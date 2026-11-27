from datetime import UTC, datetime
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.core.config import Settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models.identity import Project, User
from app.models.investigation import Investigation, Query
from app.models.reasoning import Evidence, Hypothesis
from app.models.results import Conclusion
from app.services.corpus_ie import create_or_extract_autonomous_investigation, extract_corpus_intelligence
from app.tools.remote_sensing import OpenRouterVisionVqaAdapter
from app.tools.types import ToolExecutionContext, ToolExecutionStatus, VqaParameters
from tests.raster_fixtures import geotiff_fixture


class _FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        return self._payload


class CorpusIeAndOpenRouterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        tables = [
            User.__table__,
            Project.__table__,
            Investigation.__table__,
            Query.__table__,
            Hypothesis.__table__,
            Evidence.__table__,
            Conclusion.__table__,
        ]
        Base.metadata.create_all(self.engine, tables=tables)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        with self.SessionLocal() as db:
            self.user = User(email="corpus-analyst@saatraai.test", password_hash="not-used")
            self.other_user = User(email="other-analyst@saatraai.test", password_hash="not-used")
            db.add_all([self.user, self.other_user])
            db.commit()
            db.refresh(self.user)
            db.refresh(self.other_user)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_deterministic_fallback_extracts_coordinates_multiple_timestamps_and_no_zero_ocean(self) -> None:
        corpus = (
            "Field bulletin for Kerala and 13.0827° N, 80.2707° E: on August 14, 2022, monsoon floodwaters "
            "overtopped channels, followed by renewed coastal inundation recorded on 2024-11-20. "
            "Meanwhile in UnknownNowhereVille, no station gauge existed."
        )
        settings = Settings(_env_file=None, openrouter_api_key=None)
        with patch("app.services.corpus_ie.httpx.get", side_effect=OSError("offline")):
            extracted, extractor = extract_corpus_intelligence(corpus, settings=settings)

        self.assertEqual(extractor, "deterministic-ie-fallback")
        self.assertGreaterEqual(len(extracted["timestamps"]), 2)
        self.assertEqual(extracted["timestamps"][0]["iso_date"], "2022-08-14")
        self.assertEqual(extracted["timestamps"][1]["iso_date"], "2024-11-20")
        geocoded = [loc for loc in extracted["locations"] if loc["geocoded"]]
        self.assertTrue(any(abs((loc["lat"] or 0) - 13.0827) < 0.01 for loc in geocoded))
        for loc in extracted["locations"]:
            self.assertNotEqual((loc["lat"], loc["lng"]), (0.0, 0.0))

    def test_openrouter_ie_autonomous_endpoint_persists_locations_timestamps_hypotheses_evidence_conclusion(self) -> None:
        settings = Settings(
            _env_file=None,
            openrouter_api_key="sk-or-test-secret-key",
            openrouter_model="qwen/qwen2.5-vl-72b-instruct:free",
        )
        app = create_app(settings)

        def override_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        client = TestClient(app)

        structured = {
            "title": "Brahmaputra Flood & Kochi Coastal Surge",
            "research_question": "What caused flood surges in Brahmaputra Valley and Kochi in 2024?",
            "intent": "Hydrological & Flood Analysis",
            "suggested_sources": ["optical", "sar", "rainfall"],
            "locations": [
                {
                    "name": "Brahmaputra Valley, Assam",
                    "role": "primary_basin",
                    "lat": 26.2006,
                    "lng": 92.9376,
                    "summary": "Embankment breach reported.",
                },
                {
                    "name": "Kochi, Kerala",
                    "role": "secondary_site",
                    "lat": None,
                    "lng": None,
                    "summary": "Lagoon inundation observed.",
                },
            ],
            "timestamps": [
                {
                    "label": "2024-06-12",
                    "iso_date": "2024-06-12",
                    "iso_end": None,
                    "event_summary": "Pre-breach surge started",
                    "location_name": "Brahmaputra Valley, Assam",
                },
                {
                    "label": "2024-08-05",
                    "iso_date": "2024-08-05",
                    "iso_end": None,
                    "event_summary": "Coastal flooding in Kochi",
                    "location_name": "Kochi, Kerala",
                },
            ],
            "entities": [{"name": "Brahmaputra River", "category": "waterbody", "detail": "Overbank flow"}],
            "hypotheses": [
                {
                    "statement": "Monsoon rainfall triggered embankment failure along the southern channel.",
                    "assessment_state": "under_review",
                    "confidence": 0.72,
                }
            ],
            "claims": [
                {
                    "summary": "Embankment breached on 2024-06-12 near 26.2006 N, 92.9376 E.",
                    "polarity": "supporting",
                    "hypothesis_index": 0,
                    "location_name": "Brahmaputra Valley, Assam",
                    "timestamp": "2024-06-12",
                    "source_quote": "embankment breached along the Brahmaputra",
                }
            ],
            "conclusion_summary": "Corpus indicates flood surge in Brahmaputra and Kochi; satellite SAR confirmation pending.",
        }

        openrouter_http_payload = {
            "choices": [{"message": {"content": f"```json\n{json.dumps(structured)}\n```"}}]
        }

        with (
            patch("app.api.routes.investigations.create_or_extract_autonomous_investigation", wraps=create_or_extract_autonomous_investigation),
            patch("app.services.corpus_ie.get_settings", return_value=settings),
            patch("app.services.openrouter.httpx.post", return_value=_FakeResponse(200, openrouter_http_payload)) as mocked_post,
        ):
            resp = client.post(
                "/api/v1/investigations/auto",
                json={"corpus": "Between 2024-06-12 and 2024-08-05 flooding hit Brahmaputra Valley and Kochi."},
            )
        self.assertEqual(resp.status_code, 201, resp.text)
        self.assertEqual(mocked_post.call_args.kwargs["headers"]["Authorization"], "Bearer sk-or-test-secret-key")
        body = resp.json()
        self.assertEqual(body["extraction"]["extractor"], "qwen/qwen2.5-vl-72b-instruct:free")
        self.assertEqual(body["extraction"]["hypotheses_created"], 1)
        self.assertEqual(body["extraction"]["evidence_created"], 1)
        self.assertTrue(body["extraction"]["conclusion_created"])

        inv_cfg = body["investigation"]["configuration"]
        self.assertEqual(inv_cfg["time_start"], "2024-06-12")
        self.assertEqual(inv_cfg["time_end"], "2024-08-05")
        self.assertEqual(len(inv_cfg["extracted_locations"]), 2)
        self.assertEqual(len(inv_cfg["extracted_timestamps"]), 2)
        self.assertNotIn("sk-or-test-secret-key", resp.text)

        app.dependency_overrides[get_current_user] = lambda: self.other_user
        inv_id = body["investigation"]["id"]
        denied = client.post(f"/api/v1/investigations/{inv_id}/extract", json={"corpus": "Follow-up text report."})
        self.assertEqual(denied.status_code, 404)

    def test_openrouter_vision_adapter_and_status_probe(self) -> None:
        settings = Settings(
            _env_file=None,
            openrouter_api_key="sk-or-secret-token",
            openrouter_model="google/gemini-2.5-flash",
        )
        with TemporaryDirectory() as workspace:
            scene = Path(workspace) / "scene.tif"
            scene.write_bytes(geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC)))
            ctx = ToolExecutionContext(input_paths=(scene,))
            with (
                patch("app.tools.remote_sensing.get_settings", return_value=settings),
                patch(
                    "app.services.openrouter.httpx.post",
                    return_value=_FakeResponse(
                        200,
                        {"choices": [{"message": {"content": "Flooded river floodplain visible."}}]},
                    ),
                ),
            ):
                out = OpenRouterVisionVqaAdapter().execute(VqaParameters(question="What is visible?"), ctx)
        self.assertEqual(out.status, ToolExecutionStatus.SUCCEEDED)
        self.assertEqual(out.answer, "Flooded river floodplain visible.")

        app = create_app(settings)
        app.dependency_overrides[get_db] = lambda: iter([SimpleNamespace(execute=lambda *_a, **_k: None)])
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=uuid4(), email="a@saatraai.test")
        client = TestClient(app)
        with (
            patch("app.api.routes.status.get_settings", return_value=settings),
            patch("app.api.routes.status._tcp_reachable", return_value=False),
            patch("app.services.openrouter.httpx.get", return_value=_FakeResponse(200, {"data": {"label": "ok"}})),
        ):
            status_resp = client.get("/api/v1/status")
        self.assertEqual(status_resp.status_code, 200)
        or_status = next(s for s in status_resp.json()["services"] if s["id"] == "model_openrouter")
        self.assertEqual(or_status["state"], "online")
        self.assertNotIn("sk-or-secret-token", status_resp.text)


if __name__ == "__main__":
    unittest.main()
