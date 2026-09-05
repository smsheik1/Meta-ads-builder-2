# Local transcription preflight

Status: **real macOS ARM64 inference passed; transcript quality requires agent correction and human approval. Linux/WSL execution is not yet proven.**

## What was actually tested

On macOS 26.6 ARM64, isolated Python **3.12.13** installed the complete hash-locked dependency set from public PyPI wheels. Nothing was installed globally. A pinned public model was downloaded only into ignored `tmp/asr-preflight/model/`; no user media, credentials, cookies, or paid services were sent to a provider.

- `faster-whisper==1.2.1`, `yt-dlp==2026.8.19`
- Important transitive pins: `ctranslate2==4.8.2`, `av==18.1.0`, `tokenizers==0.23.2`, `onnxruntime==1.29.0`, `numpy==2.5.2`, `huggingface-hub==1.30.0`
- The complete 24-package lock is `tmp/asr-preflight/requirements-macos-arm64.lock`. Independently resolving Python 3.12 Linux x64 produced an identical lock, SHA-256 `d5c3cdef3be6aa0c09db98f885d20294a68e859abea5923b2e0529fea37ac558`. Resolution is not Linux runtime acceptance.
- Install command used `uv pip sync --require-hashes --only-binary :all:` into a dedicated venv. The generated lock is also pip requirements syntax; production setup can use the venv's pip without adding uv as a user prerequisite.
- Import and actual inference support `device="cpu", compute_type="int8"` on this Mac. No dedicated GPU was used.

## Model pin and measured storage

