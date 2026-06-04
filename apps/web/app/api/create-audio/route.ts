import { NextResponse } from 'next/server';
import { BillShieldError, assertAudioRouteAllowed, billShieldJson } from '@/features/audio/billShield';
import { type DialogueScript } from '@/features/audio/dialogueScripts';
import { generateGeminiDialogueAudio } from '@/features/audio/geminiTts';
import { createAudioAssetUploadUrl, uploadGeneratedAudioAsset } from '@/features/audio/audioAssetStore';

export const runtime = 'nodejs';

type CreateAudioRequest = {
  sceneId?: unknown;
  sessionId?: unknown;
  script?: DialogueScript;
};

export async function POST(request: Request) {
  let body: CreateAudioRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (typeof body.sceneId !== 'string' || !body.sceneId.trim()) {
    return NextResponse.json({ error: 'A scene id is required before making audio.' }, { status: 400 });
  }

  if (!body.script?.id || !Array.isArray(body.script.lines) || body.script.lines.length < 4) {
    return NextResponse.json({ error: 'Choose a complete script option before making audio.' }, { status: 400 });
  }

  try {
    assertAudioRouteAllowed('audioGeneration', request, 'TTS_ENABLED');
    const uploadUrl = await createAudioAssetUploadUrl();
    const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim()
      ? body.sessionId.trim()
      : 'unknown-session';
    const result = await generateGeminiDialogueAudio(body.script);
    const asset = await uploadGeneratedAudioAsset({
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      uploadUrl,
      sessionId,
      sceneId: body.sceneId,
      scriptId: body.script.id,
      durationMs: result.durationMs,
      transcript: result.transcript,
      captionCount: result.captions.length,
    });

    return NextResponse.json({
      audioUrl: asset.url,
      storageId: asset.storageId,
      mimeType: asset.mimeType,
      transcript: result.transcript,
      captions: result.captions,
      durationMs: result.durationMs,
      sourceSceneId: body.sceneId,
      scriptId: body.script.id,
    });
  } catch (error) {
    if (error instanceof BillShieldError) {
      return NextResponse.json(billShieldJson(error), { status: error.status });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error generating dialogue audio.',
    }, { status: 503 });
  }
}
