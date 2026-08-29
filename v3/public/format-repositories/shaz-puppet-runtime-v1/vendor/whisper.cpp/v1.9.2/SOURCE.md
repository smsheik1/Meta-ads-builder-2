# Local transcription source

This directory contains the exact inputs used to build and run local speech transcription.

- Engine: `whisper.cpp` 1.9.2, tag `v1.9.2`, commit `306c88f4d1286aec1bf96e544632897886af5501`
- Source archive: `https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.9.2.tar.gz`
- Model: `ggml-base.en-q5_1.bin`, converted English Whisper base weights
- Model repository commit: `5359861c739e955e79d9a303bcbc70fb988958b1`
- Model source: `https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.en-q5_1.bin`
- Engine license: MIT, reproduced in `LICENSE-WHISPER.CPP`
- Original OpenAI Whisper license: MIT, reproduced in `LICENSE-OPENAI-WHISPER`

The package contains no downloaded native executable. On Apple Silicon, the runtime verifies the source archive, model, and build plan, then compiles a 2–3 MB helper with Apple Clang and Accelerate. This avoids asking the operator to bypass Gatekeeper for an unsigned downloaded program. The compiled helper is cached locally and is not included in the Format ZIP.

Audio is converted locally to mono 16 kHz PCM before transcription. The helper runs with English `base.en` weights, word splitting, fixed greedy decoding, and full JSON output. No audio, transcript, or model request leaves the machine.
