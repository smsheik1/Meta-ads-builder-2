"use client";

import { useEffect, useState } from "react";
import { AdRenderSurface } from "@/features/render/AdRenderSurface";
import { talkingFishNewsProofScene } from "@/features/formats/talking-fish-news/fixture";

const durationSeconds = talkingFishNewsProofScene.layout.durationMs / 1000;

export function TalkingFishNewsProofClient() {
  const [timeSeconds, setTimeSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const syncTime = () => setTimeSeconds(((Date.now() - startedAt) / 1000) % durationSeconds);
    syncTime();
    const interval = window.setInterval(syncTime, 100);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-[405px] overflow-hidden rounded-[18px] border-2 border-slate-900 bg-slate-950 shadow-[10px_10px_0_#101828]">
      <AdRenderSurface scene={talkingFishNewsProofScene} timeSeconds={timeSeconds} />
    </div>
  );
}
