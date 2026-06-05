import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSavedDesign,
  loadSavedDesign,
  toRenderScene,
  toShareScene,
  type SavedDesign,
} from '../features/create/sceneAdapters';
import { ogToolScene, redfinScene } from '../features/create/fixtures';
import { cloneAdScene, deserializeAdScene, serializeAdScene } from '../features/create/scene';
import { reduceAdScene } from '../features/create/sceneReducer';
import { createCreativeReroll } from '../features/create/creativeReroll';
import {
  ANONYMOUS_SESSION_STORAGE_KEY,
  getOrCreateAnonymousSessionId,
} from '../features/create/anonymousSession';
import { shouldIgnoreSpacebarRerollElement } from '../features/create/useSpacebarReroll';
import {
  MAX_SAVED_DESIGNS,
  SAVED_DESIGNS_STORAGE_KEY,
  deleteSavedDesign,
  parseSavedDesigns,
  readSavedDesigns,
  sceneHasSavedSnapshot,
  upsertSavedDesign,
  writeSavedDesigns,
} from '../features/create/savedDesigns';

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

const createMemoryStorage = (initialValue: string | null = null) => {
  const records = new Map<string, string>();
  if (initialValue !== null) records.set(SAVED_DESIGNS_STORAGE_KEY, initialValue);

  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
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

test('local creative reroll changes only creative and unlocked brand art', () => {
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
    now: 106,
  });
  const reroll = createCreativeReroll(withAudio, 123);
  const updated = reduceAdScene(withAudio, {
    type: 'rerollCreative',
    creative: reroll,
    now: 107,
  });

  assert.notEqual(updated.creative.angleId, withAudio.creative.angleId);
  assert.notEqual(updated.creative.visualizer.color, withAudio.creative.visualizer.color);
  assert.deepEqual(updated.audio, withAudio.audio);
  assert.equal('audio' in reroll, false);
});

test('spacebar reroll ignores editable controls', () => {
  assert.equal(shouldIgnoreSpacebarRerollElement('input'), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('textarea'), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('select'), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('button'), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('div', true), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('div', false, 'textbox'), true);
  assert.equal(shouldIgnoreSpacebarRerollElement('div'), false);
});

test('layout movement persists in scene state and respects locks', () => {
  const moved = reduceAdScene(ogToolScene, {
    type: 'moveLayoutElement',
    element: 'headline',
    x: 0.72,
    y: 0.44,
    now: 108,
  });
  const locked = reduceAdScene(moved, {
    type: 'setLock',
    field: 'headline',
    locked: true,
    now: 109,
  });
  const blocked = reduceAdScene(locked, {
    type: 'moveLayoutElement',
    element: 'headline',
    x: 0.2,
    y: 0.2,
    now: 110,
  });

  assert.equal(moved.layout.headline.x, 0.72);
  assert.equal(moved.layout.headline.y, 0.44);
  assert.equal(blocked.layout.headline.x, 0.72);
  assert.equal(blocked.layout.headline.y, 0.44);
});

