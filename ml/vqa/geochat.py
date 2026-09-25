from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from ml.common import ModelUnavailableError, prepare_rgb_image


MODEL_NAME = "MBZUAI/geochat-7B"
MODEL_VERSION = "geochat-7B"


def normalize_answer(generation: str) -> str:
    answer = generation.strip()
    if not answer:
        raise ValueError("GeoChat returned an empty answer")
    return answer


class GeoChatVqaRunner:
    """Thin wrapper over GeoChat's official Python runtime, loaded only on demand."""

    def __init__(self, model_path: str | None, model_base: str | None, device: str, max_new_tokens: int) -> None:
        self.model_path = model_path
        self.model_base = model_base
        self.device = device
        self.max_new_tokens = max_new_tokens

    def answer(self, image_path: Path, question: str) -> str:
        if not self.model_path:
            raise ModelUnavailableError("GEOCHAT_MODEL_PATH is not configured; no model weights were loaded")
        try:
            from geochat.conversation import Chat, conv_templates
            from geochat.mm_utils import get_model_name_from_path
            from geochat.model.builder import load_pretrained_model
        except ImportError as error:
            raise ModelUnavailableError(
                "GeoChat runtime is unavailable; install the pinned upstream GeoChat runtime before enabling inference"
            ) from error

        tokenizer, model, image_processor, _ = load_pretrained_model(
            self.model_path,
            self.model_base,
            get_model_name_from_path(self.model_path),
            device=self.device,
        )
        chat = Chat(model.eval(), image_processor, tokenizer, device=self.device)
        conversation = conv_templates["llava_v1"].copy()
        with TemporaryDirectory() as workspace:
            prepared = prepare_rgb_image(image_path, workspace)
            from PIL import Image

            image_list: list[object] = []
            chat.upload_img(Image.open(prepared.path).convert("RGB"), conversation, image_list)
            chat.ask(question, conversation)
            return normalize_answer(
                chat.answer(conversation, image_list, temperature=0.0, max_new_tokens=self.max_new_tokens)[0]
            )
