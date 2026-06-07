import { ShareSceneClient } from "./ShareSceneClient";

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f2e8] px-8 py-10 text-slate-950">
      {convexConfigured ? (
        <ShareSceneClient slug={slug} />
      ) : (
        <section className="max-w-xl rounded-[32px] border border-amber-200 bg-amber-50 p-8 text-amber-900 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em]">Convex missing</p>
          <h1 className="mt-4 text-4xl font-black leading-tight">Share pages need Convex.</h1>
          <p className="mt-4 text-base font-bold leading-7">
            Add NEXT_PUBLIC_CONVEX_URL before opening v3 share links.
          </p>
        </section>
      )}
    </main>
  );
}
