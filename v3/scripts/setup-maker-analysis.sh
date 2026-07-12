#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
command -v uv >/dev/null || { echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; }
uv venv .maker-analysis-venv
uv pip install --python .maker-analysis-venv/bin/python -r maker-analysis-requirements.txt
.maker-analysis-venv/bin/python -c 'from paddleocr import PaddleOCR; print("Maker PaddleOCR is ready.")'
