from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.tools.types import BiTemporalEvidenceOutput, ToolExecutionStatus
from ml.change_detection.evidence_preflight import assess_pair
from tests.raster_fixtures import geotiff_fixture


class BiTemporalEvidencePreflightTests(unittest.TestCase):
    def _fixture_pair(self, directory: str, *, described_bands: bool = True):
        first = Path(directory) / "test-input-before.tif"
        second = Path(directory) / "test-input-after.tif"
        first.write_bytes(
            geotiff_fixture(
                bands=3,
                acquisition_at=datetime(2025, 1, 1, tzinfo=UTC),
                described_bands=described_bands,
            )
        )
        second.write_bytes(
            geotiff_fixture(
                bands=3,
                acquisition_at=datetime(2025, 2, 1, tzinfo=UTC),
                described_bands=described_bands,
            )
        )
        return first, second

    def test_typed_result_preserves_provenance_and_marks_no_change_analysis(self) -> None:
        with TemporaryDirectory() as directory:
            paths = self._fixture_pair(directory)
            result = assess_pair(paths, ("test-image-before", "test-image-after"))

        result = BiTemporalEvidenceOutput.model_validate(result.model_dump())
        self.assertEqual(result.status, ToolExecutionStatus.INSUFFICIENT_EVIDENCE)
        self.assertEqual(result.analysis_status, "INSUFFICIENT_EVIDENCE")
        self.assertEqual([item.image_id for item in result.inputs], ["test-image-before", "test-image-after"])
        self.assertEqual([item.source_kind for item in result.inputs], ["user_uploaded_raster"] * 2)
        self.assertEqual(result.inputs[0].crs, "EPSG:4326")
        self.assertEqual(result.inputs[0].sensor_as_declared, "Sentinel-2")
        self.assertEqual(result.inputs[0].band_descriptions, ["band-1", "band-2", "band-3"])
        self.assertEqual(result.temporal_gap_seconds, 31 * 24 * 60 * 60)
        self.assertTrue(result.same_grid)
        self.assertEqual(result.common_valid_pixel_count, 16)
        self.assertEqual(result.common_valid_pixel_fraction, 1.0)
        self.assertIn("No model score, probability, hypothesis, or scientific conclusion is produced.", result.limitations)
        self.assertTrue(any("validated change method" in item for item in result.limitations))

    def test_missing_band_provenance_is_reported_as_insufficient(self) -> None:
        with TemporaryDirectory() as directory:
            paths = self._fixture_pair(directory, described_bands=False)
            result = assess_pair(paths, ("test-image-before", "test-image-after"))

        self.assertEqual(result.status, ToolExecutionStatus.INSUFFICIENT_EVIDENCE)
        self.assertTrue(any("band descriptions" in item for item in result.limitations))
        self.assertEqual(result.temporal_gap_seconds, 31 * 24 * 60 * 60)

    def test_wrong_input_count_returns_typed_unavailable_outcome(self) -> None:
        result = assess_pair((Path("unused-test-input.tif"),), ("test-image",))
        self.assertEqual(result.status, ToolExecutionStatus.INSUFFICIENT_EVIDENCE)
        self.assertIn("Exactly two", result.message)
        self.assertEqual(result.inputs, [])
