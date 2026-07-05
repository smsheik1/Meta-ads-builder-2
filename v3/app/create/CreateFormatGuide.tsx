"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CreateFormatId } from "./createFormats";
import {
  CREATE_FORMAT_GUIDES,
  CREATE_FORMAT_GUIDE_ORDER,
  type CreateFormatGuide,
} from "./createFormatEducation";

function GuideInitial({ guide, selected = false }: { guide: CreateFormatGuide; selected?: boolean }) {
  return (
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-2xl text-xs font-black ${selected ? "bg-white text-slate-950" : "text-white"}`}
      style={{ backgroundColor: selected ? undefined : guide.accent }}
      aria-hidden="true"
    >
      {guide.label.slice(0, 1)}
    </span>
  );
}

export function SelectedCreateFormatBento({ format }: { format: CreateFormatId }) {
  const guide = CREATE_FORMAT_GUIDES[format];
  const needs = guide.needs.join(", ");

  return (
    <div className="mt-3 grid grid-cols-2 gap-2" data-create-format-bento="true">
      <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start gap-3">
          <GuideInitial guide={guide} />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Best for</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {guide.bestFor.map((chip) => (
                <span key={chip} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Output</p>
        <p className="mt-1 text-sm font-black text-slate-950">{guide.output}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Needs</p>
        <p className="mt-1 text-sm font-black text-slate-950">{needs} · {guide.cost}</p>
      </div>
      <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Why it works</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{guide.why}</p>
      </div>
    </div>
  );
}

function CompareCard({
  guide,
  onSelect,
  selected,
}: {
  guide: CreateFormatGuide;
  onSelect: (format: CreateFormatId) => void;
  selected: boolean;
}) {
  return (
    <SheetClose asChild>
      <button
        type="button"
        onClick={() => onSelect(guide.format)}
        className={`group min-h-48 rounded-[26px] border p-4 text-left transition ${
          selected
            ? "border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-950/15"
            : "border-slate-200 bg-white text-slate-950 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-950/8"
        }`}
        data-create-format-guide-card={guide.format}
      >
        <div className="flex items-start justify-between gap-3">
          <GuideInitial guide={guide} selected={selected} />
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${selected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"}`}>
            {guide.output}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-black tracking-normal">{guide.label}</h3>
        <p className={`mt-2 text-sm font-black leading-5 ${selected ? "text-white/85" : "text-slate-600"}`}>
          {guide.promise}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {guide.bestFor.map((chip) => (
            <span
              key={chip}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${selected ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-600"}`}
            >
              {chip}
            </span>
          ))}
        </div>
        <p className={`mt-4 text-xs font-semibold leading-5 ${selected ? "text-white/70" : "text-slate-500"}`}>
          {guide.why}
        </p>
        <div className="mt-4 grid gap-2">
          <div className={`rounded-2xl border px-3 py-2 ${selected ? "border-white/10 bg-white/10" : "border-emerald-100 bg-emerald-50/70"}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${selected ? "text-white/55" : "text-emerald-700"}`}>Best when</p>
            <p className={`mt-1 text-xs font-black leading-5 ${selected ? "text-white/85" : "text-slate-700"}`}>{guide.bestForExample}</p>
          </div>
          <div className={`rounded-2xl border px-3 py-2 ${selected ? "border-white/10 bg-white/5" : "border-rose-100 bg-rose-50/60"}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${selected ? "text-white/55" : "text-rose-600"}`}>Skip when</p>
            <p className={`mt-1 text-xs font-semibold leading-5 ${selected ? "text-white/75" : "text-slate-600"}`}>{guide.skipWhen}</p>
          </div>
        </div>
      </button>
    </SheetClose>
  );
}

export function CreateFormatCompareSheet({
  format,
  onFormatChange,
}: {
  format: CreateFormatId;
  onFormatChange: (format: CreateFormatId) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-full border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 shadow-sm hover:bg-slate-50"
          data-create-format-compare-trigger
        >
          Compare formats
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(94vw,900px)] overflow-y-auto border-slate-200 bg-[#F8F4EA] p-5 sm:max-w-none"
        data-create-format-compare-sheet
      >
        <SheetHeader className="pr-8">
          <SheetTitle className="text-3xl font-black tracking-normal text-slate-950">Pick the right creative</SheetTitle>
          <SheetDescription className="text-sm font-semibold leading-6 text-slate-600">
            Creative Pack is the best first move. These cards explain what each individual format is for when you want to steer the next generation.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {CREATE_FORMAT_GUIDE_ORDER.map((item) => {
            const guide = CREATE_FORMAT_GUIDES[item];
            return (
              <CompareCard
                key={item}
                guide={guide}
                onSelect={onFormatChange}
                selected={format === item}
              />
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
