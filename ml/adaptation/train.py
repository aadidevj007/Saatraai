from __future__ import annotations

import argparse
import json
import random
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from hashlib import sha256

import numpy as np

from ml.adaptation.config import AdaptationConfig, load_config
from ml.adaptation.data import BigEarthNetManifestDataset, load_manifest
from ml.adaptation.model import build_model
from ml.adaptation.smoke import create_smoke_dataset
from ml.adaptation.splits import assign_splits
from ml.evaluation import multilabel_metrics


def seed_everything(seed: int) -> None:
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)
    if hasattr(torch.backends, "cudnn"):
        torch.backends.cudnn.benchmark = False
        torch.backends.cudnn.deterministic = True


def run_training(config: AdaptationConfig, *, run_kind: str = "adaptation") -> dict:
    try:
        import torch
        from torch.utils.data import DataLoader
    except ImportError as error:
        raise RuntimeError("Install ml/adaptation/requirements.txt to run adaptation training") from error

    seed_everything(config.training.seed)
    _verify_torch_numpy_bridge(torch)
    output_dir = Path(config.training.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "training-config.json").write_text(json.dumps(config.to_dict(), indent=2), encoding="utf-8")
    records = load_manifest(config.dataset.manifest_path)
    train_records, validation_records = assign_splits(records, config.dataset.validation_fraction, config.training.seed)
    dataset_args = (config.dataset.labels, config.dataset.image_size, config.dataset.normalization_mean, config.dataset.normalization_std)
    train_set = BigEarthNetManifestDataset(train_records, *dataset_args)
    validation_set = BigEarthNetManifestDataset(validation_records, *dataset_args)
    generator = torch.Generator().manual_seed(config.training.seed)
    train_loader = DataLoader(train_set, batch_size=config.training.batch_size, shuffle=True, num_workers=config.training.num_workers, generator=generator, worker_init_fn=_seed_worker)
    validation_loader = DataLoader(validation_set, batch_size=config.training.batch_size, shuffle=False, num_workers=config.training.num_workers)
    device = _resolve_device(config.training.device)
    model = build_model(config.model.in_channels, len(config.dataset.labels), config.model.feature_channels, config.model.freeze_backbone).to(device)
    if config.model.initial_checkpoint:
        model.load_state_dict(torch.load(config.model.initial_checkpoint, map_location=device)["model_state"], strict=False)
    optimizer = torch.optim.AdamW((parameter for parameter in model.parameters() if parameter.requires_grad), lr=config.training.learning_rate)
    loss_fn = torch.nn.BCEWithLogitsLoss()
    start_epoch, best_map = _resume_if_requested(
        config.training.resume_checkpoint, model, optimizer, device, generator
    )
    history = []
    for epoch in range(start_epoch, config.training.epochs):
        model.train()
        losses = []
        for inputs, targets in train_loader:
            optimizer.zero_grad()
            loss = loss_fn(model(inputs.to(device)), targets.to(device))
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach().cpu()))
        metrics = _evaluate(model, validation_loader, device)
        entry = {"epoch": epoch + 1, "train_loss": float(np.mean(losses)), **metrics}
        history.append(entry)
        if metrics["mean_average_precision"] > best_map:
            best_map = metrics["mean_average_precision"]
            torch.save(_checkpoint_state(model, optimizer, epoch, best_map, config, generator), output_dir / "best.pt")
        torch.save(_checkpoint_state(model, optimizer, epoch, best_map, config, generator), output_dir / "last.pt")
    metadata = {
        "status": "completed",
        "run_kind": run_kind,
        "completed_at": datetime.now(UTC).isoformat(),
        "model_version": config.model.version,
        "torch_version": torch.__version__,
        "device": str(device),
        "manifest_sha256": sha256(Path(config.dataset.manifest_path).read_bytes()).hexdigest(),
        "configuration": config.to_dict(),
        "train_samples": len(train_set),
        "validation_samples": len(validation_set),
        "history": history,
        "best_mean_average_precision": best_map,
    }
    (output_dir / "training-metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def _resolve_device(requested: str):
    import torch

    return torch.device("cuda" if requested == "auto" and torch.cuda.is_available() else requested if requested != "auto" else "cpu")


def _verify_torch_numpy_bridge(torch) -> None:
    try:
        torch.from_numpy(np.zeros(1, dtype=np.float32))
    except RuntimeError as error:
        raise RuntimeError(
            "PyTorch cannot use the installed NumPy binary; install ml/adaptation/requirements.txt in a clean environment"
        ) from error


def _resume_if_requested(path: str | None, model, optimizer, device, generator) -> tuple[int, float]:
    if not path:
        return 0, float("-inf")
    import torch

    state = torch.load(path, map_location=device)
    model.load_state_dict(state["model_state"])
    optimizer.load_state_dict(state["optimizer_state"])
    _restore_rng_state(state.get("rng_state"))
    if "train_generator_state" in state:
        generator.set_state(state["train_generator_state"])
    return int(state["epoch"]) + 1, float(state.get("best_mean_average_precision", float("-inf")))


def _checkpoint_state(model, optimizer, epoch: int, best_map: float, config: AdaptationConfig, generator=None) -> dict:
    import torch

    return {
        "epoch": epoch,
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "best_mean_average_precision": best_map,
        "model_version": config.model.version,
        "configuration": config.to_dict(),
        "rng_state": {"python": random.getstate(), "numpy": np.random.get_state(), "torch": torch.get_rng_state()},
        "train_generator_state": generator.get_state() if generator is not None else None,
        "cuda_rng_state": torch.cuda.get_rng_state_all() if torch.cuda.is_available() else None,
    }


def _restore_rng_state(state: dict | None) -> None:
    if not state:
        return
    import torch

    random.setstate(state["python"])
    np.random.set_state(state["numpy"])
    torch.set_rng_state(state["torch"])
    if state.get("cuda_rng_state") is not None and torch.cuda.is_available():
        torch.cuda.set_rng_state_all(state["cuda_rng_state"])


def _seed_worker(worker_id: int) -> None:
    import torch

    worker_seed = torch.initial_seed() % 2**32
    random.seed(worker_seed)
    np.random.seed(worker_seed)


def _evaluate(model, loader, device) -> dict[str, float]:
    import torch

    model.eval()
    logits, targets = [], []
    with torch.no_grad():
        for inputs, expected in loader:
            logits.append(model(inputs.to(device)).cpu().numpy())
            targets.append(expected.numpy())
    return multilabel_metrics(np.concatenate(logits), np.concatenate(targets))


def main() -> None:
    parser = argparse.ArgumentParser(description="Run reproducible remote-sensing adaptation")
    parser.add_argument("--config", required=True)
    parser.add_argument("--smoke-data", action="store_true", help="Generate deterministic synthetic samples at the configured manifest path")
    args = parser.parse_args()
    config = load_config(args.config)
    if args.smoke_data:
        manifest = create_smoke_dataset(Path(config.dataset.manifest_path).parent, config.training.seed)
        config = replace(config, dataset=replace(config.dataset, manifest_path=str(manifest)))
    print(json.dumps(run_training(config, run_kind="smoke" if args.smoke_data else "adaptation"), indent=2))


if __name__ == "__main__":
    main()
