# Remote-Sensing Adaptation Pipeline

## Status

**Implemented pipeline:** reproducible multi-label land-cover adaptation using BigEarthNet v2-style Sentinel-2 manifests, deterministic preprocessing, training/validation handling, checkpoint/resume, and metric/metadata output.

**Completed experiments:** none. This repository contains no BigEarthNet data, model weights, or completed training metadata. Installing dependencies or running the smoke workflow is not evidence of a completed BigEarthNet fine-tuning experiment.

**Planned experiments:** select a remote-sensing pretrained initialization, establish a BigEarthNet v2 baseline, compare frozen and unfrozen backbones, and register only evaluated checkpoints in the model registry.

## Dataset and manifest

[BigEarthNet v2](https://bigearth.net/) is the default target because it provides Sentinel-2 data, an official split field, and multi-label CLC2018 land-cover labels. It is licensed under CDLA-Permissive-1.0. Download it separately; the S2 archive is approximately 59 GiB and must not be committed to Git.

The loader expects JSON Lines. Each record has `id`, `labels`, and optional `split` (`train`, `validation`, or `test`), plus either an `image` path to a channel-first/last `.npy` array or ordered `band_paths` to single-band GeoTIFFs. Use official BigEarthNet v2 metadata split values when available. Records with `test` are never used during fitting. Without a split, a SHA-256 hash of seed and sample ID creates a stable validation assignment.

```json
{"id":"S2_patch", "band_paths":["..._B02.tif", "..._B03.tif", "..._B04.tif"], "labels":["Arable land"], "split":"train"}
```

## Setup and smoke run

```powershell
python -m pip install -r ml/adaptation/requirements.txt
python -m ml.adaptation.train --config ml/adaptation/config/smoke.yaml --smoke-data
```

`--smoke-data` creates twelve deterministic synthetic `.npy` samples beside the configured manifest. It validates the pipeline on CPU but is not remote-sensing training data or a training experiment.

Use a dedicated environment for adaptation. The requirements intentionally constrain NumPy to the 1.x ABI used by the supported PyTorch wheels; the runner stops with an explicit environment error if PyTorch cannot interoperate with NumPy.

## Full run and resume

Create a manifest for the downloaded dataset, set its class list, channel count, band normalization, output directory, and optional initialization checkpoint in `ml/adaptation/config/bigearthnet_s2.yaml`, then run:

```powershell
python -m ml.adaptation.train --config ml/adaptation/config/bigearthnet_s2.yaml
```

For resume, set `training.resume_checkpoint` to the previous `last.pt` in a copied configuration and increase `training.epochs`, then run that copied configuration. The checkpoint restores model/optimizer state, the shuffled DataLoader generator, and Python, NumPy, PyTorch, and CUDA RNG state. Each run writes `training-config.json`, `last.pt`, `best.pt`, and `training-metadata.json` to its output directory. The metadata records the run kind, model version/configuration, manifest SHA-256, sample counts, epoch history, and validation micro-F1, macro-F1, and mean average precision.

## Preprocessing and metrics

Images are loaded as channel-first tensors, resized bilinearly to configured dimensions, and normalized with configured per-band mean/std. This pipeline does not invent sensor normalization constants: calculate and document them for the selected band set before a full experiment. Multi-label BCE-with-logits is optimized; micro-F1, macro-F1, and mAP are reported because BigEarthNet labels are multi-label and imbalanced.
