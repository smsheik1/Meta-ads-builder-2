import Link from 'next/link';
import { ShareScenePage } from '@/features/share/ShareScenePage';
import { readShareSceneRecord } from '@/features/share/shareSceneStore';

export const dynamic = 'force-dynamic';

type SharePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const record = await readShareSceneRecord(slug);

  if (!record) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <section className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Share link expired
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950">
            This local share snapshot is not available.
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            Create a fresh share link from Wiggly to preview this ad.
          </p>
          <Link
            href="/create"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white"
          >
            Open Wiggly
          </Link>
        </section>
      </main>
    );
  }

  return <ShareScenePage record={record} />;
}
