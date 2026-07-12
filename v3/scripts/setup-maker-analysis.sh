#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
command -v uv >/dev/null || { echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; }
uv venv --clear .maker-analysis-venv
uv pip install --python .maker-analysis-venv/bin/python -r maker-analysis-requirements.txt
PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True .maker-analysis-venv/bin/python - <<'PY'
from paddleocr import PaddleOCR

PaddleOCR(
    engine="transformers",
    device="cpu",
    lang="en",
    ocr_version="PP-OCRv5",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
    return_word_box=False,
)
print("Maker PaddleOCR is installed and prewarmed.")
PY
