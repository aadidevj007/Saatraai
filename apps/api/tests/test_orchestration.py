from datetime import UTC, datetime
from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User
from app.services.orchestration import DeterministicRoutingStrategy, OrchestrationTaskClass
from app.services.storage import LocalObjectStorage, StoredObject
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
        self.created_emails = [self.email]
        self.stored_objects: list[StoredObject] = []

    def tearDown(self) -> None:
        storage = LocalObjectStorage("data/uploads", 100 * 1024 * 1024)
        for stored in self.stored_objects:
            storage.delete(stored)
        with SessionLocal() as session:
            users = session.scalars(select(User).where(User.email.in_(self.created_emails))).all()
            for user in users:
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
        image = response.json()["images"][0]
        self.stored_objects.append(
            StoredObject(
                key=image["storage_location"].removeprefix("local://"),
                uri=image["storage_location"],
            )
        )
        return image["id"]

    def upload_temporal_pair(self, headers: dict[str, str], investigation_id: str) -> list[str]:
        before = geotiff_fixture(
            bands=3,
            acquisition_at=datetime(2025, 1, 1, tzinfo=UTC),
            described_bands=True,
        )
        after = geotiff_fixture(
            bands=3,
            acquisition_at=datetime(2025, 2, 1, tzinfo=UTC),
            described_bands=True,
        )
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[
                ("files", ("test-before.tif", before, "image/tiff")),
                ("files", ("test-after.tif", after, "image/tiff")),
            ],
            headers=headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        images = response.json()["images"]
        self.stored_objects.extend(
            StoredObject(key=image["storage_location"].removeprefix("local://"), uri=image["storage_location"])
            for image in images
        )
        return [image["id"] for image in images]

    def remember_trace_artifacts(self, trace: dict) -> None:
        for uri in trace.get("output_references", []):
            if uri.startswith("local://"):
                self.stored_objects.append(StoredObject(key=uri.removeprefix("local://"), uri=uri))

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
        self.assertEqual(trace["status"], "failed")
        self.assertIn("NOT_IMPLEMENTED", trace["error"])
        self.assertEqual(trace["selected_tool"], "optical-vqa")
        self.assertEqual(trace["model_version"], "geochat-7B")
        self.assertIsNotNone(trace["started_at"])
        self.assertIsNotNone(trace["completed_at"])
        self.assertEqual(len(trace["output_references"]), 1)
        self.assertTrue(trace["output_references"][0].endswith(".json"))
        self.assertIsNotNone(trace["evidence_id"])
        self.remember_trace_artifacts(trace)
        with SessionLocal() as session:
            from app.models.investigation import Investigation, InvestigationStatus

            investigation = session.get(Investigation, investigation_id)
            self.assertEqual(investigation.status, InvestigationStatus.BLOCKED)

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
        evidence = self.client.get(
            f"/api/v1/investigations/{investigation_id}/evidence", headers=headers
        )
        self.assertEqual(evidence.status_code, 200, evidence.text)
        item = next(row for row in evidence.json()["items"] if row["id"] == trace["evidence_id"])
        self.assertEqual(item["polarity"], "insufficient")
        self.assertEqual(item["provenance"]["adapter_status"], "NOT_IMPLEMENTED")

    def test_bitemporal_preflight_runs_through_orchestrator_and_stays_inconclusive(self) -> None:
        headers, investigation_id = self.create_investigation()
        image_ids = self.upload_temporal_pair(headers, investigation_id)
        headers["Idempotency-Key"] = "test-bitemporal-preflight"

        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/executions",
            json={"query": "Detect changes", "image_ids": image_ids, "parameters": {}},
            headers=headers,
        )

        self.assertEqual(response.status_code, 201, response.text)
        trace = response.json()
        self.assertEqual(trace["selected_task"], "bi_temporal_change")
        self.assertEqual(trace["selected_tool"], "bi-temporal-evidence-preflight")
        self.assertEqual(trace["status"], "failed")
        self.assertIn("INSUFFICIENT_EVIDENCE", trace["error"])
        self.assertEqual(trace["input_ids"], image_ids)
        self.assertIsNotNone(trace["started_at"])
        self.assertIsNotNone(trace["completed_at"])
        self.assertEqual(len(trace["output_references"]), 1)
        self.assertIsNotNone(trace["evidence_id"])
        self.remember_trace_artifacts(trace)

        evidence = self.client.get(
            f"/api/v1/investigations/{investigation_id}/evidence", headers=headers
        )
        self.assertEqual(evidence.status_code, 200, evidence.text)
        item = next(row for row in evidence.json()["items"] if row["id"] == trace["evidence_id"])
        self.assertEqual(item["polarity"], "insufficient")
        self.assertEqual(item["provenance"]["adapter_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(item["provenance"]["input_ids"], image_ids)
        self.assertEqual(item["provenance"]["tool_output"]["analysis_status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(len(item["provenance"]["tool_output"]["inputs"][0]["source_checksum"]), 64)
        self.assertTrue(item["source_uri"].endswith(".json"))

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

    def test_cross_user_resources_are_not_readable_or_mutable(self) -> None:
        owner_headers, owner_investigation_id = self.create_investigation()
        owner_investigation = self.client.get(
            f"/api/v1/investigations/{owner_investigation_id}", headers=owner_headers
        ).json()
        owner_project_id = owner_investigation["project_id"]
        image_id = self.upload_single_image(owner_headers, owner_investigation_id)
        owner_headers["Idempotency-Key"] = "owner-execution"
        owner_execution = self.client.post(
            f"/api/v1/investigations/{owner_investigation_id}/executions",
            json={"query": "What is visible?", "image_ids": [image_id], "parameters": {}},
            headers=owner_headers,
        )
        self.assertEqual(owner_execution.status_code, 201, owner_execution.text)
        owner_trace = owner_execution.json()
        self.remember_trace_artifacts(owner_trace)
        task_id = owner_trace["task_id"]

        attacker_email = f"orchestration-attacker-{uuid4()}@example.com"
        self.created_emails.append(attacker_email)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/register",
                json={"email": attacker_email, "password": "correct-horse-battery-staple"},
            ).status_code,
            201,
        )
        attacker_login = self.client.post(
            "/api/v1/auth/login",
            json={"email": attacker_email, "password": "correct-horse-battery-staple"},
        )
        attacker_headers = {"Authorization": f"Bearer {attacker_login.json()['access_token']}"}
        attacker_project = self.client.post(
            "/api/v1/projects", json={"name": "Attacker workspace"}, headers=attacker_headers
        ).json()
        attacker_investigation = self.client.post(
            "/api/v1/investigations",
            json={"project_id": attacker_project["id"], "title": "Attacker investigation"},
            headers=attacker_headers,
        ).json()
        attacker_investigation_id = attacker_investigation["id"]

        self.assertEqual(
            self.client.get(f"/api/v1/projects/{owner_project_id}", headers=attacker_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(f"/api/v1/investigations/{owner_investigation_id}", headers=attacker_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/v1/investigations/{owner_investigation_id}/configuration",
                json={"configuration": {"question": "tamper"}},
                headers=attacker_headers,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/investigations/{owner_investigation_id}/queries",
                json={"text": "tamper"},
                headers=attacker_headers,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(f"/api/v1/investigations/{owner_investigation_id}/images", headers=attacker_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/investigations/{owner_investigation_id}/images",
                files=[("files", ("unused.tif", b"not read", "image/tiff"))],
                headers=attacker_headers,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(f"/api/v1/investigations/{owner_investigation_id}/executions", headers=attacker_headers).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                f"/api/v1/investigations/{owner_investigation_id}/executions/{task_id}",
                headers=attacker_headers,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.post(
                f"/api/v1/investigations/{owner_investigation_id}/executions",
                json={"query": "What is visible?", "image_ids": [image_id], "parameters": {}},
                headers={**attacker_headers, "Idempotency-Key": "attacker-attempt"},
            ).status_code,
            404,
        )
        for resource in ("evidence", "hypotheses", "conclusions"):
            self.assertEqual(
                self.client.get(
                    f"/api/v1/investigations/{owner_investigation_id}/{resource}",
                    headers=attacker_headers,
                ).status_code,
                404,
            )
        self.assertEqual(
            self.client.delete(f"/api/v1/investigations/{owner_investigation_id}", headers=attacker_headers).status_code,
            404,
        )

        cross_owned_image = self.client.post(
            f"/api/v1/investigations/{attacker_investigation_id}/executions",
            json={"query": "What is visible?", "image_ids": [image_id], "parameters": {}},
            headers={**attacker_headers, "Idempotency-Key": "foreign-image-attempt"},
        )
        self.assertEqual(cross_owned_image.status_code, 422)
