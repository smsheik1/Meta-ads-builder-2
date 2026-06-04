import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSavedDesign, loadSavedDesign, toRenderScene, toShareScene } from '../features/create/sceneAdapters';
import { ogToolScene, redfinScene } from '../features/create/fixtures';
import { cloneAdScene, deserializeAdScene, serializeAdScene } from '../features/create/scene';
import { reduceAdScene } from '../features/create/sceneReducer';

const __filename = fileURLToPath(import.meta.url);
const webRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(webRoot, '../..');

const test = (name: string, run: () => void) => {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
};

const listSourceFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'tmp'].includes(entry.name)) return [];
      return listSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
};

test('AdScene serializes and deserializes without mutation', () => {
  const serialized = serializeAdScene(ogToolScene);
  const parsed = deserializeAdScene(serialized);

  assert.deepEqual(parsed, ogToolScene);
  assert.notEqual(parsed, ogToolScene);
});

test('reroll updates unlocked creative fields and respects locked headline/logo', () => {
  const locked = reduceAdScene(ogToolScene, {
    type: 'setLock',
    field: 'headline',
    locked: true,
    now: 100,
  });
  const lockedAgain = reduceAdScene(locked, {
    type: 'setLock',
    field: 'logo',
    locked: true,
    now: 101,
  });
  const rerolled = reduceAdScene(lockedAgain, {
    type: 'rerollCreative',
    creative: {
      headline: 'A headline that should not land',
      subheadline: 'A subheadline that should land',
      logoUrl: 'https://example.com/new-logo.png',
      visualizer: { color: '#ff00ff' },
    },
    now: 102,
  });

  assert.equal(rerolled.creative.headline, ogToolScene.creative.headline);
  assert.equal(rerolled.creative.subheadline, 'A subheadline that should land');
  assert.equal(rerolled.brand.logoUrl, ogToolScene.brand.logoUrl);
  assert.equal(rerolled.creative.visualizer.color, '#ff00ff');
});

test('audio updates do not mutate creative state', () => {
  const beforeCreative = JSON.stringify(ogToolScene.creative);
  const updated = reduceAdScene(ogToolScene, {
    type: 'updateAudio',
    audio: {
      status: 'generated',
      url: 'https://example.com/audio.wav',
      transcript: 'I just checked the rankings.',
      captions: [
        {
          text: 'I just checked the rankings.',
          startMs: 0,
          endMs: 1800,
          speaker: 'a',
        },
      ],
      brandKey: 'ogtool',
    },
    now: 103,
  });

  assert.equal(JSON.stringify(updated.creative), beforeCreative);
  assert.equal(updated.audio.status, 'generated');
  assert.equal(updated.audio.captions[0]?.speaker, 'a');
});

test('stale generated audio cannot attach to a different scene', () => {
  const updated = reduceAdScene(redfinScene, {
    type: 'updateAudio',
    audio: {
      status: 'generated',
      url: 'https://example.com/old-audio.wav',
      transcript: 'Old brand audio',
      captions: [],
      sourceSceneId: ogToolScene.id,
      scriptId: 'old-script',
      durationMs: 2000,
    },
    now: 104,
  });

  assert.equal(updated.audio.status, 'none');
  assert.equal(updated.audio.url, null);
});

test('loading a new generated scene clears previous generated audio', () => {
  const withAudio = reduceAdScene(ogToolScene, {
    type: 'updateAudio',
    audio: {
      status: 'generated',
      url: 'https://example.com/audio.wav',
      transcript: 'Current brand audio',
      captions: [],
      sourceSceneId: ogToolScene.id,
      scriptId: 'script-1',
      durationMs: 2000,
    },
    now: 105,
  });
  const loaded = reduceAdScene(withAudio, {
    type: 'loadScene',
    scene: redfinScene,
  });

  assert.equal(loaded.id, redfinScene.id);
  assert.equal(loaded.audio.status, 'none');
  assert.equal(loaded.audio.url, null);
});

test('saved design and render/share adapters clone scene data', () => {
  const scene = cloneAdScene(ogToolScene);
  const design = createSavedDesign(scene, 'Fixture save');
  const loaded = loadSavedDesign(design);
  const renderScene = toRenderScene(scene);
  const shareScene = toShareScene(scene);

  assert.equal(design.title, 'Fixture save');
  assert.deepEqual(loaded, scene);
  assert.notEqual(loaded, scene);
  assert.deepEqual(renderScene, scene);
  assert.notEqual(renderScene, scene);
  assert.equal(shareScene.brand.name, scene.brand.name);
  assert.equal(shareScene.creative.headline, scene.creative.headline);
});

test('new web app does not import from legacy src/App.tsx', () => {
  const sourceFiles = listSourceFiles(webRoot).filter((file) => !file.includes(`${path.sep}tests${path.sep}`));
  const offenders = sourceFiles.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /src\/App(\.tsx)?|from ['"].*App['"]/.test(source);
  });

  assert.deepEqual(offenders, []);
});

test('new core product files stay under the 500-line budget', () => {
  const sourceFiles = listSourceFiles(path.join(webRoot, 'features'));
  const oversized = sourceFiles
    .map((file) => ({
      file: path.relative(repoRoot, file),
      lines: fs.readFileSync(file, 'utf8').split('\n').length,
    }))
    .filter((entry) => entry.lines > 500);

  assert.deepEqual(oversized, []);
});

test('minimal Remotion fixture is wired to AdScene', () => {
  const rootSource = fs.readFileSync(path.join(webRoot, 'remotion-entry/Root.tsx'), 'utf8');
  const sceneSource = fs.readFileSync(path.join(webRoot, 'features/render/AdSceneRemotion.tsx'), 'utf8');

  assert.match(rootSource, /<Composition/);
  assert.match(rootSource, /AdSceneFixture/);
  assert.match(sceneSource, /scene: AdScene/);
});
