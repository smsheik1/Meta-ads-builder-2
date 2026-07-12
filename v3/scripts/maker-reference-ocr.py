#!/usr/bin/env python3
"""PaddleOCR geometry and deterministic reference composition for Maker analysis."""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from paddleocr import PaddleOCR


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n")


def prepare_reference(source_path: Path, output_path: Path) -> Image.Image:
    source = Image.open(source_path).convert("RGB")
    if max(source.size) > 1600:
        scale = 1600 / max(source.size)
        source = source.resize(
            (round(source.width * scale), round(source.height * scale)),
            Image.Resampling.LANCZOS,
        )
    source.save(output_path, format="JPEG", quality=90, optimize=True)
    return source


def estimate_text_color(image: np.ndarray, polygon: np.ndarray) -> str:
    mask = np.zeros(image.shape[:2], dtype=np.uint8)
    cv2.fillPoly(mask, [polygon], 255)
    ring = cv2.dilate(mask, np.ones((7, 7), dtype=np.uint8), iterations=1)
    ring = cv2.subtract(ring, mask)
    background_pixels = image[ring > 0]
    if len(background_pixels) == 0:
        background_pixels = image[mask > 0]
    background = np.median(background_pixels, axis=0) if len(background_pixels) else np.array([255, 255, 255])
    foreground = image[mask > 0]
    if len(foreground) == 0:
        return "#111111"
    distances = np.linalg.norm(foreground.astype(float) - background.astype(float), axis=1)
    cutoff = np.quantile(distances, 0.72)
    candidates = foreground[distances >= cutoff]
    color_bgr = np.median(candidates if len(candidates) else foreground, axis=0).astype(int)
    blue, green, red = color_bgr.tolist()
    return f"#{red:02x}{green:02x}{blue:02x}"


