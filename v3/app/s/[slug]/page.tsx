import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getV3ConvexUrl } from "@/lib/convexEnv";
import { ShareSceneClient, type ShareRecord } from "./ShareSceneClient";

export const dynamic = "force-dynamic";

async function getInitialShare(slug: string): Promise<ShareRecord | null | undefined> {
  const convexUrl = getV3ConvexUrl();
  if (!convexUrl) return undefined;

  try {
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.sharePages.getBySlug, { slug }) as ShareRecord | null;
  } catch {
    return undefined;
  }
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const convexConfigured = Boolean(getV3ConvexUrl());
  const initialShare = convexConfigured ? await getInitialShare(slug) : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f2e8] px-4 py-8 text-slate-950 sm:px-8 sm:py-10">
      {convexConfigured ? (
        <ShareSceneClient slug={slug} initialShare={initialShare} />
      ) : (
        <section className="max-w-xl rounded-[32px] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em]">Convex missing</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Share pages need Convex.</h1>
          <p className="mt-4 text-base font-bold leading-7">
            Add NEXT_PUBLIC_V3_CONVEX_URL before opening v3 share links.
          </p>
        </section>
      )}
    </main>
  );
}
