import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PhonePreviewFrame } from "../app/create/CreatePreviewChrome";
import {
  createDefaultSceneLocks,
  rerollScene,
} from "../features/create/reroll";
import {
  createDefaultCanvasInteractionSnapshot,
  getCanvasCanReroll,
  reduceCanvasInteractionState,
} from "../features/create/canvasInteractionStore";
import {
  isEditableShortcutTarget,
  isRerollSpacebarKey,
} from "../features/create/useCanvasKeyboard";
import {
  consumeWorkflowUsageSnapshot,
  hasPaidAccess,
  readWorkflowUsageSnapshot,
  type WorkflowUsage,
} from "../lib/billing";
import { defaultRenderScene } from "../remotion-entry/fixture";
import type { VisualizerAdScene } from "../features/scene/types";

function test(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

function makeScene(index: number): VisualizerAdScene {
  return {
    ...defaultRenderScene,
    brand: {
      ...defaultRenderScene.brand,
      name: `Brand ${index}`,
    },
    creative: {
      ...defaultRenderScene.creative,
      angleId: `angle-${index}`,
      headline: `Headline ${index}`,
      subheadline: `Subheadline ${index}`,
      ctaText: `CTA ${index}`,
    },
    style: {
      ...defaultRenderScene.style,
      backgroundColor: index % 2 === 0 ? "#ffffff" : "#101828",
      textColor: index % 2 === 0 ? "#101828" : "#ffffff",
      accentColor: index % 2 === 0 ? "#2563eb" : "#f97316",
      visualizerColor: index % 2 === 0 ? "#2563eb" : "#f97316",
    },
    metadata: {
      ...defaultRenderScene.metadata,
      candidateIndex: index,
      generationBatchId: `batch-${index}`,
    },
  };
}

const scenes = [makeScene(0), makeScene(1), makeScene(2)];

test("full scene reroll swaps to the next AdScene payload", () => {
  const result = rerollScene(scenes, scenes[0]!, 0, createDefaultSceneLocks());

  assert.equal(result.index, 1);
  assert.equal(result.scene?.creative.headline, "Headline 1");
  assert.equal(result.scene?.creative.subheadline, "Subheadline 1");
  assert.equal(result.scene?.brand.name, "Brand 1");
  assert.equal(result.scene?.metadata.generationBatchId, "batch-1");
  assert.equal(result.scene?.style.visualizerColor, "#f97316");
});

test("flat audio lock preserves generated audio without scoped reroll state", () => {
  const currentAudio = {
    status: "generated" as const,
    storageId: "audio-1",
    url: "https://example.com/audio.wav",
    mimeType: "audio/wav",
    durationMs: 2500,
    durationSeconds: 2.5,
    transcript: "Generated transcript",
    captions: [{ text: "Generated transcript", startMs: 0, endMs: 2500 }],
    provider: "gemini" as const,
    model: "test-audio",
    generatedAt: 123,
  };
  const currentScene = {
    ...scenes[0]!,
    audio: currentAudio,
  };

  const result = rerollScene(scenes, currentScene, 0, {
    ...createDefaultSceneLocks(),
    audio: true,
  });

  assert.equal(result.index, 1);
  assert.equal(result.scene?.creative.headline, "Headline 1");
  assert.equal(result.scene?.audio, currentAudio);
});

test("modal state blocks spacebar reroll and preserves playback state", () => {
  const idle = createDefaultCanvasInteractionSnapshot();
  const inCaptionsModal = reduceCanvasInteractionState(idle, {
    type: "openModal",
    modal: "captions",
  });
  const playingInCaptionsModal = reduceCanvasInteractionState(inCaptionsModal, {
    type: "playbackStarted",
  });

  assert.equal(getCanvasCanReroll(idle), true);
  assert.equal(getCanvasCanReroll(inCaptionsModal), false);
  assert.equal(getCanvasCanReroll(playingInCaptionsModal), false);
  assert.equal(playingInCaptionsModal.uiStatus, "modal:captions");
  assert.equal(playingInCaptionsModal.playbackStatus, "playing");
});

test("editable input targets block spacebar shortcuts", () => {
  const inputLikeTarget = {
    closest: (selector: string) => selector.includes("input") ? {} : null,
  } as unknown as EventTarget;
  const inertTarget = {
    closest: () => null,
  } as unknown as EventTarget;

  assert.equal(isRerollSpacebarKey({ key: "Enter", code: "Enter" }), false);
  assert.equal(isRerollSpacebarKey({ key: " ", code: "Space" }), true);
  assert.equal(isEditableShortcutTarget(inputLikeTarget), true);
  assert.equal(isEditableShortcutTarget(inertTarget), false);
});

test("preview route renders ad pixels through AdRenderSurface", () => {
  const html = renderToStaticMarkup(createElement(PhonePreviewFrame, {
    scene: scenes[1]!,
    result: null,
    platform: "instagram-feed",
    timeSeconds: 0.4,
  }));

  assert.equal((html.match(/data-render-surface="ad"/g) || []).length, 1);
  assert.ok(html.includes('data-format="visualizer"'));
  assert.ok(html.includes("Headline 1"));
});

test("paywall allows two free website runs then gates the next run", () => {
  const now = 1_800_000_000_000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  let usage: WorkflowUsage | undefined;

  const initial = readWorkflowUsageSnapshot(usage, now, 2, sevenDaysMs);
  assert.deepEqual(initial, { count: 0, remaining: 2, resetAt: now + sevenDaysMs });

  const first = consumeWorkflowUsageSnapshot(usage, now, 2, sevenDaysMs);
  assert.equal(first.ok, true);
  assert.equal(first.usage.remaining, 1);
  usage = { count: first.usage.count, resetAt: first.usage.resetAt };

  const second = consumeWorkflowUsageSnapshot(usage, now + 1, 2, sevenDaysMs);
  assert.equal(second.ok, true);
  assert.equal(second.usage.remaining, 0);
  usage = { count: second.usage.count, resetAt: second.usage.resetAt };

  const third = consumeWorkflowUsageSnapshot(usage, now + 2, 2, sevenDaysMs);
  assert.equal(third.ok, false);
  assert.equal(third.usage.remaining, 0);
});

test("paid access bypasses the free-run gate window", () => {
  const now = 1_800_000_000_000;

  assert.equal(hasPaidAccess(now + 1, now), true);
  assert.equal(hasPaidAccess(now, now), false);
  assert.equal(hasPaidAccess(now - 1, now), false);
});

console.log("v3 behavior smoke tests passed");
