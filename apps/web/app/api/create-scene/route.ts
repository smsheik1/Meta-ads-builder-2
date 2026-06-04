import { NextResponse } from 'next/server';
import { generateAdCopy } from '@/features/research/adCopy';
import { fetchResearchWithFirecrawl, firecrawlResearchWasUsed } from '@/features/research/firecrawl';
import { evaluateResearchQuality } from '@/features/research/researchQuality';
import { buildAdSceneFromWebsiteResearch } from '@/features/research/sceneFactory';

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
    const enrichedResearch = await fetchResearchWithFirecrawl(body.websiteUrl);
    if (!firecrawlResearchWasUsed(enrichedResearch)) {
      return NextResponse.json({
        error: 'Firecrawl research did not complete, so Wiggly cannot build a brand-based ad from this website yet.',
        research: enrichedResearch,
      }, { status: 422 });
    }

    const quality = evaluateResearchQuality(enrichedResearch);

    if (!quality.canGenerate) {
      return NextResponse.json({
        error: 'Wiggly read the page, but did not find enough specific selling evidence to make a trustworthy ad.',
        research: enrichedResearch,
        quality,
      }, { status: 422 });
    }

    const adCopy = await generateAdCopy(enrichedResearch);
    const research = {
      ...enrichedResearch,
      providerStatus: [
        ...enrichedResearch.providerStatus.filter((item) => item.provider !== 'openrouter'),
        adCopy.providerStatus,
      ],
    };
    const scene = buildAdSceneFromWebsiteResearch(research, { copy: adCopy.copy });

    return NextResponse.json({ scene, research, quality, adCopy });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Something broke while researching that website.';

    return NextResponse.json({ error: message }, { status: 422 });
  }
}