def run_ocr(input_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    reference_path = output_dir / "reference.jpg"
    reference = prepare_reference(input_path, reference_path)
    vision = reference
    if max(reference.size) > 1024:
        scale = 1024 / max(reference.size)
        vision = reference.resize(
            (round(reference.width * scale), round(reference.height * scale)),
            Image.Resampling.LANCZOS,
        )
    vision.save(output_dir / "vision.jpg", format="JPEG", quality=86, optimize=True)
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    initialized_at = time.perf_counter()
    pipeline = PaddleOCR(
        engine="transformers",
        device="cpu",
        lang="en",
        ocr_version="PP-OCRv5",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        return_word_box=False,
    )
    initialization_seconds = time.perf_counter() - initialized_at
    started = time.perf_counter()
    results = list(pipeline.predict(str(reference_path)))
    prediction_seconds = time.perf_counter() - started
    if len(results) != 1:
        raise RuntimeError(f"Expected one OCR result, received {len(results)}")
    result = results[0].json
    if not isinstance(result, dict):
        result = json.loads(result)
    payload = result["res"]
    image = cv2.imread(str(reference_path), cv2.IMREAD_COLOR)
    texts = []
    for index, (text, score, raw_polygon) in enumerate(
        zip(payload["rec_texts"], payload["rec_scores"], payload["rec_polys"]),
        start=1,
    ):
        if not str(text).strip():
            continue
        polygon = np.asarray(raw_polygon, dtype=np.int32)
        texts.append(
            {
                "id": f"text_{index:02d}",
                "text": str(text),
                "confidence": round(float(score), 4),
                "polygon": [[int(x), int(y)] for x, y in polygon.tolist()],
                "textColor": estimate_text_color(image, polygon),
            }
        )
    write_json(
        output_dir / "ocr.json",
        {
            "width": reference.width,
            "height": reference.height,
            "texts": texts,
            "timing": {
                "initializationSeconds": round(initialization_seconds, 3),
                "predictionSeconds": round(prediction_seconds, 3),
            },
        },
    )


def full_sam_mask(result: dict, index: int, width: int, height: int) -> np.ndarray:
    cropped = np.asarray(result["masks"][index], dtype=np.uint8) * 255
    offset_x, offset_y = result["masks_offset"][index]
    full = np.zeros((height, width), dtype=np.uint8)
    y2 = min(height, int(offset_y) + cropped.shape[0])
    x2 = min(width, int(offset_x) + cropped.shape[1])
    full[int(offset_y):y2, int(offset_x):x2] = cropped[: y2 - int(offset_y), : x2 - int(offset_x)]
    return full


def compose_reference(
    reference_path: Path,
    ocr_path: Path,
    claims_path: Path,
    sam_path: Path,
    output_dir: Path,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    ocr = json.loads(ocr_path.read_text())
    claims = json.loads(claims_path.read_text())
    sam_payload = json.loads(sam_path.read_text())
    source = cv2.imread(str(reference_path), cv2.IMREAD_COLOR)
    if source is None:
        raise RuntimeError("Normalized reference could not be read")
    height, width = source.shape[:2]
    removal_mask = np.zeros((height, width), dtype=np.uint8)
    evidence_by_id = {item["id"]: item for item in ocr["texts"]}
    for evidence_id in claims["editableTextEvidenceIds"]:
        evidence = evidence_by_id.get(evidence_id)
        if evidence is None:
            raise RuntimeError(f"Missing OCR geometry for {evidence_id}")
        polygon = np.asarray(evidence["polygon"], dtype=np.int32)
        cv2.fillPoly(removal_mask, [polygon], 255)
    removal_mask = cv2.dilate(removal_mask, np.ones((5, 5), dtype=np.uint8), iterations=1)

    artifacts = []
    warnings = []
    for entry in sam_payload:
        asset_id = entry["assetId"]
        result = entry["result"]
        scores = [float(score) for score in result.get("scores", [])]
        if not scores:
            warnings.append(f"SAM 3 found no candidate for {asset_id}; it remains in the locked background.")
            continue
        selected_index = max(range(len(scores)), key=lambda index: scores[index])
        confidence = scores[selected_index]
        if confidence < 0.5:
            warnings.append(f"SAM 3 confidence for {asset_id} was {confidence:.2f}; it remains in the locked background.")
            continue
        mask = full_sam_mask(result, selected_index, width, height)
        points = cv2.findNonZero(mask)
        if points is None:
            warnings.append(f"SAM 3 returned an empty mask for {asset_id}; it remains in the locked background.")
            continue
        x, y, asset_width, asset_height = cv2.boundingRect(points)
        rgba = cv2.cvtColor(source, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = mask
        crop = rgba[y : y + asset_height, x : x + asset_width]
        file_name = f"asset-{asset_id}.png"
        cv2.imwrite(str(output_dir / file_name), crop)
        removal_mask = cv2.bitwise_or(
            removal_mask,
            cv2.dilate(mask, np.ones((5, 5), dtype=np.uint8), iterations=1),
        )
        artifacts.append(
            {
                "assetId": asset_id,
                "fileName": file_name,
                "x": x,
                "y": y,
                "width": asset_width,
                "height": asset_height,
            }
        )

    background = cv2.inpaint(source, removal_mask, 3, cv2.INPAINT_TELEA)
    cv2.imwrite(str(output_dir / "background.jpg"), background, [cv2.IMWRITE_JPEG_QUALITY, 90])
    write_json(output_dir / "composition.json", {"assets": artifacts, "warnings": warnings})


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    ocr_parser = subparsers.add_parser("ocr")
    ocr_parser.add_argument("input", type=Path)
    ocr_parser.add_argument("output_dir", type=Path)
    compose_parser = subparsers.add_parser("compose")
    compose_parser.add_argument("reference", type=Path)
    compose_parser.add_argument("ocr", type=Path)
    compose_parser.add_argument("claims", type=Path)
    compose_parser.add_argument("sam", type=Path)
    compose_parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    if args.command == "ocr":
        run_ocr(args.input, args.output_dir)
    else:
        compose_reference(args.reference, args.ocr, args.claims, args.sam, args.output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
