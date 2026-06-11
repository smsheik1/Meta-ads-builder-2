"use client";

import { type ReactNode, useState } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { getV3ConvexUrl } from "@/lib/convexEnv";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = getV3ConvexUrl();
  const [client] = useState(() => (url ? new ConvexReactClient(url) : null));

  if (!client) {
    return (
      <>
        <div className="fixed inset-x-0 top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-amber-800">
          Convex not connected yet. Add NEXT_PUBLIC_V3_CONVEX_URL before Phase 1.
        </div>
        {children}
      </>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
