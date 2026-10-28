# Initial Remote-Sensing Workflows

## VQA and text-guided grounding

Both initial single-image capabilities use [GeoChat](https://github.com/mbzuai-oryx/GeoChat), the `MBZUAI/geochat-7B` remote-sensing VLM checkpoint. GeoChat is trained for remote-sensing image and region understanding, including VQA and referring-object detection; SAATRAAI does not describe it as a general-purpose VLM. The upstream repository does not declare a repository license, and the checkpoint is built on LLaVA/Vicuna components with their own terms, so legal review and acceptance of all upstream weight terms are required before deployment.

The implementation deliberately does not download weights at request time. Obtain the compatible [GeoChat-7B checkpoint](https://huggingface.co/MBZUAI/geochat-7B), set `GEOCHAT_MODEL_PATH`, and install the upstream GeoChat runtime. `GEOCHAT_MODEL_BASE`, `GEOCHAT_DEVICE` (default `cuda`), and `GEOCHAT_MAX_NEW_TOKENS` are configurable. Production deployment should follow the upstream CUDA 11.8+, PyTorch, and FlashAttention requirements and size GPU memory for the full 7B model plus imagery workload. A CPU device may be used for smoke tests if the upstream runtime and host memory permit it, but the 7B model is not a practical production CPU serving configuration.

## Preprocessing and outputs

GeoTIFF inputs are deterministically converted to RGB with a per-band 2nd-to-98th percentile stretch. One-band imagery is replicated to RGB; two-band imagery repeats the second channel. PNG and JPEG inputs are converted to RGB. This is display-oriented VLM preprocessing, not radiometric analysis; it should not be used for quantitative remote-sensing measurement.

VQA returns generated text without a confidence value because GeoChat text generation does not expose a calibrated confidence. Grounding asks GeoChat for a location, parses its documented 0-100 box convention, and returns pixel bounding boxes and optional orientation. GeoChat does not provide masks through this adapter. Every normalized result is stored as a JSON artifact through `ObjectStorage`, and the model name/version, parameters, inputs, timings, and artifact URI are persisted in `ModelRun` and evidence provenance.

## Limitations

The current workflows accept optical and multispectral imagery only. Multispectral band selection is deterministic but not sensor-aware. High-resolution images are reduced to a display RGB representation, so small targets and sensor-specific spectral signatures can be lost. A successful model response is neutral evidence, not a validated conclusion. Missing weights or runtime dependencies result in explicit `NOT_IMPLEMENTED` execution status and no fabricated result.

## Bi-temporal evidence preflight (first executable temporal slice)

`bi-temporal-evidence-preflight` is a deterministic tool registered in the existing `CHANGE_DETECTION` task slot. It runs on the actual uploaded rasters resolved by the API storage layer and records image IDs, stored input checksums, acquisition timestamps, declared sensor tag, CRS, bounds, dimensions, band descriptions/types, valid-data pixel counts, common valid-pixel overlap, and temporal separation in a normalized JSON artifact. Execution is persisted through the existing task/model-run/evidence records. The protected evidence response carries the typed preflight payload in provenance. The tool reports `INSUFFICIENT_EVIDENCE` and the execution trace remains failed because it does **not** calculate image change or answer the requested change query.

Integration note: the execution response envelope and database schema are unchanged. The authenticated tool catalog now advertises `bi-temporal-evidence-preflight` for the `change_detection` task, and the normalized tool-output status adds `INSUFFICIENT_EVIDENCE`; the execution trace continues using the existing `failed` execution status. A client should show this as an inconclusive input preflight, not a completed change analysis.

The preflight requires matching pixel grids and CRS before reporting common valid-pixel overlap. It does not resample. It treats timestamps and sensor/band labels as file-declared metadata, not verified acquisition records. Raster validity masks are not cloud/shadow masks. It does not establish radiometric calibration, atmospheric correction, matching processing levels, or semantic band equivalence. Its output is input QA/provenance only: no change magnitude, label, probability, confidence, or hazard conclusion is emitted. Missing/inconsistent metadata and missing common valid pixels are recorded as limitations; none trigger a substitute result.

### Runtime requirements and data status

- The preflight uses the API's existing Python environment and its pinned `rasterio==1.4.3` dependency; Rasterio installs NumPy as a dependency. No new runtime package, model weights, external provider, network access, GPU, or paid service is required.
- Setup uses the existing [API requirements](../apps/api/requirements.txt) and the repository's [local development guide](local-development.md); from the repository root, install with `python -m pip install -r apps/api/requirements.txt`, configure the documented API environment/database, then run `python -m unittest discover -s tests -v` from `apps/api` for the full suite.
- GeoTIFF is handled by Rasterio/GDAL. The project pins Rasterio but does not separately declare a GDAL system package; use the supported Rasterio wheel/environment documented by Rasterio for the target platform.
- The tests generate tiny in-memory-derived GeoTIFFs labelled by test filenames and test-only identifiers. These are synthetic software fixtures, not satellite observations, and are not stored as investigation results in production. They verify schema and provenance shape only; they do not validate scientific accuracy.
- No analysis dataset or weights are bundled for this workflow. The existing GeoChat route remains optional and requires separately obtained checkpoint/runtime; review upstream GeoChat, LLaVA, and Vicuna terms before use. The adaptation pipeline remains untrained and separately requires its optional requirements (including PyTorch); it is not used here.

### Enablement boundary

This is a provenance/quality preflight, not a production change-detection model. A true quantitative temporal analysis remains unavailable until an owned/licensed data source, calibrated input convention, sensor-aware alignment and cloud/shadow QA policy, and a reproducible evaluated algorithm/model are approved. Tests can run with the API's existing `unittest` command and require the configured isolated test database for the orchestration integration test.
