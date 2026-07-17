#!/usr/bin/env python3
"""Compare zero-GPU treatments for a movable image slot.

This spike deliberately uses only saved local assets plus OpenCV/Pillow. It does
not call SAM, RevealLayer, an image generator, or any hosted model.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


SUBJECT_BOX = (255, 235, 209, 216)
MOVED_BOX = (35, 250, 209, 216)


def cover_crop(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_width, target_height = size
    scale = max(target_width / image.width, target_height / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - target_width) // 2
    top = (resized.height - target_height) // 2
    return resized.crop((left, top, left + target_width, top + target_height))


def circular_slot(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    width, height = size
    slot = cover_crop(image.convert("RGB"), size).convert("RGBA")
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse((3, 3, width - 4, height - 4), fill=255)
    slot.putalpha(mask)
    ImageDraw.Draw(slot).ellipse(
        (2, 2, width - 3, height - 3),
        outline="#ef2b22",
        width=4,
    )
    return slot


def paste_slot(canvas: Image.Image, slot: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    result = canvas.convert("RGBA")
    x, y, width, height = box
    resized = slot.resize((width, height), Image.Resampling.LANCZOS)
    result.alpha_composite(resized, (x, y))
    return result.convert("RGB")


def subject_mask(alpha_source: Image.Image, canvas_size: tuple[int, int]) -> np.ndarray:
    x, y, width, height = SUBJECT_BOX
    alpha = alpha_source.convert("RGBA").getchannel("A").resize((width, height), Image.Resampling.LANCZOS)
    mask = np.zeros((canvas_size[1], canvas_size[0]), dtype=np.uint8)
    mask[y : y + height, x : x + width] = np.asarray(alpha)
    return cv2.dilate(mask, np.ones((7, 7), dtype=np.uint8), iterations=1)


def gradient_fill(source_bgr: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Fit a cheap color plane to nearby pixels and paint only the removed slot."""
    ring = cv2.subtract(
        cv2.dilate(mask, np.ones((61, 61), dtype=np.uint8), iterations=1),
        cv2.dilate(mask, np.ones((9, 9), dtype=np.uint8), iterations=1),
    )
    ys, xs = np.where(ring > 0)
    if len(xs) < 20:
        raise RuntimeError("Not enough nearby pixels to estimate a background fill")
    sample_step = max(1, len(xs) // 8_000)
    xs = xs[::sample_step]
    ys = ys[::sample_step]
    image_height, image_width = mask.shape
    normalized_x = (xs - image_width / 2) / image_width
    normalized_y = (ys - image_height / 2) / image_height
    design = np.column_stack((np.ones_like(normalized_x), normalized_x, normalized_y, normalized_x * normalized_y))
    result = source_bgr.copy().astype(np.float64)
    target_y, target_x = np.where(mask > 0)
    target_normalized_x = (target_x - image_width / 2) / image_width
    target_normalized_y = (target_y - image_height / 2) / image_height
    target_design = np.column_stack((
        np.ones_like(target_normalized_x),
        target_normalized_x,
        target_normalized_y,
        target_normalized_x * target_normalized_y,
    ))
    for channel in range(3):
        coefficients, *_ = np.linalg.lstsq(design, source_bgr[ys, xs, channel], rcond=None)
        result[target_y, target_x, channel] = (
            coefficients[0]
            + target_normalized_x * coefficients[1]
            + target_normalized_y * coefficients[2]
            + target_normalized_x * target_normalized_y * coefficients[3]
        )
    result = np.clip(result, 0, 255).astype(np.uint8)
    softened = cv2.GaussianBlur(result, (0, 0), sigmaX=2.0)
    feather = cv2.GaussianBlur(mask, (0, 0), sigmaX=2.0).astype(np.float32) / 255.0
    return (
        result.astype(np.float32) * (1 - feather[..., None])
        + softened.astype(np.float32) * feather[..., None]
    ).astype(np.uint8)


def labeled_board(images: list[tuple[str, str, Image.Image]]) -> Image.Image:
    card_width = 500
    card_height = 1_180
    gap = 24
    board = Image.new("RGB", (gap + len(images) * (card_width + gap), card_height + gap * 2), "#eee9df")
    draw = ImageDraw.Draw(board)
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 25)
        body_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
    for index, (title, detail, image) in enumerate(images):
        left = gap + index * (card_width + gap)
        draw.rounded_rectangle((left, gap, left + card_width, gap + card_height), 24, fill="white", outline="#d8d2c8", width=2)
        draw.text((left + 20, gap + 18), title, fill="#171717", font=title_font)
        draw.multiline_text((left + 20, gap + 55), detail, fill="#555555", font=body_font, spacing=4)
        preview = image.resize((464, 1024), Image.Resampling.LANCZOS)
        board.paste(preview, (left + 18, gap + 132))
    return board


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--subject-alpha", type=Path, required=True)
    parser.add_argument("--replacement", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    reference = Image.open(args.reference).convert("RGB")
    subject_alpha = Image.open(args.subject_alpha).convert("RGBA")
    replacement = Image.open(args.replacement).convert("RGB")
    slot = circular_slot(replacement, SUBJECT_BOX[2:])
    mask = subject_mask(subject_alpha, reference.size)
    source_bgr = cv2.cvtColor(np.asarray(reference), cv2.COLOR_RGB2BGR)

    in_place = paste_slot(reference, slot, SUBJECT_BOX)
    gradient_background = gradient_fill(source_bgr, mask)
    gradient_moved = paste_slot(
        Image.fromarray(cv2.cvtColor(gradient_background, cv2.COLOR_BGR2RGB)),
        slot,
        MOVED_BOX,
    )
    telea_background = cv2.inpaint(source_bgr, mask, 5, cv2.INPAINT_TELEA)
    telea_moved = paste_slot(
        Image.fromarray(cv2.cvtColor(telea_background, cv2.COLOR_BGR2RGB)),
        slot,
        MOVED_BOX,
    )

    outputs = {
        "01-reference.png": reference,
        "02-replace-in-place.png": in_place,
        "03-gradient-fill-moved.png": gradient_moved,
        "04-opencv-telea-moved.png": telea_moved,
        "source-story-setting.png": reference.crop((0, 112, 464, 540)),
        "source-subject-slot.png": reference.crop((255, 235, 464, 451)),
        "zero-gpu-gradient-background.png": Image.fromarray(cv2.cvtColor(gradient_background, cv2.COLOR_BGR2RGB)),
        "zero-gpu-telea-background.png": Image.fromarray(cv2.cvtColor(telea_background, cv2.COLOR_BGR2RGB)),
    }
    for file_name, output in outputs.items():
        output.save(args.output_dir / file_name, optimize=True)

    board = labeled_board([
        ("1. Original", "The flattened reference.", reference),
        ("2. Replace in place", "No repair. New media fully covers the old slot.", in_place),
        ("3. Move + sampled fill", "No model. A local color plane covers the old slot.", gradient_moved),
        ("4. Move + OpenCV", "No model. CPU Telea inpainting fills the old slot.", telea_moved),
    ])
    board.save(args.output_dir / "comparison.png", optimize=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
