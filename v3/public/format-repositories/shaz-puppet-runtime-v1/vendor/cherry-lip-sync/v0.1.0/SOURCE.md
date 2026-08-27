# Cherry Lip Sync v0.1.0 WASI payload

This directory redistributes Cherry Lip Sync `v0.1.0` as a WebAssembly module for the Wiggly Shaz Puppet Runtime. The package does **not** include or invoke the unsigned native macOS executable from the upstream release.

## Immutable upstream source

- Repository: <https://github.com/amberwhitehead/cherry-lip-sync>
- Tag: `v0.1.0`
- Commit: `ab3e68a8e2d38fc72d1672c450478dff7710bc14`
- Source archive: <https://github.com/amberwhitehead/cherry-lip-sync/archive/refs/tags/v0.1.0.tar.gz>
- Source archive SHA-256: `cf16c5bf5fdeed18a96240e74144287f80957c1c1461891eb74585ac3ab94bfc`
- Upstream `Cargo.toml` SHA-256 before the patch: `4054b2a5e2b702126e159d6df5dd1a5b51f60817d095e702a95057bb82d982ea`
- Upstream `Cargo.lock` SHA-256: `9d338e01f153f24d26f826ef5942ff48ae5ead3cd1d1b1a3ec2ceccb7259ed05`

The upstream project is offered under `MIT OR Apache-2.0`. `LICENSE-MIT`, `LICENSE-APACHE`, `NOTICE`, and the upstream README are preserved beside the module. The MIT license text in this package has one terminating POSIX newline added by the repository patching tool; its legal text is unchanged.

## Exact source change

Apply `patches/0001-make-non-runtime-dependencies-optional.patch` to the immutable source above. It changes only two direct dependency declarations in `Cargo.toml`:

1. `burn-import` becomes optional.
2. `test_bin` becomes optional.

Neither dependency is referenced by the `cherrylipsync` command-line target. Making them optional prevents unused native build dependencies from entering the `wasm32-wasip1` build. No Rust source, model, inference, audio-decoding, CLI, or cue-generation code was changed. `Cargo.lock` remains byte-identical to upstream.

## Reproduction

With Rust `1.97.1` and the `wasm32-wasip1` target installed:

```sh
git clone https://github.com/amberwhitehead/cherry-lip-sync.git
cd cherry-lip-sync
git checkout ab3e68a8e2d38fc72d1672c450478dff7710bc14
git apply /absolute/path/to/0001-make-non-runtime-dependencies-optional.patch
rustup target add wasm32-wasip1
cargo fetch --locked
cargo build --locked --offline --release --target wasm32-wasip1 --bin cherrylipsync
shasum -a 256 target/wasm32-wasip1/release/cherrylipsync.wasm
```

Expected module SHA-256:

```text
1bf5730acc7a81b1f0b6c818a9068001b9e9a797a7eb990ae091eb1b01603382
```

The build used `rustc 1.97.1 (8bab26f4f 2026-07-14)` and `cargo 1.97.1 (c980f4866 2026-06-30)` on `aarch64-apple-darwin`. The output target is platform-neutral `wasm32-wasip1`; Rust is not required to run the packaged module.

The MPL-2.0 dependencies are named in `NOTICE`. Their exact versions and source checksums are fixed by the upstream `Cargo.lock`; corresponding source archives are available from `https://crates.io/api/v1/crates/<crate>/<version>/download` (or the exact Git revision recorded by that lockfile). No dependency source file was modified for this WASI build.

## Parity receipt

The bundled `fixtures/hello.ogg` was processed with frame rate `24` and `--filter`. The WASI output, the upstream macOS arm64 v0.1.0 release output, and the previously accepted local proof output were byte-identical:

```text
96767d332d8630843e9c367f133950bcf3dd56e7e3ccb2dcb22b59eb4cfb5340  hello.filtered.fps24.tsv
```

The exact input, output, arguments, and checksums are machine-readable in `VENDOR-MANIFEST.json`.
