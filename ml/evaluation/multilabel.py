from __future__ import annotations

import numpy as np


def multilabel_metrics(logits: np.ndarray, targets: np.ndarray, threshold: float = 0.5) -> dict[str, float]:
    """Thresholded F1 plus per-label average precision for imbalanced multi-label data."""
    probabilities = 1 / (1 + np.exp(-np.clip(logits, -50, 50)))
    predictions = probabilities >= threshold
    targets = targets.astype(bool)
    tp = np.logical_and(predictions, targets).sum()
    fp = np.logical_and(predictions, ~targets).sum()
    fn = np.logical_and(~predictions, targets).sum()
    micro_f1 = _f1(tp, fp, fn)
    per_label_f1 = [_f1(
        np.logical_and(predictions[:, index], targets[:, index]).sum(),
        np.logical_and(predictions[:, index], ~targets[:, index]).sum(),
        np.logical_and(~predictions[:, index], targets[:, index]).sum(),
    ) for index in range(targets.shape[1])]
    average_precisions = [_average_precision(probabilities[:, index], targets[:, index]) for index in range(targets.shape[1])]
    valid_ap = [value for value in average_precisions if not np.isnan(value)]
    return {
        "micro_f1": float(micro_f1),
        "macro_f1": float(np.mean(per_label_f1)),
        "mean_average_precision": float(np.mean(valid_ap)) if valid_ap else 0.0,
    }


def _f1(tp: int, fp: int, fn: int) -> float:
    denominator = 2 * tp + fp + fn
    return 0.0 if denominator == 0 else 2 * tp / denominator


def _average_precision(scores: np.ndarray, targets: np.ndarray) -> float:
    positives = int(targets.sum())
    if positives == 0:
        return float("nan")
    order = np.argsort(-scores, kind="stable")
    ordered = targets[order]
    precision = np.cumsum(ordered) / (np.arange(len(ordered)) + 1)
    return float(precision[ordered].sum() / positives)
