import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const listSourceFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'test-results', 'tmp'].includes(entry.name)) return [];
      return listSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx|css|md)$/.test(entry.name)) return [];
    return [fullPath];
  });
};

test('legacy create owns its AdScene engine instead of importing create-v2 UI internals', () => {
  const sourceFiles = listSourceFiles(path.join(repoRoot, 'src'));
  const offenders = sourceFiles
    .filter((filePath) => !filePath.endsWith(path.join('src', 'engine', 'ad-scene', 'scene.ts')))
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('apps/web/features/create/scene'));

  expect(offenders).toEqual([]);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'engine', 'ad-scene', 'scene.ts'))).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'apps', 'web', 'features', 'create'))).toBe(false);
});

test('freeze docs name legacy create as the active product path', () => {
  const freezeDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'LEGACY_FREEZE.md'), 'utf8');

  expect(freezeDoc).toContain('`/create` is the active product path');
  expect(freezeDoc).not.toContain('Build new Wiggly product work in `apps/web`');
  expect(freezeDoc).not.toContain('http://localhost:3010/create-v2');
});

test('legacy create app has no browser recorder fallback renderer', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const packageSource = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8');

  expect(appSource).not.toContain('canvas.captureStream');
  expect(appSource).not.toContain('new MediaRecorder');
  expect(appSource).not.toContain('Browser recorder fallback');
  expect(appSource).not.toContain('/api/convert-to-mp4');
  expect(serverSource).not.toContain('/api/convert-to-mp4');
  expect(serverSource).not.toContain('uploadDisk');
  expect(serverSource).not.toContain('fluent-ffmpeg');
  expect(packageSource).not.toContain('fluent-ffmpeg');
});

test('legacy create website research timeout matches the server research budget', () => {
  const createFlowSource = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'CreateFlow.tsx'), 'utf8');

  expect(createFlowSource).toContain('const WEBSITE_RESEARCH_TIMEOUT_MS = 45000;');
  expect(createFlowSource).toContain('WEBSITE_RESEARCH_TIMEOUT_MS');
  expect(createFlowSource).not.toContain("}, 25000, 'That site is taking too long to read");
});

test('legacy create app no longer carries dead phone-call or Postiz branches', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');

  expect(appSource).not.toContain('creativeMode');
  expect(appSource).not.toContain('phone-call');
  expect(appSource).not.toContain('PhoneCallSimulator');
  expect(appSource).not.toContain('SOCIAL_POSTING_ENABLED');
  expect(appSource).not.toContain('postiz');
  expect(appSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('/api/postiz');
  expect(serverSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('postiz');
  expect(serverSource).not.toContain('POSTIZ');
  expect(serverSource).not.toContain('uploadPostiz');
});

test('legacy create render path has no phone-call composition branch', () => {
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const remotionRootSource = fs.readFileSync(path.join(repoRoot, 'src', 'remotion', 'Root.tsx'), 'utf8');
  const exportSnapshotSource = fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'export-snapshot.ts'), 'utf8');

  expect(serverSource).not.toContain('PhoneCallRender');
  expect(serverSource).not.toContain('isPhoneCallSnapshot');
  expect(serverSource).not.toContain('PHONE_CALL_EXPORT_DIMENSIONS');
  expect(remotionRootSource).not.toContain('PhoneCallRender');
  expect(remotionRootSource).not.toContain('RemotionPhoneCall');
  expect(exportSnapshotSource).not.toContain('PhoneCallSnapshot');
  expect(exportSnapshotSource).not.toContain('PHONE_CALL_EXPORT_DIMENSIONS');

  expect(fs.existsSync(path.join(repoRoot, 'src', 'remotion', 'RemotionPhoneCall.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'components', 'PhoneCallScene.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'components', 'PhoneCallSimulator.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'lib', 'phone-call.ts'))).toBe(false);
});
