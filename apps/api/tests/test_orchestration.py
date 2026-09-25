from datetime import UTC, datetime
from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User
from app.models.eo import ImageModality
from app.services.orchestration import DeterministicRoutingStrategy, OrchestrationTaskClass
from app.tools.types import InputConfiguration
from tests.raster_fixtures import geotiff_fixture


class DeterministicRoutingTests(unittest.TestCase):
    def test_routes_all_supported_task_classes(self) -> None:
        router = DeterministicRoutingStrategy()
        scenarios = [
            ("What is visible?", InputConfiguration.SINGLE_IMAGE, OrchestrationTaskClass.SINGLE_IMAGE_VQA),
            ("Caption this scene", InputConfiguration.SINGLE_IMAGE, OrchestrationTaskClass.CAPTIONING),
            ("Locate the airport", InputConfiguration.SINGLE_IMAGE, OrchestrationTaskClass.GROUNDING),
            ("Detect changes", InputConfiguration.BI_TEMPORAL_PAIR, OrchestrationTaskClass.BI_TEMPORAL_CHANGE),
            ("What changed between images?", InputConfiguration.BI_TEMPORAL_PAIR, OrchestrationTaskClass.CHANGE_VQA),
            ("Analyze the pair", InputConfiguration.CROSS_MODAL_PAIR, OrchestrationTaskClass.OPTICAL_SAR_ANALYSIS),
        ]
        for query, configuration, expected in scenarios:
            with self.subTest(query=query):
                self.assertEqual(router.classify(query, configuration), expected)


class OrchestrationApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.email = f"orchestration-{uuid4()}@example.com"

    def tearDown(self) -> None:
        with SessionLocal() as session:
            user = session.scalar(select(User).where(User.email == self.email))
            if user is not None:
                session.delete(user)
                session.commit()

    def create_investigation(self) -> tuple[dict[str, str], str]:
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
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        project = self.client.post("/api/v1/projects", json={"name": "Controller"}, headers=headers).json()
        investigation = self.client.post(
            "/api/v1/investigations",
            json={"project_id": project["id"], "title": "Routing"},
            headers=headers,
        ).json()
        return headers, investigation["id"]

    def upload_single_image(self, headers: dict[str, str], investigation_id: str) -> str:
        raster = geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC))
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[("files", ("input.tif", raster, "image/tiff"))],
            headers=headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["images"][0]["id"]

    def test_execution_persists_not_implemented_trace_and_replays(self) -> None:
        headers, investigation_id = self.create_investigation()
        image_id = self.upload_single_image(headers, investigation_id)
        request = {"query": "What is visible?", "image_ids": [image_id], "parameters": {}}
        headers["Idempotency-Key"] = "vqa-request-1"

        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/executions", json=request, headers=headers
        )
        self.assertEqual(response.status_code, 201, response.text)
        trace = response.json()
        self.assertEqual(trace["selected_task"], "single_image_vqa")
        self.assertEqual(trace["selected_tool"], "optical-vqa")
        self.assertEqual(trace["status"], "failed")
        self.assertIn("NOT_IMPLEMENTED", trace["error"])
        self.assertEqual(len(trace["output_references"]), 1)
        self.assertTrue(trace["output_references"][0].endswith(".json"))
        self.assertIsNotNone(trace["evidence_id"])

        replay = self.client.post(
            f"/api/v1/investigations/{investigation_id}/executions", json=request, headers=headers
        )
        self.assertEqual(replay.status_code, 201, replay.text)
        self.assertEqual(replay.json()["task_id"], trace["task_id"])
        self.assertTrue(replay.json()["idempotent_replay"])

        fetched = self.client.get(
            f"/api/v1/investigations/{investigation_id}/executions/{trace['task_id']}", headers=headers
        )
        self.assertEqual(fetched.status_code, 200, fetched.text)
        self.assertEqual(fetched.json()["query_id"], trace["query_id"])

    def test_unrelated_pair_is_rejected_before_tool_execution(self) -> None:
        headers, investigation_id = self.create_investigation()
        first = self.upload_single_image(headers, investigation_id)
        second = self.upload_single_image(headers, investigation_id)
        headers["Idempotency-Key"] = "invalid-pair"
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/executions",
            json={"query": "Detect changes", "image_ids": [first, second], "parameters": {}},
            headers=headers,
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("validated ingestion relationship", response.json()["error"]["details"][0]["message"])
