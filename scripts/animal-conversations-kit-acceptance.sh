#!/usr/bin/env bash
# CI-only platform mechanics/intake proof, NOT fresh-agent approval or playback acceptance.
set -euo pipefail

platform=${1:?Pass linux-x64 or wsl2-x64}
reports=${2:?Pass an empty report directory}
commit=${3:?Pass the checked-out commit SHA}
[[ ${GITHUB_ACTIONS:-} == true ]] || { echo 'Run only on an explicitly approved ephemeral GitHub Actions runner.' >&2; exit 2; }
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Actual Linux x64 execution is required.' >&2; exit 2; }
[[ $commit =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid commit SHA.' >&2; exit 2; }
case "$platform" in
  wsl2-x64) [[ $(uname -r) =~ [Mm][Ii][Cc][Rr][Oo][Ss][Oo][Ff][Tt].*[Ww][Ss][Ll]2 ]] || { echo 'An actual WSL2 kernel is required.' >&2; exit 2; } ;;
  linux-x64) [[ ! $(uname -r) =~ [Mm][Ii][Cc][Rr][Oo][Ss][Oo][Ff][Tt] ]] || { echo 'Do not mislabel WSL as the native Linux job.' >&2; exit 2; } ;;
  *) echo 'Unknown acceptance platform.' >&2; exit 2 ;;
esac

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
source_kit="$repo/v3/public/format-repositories/animal-conversations-v1"
scratch=$(mktemp -d /tmp/wiggly-kit-acceptance.XXXXXX)
mkdir -p "$reports"
[[ -z $(ls -A "$reports") ]] || { echo 'Refusing to overwrite existing acceptance reports.' >&2; exit 2; }
stage_name=host-setup
trap 'result=$?; printf "exit=%s\nstage=%s\nscope=platform-mechanics-and-intake-only\n" "$result" "$stage_name" > "$reports/outcome.txt"' EXIT
stage() { stage_name=$1; printf '%s\n' "$stage_name" | tee -a "$reports/stages.log"; }
as_root=()
if [[ $(id -u) != 0 ]]; then as_root=(sudo); fi

stage install-ephemeral-linux-tools
"${as_root[@]}" apt-get update -qq
"${as_root[@]}" env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates curl xz-utils zip unzip ffmpeg python3.12 python3.12-venv \
  build-essential pkg-config libssl-dev util-linux cargo-1.85 rustc-1.85

