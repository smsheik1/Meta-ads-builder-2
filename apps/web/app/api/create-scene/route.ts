import { NextResponse } from 'next/server';
import { buildAdSceneFromWebsiteResearch } from '@/features/research/sceneFactory';
import { fetchWebsiteResearch } from '@/features/research/websiteResearch';

export const runtime = 'nodejs';

type CreateSceneRequest = {
  websiteUrl?: unknown;
};

export async function POST(request: Request) {
  let body: CreateSceneRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  if (typeof body.websiteUrl !== 'string' || !body.websiteUrl.trim()) {
    return NextResponse.json({ error: 'Enter a website URL.' }, { status: 400 });
  }

  try {
    const research = await fetchWebsiteResearch(body.websiteUrl);
    const scene = buildAdSceneFromWebsiteResearch(research);

    return NextResponse.json({ scene, research });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Something broke while researching that website.';

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
