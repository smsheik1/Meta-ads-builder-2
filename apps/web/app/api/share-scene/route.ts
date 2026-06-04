import { NextResponse } from 'next/server';
import type { AdScene } from '@/features/create/scene';
import { saveShareSceneRecord } from '@/features/share/shareSceneStore';

export const runtime = 'nodejs';

type ShareSceneRequest = {
  scene?: AdScene;
};

export async function POST(request: Request) {
  let body: ShareSceneRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (!body.scene?.id || !body.scene?.brand?.name || !body.scene?.creative?.headline) {
    return NextResponse.json({ error: 'A complete ad scene is required before creating a share link.' }, { status: 400 });
  }

  try {
    const record = await saveShareSceneRecord(body.scene);
    return NextResponse.json({
      slug: record.slug,
      shareUrl: `/s/${record.slug}`,
    });
  } catch (error) {
    console.error('[create-v2 share-scene]', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Could not create share link.',
    }, { status: 500 });
  }
}
