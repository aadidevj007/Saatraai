from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
import httpx

from app.api.dependencies import get_current_user
from app.core.config import Settings
from app.db.session import get_db
from app.main import create_app
from app.tools.remote_sensing import GeoChatGroundingAdapter, GeoChatVqaAdapter
from app.tools.types import GroundingParameters, ToolExecutionContext, ToolExecutionStatus, VqaParameters
from tests.raster_fixtures import geotiff_fixture


class _FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


class _FakeDb:
    def execute(self, *_args: object, **_kwargs: object) -> None:
        return None


class GeoChatRemoteIntegrationTests(unittest.TestCase):
    def _client(self, settings: Settings, *, authenticated: bool = True) -> TestClient:
        app = create_app(settings)

        def override_db():
            yield _FakeDb()

        app.dependency_overrides[get_db] = override_db
        if authenticated:
            app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
                id=uuid4(),
                email="remote-analyst@saatraai.test",
            )
        return TestClient(app)

    def test_status_reports_remote_geochat_health_without_exposing_url_or_token(self) -> None:
        settings = Settings(
            _env_file=None,
            geochat_model_path=None,
            geochat_remote_url="https://secret-gpu-worker.internal.test",
            geochat_remote_token="super-secret-worker-token",
        )
        client = self._client(settings)

        with (
            patch("app.api.routes.status.get_settings", return_value=settings),
            patch("app.api.routes.status._tcp_reachable", return_value=False),
            patch("app.services.geochat_remote.httpx.get", return_value=_FakeResponse(200, {"status": "ok"})) as mocked_get,
        ):
            online_resp = client.get("/api/v1/status")
        self.assertEqual(online_resp.status_code, 200)
        geochat = next(item for item in online_resp.json()["services"] if item["id"] == "model_geochat")
        self.assertEqual(geochat["state"], "online")
        self.assertNotIn("secret-gpu-worker", online_resp.text)
        self.assertNotIn("super-secret-worker-token", online_resp.text)
        self.assertEqual(
            mocked_get.call_args.kwargs["headers"]["Authorization"],
            "Bearer super-secret-worker-token",
        )

        with (
            patch("app.api.routes.status.get_settings", return_value=settings),
            patch("app.api.routes.status._tcp_reachable", return_value=False),
            patch("app.services.geochat_remote.httpx.get", side_effect=httpx.ConnectError("down")),
        ):
            degraded_resp = client.get("/api/v1/status")
        self.assertEqual(degraded_resp.status_code, 200)
        degraded_geochat = next(item for item in degraded_resp.json()["services"] if item["id"] == "model_geochat")
        self.assertEqual(degraded_geochat["state"], "degraded")
        self.assertNotIn("secret-gpu-worker", degraded_resp.text)
        self.assertNotIn("super-secret-worker-token", degraded_resp.text)

    def test_remote_vqa_and_grounding_adapters_execute_and_fail_honestly(self) -> None:
        settings = Settings(
            _env_file=None,
            geochat_model_path=None,
            geochat_remote_url="https://gpu.example.test",
            geochat_remote_token="worker-secret",
        )
        with TemporaryDirectory() as workspace:
            scene = Path(workspace) / "scene.tif"
            scene.write_bytes(geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC)))
            ctx = ToolExecutionContext(input_paths=(scene,))

            with (
                patch("app.tools.remote_sensing.get_settings", return_value=settings),
                patch(
                    "app.services.geochat_remote.httpx.post",
                    return_value=_FakeResponse(200, {"answer": "  A bridge crosses the river.  "}),
                ) as mocked_post,
            ):
                vqa_result = GeoChatVqaAdapter().execute(VqaParameters(question="What crosses the river?"), ctx)
            self.assertEqual(vqa_result.status, ToolExecutionStatus.SUCCEEDED)
            self.assertEqual(vqa_result.answer, "A bridge crosses the river.")
            self.assertEqual(mocked_post.call_args.args[0], "https://gpu.example.test/vqa")
            self.assertEqual(mocked_post.call_args.kwargs["headers"]["Authorization"], "Bearer worker-secret")

            with (
                patch("app.tools.remote_sensing.get_settings", return_value=settings),
                patch(
                    "app.services.geochat_remote.httpx.post",
                    return_value=_FakeResponse(200, {"raw_text": "{<25><25><75><75><0>}"}),
                ),
            ):
                grounding_result = GeoChatGroundingAdapter().execute(GroundingParameters(target="bridge"), ctx)
            self.assertEqual(grounding_result.status, ToolExecutionStatus.SUCCEEDED)
            self.assertEqual(len(grounding_result.boxes), 1)
            self.assertEqual((grounding_result.boxes[0].x_min, grounding_result.boxes[0].x_max), (1.0, 3.0))

            with (
                patch("app.tools.remote_sensing.get_settings", return_value=settings),
                patch("app.services.geochat_remote.httpx.post", return_value=_FakeResponse(503, {"detail": "busy"})),
            ):
                unavailable_result = GeoChatVqaAdapter().execute(VqaParameters(question="What is visible?"), ctx)
            self.assertEqual(unavailable_result.status, ToolExecutionStatus.NOT_IMPLEMENTED)

    def test_geochat_routes_require_auth_delegate_to_remote_worker_and_return_501_when_unconfigured(self) -> None:
        unauthenticated = self._client(Settings(_env_file=None), authenticated=False)
        sample_tiff = geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC))
        resp_401 = unauthenticated.post(
            "/api/v1/models/geochat/vqa",
            data={"question": "Any boats?"},
            files={"image": ("scene.tif", sample_tiff, "image/tiff")},
        )
        self.assertEqual(resp_401.status_code, 401)

        unconfigured = Settings(_env_file=None, geochat_model_path=None, geochat_remote_url=None)
        client_unconf = self._client(unconfigured)
        with patch("app.api.routes.geochat.get_settings", return_value=unconfigured):
            resp_501 = client_unconf.post(
                "/api/v1/models/geochat/vqa",
                data={"question": "Any boats?"},
                files={"image": ("scene.tif", sample_tiff, "image/tiff")},
            )
        self.assertEqual(resp_501.status_code, 501)

        configured = Settings(_env_file=None, geochat_model_path=None, geochat_remote_url="https://gpu.example.test")
        client_conf = self._client(configured)
        with (
            patch("app.api.routes.geochat.get_settings", return_value=configured),
            patch(
                "app.services.geochat_remote.httpx.post",
                return_value=_FakeResponse(200, {"answer": "Two storage tanks detected."}),
            ),
        ):
            resp_vqa = client_conf.post(
                "/api/v1/models/geochat/vqa",
                data={"question": "Any tanks?"},
                files={"image": ("scene.tif", sample_tiff, "image/tiff")},
            )
        self.assertEqual(resp_vqa.status_code, 200)
        self.assertEqual(resp_vqa.json()["model"], "MBZUAI/geochat-7B")
        self.assertEqual(resp_vqa.json()["answer"], "Two storage tanks detected.")

        with (
            patch("app.api.routes.geochat.get_settings", return_value=configured),
            patch(
                "app.services.geochat_remote.httpx.post",
                return_value=_FakeResponse(
                    200,
                    {"boxes": [{"x_min": 0.5, "y_min": 1.0, "x_max": 3.5, "y_max": 3.0, "angle_degrees": 10.0}]},
                ),
            ),
        ):
            resp_ground = client_conf.post(
                "/api/v1/models/geochat/grounding",
                data={"target": "storage tank"},
                files={"image": ("scene.tif", sample_tiff, "image/tiff")},
            )
        self.assertEqual(resp_ground.status_code, 200)
        self.assertEqual(resp_ground.json()["model"], "MBZUAI/geochat-7B")
        self.assertEqual(len(resp_ground.json()["boxes"]), 1)
        self.assertEqual(resp_ground.json()["boxes"][0]["angle_degrees"], 10.0)


if __name__ == "__main__":
    unittest.main()
