"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "@/features/waitlist/email";

export function WaitlistSignupForm() {
  const params = useSearchParams();
  const joinWaitlist = useAction(api.waitlist.joinAndSync);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = normalizeWaitlistEmail(email);
    if (!isValidWaitlistEmail(normalizedEmail)) {
      setStatus("error");
      setErrorMessage("Enter a real email address.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    try {
      await joinWaitlist({
        email: normalizedEmail,
        source: params.get("utm_source") || params.get("ref") || "waitlist",
        utmSource: params.get("utm_source") || undefined,
        utmMedium: params.get("utm_medium") || undefined,
        utmCampaign: params.get("utm_campaign") || undefined,
        utmContent: params.get("utm_content") || undefined,
        ref: params.get("ref") || undefined,
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent,
      });
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not join yet. Try again.");
    }
  };

  if (status === "ready") {
    return (
      <div className="mt-9 max-w-xl rounded-lg border-2 border-[#080817] bg-[#C9FF55] p-4 shadow-[8px_9px_0_#080817]">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#080817]">You're on the list.</p>
        <p className="mt-2 text-base font-bold leading-6 text-[#30364d]">Open Wiggly and turn your first product page into a creative slate.</p>
        <Link
          href="/create"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border-2 border-[#080817] bg-[#080817] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5b38d7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b38d7]"
        >
          Enter Wiggly
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-9 max-w-xl">
      <form noValidate onSubmit={onSubmit} className="rounded-lg border-2 border-[#080817] bg-white p-3 shadow-[8px_9px_0_#080817]">
        <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#70788d]" htmlFor="waitlist-email">
          Join the private beta
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="waitlist-email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@brand.com"
            className="min-h-13 flex-1 rounded-lg border-2 border-[#d6d8df] bg-[#f7f7f3] px-4 text-base font-bold text-[#080817] outline-none transition placeholder:text-[#9ca3b3] focus:border-[#5b38d7] focus:bg-white focus:shadow-[0_0_0_4px_rgba(91,56,215,0.12)]"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="min-h-13 rounded-lg border-2 border-[#080817] bg-[#5b38d7] px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#4524bb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5b38d7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? "Joining..." : "Get early access"}
          </button>
        </div>
        {status === "error" ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{errorMessage}</p>
        ) : null}
      </form>
    </div>
  );
}
