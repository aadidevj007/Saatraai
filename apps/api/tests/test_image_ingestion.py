from datetime import UTC, datetime
from hashlib import sha256
from io import BytesIO
from tempfile import TemporaryDirectory
from uuid import uuid4
import asyncio
import unittest

from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import User
from app.services.storage import LocalObjectStorage, StoredObject
from app.services.raster import validate_extension
from tests.raster_fixtures import geotiff_fixture


class ImageIngestionApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        self.created_emails: list[str] = []
        self.stored_objects: list[StoredObject] = []
        self.storage = LocalObjectStorage("data/uploads", 100 * 1024 * 1024)

    def tearDown(self) -> None:
        for stored in self.stored_objects:
            self.storage.delete(stored)
        with SessionLocal() as session:
            users = session.scalars(select(User).where(User.email.in_(self.created_emails))).all()
            for user in users:
                session.delete(user)
            session.commit()

    def create_investigation(self) -> tuple[dict[str, str], str]:
        email = f"ingestion-{uuid4()}@example.com"
        self.created_emails.append(email)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": "correct-horse-battery-staple"},
            ).status_code,
            201,
        )
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "correct-horse-battery-staple"},
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        project = self.client.post("/api/v1/projects", json={"name": "Ingestion"}, headers=headers).json()
        investigation = self.client.post(
            "/api/v1/investigations",
            json={"project_id": project["id"], "title": "Image intake"},
            headers=headers,
        ).json()
        return headers, investigation["id"]

    def remember_storage(self, payload: dict) -> None:
        for image in payload["images"]:
            key = image["storage_location"].removeprefix("local://")
            self.stored_objects.append(StoredObject(key=key, uri=image["storage_location"]))

    def test_ingests_single_optical_geotiff_and_persists_metadata(self) -> None:
        headers, investigation_id = self.create_investigation()
        raster = geotiff_fixture(
            bands=3,
            acquisition_at=datetime(2025, 1, 1, tzinfo=UTC),
        )
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[("files", ("../../coastal scene.tif", raster, "image/tiff"))],
            headers=headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.remember_storage(payload)
        image = payload["images"][0]
        self.assertEqual(payload["input_configuration"], "single_image")
        self.assertEqual(image["original_filename"], "coastal_scene.tif")
        self.assertEqual(image["modality"], "optical")
        self.assertEqual(image["width"], 4)
        self.assertEqual(image["height"], 4)
        self.assertEqual(image["band_count"], 3)
        self.assertEqual(image["crs"], "EPSG:4326")
        self.assertEqual(image["checksum"], sha256(raster).hexdigest())

    def test_detects_co_registered_optical_sar_pair(self) -> None:
        headers, investigation_id = self.create_investigation()
        optical = geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC))
        sar = geotiff_fixture(
            bands=1,
            sensor="Sentinel-1 SAR",
            acquisition_at=datetime(2025, 1, 2, tzinfo=UTC),
        )
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[
                ("files", ("optical.tif", optical, "image/tiff")),
                ("files", ("sar.tif", sar, "image/tiff")),
            ],
            headers=headers,
        )
        self.assertEqual(response.status_code, 201, response.text)
        payload = response.json()
        self.remember_storage(payload)
        self.assertEqual(payload["input_configuration"], "cross_modal_pair")
        self.assertEqual({image["modality"] for image in payload["images"]}, {"optical", "sar"})

    def test_rejects_incompatible_bi_temporal_pair_with_explicit_errors(self) -> None:
        headers, investigation_id = self.create_investigation()
        first = geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC))
        second = geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC))
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[
                ("files", ("before.tif", first, "image/tiff")),
                ("files", ("after.tif", second, "image/tiff")),
            ],
            headers=headers,
        )
        self.assertEqual(response.status_code, 422)
        error = response.json()["error"]
        self.assertEqual(error["code"], "http_422")
        self.assertIn("distinct acquisition timestamps", error["details"][0]["message"])

    def test_rejects_png_without_permitted_benchmark_context(self) -> None:
        headers, investigation_id = self.create_investigation()
        response = self.client.post(
            f"/api/v1/investigations/{investigation_id}/images",
            files=[("files", ("not-permitted.png", b"not a raster", "image/png"))],
            headers=headers,
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("permitted benchmark dataset", response.json()["error"]["details"][0]["message"])

    def test_storage_enforces_size_limit_and_permitted_benchmark_gate(self) -> None:
        validate_extension(".png", "EuroSAT")
        with TemporaryDirectory() as directory:
            limited_storage = LocalObjectStorage(directory, max_upload_bytes=4)
            upload = UploadFile(filename="small.tif", file=BytesIO(b"12345"))
            with self.assertRaises(HTTPException) as error:
                asyncio.run(limited_storage.stage(upload))
            self.assertEqual(error.exception.status_code, 413)
