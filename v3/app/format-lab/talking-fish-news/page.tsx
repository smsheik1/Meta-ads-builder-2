import { TalkingFishNewsProofClient } from "./TalkingFishNewsProofClient";

export default function TalkingFishNewsProofPage() {
  return (
    <main className="min-h-screen bg-[#eaf8f5] px-5 py-10 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[405px_minmax(0,1fr)] lg:items-center">
        <TalkingFishNewsProofClient />
        <section>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-800">Wiggly proof</p>
          <h1 className="mt-3 text-4xl font-black leading-none">Talking Fish News</h1>
          <p className="mt-4 max-w-xl text-lg leading-7 text-slate-700">An original 18.45-second mini-report: fixed anchor, big visual proof, renderer captions, and one neutral narration track.</p>
          <ul className="mt-6 space-y-2 text-sm font-semibold text-slate-700">
            <li>Fixed anchor across every beat</li>
            <li>Four evidence-led proof changes</li>
            <li>No image or video provider call</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
