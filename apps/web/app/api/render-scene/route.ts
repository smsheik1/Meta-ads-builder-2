import { NextResponse } from 'next/server';
import type { AdScene } from '@/features/create/scene';
import { getPublicRenderErrorMessage } from '@/features/export/renderErrors';
import { renderAdSceneToMp4 } from '@/features/export/renderScene';

export const runtime = 'nodejs';
export const maxDuration = 120;

type RenderSceneRequest = {
  scene?: AdScene;
};

export async function POST(request: Request) {
  let body: RenderSceneRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (!body.scene?.id || !body.scene?.brand?.name || !body.scene?.creative?.headline) {
    return NextResponse.json({ error: 'A complete ad scene is required before rendering video.' }, { status: 400 });
  }

  try {
    const result = await renderAdSceneToMp4(body.scene);

    return new NextResponse(result.file, {
      headers: {
        'content-type': 'video/mp4',
        'content-disposition': `attachment; filename="${result.filename}"`,
        'x-wiggly-render-platform': result.snapshot.scene.platform,
        'x-wiggly-render-width': String(result.snapshot.spec.width),
        'x-wiggly-render-height': String(result.snapshot.spec.height),
      },
    });
  } catch (error) {
    console.error('[create-v2 render-scene]', error);
    return NextResponse.json({
      error: getPublicRenderErrorMessage(error, 'Video render failed. Try again in a moment.'),
    }, { status: 500 });
  }
}
