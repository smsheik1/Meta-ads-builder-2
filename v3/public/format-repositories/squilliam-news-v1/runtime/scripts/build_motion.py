#!/usr/bin/env python3
"""Drive the fixed presenter pose track and real mouth rig from final WAV audio."""

from __future__ import annotations

import argparse
from array import array
import json
import math
from pathlib import Path
import sys
import wave


FPS = 30.0
FORMAT_ROOT = Path(__file__).resolve().parents[2]


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    position = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * fraction)))
    return ordered[position]


def read_envelope(audio_path: Path) -> tuple[list[float], float]:
    with wave.open(str(audio_path), "rb") as audio:
        channels = audio.getnchannels()
        sample_rate = audio.getframerate()
        frame_total = audio.getnframes()
        if audio.getsampwidth() != 2:
            raise ValueError("Expected 16-bit PCM WAV")
        samples = array("h")
        samples.frombytes(audio.readframes(frame_total))
    if sys.byteorder != "little":
        samples.byteswap()
    duration = frame_total / sample_rate
    frame_count = round(duration * FPS)
    half_window = max(1, int(sample_rate * 0.025))
    values: list[float] = []
    for frame in range(frame_count):
        center = int((frame / FPS) * sample_rate)
        first = max(0, center - half_window) * channels
        last = min(frame_total, center + half_window) * channels
        window = samples[first:last]
        if not window:
            values.append(0.0)
            continue
        mean_square = math.fsum((sample / 32768.0) ** 2 for sample in window) / len(window)
        values.append(math.sqrt(mean_square))
    floor = percentile(values, 0.18)
    ceiling = max(floor + 1e-5, percentile(values, 0.96))
    normalized = [max(0.0, min(1.0, (value - floor) / (ceiling - floor))) for value in values]
    smoothed: list[float] = []
    current = 0.0
    for value in normalized:
        current += (value - current) * (0.72 if value > current else 0.30)
        smoothed.append(round(current, 4))
    return smoothed, duration


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=FORMAT_ROOT / "assets/motion/presenter-motion-reference.json")
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.source.read_text(encoding="utf-8"))
    envelope, duration = read_envelope(args.audio)
    source_frames = source["frames"]
    last = len(source_frames) - 1
    cycle = last * 2
    frames: list[dict[str, object]] = []
    for index, mouth in enumerate(envelope):
        phase = index % cycle
        source_index = phase if phase <= last else cycle - phase
        frames.append({
            "t": round(index / FPS, 4),
            "mouth": mouth,
            "points": source_frames[source_index]["points"],
        })
    payload = {
        "fps": FPS,
        "duration": round(duration, 5),
        "frameCount": len(frames),
        "detections": len(frames),
        "sourceVideoFps": source.get("sourceVideoFps", FPS),
        "poseSource": "assets/motion/presenter-motion-reference.json (ping-pong retimed)",
        "frames": frames,
    }
    if payload["frameCount"] != 900 or payload["duration"] != 30.0:
        raise ValueError(f"Expected exactly 900 frames and 30 seconds, got {payload['frameCount']} / {payload['duration']}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({key: payload[key] for key in ("fps", "duration", "frameCount", "detections")}, indent=2))


if __name__ == "__main__":
    main()
