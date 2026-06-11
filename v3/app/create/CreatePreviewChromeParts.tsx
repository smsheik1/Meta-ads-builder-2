"use client";

import { Battery, Signal, Wifi } from "lucide-react";

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export function BrandAvatar({
  logoUrl,
  brandName,
  sizeClass = "size-12",
}: {
  brandName: string;
  logoUrl?: string | null;
  sizeClass?: string;
}) {
  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-full border-2 border-fuchsia-500 bg-white p-1 shadow-[inset_0_0_0_2px_rgba(249,115,22,0.55)]`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-full rounded-full object-contain"
          src={logoUrl}
        />
      ) : (
        <span className="grid size-full place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
          {brandName.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function StatusBar({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className={cx("flex items-center justify-between text-[12px] font-black", isDark ? "text-white" : "text-slate-900")}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <Battery className="size-4" strokeWidth={2.5} />
      </div>
    </div>
  );
}
