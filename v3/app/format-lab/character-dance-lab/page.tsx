import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const repository = "/format-repositories/mixamo-character-motion-v1";

export const metadata: Metadata = {
  title: "Character Dance Lab — Wiggly",
  description: "Audition 25 Mixamo motions on SpongeBob, Squilliam Fancyson, and Mr. Krabs.",
};

export default function CharacterDanceLabPage() {
  const labUrl = `${repository}/runtime/renderer/index.html?mode=lab`;

  return (
    <main className="min-h-screen bg-[#040b13] text-white">
      <header className="border-b border-cyan-300/20 bg-[#07111f]">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Wiggly / Format Lab</p>
              <h1 className="mt-1 text-xl font-black tracking-tight">Character Dance Lab</h1>
            </div>
            <Badge className="bg-amber-300 text-amber-950 hover:bg-amber-300">25-motion proof</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-cyan-300/40 bg-transparent text-cyan-100 hover:bg-cyan-300/10 hover:text-white">
              <a href={labUrl} target="_blank" rel="noreferrer">Open full screen</a>
            </Button>
            <Button asChild className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              <a href={`${repository}/downloads/wiggly-mixamo-character-motion-format-kit.zip`} download>Download runnable kit</a>
            </Button>
          </div>
        </div>
      </header>

      <iframe
        className="h-[calc(100vh-81px)] min-h-[760px] w-full border-0 bg-[#06101c]"
        src={labUrl}
        title="Interactive Character Dance Lab"
        data-testid="character-dance-lab"
      />
    </main>
  );
}
