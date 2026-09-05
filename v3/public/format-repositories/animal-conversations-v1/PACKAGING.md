# Release packaging

Packaging creates a local candidate archive. It does **not** publish the website, certify fresh-agent acceptance, approve an episode, or claim perceptual review.

## Exact public selection

`release-files.json` is the publishable-file allowlist: individual paths only, no wildcards or recursive folder inclusion. New runtime modules, tests, contracts, or adapters must be added deliberately. A listed missing file fails the build.

The two existing distributable example MP4s are additionally pinned by SHA-256. Changing one requires an explicit reviewed provenance/hash update; an arbitrary replacement cannot inherit permission from its filename. Raw episode audio/video is never implicitly included.

The builder rejects symlinks (including selected parent folders), path traversal, case-colliding duplicates, credential files, private/run directories, environments, caches, model weights, and generated build/download folders. Those exclusions still apply if someone adds such a path to the allowlist. Model **metadata and dependency locks** ship; model **weights and environments** do not.

The converter's source, fixtures, and tests are selected explicitly so its optional release profile remains runnable. Ordinary runtime tests do not require Cargo or Python. Unused generated converter proof artifacts are not included.

## Candidate build

Prerequisites for packaging only: Node, `zip`, and `unzip`. No provider, transcription model, Python installation, or Cargo execution is needed to build the archive itself.

After integration and acceptance prerequisites are ready:

```sh
node build-kit.mjs
```

To keep a release candidate separate from the stable local download directory:

```sh
node build-kit.mjs --output=/absolute/path/to/candidate-output
```

All five version declarations must agree: `KIT-MANIFEST.json`, `format.json`, `package.json`, and the package-lock's top-level and root-package versions. This builder never edits versions.

The build:

1. Takes an exclusive local build lock and snapshots only allowlisted regular files.
2. Writes `RELEASE-CONTENTS.json` containing their paths, sizes, and SHA-256 values. Staged file timestamps use the ZIP-safe 1980-01-01 UTC epoch; modes are 0644 except explicit shell scripts at 0755. Source files are unchanged.
3. Creates a versioned ZIP with exact file arguments, then extracts it to verify entry names and every file's checksum.
4. Saves `<kit>-<version>.zip`, its `.sha256`, and `<kit>-<version>.release.json`.
5. Refreshes `<kit>.zip`, its `.sha256`, and `latest-release.json` only from that verified version.

A repeat build of unchanged content verifies/reuses the existing version. Fresh builds also use stable entry ordering, normalized metadata, and `TZ=UTC` for the ZIP process, so the same ZIP toolchain produces matching bytes despite changed source mtimes or output folders. This is not a cross-platform media-encoding identity claim. Changed or corrupted content under the same version is rejected; the previous archive remains intact. A partial prior publication or stale build lock requires inspection, not an automatic completion claim. Versioned archives are not overwritten.

Release receipts explicitly say `acceptanceStatus: "not-certified-by-packaging"` and `publication: "local-only"`. Fresh-install, fresh-agent, actual media review, verified episode export, and supported-platform acceptance are separate gates. Website publication is separate.

## Tests

The default packaging tests use only Node built-ins and temporary synthetic fixtures:

```sh
node --test runtime/tests/packaging.test.mjs
```

The explicit archive profile additionally requires `zip` and `unzip`, builds **only temporary synthetic test packages**, and checks real ZIP contents, sidecar checksums, the stable alias, idempotence, matching fresh-build bytes after source timestamp changes, and rejection of same-version changes:

```sh
WIGGLY_TEST_ARCHIVE=1 node --test runtime/tests/packaging.test.mjs
```

Before release, build the actual candidate, extract it to a fresh directory, and run its default tests, doctor-before-install check, and documented end-to-end profiles. Do not confuse a source-tree test pass or the synthetic archive tests with that acceptance.
