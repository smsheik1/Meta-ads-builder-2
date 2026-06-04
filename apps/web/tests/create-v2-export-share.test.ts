import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ogToolScene, redfinScene } from '../features/create/fixtures';
import { cloneAdScene, type AdScene } from '../features/create/scene';
import {
  AD_SCENE_RENDER_SPECS,
  createDownloadFilename,
  createRenderSnapshot,
  createSceneSlug,
  getActiveCaptionText,
  getSceneDurationMs,
  getVisualizerBarHeight,
  isGeneratedSceneAudio,
} from '../features/render/adSceneRender';
import {
  createRenderSceneTicket,
  deleteRenderSceneTicket,
  readRenderSceneTicket,
} from '../features/export/renderSceneTicketStore';
import { getPublicRenderErrorMessage } from '../features/export/renderErrors';
import { createShareSceneRecord } from '../features/share/shareSceneStore';

const test = async (name: string, run: () => void | Promise<void>) => {
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
};

const withGeneratedAudio = (scene: AdScene) => ({
  ...cloneAdScene(scene),
  audio: {
    ...scene.audio,
    status: 'generated' as const,
    url: 'data:audio/wav;base64,abc',
    transcript: 'First line. Second line.',
    captions: [
      { text: 'First line.', startMs: 0, endMs: 1400, speaker: 'a' as const },
      { text: 'Second line.', startMs: 1401, endMs: 2800, speaker: 'b' as const },
    ],
    sourceSceneId: scene.id,
    scriptId: 'script-1',
    durationMs: 2800,
  },
});

await test('render snapshots preserve platform dimensions and generated audio duration', () => {
  const vertical = createRenderSnapshot(withGeneratedAudio(redfinScene));

  assert.equal(vertical.spec.width, AD_SCENE_RENDER_SPECS.reels.width);
  assert.equal(vertical.spec.height, AD_SCENE_RENDER_SPECS.reels.height);
  assert.equal(vertical.durationMs, 2800);
  assert.equal(isGeneratedSceneAudio(vertical.scene), true);
});

await test('render snapshots strip stale generated audio before export and share', () => {
  const staleAudio = withGeneratedAudio(ogToolScene);
  staleAudio.id = 'different-scene-id';
  const snapshot = createRenderSnapshot(staleAudio);

  assert.equal(getSceneDurationMs(staleAudio), 6000);
  assert.equal(snapshot.scene.audio.status, 'none');
  assert.equal(snapshot.scene.audio.url, null);
  assert.deepEqual(snapshot.scene.audio.captions, []);
});

await test('caption and visualizer helpers are deterministic', () => {
  const scene = withGeneratedAudio(ogToolScene);

  assert.equal(getActiveCaptionText(scene.audio, 600), 'First line.');
  assert.equal(getActiveCaptionText(scene.audio, 1800), 'Second line.');
  assert.equal(getVisualizerBarHeight(10, 21, 0), getVisualizerBarHeight(10, 21, 0));
  assert.notEqual(getVisualizerBarHeight(10, 21, 0), getVisualizerBarHeight(10, 21, 900));
});

await test('share slugs and download filenames are safe and brand-specific', () => {
  assert.equal(createSceneSlug(ogToolScene, 1_717_200_000_000), 'why-ai-recommends-your-competitors-cjk00');
  assert.equal(createDownloadFilename(ogToolScene), 'ogtool-why-ai-recommends-your-competitors.mp4');
});

await test('share record builder freezes a Convex-safe render snapshot', () => {
  const record = createShareSceneRecord(withGeneratedAudio(ogToolScene), 1_717_200_000_000);

  assert.equal(record.slug, 'why-ai-recommends-your-competitors-cjk00');
  assert.equal(record.scene.creative.headline, ogToolScene.creative.headline);
  assert.equal(record.scene.audio.status, 'none');
  assert.equal(record.scene.audio.url, null);
  assert.equal(record.durationMs, 6000);
  assert.equal(record.spec.compositionId, AD_SCENE_RENDER_SPECS['instagram-feed'].compositionId);
});

await test('render tickets store a frozen scene for normal attachment downloads', async () => {
  const ticket = await createRenderSceneTicket(
    withGeneratedAudio(ogToolScene),
    Buffer.from('fake mp4'),
    1_717_200_000_000,
  );
  const restored = await readRenderSceneTicket(ticket.id);
  const file = await fs.readFile(ticket.filePath, 'utf8');

  assert.ok(restored);
  assert.equal(restored.id, ticket.id);
  assert.equal(restored.filename, 'ogtool-why-ai-recommends-your-competitors.mp4');
  assert.equal(restored.filePath, ticket.filePath);
  assert.equal(file, 'fake mp4');
  assert.equal(restored.scene.audio.status, 'generated');
  assert.equal(restored.scene.audio.sourceSceneId, ogToolScene.id);

  await deleteRenderSceneTicket(ticket.id);
  assert.equal(await readRenderSceneTicket(ticket.id), null);
  await fs.rm(path.join(process.cwd(), 'tmp', 'create-v2-render-tickets'), { recursive: true, force: true });
});

await test('render errors hide server command details from users', () => {
  const publicMessage = getPublicRenderErrorMessage(
    new Error('Command failed with exit code 1: /tmp/remotion-assets-dir/audio.wav Invalid data found when processing input'),
  );

  assert.match(publicMessage, /audio could not be read/);
  assert.doesNotMatch(publicMessage, /\/tmp|Command failed|remotion-assets-dir/i);
});
