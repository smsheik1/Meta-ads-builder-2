import type { AdSceneCaption, JingleAdScene } from "../scene/types";
import { JINGLE_MAX_MUSIC_LENGTH_MS, JINGLE_MODEL_ID } from "../formats/jingle/prompt";

const ELEVENLABS_MUSIC_URL = "https://api.elevenlabs.io/v1/music";

const cleanLyric = (value: string) => value
  .replace(/^\[[^\]]+]\s*/g, "")
  .replace(/\s+/g, " ")
  .trim();

export const createJingleCaptions = (scene: JingleAdScene): AdSceneCaption[] => {
  let cursor = 0;
  return scene.layout.compositionPlan.chunks.map((chunk) => {
    const startMs = cursor;
    const endMs = cursor + chunk.duration_ms;
    cursor = endMs;
    return {
      text: cleanLyric(chunk.text),
      startMs,
      endMs,
    };
  });
};

export async function generateElevenLabsJingleMusic({
  apiKey = process.env.ELEVENLABS_API_KEY,
  fetcher = fetch,
  scene,
}: {
  apiKey?: string;
  fetcher?: typeof fetch;
  scene: JingleAdScene;
}) {
  if (!apiKey) throw new Error("ElevenLabs music generation is not configured.");
  if (scene.layout.musicLengthMs > JINGLE_MAX_MUSIC_LENGTH_MS) {
    throw new Error("Jingle music generation refused a track longer than 30 seconds.");
  }

  const response = await fetcher(`${ELEVENLABS_MUSIC_URL}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      composition_plan: scene.layout.compositionPlan,
      model_id: JINGLE_MODEL_ID,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ElevenLabs music generation failed with ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error("ElevenLabs music generation returned empty audio.");

  return {
    bytes,
    mimeType: response.headers.get("content-type") || "audio/mpeg",
    durationMs: scene.layout.musicLengthMs,
    transcript: scene.layout.lyrics.join("\n"),
    captions: createJingleCaptions(scene),
    model: JINGLE_MODEL_ID,
    provider: "elevenlabs" as const,
  };
}
