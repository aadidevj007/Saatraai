from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.db.session import SessionLocal
from app.models import User
from app.models.eo import ImageModality
from app.tools.builtins import get_tool_registry
from app.tools.registry import ToolValidationError
from app.tools.types import InputConfiguration, ToolExecutionStatus, ToolInvocation, ToolTaskType


class ToolRegistryTests(unittest.TestCase):
    def test_registry_declares_all_specialist_task_types(self) -> None:
        registry = get_tool_registry()
        task_types = {tool.task_type for tool in registry.list_tools()}
        self.assertEqual(task_types, set(ToolTaskType))

    def test_registry_selects_valid_tool_and_placeholder_is_explicit(self) -> None:
        registry = get_tool_registry()
        invocation = ToolInvocation(
            input_configuration=InputConfiguration.SINGLE_IMAGE,
            modalities=[ImageModality.OPTICAL],
            parameters={"question": "What is visible?"},
        )
        selected = registry.select(ToolTaskType.VQA, invocation)
        self.assertEqual(selected[0].name, "optical-vqa")

        result = registry.execute("optical-vqa", invocation)
        self.assertEqual(result.status, ToolExecutionStatus.NOT_IMPLEMENTED)
        self.assertIn("GEOCHAT_MODEL_PATH", result.message)

        invalid_parameters = invocation.model_copy(update={"parameters": {}})
        with self.assertRaises(ToolValidationError):
            registry.execute("optical-vqa", invalid_parameters)

    def test_registry_rejects_invalid_pair_before_execution(self) -> None:
        invocation = ToolInvocation(
            input_configuration=InputConfiguration.CROSS_MODAL_PAIR,
            modalities=[ImageModality.OPTICAL, ImageModality.OPTICAL],
            parameters={"fusion_mode": "feature"},
        )
        with self.assertRaises(ToolValidationError):
            get_tool_registry().select(ToolTaskType.OPTICAL_SAR, invocation)


class ToolRegistryApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.email = f"tools-{uuid4()}@example.com"

    def tearDown(self) -> None:
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.email == self.email))
            if user is not None:
                session.delete(user)
                session.commit()

    def test_authenticated_tool_catalog(self) -> None:
        self.assertEqual(self.client.get("/api/v1/tools").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/register",
                json={"email": self.email, "password": "correct-horse-battery-staple"},
            ).status_code,
            201,
        )
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": "correct-horse-battery-staple"},
        )
        response = self.client.get(
            "/api/v1/tools",
            headers={"Authorization": f"Bearer {login.json()['access_token']}"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        tools = response.json()["tools"]
        self.assertEqual(len(tools), 6)
        self.assertTrue(all("parameter_schema" in tool for tool in tools))
