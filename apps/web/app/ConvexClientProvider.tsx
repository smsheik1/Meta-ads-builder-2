"use client";

import { type ReactNode, useState } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const [client] = useState(() => {
    return url ? new ConvexReactClient(url) : null;
  });

  if (!client) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-8">
        <section className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Convex missing
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950">
            Add NEXT_PUBLIC_CONVEX_URL to run Create v2.
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            Start Convex locally or connect a Convex deployment before using this app.
          </p>
        </section>
      </main>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