# Use an official Linux Node 22 distribution in this disposable directory, never Windows Node.
node_dist=https://nodejs.org/dist/latest-v22.x
curl --fail --silent --show-error --location --max-time 120 "$node_dist/SHASUMS256.txt" -o "$scratch/SHASUMS256.txt"
node_file=$(awk '$2 ~ /^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$/ {print $2}' "$scratch/SHASUMS256.txt")
[[ $node_file =~ ^node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz$ ]] || { echo 'Official Node 22 archive selection failed.' >&2; exit 1; }
node_version=${node_file#node-}
node_version=${node_version%-linux-x64.tar.xz}
curl --fail --silent --show-error --location --max-time 180 "https://nodejs.org/dist/$node_version/$node_file" -o "$scratch/$node_file"
(cd "$scratch" && awk -v file="$node_file" '$2 == file' SHASUMS256.txt | sha256sum --check --strict)
tar -xJf "$scratch/$node_file" -C "$scratch"
export PATH="$scratch/${node_file%.tar.xz}/bin:/usr/bin:/bin"
export PYTHON=/usr/bin/python3.12 FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe
export CARGO=/usr/bin/cargo-1.85 RUSTC=/usr/bin/rustc-1.85 RUSTDOC=/usr/bin/rustdoc-1.85
export npm_config_cache="$scratch/npm-cache" CARGO_HOME="$scratch/cargo-cache" CARGO_TARGET_DIR="$scratch/cargo-target"
node -e 'if (process.platform !== "linux" || process.arch !== "x64") throw Error("Linux x64 Node is required"); console.log(process.version, process.platform, process.arch)'
"$PYTHON" -c 'import sys; assert sys.version_info[:2] == (3,12); print(sys.version)'
uname -srm
command -v node npm python3.12 ffmpeg ffprobe cargo-1.85 rustc-1.85 rustdoc-1.85
"$CARGO" --version
"$RUSTC" --version
"$RUSTDOC" --version

stage build-and-freshly-extract-candidate
node "$source_kit/build-kit.mjs" --output="$scratch/release" > "$scratch/build.json"
archive=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).archive.file' "$scratch/build.json")
unzip -q "$scratch/release/$archive" -d "$scratch/kit"
cd "$scratch/kit"
export ACCEPTANCE_SOURCE_KIT="$source_kit" ACCEPTANCE_REPORTS="$reports" ACCEPTANCE_PLATFORM="$platform" ACCEPTANCE_COMMIT="$commit"
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { selectReleaseFiles } from './build-kit.mjs';
import { sha256 } from './runtime/common.mjs';
const inventory = JSON.parse(await readFile('RELEASE-CONTENTS.json'));
assert.deepEqual(inventory.files, await selectReleaseFiles(process.env.ACCEPTANCE_SOURCE_KIT));
async function walk(dir = '.') {
  const files = [];
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name), info = await lstat(file);
    assert.equal(info.isSymbolicLink(), false);
    if (info.isDirectory()) files.push(...await walk(file)); else files.push(file);
  }
  return files;
}
assert.deepEqual((await walk()).sort(), [...inventory.files.map(f => f.path), 'RELEASE-CONTENTS.json'].sort());
for (const file of inventory.files) assert.equal(await sha256(file.path), file.sha256, file.path);
await writeFile(path.join(process.env.ACCEPTANCE_REPORTS, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
NODE

stage doctor-before-installation
if node runner.mjs doctor > "$scratch/doctor-before.json"; then
  echo 'Fresh ZIP unexpectedly had all dependencies installed.' >&2; exit 1
fi
node --input-type=module - "$scratch/doctor-before.json" <<'NODE'
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const report = JSON.parse(await readFile(process.argv[2]));
assert.equal(report.status, 'setup-required');
assert.deepEqual(report.issues.map(issue => issue.id), ['dependency:sharp']);
NODE
stage fresh-npm-ci-and-default-tests
npm ci --no-audit --no-fund
node runner.mjs doctor > "$scratch/doctor-after.json"
npm test
stage explicit-media-and-converter-profiles-synthetic-mechanics-not-episode-approval
npm run test:release
stage official-synthetic-smoke-not-playback-approval
node runner.mjs smoke --run=ci-mechanics > "$scratch/smoke.json"

stage actual-pinned-cpu-intake-setup
node runner.mjs setup-intake > "$scratch/setup.json"
stage two-real-approved-examples-with-os-network-disabled
# The entire local intake runs in a network namespace with no external interfaces/routes.
# This is stronger than resolving platform wheels or setting HF_HUB_OFFLINE alone.
"${as_root[@]}" unshare --net -- env PATH="$PATH" PYTHON="$PYTHON" FFMPEG="$FFMPEG" FFPROBE="$FFPROBE" \
  node runner.mjs intake --run=ci-example-one --source="$PWD/goldens/we-listen-dont-judge.mp4" > "$scratch/intake-one.json"
"${as_root[@]}" unshare --net -- env PATH="$PATH" PYTHON="$PYTHON" FFMPEG="$FFMPEG" FFPROBE="$FFPROBE" \
  node runner.mjs intake --run=ci-example-two --source="$PWD/examples/i-made-a-mistake/evidence/final.mp4" > "$scratch/intake-two.json"
node runner.mjs status --run=ci-example-one > "$scratch/status-one.json"
node runner.mjs status --run=ci-example-two > "$scratch/status-two.json"

stage verify-intake-evidence-and-no-invented-approval
node --input-type=module - "$scratch" <<'NODE'
import assert from 'node:assert/strict';
import { readFile, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { sha256 } from './runtime/common.mjs';
const scratch = process.argv[2];
const read = async file => JSON.parse(await readFile(file));
const inventory = await read('RELEASE-CONTENTS.json');
const approved = (await read('release-files.json')).approvedMedia;
const examples = [];
for (const suffix of ['one', 'two']) {
  const run = `ci-example-${suffix}`, dir = path.join('agent-runs', run);
  const intake = await read(path.join(dir, 'intake.json'));
  const transcript = await read(path.join(dir, 'transcript.json'));
  assert.equal(intake.status, 'needs-script-draft');
  assert.equal((await read(path.join(scratch, `status-${suffix}.json`))).phase, 'needs-script-draft');
  assert.equal(transcript.engine.device, 'cpu');
  assert.equal(transcript.engine.computeType, 'int8');
  assert.equal(transcript.uncertain, true);
  assert.ok(transcript.segments.some(segment => segment.text.trim()));
  assert.ok(approved.some(file => file.sha256 === intake.source.sha256));
  for (const artifact of [intake.audio, intake.asrAudio, intake.transcript]) assert.equal(await sha256(path.join(dir, artifact.file)), artifact.sha256);
  for (const file of ['input.json', '.script-approval.json', 'final.mp4', 'playback-review.json', 'delivery.json']) {
    await assert.rejects(access(path.join(dir, file)), { code: 'ENOENT' });
  }
  examples.push({ run, sourceSha256: intake.source.sha256, audioSha256: intake.audio.sha256,
    durationSeconds: intake.audio.durationSeconds, transcriptSha256: intake.transcript.sha256,
    segments: transcript.segments.length, engine: transcript.engine, phase: intake.status });
}
assert.notEqual(examples[0].sourceSha256, examples[1].sourceSha256);
const summary = { schemaVersion: 1, status: 'pass', platform: process.env.ACCEPTANCE_PLATFORM,
  commit: process.env.ACCEPTANCE_COMMIT, kernel: os.release(), node: process.version,
  formatVersion: inventory.formatVersion, inventorySha256: await sha256('RELEASE-CONTENTS.json'),
  sourceArchiveInventoryVerified: true, freshInstall: true, defaultTests: 'pass',
  explicitReleaseProfile: 'pass — includes synthetic receipt/export mechanics, not real approval',
  syntheticSmoke: 'pass — not an approved episode', offlineIntake: 'OS network namespace, no external network',
  examples, limitations: ['No fresh coding-agent interaction was tested.', 'No user script approval or perceptual playback review was fabricated.',
    'This proves platform mechanics and local intake, not full episode acceptance or public website promotion.',
    'Cross-platform archive or MP4 byte identity is not required; exact source file inventory and checksums are verified.'] };
await writeFile(path.join(process.env.ACCEPTANCE_REPORTS, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
NODE
stage passed-platform-mechanics-and-intake-only
