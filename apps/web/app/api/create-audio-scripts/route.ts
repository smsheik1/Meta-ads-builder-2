import { NextResponse } from 'next/server';
import { BillShieldError, assertAudioRouteAllowed, billShieldJson } from '@/features/audio/billShield';
import { generateDialogueScripts } from '@/features/audio/dialogueScripts';
import type { AdScene } from '@/features/create/scene';

export const runtime = 'nodejs';

type CreateAudioScriptsRequest = {
  scene?: AdScene;
  count?: number;
};

export async function POST(request: Request) {
  let body: CreateAudioScriptsRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (!body.scene?.id || !body.scene?.brand?.name || !body.scene?.brand?.receipts) {
    return NextResponse.json({ error: 'A complete ad scene is required before writing audio options.' }, { status: 400 });
  }

  try {
    assertAudioRouteAllowed('audioScripts', request, 'AUDIO_SCRIPTS_ENABLED');
    const result = await generateDialogueScripts(body.scene, { count: body.count });

    return NextResponse.json({
      ...result,
      sourceSceneId: body.scene.id,
    });
  } catch (error) {
    if (error instanceof BillShieldError) {
      return NextResponse.json(billShieldJson(error), { status: error.status });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error generating voice script options.',
    }, { status: 503 });
  }
}
