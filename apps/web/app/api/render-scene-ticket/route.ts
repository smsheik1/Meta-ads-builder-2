import { NextResponse } from 'next/server';
import type { AdScene } from '@/features/create/scene';
import { refreshSceneAudioUrl } from '@/features/audio/audioAssetStore';
import { getPublicRenderErrorMessage } from '@/features/export/renderErrors';
import { renderAdSceneToMp4 } from '@/features/export/renderScene';
import { createRenderSceneTicket } from '@/features/export/renderSceneTicketStore';

export const runtime = 'nodejs';
export const maxDuration = 120;

type RenderSceneTicketRequest = {
  scene?: AdScene;
};

export async function POST(request: Request) {
  let body: RenderSceneTicketRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (!body.scene?.id || !body.scene?.brand?.name || !body.scene?.creative?.headline) {
    return NextResponse.json({ error: 'A complete ad scene is required before rendering video.' }, { status: 400 });
  }

  try {
    const render = await renderAdSceneToMp4(await refreshSceneAudioUrl(body.scene));
    const ticket = await createRenderSceneTicket(render.snapshot.scene, render.file);

    return NextResponse.json({
      ticketId: ticket.id,
      filename: ticket.filename,
      downloadUrl: `/api/render-scene/${ticket.id}`,
    });
  } catch (error) {
    console.error('[create-v2 render-scene-ticket]', error);
    return NextResponse.json({
      error: getPublicRenderErrorMessage(error, 'Could not prepare video download. Try again in a moment.'),
    }, { status: 500 });
  }
}
