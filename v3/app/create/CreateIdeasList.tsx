import type { AdScene } from "@/features/scene/types";

export function CreateIdeasList({
  scenes,
  selectedSceneIndex,
  onSelectScene,
}: {
  scenes: AdScene[];
  selectedSceneIndex: number;
  onSelectScene: (scene: AdScene, index: number) => void;
}) {
  if (!scenes.length) return null;

  return (
    <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <p className="text-sm font-black uppercase tracking-[0.26em] text-slate-400">All ideas</p>
      <div className="mt-4 grid max-h-[440px] gap-3 overflow-auto pr-2">
        {scenes.map((scene, index) => (
          <button
            type="button"
            key={`${scene.metadata.generationBatchId}-${scene.metadata.candidateIndex}-${index}`}
            onClick={() => onSelectScene(scene, index)}
            className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
              selectedSceneIndex === index
                ? "border-slate-950 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {scene.creative.headlineType.replace(/_/g, " ")}
              </span>
              <span className="text-xs font-black text-slate-400">
                #{scene.metadata.candidateIndex + 1}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">
              {scene.creative.headline}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-600">
              {scene.creative.subheadline}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
