"""Optional local ASR helper. Setup downloads happen outside this program."""
import argparse
from dataclasses import asdict
import importlib.metadata
import json
import os
from pathlib import Path
import re
import socket
import sys
import tempfile


def check(requirements):
    missing = []
    versions = {}
    if sys.version_info[:2] != (3, 12):
        missing.append("Python 3.12 is required")
    for name, expected in re.findall(r"^([a-zA-Z0-9_-]+)==([^\s\\]+)", requirements.read_text(), re.M):
        try:
            actual = importlib.metadata.version(name)
            versions[name] = actual
            if actual != expected:
                missing.append(f"{name}=={expected} required; installed {actual}")
        except importlib.metadata.PackageNotFoundError:
            missing.append(f"{name}=={expected} missing")
    return {"ready": not missing, "missing": missing, "python": sys.version.split()[0], "versions": versions}


def atomic_json(output, data):
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=output.parent, prefix=".transcript-", delete=False) as handle:
        temporary = Path(handle.name)
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    try:
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--requirements", type=Path, required=True)
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--model", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--source-offset", type=float, default=0)
    args = parser.parse_args()
    readiness = check(args.requirements)
    if args.check:
        print(json.dumps(readiness))
        return
    if not readiness["ready"]:
        raise RuntimeError("setup-required: " + "; ".join(readiness["missing"]))
    if not all((args.audio, args.model, args.manifest, args.output)):
        parser.error("audio, model, manifest, and output are required for transcription")
    manifest = json.loads(args.manifest.read_text())
    if any(not (args.model / item["name"]).is_file() for item in manifest["files"]):
        raise RuntimeError("setup-required: model files missing")

    # This helper is always offline, including library fallback paths.
    os.environ.update(HF_HUB_OFFLINE="1", HF_HUB_DISABLE_IMPLICIT_TOKEN="1", HF_HUB_DISABLE_TELEMETRY="1")

    def offline(*_args, **_kwargs):
        raise RuntimeError("Transcription attempted network access; run explicit setup instead")

    socket.socket.connect = offline
    socket.create_connection = offline
    from faster_whisper import WhisperModel

    model = WhisperModel(str(args.model), device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
    settings = dict(language="en", beam_size=5, word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    segments, info = model.transcribe(str(args.audio), **settings)
    segments = [asdict(segment) for segment in segments]
    if not any(segment["text"].strip() for segment in segments):
        raise RuntimeError("No words detected; the agent must inspect the source before drafting")
    atomic_json(args.output, {
        "schemaVersion": 1,
        "engine": {"name": "faster-whisper", "version": readiness["versions"]["faster-whisper"], "model": manifest["repository"], "revision": manifest["revision"], "device": "cpu", "computeType": "int8", "cpuThreads": 4, "settings": settings},
        "durationSeconds": info.duration,
        "sourceAudioStartSeconds": args.source_offset,
        "timestampBasis": "Seconds from the first decoded audio sample; add sourceAudioStartSeconds to locate it in the source container.",
        "uncertain": True,
        "evidenceLimitations": ["Words and timestamps are proposals, not approved facts.", "No diarization or Dog/Bunny assignment was performed.", "Overlapping speech, named vocalizations, and elongated words need source review."],
        "segments": segments,
    })
    print(json.dumps({"ok": True, "segments": len(segments), "uncertain": True}))


if __name__ == "__main__":
    main()