Public repository: [Systran/faster-whisper-small.en](https://huggingface.co/Systran/faster-whisper-small.en/tree/d1d751a5f8271d482d14ca55d9e2deeebbae577f)

Revision: `d1d751a5f8271d482d14ca55d9e2deeebbae577f`.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| config.json | 2,657 | `666a9605530ac1f61fa8177f3702b4dacec9966749e42610839fcc32661d5fae` |
| model.bin | 483,545,366 | `62b2a45b05ee59acb4a5341b33ee35e041395d378d418a18acfe4c9e768ee37a` |
| tokenizer.json | 2,128,466 | `929c5252409436dce1b38a75d1abbcb5e132d170d8e324e4e04ed915fa2d22df` |
| vocabulary.txt | 422,309 | `ff77588746d3a2595d32ab5b69ffd7b95ce2441ac57533cb66fc3eb575a115cf` |

Total model download: **486,098,798 bytes** (~486 MB decimal). Measured local model directory: 464 MiB; isolated installed dependencies: 205 MiB, excluding downloader caches and the already-installed Python interpreter. `compute_type=int8` is inference quantization; it does not make the downloaded checkpoint an int8-sized download.

Commit the four file hashes and exact revision with the setup manifest. Setup stages each download, verifies size/hash, and only then publishes a complete model directory. Ordinary intake must check all expected local files before importing/constructing the model; a missing tokenizer can otherwise trigger an upstream fallback download. Instantiate by local model directory with `local_files_only=True`, not the mutable model nickname.

## Real inference evidence

The packaged `PROVENANCE.md` explicitly permits distribution of these existing soundtracked examples. Both original MP4s were read-only and retained their original SHA-256. The proof decoded **full-duration 44.1 kHz stereo PCM24 render audio** and then made a separate **16 kHz mono PCM16 ASR derivative**. It did not trim to video-frame duration or replace the render soundtrack with ASR audio.

`WhisperModel.transcribe` settings: English, word timestamps, beam size 5, `vad_filter=False`, `condition_on_previous_text=False`, CPU/int8, four CPU threads. Model load: **0.62 seconds**.

| Existing fixture | Decoded audio | ASR runtime | Result |
| --- | ---: | ---: | --- |
| i-made-a-mistake | 30.023401 s | 5.35 s | Completed, word timestamps from beginning through end; known emotional/overlap errors below. |
| we-listen-dont-judge | 31.137959 s | 5.95 s | Completed past the 30-second boundary; word timestamps extend to 30.96 s. |

Offline protection during these real executions: `HF_HUB_OFFLINE=1`, implicit-token/telemetry disabling, local model path, `local_files_only=True`, and Python socket connection methods replaced with a failing guard. Neither run attempted a guarded connection. This is application-level offline proof, not an OS packet trace. Source offset was zero; nonzero stream-offset acceptance is **not** proven by these fixtures.

Evidence remains in ignored `tmp/asr-preflight/`: `asr-proof.json`, `model-receipt.json`, both fixture `transcript.json` files, separate WAVs, scripts, venv, and complete platform locks. The production lock and model manifest should be copied into the package deliberately; no private proof media or model weights belong in a release archive.

## Quality findings that must stay visible

This setup is a useful drafting aid, **not an approved script, diarization system, or exact alignment guarantee**.

- On the known approved `i-made-a-mistake` performance, the model rendered the elongated “I'm traaaaash... Gaaaaarbage...” as “I've tried! It's garbage!”
- Around the same example's overlapping reassurance and emotional reaction, it emitted numerous repeated “no” tokens and did not identify the approved gasp/shriek as named events. A token transcript cannot approve simultaneous speakers or cast Dog/Bunny.
- The other example's transcript differs from the packaged approved captions in repetitions, wording, and final words. These are discrepancies for source playback, not proof the model or the historical caption is always correct.
- First and last word timestamps exist; their perceptual accuracy was not manually certified in this preflight. Existing approved example notes were used to identify known discrepancies, not a new claimed listening pass.

The agent must compare source playback, preserve uncertainty/nonverbal events/overlap in the proposed review, and obtain explicit approval. Low word confidence is useful evidence but does not identify every error or prove speaker identity.

## Setup and implementation details

1. Require an available Python 3.12 interpreter and create a kit-local venv. Do not install or repair global Python automatically.
2. Install a complete committed hash-locked requirements file with `--require-hashes --only-binary=:all:`. On supported targets verify wheel availability and required OS/glibc versions; fail with an actionable compatibility message rather than compiling dependencies unexpectedly.
3. Explicit setup downloads model files from the pinned revision and verifies **all four** hashes. Runtime cannot silently fetch missing weights or tokenizer files.
4. Use ordinary `WhisperModel.transcribe`, not `BatchedInferencePipeline`: the latter has different VAD/clip behavior and can reject >30-second audio with VAD disabled. Fully consume the returned segment generator; merely calling `transcribe()` is not a completed transcription.
5. The tested yt-dlp version accepts `--ignore-config --no-plugin-dirs --no-playlist --max-downloads 1 --no-cache-dir --no-cookies-from-browser --no-netrc`. Generated local output names and private metadata storage still belong in the intake wrapper. No live remote media retrieval was attempted here; supported accessible URLs and mocked failure classifications require wrapper tests. Blocked links must offer a user-supplied local file, not automatic cookie access.
6. yt-dlp may need additional site-specific tooling for some sources. Do not describe the two Python packages as a guarantee that every YouTube/Instagram/TikTok URL downloads.

Official references checked: [faster-whisper usage and lazy generator](https://github.com/SYSTRAN/faster-whisper#usage), [the actual transcription API](https://github.com/SYSTRAN/faster-whisper/blob/v1.2.1/faster_whisper/transcribe.py), [yt-dlp options](https://github.com/yt-dlp/yt-dlp#usage-and-options), [PyPI faster-whisper metadata](https://pypi.org/project/faster-whisper/1.2.1/), and [PyPI yt-dlp metadata](https://pypi.org/project/yt-dlp/2026.8.19/).

## Remaining acceptance, not claimed complete

- Fresh packaged setup and intake wrapper tests, including missing model files and media with nonzero source timestamps.
- Actual fresh-agent inference and video production on Linux x64 and WSL. This host has neither Docker nor Podman available; cross-platform dependency resolution alone is not execution.
- Source playback review and approved corrected dialogue through the integrated gate-driven episode path. The two transcription runs do not themselves count as episode approval, video review, or export acceptance.
