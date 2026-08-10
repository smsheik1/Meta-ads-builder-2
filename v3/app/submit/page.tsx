import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RepoSubmissionFlow } from "./RepoSubmissionFlow";

export const metadata: Metadata = {
  title: "Create a Wiggly Repo | Wiggly",
  description: "Import a project, scan its Wiggly Repo structure, and send it for testing.",
};

export default function SubmitFormatPage() {
  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#080817]">
      <header className="border-b-2 border-[#080817]">
        <div className="mx-auto flex min-h-[76px] w-[min(100%-32px,1380px)] items-center justify-between gap-4">
          <Link href="/discover" className="inline-flex items-center gap-2 text-sm font-black">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Discovery
          </Link>
          <Link href="/" aria-label="Wiggly home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="w-28 sm:w-36" src="/wiggly-wordmark-3d-crop.png" alt="Wiggly" />
          </Link>
        </div>
      </header>

      <section className="mx-auto w-[min(100%-32px,1100px)] py-8 lg:py-16">
        <RepoSubmissionFlow />
      </section>
    </main>
  );
}
