# Initial Remote-Sensing Workflows

## VQA and text-guided grounding

Both initial single-image capabilities use [GeoChat](https://github.com/mbzuai-oryx/GeoChat), the `MBZUAI/geochat-7B` remote-sensing VLM checkpoint. GeoChat is trained for remote-sensing image and region understanding, including VQA and referring-object detection; SAATRAAI does not describe it as a general-purpose VLM. The upstream repository does not declare a repository license, and the checkpoint is built on LLaVA/Vicuna components with their own terms, so legal review and acceptance of all upstream weight terms are required before deployment.

The implementation deliberately does not download weights at request time. Obtain the compatible [GeoChat-7B checkpoint](https://huggingface.co/MBZUAI/geochat-7B), set `GEOCHAT_MODEL_PATH`, and install the upstream GeoChat runtime. `GEOCHAT_MODEL_BASE`, `GEOCHAT_DEVICE` (default `cuda`), and `GEOCHAT_MAX_NEW_TOKENS` are configurable. Production deployment should follow the upstream CUDA 11.8+, PyTorch, and FlashAttention requirements and size GPU memory for the full 7B model plus imagery workload. A CPU device may be used for smoke tests if the upstream runtime and host memory permit it, but the 7B model is not a practical production CPU serving configuration.

## Preprocessing and outputs

GeoTIFF inputs are deterministically converted to RGB with a per-band 2nd-to-98th percentile stretch. One-band imagery is replicated to RGB; two-band imagery repeats the second channel. PNG and JPEG inputs are converted to RGB. This is display-oriented VLM preprocessing, not radiometric analysis; it should not be used for quantitative remote-sensing measurement.

VQA returns generated text without a confidence value because GeoChat text generation does not expose a calibrated confidence. Grounding asks GeoChat for a location, parses its documented 0-100 box convention, and returns pixel bounding boxes and optional orientation. GeoChat does not provide masks through this adapter. Every normalized result is stored as a JSON artifact through `ObjectStorage`, and the model name/version, parameters, inputs, timings, and artifact URI are persisted in `ModelRun` and evidence provenance.

## Limitations

The current workflows accept optical and multispectral imagery only. Multispectral band selection is deterministic but not sensor-aware. High-resolution images are reduced to a display RGB representation, so small targets and sensor-specific spectral signatures can be lost. A successful model response is neutral evidence, not a validated conclusion. Missing weights or runtime dependencies result in explicit `NOT_IMPLEMENTED` execution status and no fabricated result.