test('layout survives save, render, and share adapters', () => {
  const moved = reduceAdScene(ogToolScene, {
    type: 'moveLayoutElement',
    element: 'visualizer',
    x: 0.43,
    y: 0.62,
    now: 111,
  });
  const design = createSavedDesign(moved, 'Moved layout', 112);
  const loaded = loadSavedDesign(design);
  const renderScene = toRenderScene(moved);
  const shareScene = toShareScene(moved);

  assert.equal(loaded.layout.visualizer.x, 0.43);
  assert.equal(renderScene.layout.visualizer.y, 0.62);
  assert.equal(shareScene.layout.visualizer.x, 0.43);
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

test('saved design upsert stores Convex-safe scene snapshots without aliasing', () => {
  const withAudio = reduceAdScene(ogToolScene, {
    type: 'updateAudio',
    audio: {
      status: 'generated',
      url: 'data:audio/wav;base64,abc',
      transcript: 'Saved transcript',
      captions: [{ text: 'Saved transcript', startMs: 0, endMs: 1200 }],
      sourceSceneId: ogToolScene.id,
      scriptId: 'script-1',
      durationMs: 1200,
    },
    now: 200,
  });
  const firstSave = upsertSavedDesign([], withAudio, 300);
  const loaded = loadSavedDesign(firstSave[0]);
  const expectedSavedScene = {
    ...withAudio,
    audio: {
      status: 'none' as const,
      url: null,
      storageId: null,
      mimeType: null,
      transcript: '',
      captions: [],
      brandKey: null,
      sourceSceneId: null,
      scriptId: null,
      durationMs: null,
    },
  };

  assert.equal(firstSave.length, 1);
  assert.equal(firstSave[0].scene.audio.url, null);
  assert.deepEqual(loaded, expectedSavedScene);
  assert.notEqual(loaded, expectedSavedScene);
  assert.notEqual(firstSave[0].scene, withAudio);
});

test('saved design snapshots preserve stored generated audio', () => {
  const withStoredAudio = reduceAdScene(ogToolScene, {
    type: 'updateAudio',
    audio: {
      status: 'generated',
      url: 'https://intent-capybara-375.convex.cloud/api/storage/mock-audio',
      storageId: 'kg2audioassetmock',
      mimeType: 'audio/wav',
      transcript: 'Saved transcript',
      captions: [{ text: 'Saved transcript', startMs: 0, endMs: 1200 }],
      sourceSceneId: ogToolScene.id,
      scriptId: 'script-1',
      durationMs: 1200,
    },
    now: 200,
  });
  const firstSave = upsertSavedDesign([], withStoredAudio, 300);
  const loaded = loadSavedDesign(firstSave[0]);

  assert.equal(loaded.audio.status, 'generated');
  assert.equal(loaded.audio.storageId, 'kg2audioassetmock');
  assert.equal(loaded.audio.url, 'https://intent-capybara-375.convex.cloud/api/storage/mock-audio');
  assert.equal(loaded.audio.mimeType, 'audio/wav');
});

test('saving the same scene updates the existing saved design in place', () => {
  const firstSave = upsertSavedDesign([], ogToolScene, 300);
  const changedScene = reduceAdScene(ogToolScene, {
    type: 'rerollCreative',
    creative: { headline: 'Updated saved headline' },
    now: 301,
  });
  const secondSave = upsertSavedDesign(firstSave, changedScene, 400);

  assert.equal(secondSave.length, 1);
  assert.equal(secondSave[0].id, firstSave[0].id);
  assert.equal(secondSave[0].createdAt, 300);
  assert.equal(secondSave[0].updatedAt, 400);
  assert.equal(secondSave[0].scene.creative.headline, 'Updated saved headline');
});

test('saved design storage safely parses, sorts, caps, and deletes snapshots', () => {
  assert.deepEqual(parseSavedDesigns('not-json'), []);

  const saved = Array.from({ length: MAX_SAVED_DESIGNS + 2 }).reduce<SavedDesign[]>((designs, _value, index) => {
    const scene = {
      ...cloneAdScene(ogToolScene),
      id: `scene-${index}`,
      updatedAt: index,
    };
    return upsertSavedDesign(designs, scene, 1_000 + index);
  }, []);
  const storage = createMemoryStorage();
  writeSavedDesigns(storage, saved);
  const restored = readSavedDesigns(storage);
  const deleted = deleteSavedDesign(restored, restored[0].id);

  assert.equal(restored.length, MAX_SAVED_DESIGNS);
  assert.equal(restored[0].updatedAt, 1_000 + MAX_SAVED_DESIGNS + 1);
  assert.equal(deleted.length, MAX_SAVED_DESIGNS - 1);
  assert.equal(deleted.some((design) => design.id === restored[0].id), false);
});

test('anonymous session id is stable across refreshes', () => {
  const storage = createMemoryStorage();
  const firstSessionId = getOrCreateAnonymousSessionId(storage);
  const secondSessionId = getOrCreateAnonymousSessionId(storage);

  assert.match(firstSessionId, /^anon-/);
  assert.equal(secondSessionId, firstSessionId);
  assert.equal(storage.getItem(ANONYMOUS_SESSION_STORAGE_KEY), firstSessionId);
});

test('current scene is saved only when the snapshot matches the latest scene update', () => {
  const saved = upsertSavedDesign([], ogToolScene, 300);
  const changedScene = reduceAdScene(ogToolScene, {
    type: 'rerollCreative',
    creative: { headline: 'Unsaved headline change' },
    now: ogToolScene.updatedAt + 1,
  });

  assert.equal(sceneHasSavedSnapshot(saved, ogToolScene), true);
  assert.equal(sceneHasSavedSnapshot(saved, changedScene), false);
});

test('new web app does not import from legacy src/App.tsx', () => {
  const sourceFiles = listSourceFiles(webRoot).filter((file) => !file.includes(`${path.sep}tests${path.sep}`));
  const offenders = sourceFiles.filter((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return /src\/App(\.tsx)?|from ['"].*App['"]/.test(source);
  });

  assert.deepEqual(offenders, []);
});

test('opening the audio panel does not auto-write voice options', () => {
  const source = fs.readFileSync(path.join(webRoot, 'features/create/CreateFoundation.tsx'), 'utf8');

  assert.match(source, /onAddAudio={openAudioPanel}/);
  assert.doesNotMatch(source, /onAddAudio=\\{\\(\\) => loadScriptOptions/);
});

test('create surface shows a clickable spacebar reroll prompt', () => {
  const source = fs.readFileSync(path.join(webRoot, 'features/create/CreateFoundation.tsx'), 'utf8');
  const promptSource = fs.readFileSync(path.join(webRoot, 'features/create/SpacebarRerollPrompt.tsx'), 'utf8');

  assert.match(source, /SpacebarRerollPrompt/);
  assert.match(promptSource, /Press/);
  assert.match(promptSource, /Spacebar/);
  assert.match(promptSource, /to generate more/);
  assert.match(promptSource, /onClick=\{onReroll\}/);
});

test('saved designs use a hover popover instead of a second library surface', () => {
  const panelSource = fs.readFileSync(path.join(webRoot, 'features/create/SavedDesignsPanel.tsx'), 'utf8');

  assert.match(panelSource, /saved-designs-save-button/);
  assert.match(panelSource, /saved-designs-popover/);
  assert.match(panelSource, /savedDesigns\.slice\(0, 4\)/);
  assert.match(panelSource, /onMouseEnter=\{openPopover\}/);
  assert.match(panelSource, /onMouseLeave=\{\(\) => setPopoverOpen\(false\)\}/);
  assert.match(panelSource, /onLoadDesign\(design\)/);
  assert.doesNotMatch(panelSource, /sm:grid-cols-4/);
});

test('safe guides are preview-only canvas UI', () => {
  const createSource = fs.readFileSync(path.join(webRoot, 'features/create/CreateFoundation.tsx'), 'utf8');
  const canvasSource = fs.readFileSync(path.join(webRoot, 'features/render/AdSceneCanvas.tsx'), 'utf8');
  const toggleSource = fs.readFileSync(path.join(webRoot, 'features/create/CanvasGuidesToggle.tsx'), 'utf8');
  const remotionSource = fs.readFileSync(path.join(webRoot, 'features/render/AdSceneRemotion.tsx'), 'utf8');

  assert.match(createSource, /CanvasGuidesToggle/);
  assert.match(createSource, /showGuides=\{showGuides\}/);
  assert.match(toggleSource, /safe-guides-toggle/);
  assert.match(canvasSource, /scene-safe-guides/);
  assert.match(canvasSource, /Feed safe area/);
  assert.doesNotMatch(remotionSource, /scene-safe-guides|Feed safe area/);
});

test('export panel explains render progress without fake precision', () => {
  const source = fs.readFileSync(path.join(webRoot, 'features/create/ExportPanel.tsx'), 'utf8');

  assert.match(source, /Preparing your video/);
  assert.match(source, /Rendering the ad scene/);
  assert.match(source, /Packaging the MP4/);
  assert.match(source, /Almost ready/);
  assert.match(source, /This usually takes 10-30 seconds/);
  assert.match(source, /direct MP4 link/);
  assert.doesNotMatch(source, /\d+%/);
  assert.doesNotMatch(source, /Click Save video/);
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

test('root, create, and create-v2 routes all use the v2 create app', () => {
  const rootPage = fs.readFileSync(path.join(webRoot, 'app/page.tsx'), 'utf8');
  const createPage = fs.readFileSync(path.join(webRoot, 'app/create/page.tsx'), 'utf8');
  const createV2Page = fs.readFileSync(path.join(webRoot, 'app/create-v2/page.tsx'), 'utf8');

  assert.match(rootPage, /CreateFoundation/);
  assert.match(createPage, /CreateFoundation/);
  assert.match(createV2Page, /CreateFoundation/);
  assert.doesNotMatch(rootPage, /Open create v2|foundation route|placeholder/i);
});

test('current create surface does not expose migration scaffolding copy', () => {
  const layoutSource = fs.readFileSync(path.join(webRoot, 'app/layout.tsx'), 'utf8');
  const createSource = fs.readFileSync(path.join(webRoot, 'features/create/CreateFoundation.tsx'), 'utf8');
  const readmeSource = fs.readFileSync(path.join(webRoot, 'README.md'), 'utf8');
  const combined = [layoutSource, createSource, readmeSource].join('\n');

  assert.doesNotMatch(combined, /Create v2 foundation|frozen legacy app|Clean-room Wiggly create foundation/);
  assert.doesNotMatch(layoutSource, /Wiggly Create V2/);
  assert.match(createSource, /one clean video ad scene you can save, share, and download/);
});

test('oracle deploy pushes Convex before building the app', () => {
  const deployScript = fs.readFileSync(path.join(repoRoot, 'scripts/deploy-oracle.sh'), 'utf8');
  const deployWorkflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/deploy-oracle.yml'), 'utf8');
  const webPackage = JSON.parse(fs.readFileSync(path.join(webRoot, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };

  assert.match(deployScript, /CONVEX_DEPLOY_KEY/);
  assert.match(deployScript, /NEXT_PUBLIC_CONVEX_URL/);
  assert.match(deployScript, /FIRECRAWL_API_KEY/);
  assert.match(deployScript, /GROQ_API_KEY/);
  assert.match(deployScript, /GEMINI_API_KEY/);
  assert.match(deployScript, /npx convex deploy/);
  assert.ok(deployScript.indexOf('npx convex deploy') < deployScript.indexOf('npm run build'));
  assert.match(webPackage.scripts?.start ?? '', /next start/);
  assert.match(deployScript, /pm2 delete "\$APP_NAME"/);
  assert.match(deployScript, /\(cd apps\/web && pm2 start npm --name "\$APP_NAME" -- run start\)/);
  assert.doesNotMatch(deployScript, /pm2 restart "\$APP_NAME"/);
  assert.match(deployWorkflow, /secrets\.CONVEX_DEPLOY_KEY/);
  assert.match(deployWorkflow, /secrets\.FIRECRAWL_API_KEY/);
  assert.match(deployWorkflow, /secrets\.GROQ_API_KEY/);
  assert.match(deployWorkflow, /secrets\.GEMINI_API_KEY/);
  assert.match(deployWorkflow, /envs: CONVEX_DEPLOY_KEY,CONVEX_URL,NEXT_PUBLIC_CONVEX_URL,NEXT_PUBLIC_CONVEX_SITE_URL,FIRECRAWL_API_KEY,GROQ_API_KEY,GEMINI_API_KEY/);
});
