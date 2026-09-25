from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from dataclasses import replace
from importlib.util import find_spec

import numpy as np

from ml.adaptation.config import AdaptationConfig, DatasetConfig, ModelConfig, TrainingConfig, load_config
from ml.adaptation.smoke import create_smoke_dataset
from ml.adaptation.splits import assign_splits
from ml.adaptation.train import run_training
from ml.evaluation import multilabel_metrics


def _torch_numpy_bridge_available() -> bool:
    # The supported requirements intentionally keep NumPy on the 1.x ABI.
    return find_spec("torch") is not None and int(np.__version__.split(".", maxsplit=1)[0]) < 2


class AdaptationPipelineTests(unittest.TestCase):
    @unittest.skipUnless(
        _torch_numpy_bridge_available(),
        "PyTorch with a NumPy-compatible binary is required for the training smoke test",
    )
    def test_cpu_smoke_training_saves_metadata_and_resumes(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = create_smoke_dataset(root / "dataset", seed=17)
            configured = load_config(Path(__file__).parents[1] / "config" / "smoke.yaml")
            config = replace(
                configured,
                dataset=replace(configured.dataset, manifest_path=str(manifest)),
                training=replace(configured.training, epochs=1, output_dir=str(root / "run")),
            )
            first = run_training(config, run_kind="smoke")
            self.assertEqual(first["status"], "completed")
            self.assertEqual(first["run_kind"], "smoke")
            self.assertTrue((root / "run" / "last.pt").is_file())
            self.assertTrue((root / "run" / "best.pt").is_file())

            resumed = replace(
                config,
                training=replace(config.training, epochs=2, resume_checkpoint=str(root / "run" / "last.pt")),
            )
            second = run_training(resumed, run_kind="smoke")
            self.assertEqual(second["history"][0]["epoch"], 2)

    def test_configuration_rejects_channel_mismatch(self) -> None:
        with self.assertRaises(ValueError):
            AdaptationConfig(
                dataset=DatasetConfig(manifest_path="ignored.jsonl", labels=["land"]),
                model=ModelConfig(in_channels=2),
                training=TrainingConfig(),
            )

    def test_seeded_split_is_repeatable_and_excludes_test_samples(self) -> None:
        records = [{"id": f"sample-{index}"} for index in range(30)] + [{"id": "held-out", "split": "test"}]
        first = assign_splits(records, validation_fraction=0.25, seed=7)
        second = assign_splits(records, validation_fraction=0.25, seed=7)
        self.assertEqual(first, second)
        self.assertNotIn({"id": "held-out", "split": "test"}, first[0])
        self.assertNotIn({"id": "held-out", "split": "test"}, first[1])

    def test_metrics_reward_correct_multilabel_rankings(self) -> None:
        metrics = multilabel_metrics(
            np.array([[8.0, -8.0], [-8.0, 8.0]]),
            np.array([[1, 0], [0, 1]]),
        )
        self.assertEqual(metrics, {"micro_f1": 1.0, "macro_f1": 1.0, "mean_average_precision": 1.0})

    def test_smoke_dataset_is_small_and_uses_explicit_splits(self) -> None:
        with TemporaryDirectory() as directory:
            manifest = create_smoke_dataset(directory, seed=9)
            records = manifest.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(records), 12)
        self.assertTrue(all('"split"' in record for record in records))

    def test_example_configuration_loads(self) -> None:
        config = load_config(Path(__file__).parents[1] / "config" / "bigearthnet_s2.yaml")
        self.assertEqual(config.training.seed, 20260906)
        self.assertEqual(config.dataset.image_size, 120)
        smoke = load_config(Path(__file__).parents[1] / "config" / "smoke.yaml")
        self.assertEqual(smoke.training.device, "cpu")
