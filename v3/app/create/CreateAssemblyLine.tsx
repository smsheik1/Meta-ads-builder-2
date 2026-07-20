"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { type ReactNode, useState } from "react";

export type CreateAssemblyStageStatus = "ready" | "failed" | "building" | "needs";

export type CreateAssemblyStage = {
  id: string;
  label: string;
  compactLabel?: string;
  kicker: string;
  icon: ReactNode;
  status: CreateAssemblyStageStatus;
  content: ReactNode;
};

const numberTone = (status: CreateAssemblyStageStatus, active: boolean) => {
  if (active) return "bg-white text-slate-950";
  if (status === "failed") return "bg-red-50 text-red-600";
  if (status === "building") return "bg-sky-50 text-sky-600";
  if (status === "ready") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-400";
};

const compactStageTone = (status: CreateAssemblyStageStatus, active: boolean) => {
  if (status === "ready") return "text-emerald-600";
  if (status === "failed") return "text-red-600";
  if (status === "building") return "text-sky-600";
  if (active) return "text-slate-800";
  return "text-slate-400";
};

export function CreateAssemblyLine({
  defaultStageId,
  error,
  stages,
}: {
  defaultStageId: string;
  error?: string;
  stages: CreateAssemblyStage[];
}) {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const selectedStageId = stages.some((stage) => stage.id === activeStageId) ? activeStageId! : defaultStageId;
  const selectedStage = stages.find((stage) => stage.id === selectedStageId) || stages[0];

  return (
    <section
      className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/5"
      data-create-assembly-line="true"
    >
      <button
        type="button"
        onClick={() => setCollapsed((nextCollapsed) => !nextCollapsed)}
        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-2 text-left transition hover:bg-slate-50"
        aria-expanded={!collapsed}
        data-create-assembly-toggle="true"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Assembly line
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-black text-slate-700">
            {collapsed ? (
              <span className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] leading-none" data-create-assembly-compact-steps="true">
                {stages.map((stage, index) => {
                  const active = selectedStageId === stage.id;
                  return (
                    <span key={stage.id} className="flex items-center gap-1">
                      <span className={compactStageTone(stage.status, active)}>
                        {stage.compactLabel || stage.label}
                      </span>
                      {index < stages.length - 1 ? <ChevronRight className="size-3 shrink-0 text-slate-300" /> : null}
                    </span>
                  );
                })}
              </span>
            ) : "Collapse"}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition ${collapsed ? "" : "rotate-180"}`} />
      </button>

      {collapsed ? null : (
        <>
          <div className="mt-1 space-y-2" data-create-assembly-stages="true">
            {stages.map((stage, index) => {
              const active = selectedStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveStageId(stage.id)}
                  className={`group flex w-full items-center gap-3 rounded-[18px] border p-3 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border-slate-100 bg-slate-50 text-slate-950 hover:border-slate-200 hover:bg-white"
                  }`}
                  aria-pressed={active}
                  data-create-assembly-stage={stage.id}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-black ${numberTone(stage.status, active)}`}>
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-black leading-none">
                      {stage.icon}
                      {stage.label}
                    </span>
                    <span className={`mt-1 block truncate text-[10px] font-black uppercase tracking-[0.15em] ${
                      active ? "text-white/55" : "text-slate-400"
                    }`}>
                      {stage.kicker}
                    </span>
                  </span>
                  <ChevronRight className={`size-4 shrink-0 ${active ? "text-white" : "text-slate-300"}`} />
                </button>
              );
            })}
          </div>

          <div className="mt-3 max-h-[320px] overflow-y-auto rounded-[20px] border border-slate-100 bg-slate-50 p-3" data-create-assembly-content="true">
            {error ? (
              <p className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">
                {error}
              </p>
            ) : null}
            {selectedStage?.content}
          </div>
        </>
      )}
    </section>
  );
}
