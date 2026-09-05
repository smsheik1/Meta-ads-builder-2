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
  build-essential pkg-config libssl-dev util-linux

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

stage install-pinned-rust-in-disposable-directory
# libflate 2.3 uses let chains, stable since Rust 1.88; the package lock stays unchanged.
# https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/
# Pins read from each official static.rust-lang.org/dist/<archive>.sha256.
rust_version=1.89.0
rust_target=x86_64-unknown-linux-gnu
rust_components=(
  rustc:b42c254e1349df86bd40bc28fdf386172a1a46f2eeabe3c7a08a75cf1fb60e27
  cargo:99fc10be2aeedf2c23a484f217bfa76458494495a0eee33e280d3616bb08282d
  rust-std:2719470dcd78b3f97d78b978c8f85a1a58d84ff11b62558294621c01bca34d49
)
for pinned in "${rust_components[@]}"; do
  component=${pinned%%:*}
  checksum=${pinned#*:}
  component_name="$component-$rust_version-$rust_target"
  component_archive="$component_name.tar.xz"
  curl --fail --silent --show-error --location --max-time 300 \
    "https://static.rust-lang.org/dist/$component_archive" -o "$scratch/$component_archive"
  (cd "$scratch" && printf '%s  %s\n' "$checksum" "$component_archive" | sha256sum --check --strict)
  tar -xJf "$scratch/$component_archive" -C "$scratch"
  # Official standalone installer; no rustup/global toolchain, profile edits, or ldconfig.
  bash "$scratch/$component_name/install.sh" --prefix="$scratch/rust" --disable-ldconfig
done
export PATH="$scratch/${node_file%.tar.xz}/bin:$scratch/rust/bin:/usr/bin:/bin"
export PYTHON=/usr/bin/python3.12 FFMPEG=/usr/bin/ffmpeg FFPROBE=/usr/bin/ffprobe
export CARGO="$scratch/rust/bin/cargo" RUSTC="$scratch/rust/bin/rustc" RUSTDOC="$scratch/rust/bin/rustdoc"
export npm_config_cache="$scratch/npm-cache" CARGO_HOME="$scratch/cargo-cache" CARGO_TARGET_DIR="$scratch/cargo-target"
node -e 'if (process.platform !== "linux" || process.arch !== "x64") throw Error("Linux x64 Node is required"); console.log(process.version, process.platform, process.arch)'
"$PYTHON" -c 'import sys; assert sys.version_info[:2] == (3,12); print(sys.version)'
uname -srm
command -v node npm python3.12 ffmpeg ffprobe cargo rustc rustdoc
export ACCEPTANCE_RUST_VERSION="$rust_version" ACCEPTANCE_RUST_TARGET="$rust_target"
export ACCEPTANCE_RUST_COMPONENTS="$(printf '%s\n' "${rust_components[@]}")"
node --input-type=module - "$reports" <<'NODE'
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const version = process.env.ACCEPTANCE_RUST_VERSION, target = process.env.ACCEPTANCE_RUST_TARGET;
const versions = {};
for (const [name, executable] of [['cargo', process.env.CARGO], ['rustc', process.env.RUSTC], ['rustdoc', process.env.RUSTDOC]]) {
  versions[name] = execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim();
  assert.ok(versions[name].startsWith(`${name} ${version} `), `${name} must use the pinned version`);
}
const compiler = execFileSync(process.env.RUSTC, ['--version', '--verbose'], { encoding: 'utf8' });
assert.ok(compiler.split('\n').includes(`host: ${target}`), 'Rust must execute natively on Linux x64');
const components = process.env.ACCEPTANCE_RUST_COMPONENTS.trim().split('\n').map(pin => {
  const [component, sha256] = pin.split(':');
  return { component, sha256, url: `https://static.rust-lang.org/dist/${component}-${version}-${target}.tar.xz` };
});
const provenance = { version, target, versions, components, checksumsVerified: true, installation: 'disposable CI directory only' };
await writeFile(path.join(process.argv[2], 'rust-toolchain.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(JSON.stringify(provenance, null, 2));
NODE

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

# Keep command exits authoritative; diagnostics never turn a failed gate into success.
run_diagnostic_step() {
  local label=$1 run_id=$2 code
  shift 2
  stage "$label"
  if "$@" > "$scratch/$label.stdout" 2> "$scratch/$label.stderr"; then code=0; else code=$?; fi
  if ! node --input-type=module - "$scratch" "$reports" "$label" "$run_id" "$code" <<'NODE'
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
const [scratch, reports, label, run, exitCode] = process.argv.slice(2);
const clean = value => String(value ?? '')
  .replace(/\u001b\[[0-9;]*m/g, '')
  .replace(/https?:\/\/[^\s"'<>]+/g, '<url omitted>')
  .replace(/\/(?:tmp|home|root|mnt|private|Users)\/[^\s"'<>:]+/g, '<path omitted>')
  .replace(/(authorization|api[-_]?key|token|password)\s*[:=]\s*[^\s,;]+/gi, '$1=<redacted>')
  .slice(-5000);
const stdout = await readFile(path.join(scratch, `${label}.stdout`), 'utf8');
const stderr = await readFile(path.join(scratch, `${label}.stderr`), 'utf8');
let selected;
try {
  const value = JSON.parse(stdout);
  selected = { status: value.status, phase: value.phase, completionClaimed: value.completionClaimed,
    blocker: value.blocker && { code: value.blocker.code, message: clean(value.blocker.message) },
    nextAction: value.nextAction && { owner: value.nextAction.owner, action: value.nextAction.action, message: clean(value.nextAction.message) },
    missing: Array.isArray(value.missing) ? value.missing.map(clean) : undefined,
    helper: label.startsWith('helper-') ? { ok: value.ok, segments: value.segments, uncertain: value.uncertain } : undefined };
} catch { selected = { json: false, preview: clean(stdout) }; }
const access = [];
for (const file of ['', 'state.json', 'intake.json', 'transcript.json', 'user-audio.wav']) {
  try {
    const info = await stat(path.join('agent-runs', run, file));
    access.push({ file: file || '(run directory)', uid: info.uid, gid: info.gid, mode: (info.mode & 0o777).toString(8), bytes: info.size });
  } catch (error) { access.push({ file: file || '(run directory)', error: error.code }); }
}
const report = { schemaVersion: 1, stage: label, exitCode: Number(exitCode), run,
  diagnosticCaller: { uid: process.getuid(), gid: process.getgid() },
  stdout: selected, stderr: clean(stderr), access,
  limitation: 'Diagnostic evidence only; a successful helper retry does not override the failed intake/status exit.' };
await writeFile(path.join(reports, `diagnostic-${label}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
NODE
  then
    if (( code != 0 )); then return "$code"; else return 1; fi
  fi
  return "$code"
}

# The entire local intake runs in a network namespace with no external interfaces/routes.
# This is stronger than resolving platform wheels or setting HF_HUB_OFFLINE alone.
offline=("${as_root[@]}" unshare --net -- env PATH="$PATH" PYTHON="$PYTHON" FFMPEG="$FFMPEG" FFPROBE="$FFPROBE")
diagnose_transcription_once() {
  local suffix=$1 helper_json
  local -a helper_args
  # Only inspect the helper after an actually observed transcription-failed result.
  node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1])); process.exit(r.status === "transcription-failed" ? 0 : 1)' \
    "$scratch/intake-$suffix.stdout" 2>/dev/null || return 0
  helper_json=$(node --input-type=module - "ci-example-$suffix" "$scratch/helper-$suffix.transcript.json" <<'NODE'
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './runtime/common.mjs';
try {
  const dir = path.resolve('agent-runs', process.argv[2]);
  const intake = JSON.parse(await readFile(path.join(dir, 'intake.json')));
  const release = JSON.parse(await readFile('release-files.json'));
  assert.equal(intake.status, 'transcription-failed');
  assert.ok(release.approvedMedia.some(file => file.sha256 === intake.source.sha256));
  const audio = path.resolve(dir, intake.asrAudio.file);
  assert.ok(audio.startsWith(dir + path.sep));
  assert.equal(await sha256(audio), intake.asrAudio.sha256);
  assert.ok(Number.isFinite(intake.source.sourceAudioStartSeconds));
  // Exact production helper interface, writing only a separate diagnostic output.
  console.log(JSON.stringify([path.resolve('.intake-env/bin/python'), path.resolve('scripts/intake.py'),
    '--requirements', path.resolve('scripts/intake-requirements.lock'), '--audio', audio,
    '--model', path.resolve('.intake-models/small.en'), '--manifest', path.resolve('scripts/intake-model.json'),
    '--source-offset', String(intake.source.sourceAudioStartSeconds), '--output', process.argv[3]]));
} catch (error) { console.error(`Public-source diagnostic prerequisites not verified (${error.code || error.name}).`); process.exitCode = 1; }
NODE
  ) || return 1
  mapfile -d '' -t helper_args < <(node -e 'for (const arg of JSON.parse(process.argv[1])) process.stdout.write(arg + "\0")' "$helper_json")
  run_diagnostic_step "helper-$suffix" "ci-example-$suffix" "${offline[@]}" "${helper_args[@]}"
}

sources=("$PWD/goldens/we-listen-dont-judge.mp4" "$PWD/examples/i-made-a-mistake/evidence/final.mp4")
for suffix in one two; do
  if [[ $suffix == one ]]; then source_file=${sources[0]}; else source_file=${sources[1]}; fi
  if run_diagnostic_step "intake-$suffix" "ci-example-$suffix" "${offline[@]}" \
    node runner.mjs intake --run="ci-example-$suffix" --source="$source_file"; then :
  else
    failed_code=$?
    diagnose_transcription_once "$suffix" || true
    exit "$failed_code"
  fi
done
for suffix in one two; do
  run_diagnostic_step "status-$suffix" "ci-example-$suffix" node runner.mjs status --run="ci-example-$suffix"
done

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
  assert.equal((await read(path.join(scratch, `status-${suffix}.stdout`))).phase, 'needs-script-draft');
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
  rustToolchain: await read(path.join(process.env.ACCEPTANCE_REPORTS, 'rust-toolchain.json')),
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
