from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from importlib.util import find_spec
from datetime import UTC, datetime

from app.tools.remote_sensing import GeoChatVqaAdapter
from app.tools.types import ToolExecutionContext, VqaParameters
from ml.grounding import parse_grounding_boxes
from tests.raster_fixtures import geotiff_fixture


class RemoteSensingWorkflowTests(unittest.TestCase):
    @unittest.skipUnless(find_spec("PIL"), "Pillow is installed from application requirements")
    def test_fixture_geotiff_is_prepared_without_gpu_or_model_weights(self) -> None:
        from ml.common import prepare_rgb_image

        with TemporaryDirectory() as workspace:
            source = Path(workspace) / "fixture.tif"
            source.write_bytes(geotiff_fixture(bands=3, acquisition_at=datetime(2025, 1, 1, tzinfo=UTC)))
            with TemporaryDirectory() as output_workspace:
                prepared = prepare_rgb_image(source, output_workspace)
                self.assertEqual((prepared.width, prepared.height), (4, 4))
                self.assertTrue(prepared.path.exists())

    def test_geochat_boxes_are_normalized_to_input_pixels(self) -> None:
        boxes = parse_grounding_boxes("<p>airport</p>{<10><20><60><80><15>}", 1000, 500)
        self.assertEqual(boxes, [{
            "x_min": 100.0,
            "y_min": 100.0,
            "x_max": 600.0,
            "y_max": 400.0,
            "angle_degrees": 15.0,
        }])

    def test_cpu_path_without_weights_is_explicit_and_never_fabricates_output(self) -> None:
        with TemporaryDirectory() as workspace:
            result = GeoChatVqaAdapter().execute(
                VqaParameters(question="What is visible?"),
                ToolExecutionContext(input_paths=(Path(workspace) / "fixture.tif",)),
            )
        self.assertEqual(result.status.value, "NOT_IMPLEMENTED")
        self.assertIn("GEOCHAT_MODEL_PATH", result.message)
