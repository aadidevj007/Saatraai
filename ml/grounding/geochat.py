from __future__ import annotations

import re
from pathlib import Path
from tempfile import TemporaryDirectory

from ml.common import ModelUnavailableError, prepare_rgb_image
from ml.vqa.geochat import GeoChatVqaRunner


def parse_grounding_boxes(generation: str, width: int, height: int) -> list[dict[str, float | None]]:
    """Parse GeoChat's documented 0-100 rotated-box coordinate convention."""
    boxes: list[dict[str, float | None]] = []
    for match in re.finditer(r"\{\s*<(-?\d+(?:\.\d+)?)><(-?\d+(?:\.\d+)?)><(-?\d+(?:\.\d+)?)><(-?\d+(?:\.\d+)?)>(?:<(-?\d+(?:\.\d+)?)>)?\s*\}", generation):
        x1, y1, x2, y2, angle = (float(value) if value is not None else None for value in match.groups())
        left, right = sorted((max(0.0, min(100.0, x1)), max(0.0, min(100.0, x2))))
        top, bottom = sorted((max(0.0, min(100.0, y1)), max(0.0, min(100.0, y2))))
        if left == right or top == bottom:
            continue
        boxes.append({
            "x_min": left * width / 100,
            "y_min": top * height / 100,
            "x_max": right * width / 100,
            "y_max": bottom * height / 100,
            "angle_degrees": angle,
        })
    return boxes


class GeoChatGroundingRunner:
    """GeoChat grounding wrapper. GeoChat supplies boxes, not segmentation masks."""

    def __init__(self, model_path: str | None, model_base: str | None, device: str, max_new_tokens: int) -> None:
        self._runner = GeoChatVqaRunner(model_path, model_base, device, max_new_tokens)

    def ground(self, image_path: Path, target: str) -> list[dict[str, float | None]]:
        with TemporaryDirectory() as workspace:
            prepared = prepare_rgb_image(image_path, workspace)
            response = self._runner.answer(prepared.path, f"Locate {target}. Return bounding box coordinates only.")
            boxes = parse_grounding_boxes(response, prepared.width, prepared.height)
        if not boxes:
            raise ValueError("GeoChat returned no valid grounding boxes")
        return boxes
