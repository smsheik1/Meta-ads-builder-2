"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "@/features/waitlist/email";

export function WaitlistSignupForm() {
  const params = useSearchParams();
  const joinWaitlist = useMutation(api.waitlist.join);
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
      <div className="mt-8 max-w-xl rounded-[1.65rem] border border-[#d9ceff] bg-white/88 p-4 shadow-[0_24px_54px_rgba(38,25,91,0.12)] backdrop-blur">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#6845df]">You're on the list.</p>
        <p className="mt-2 text-base font-bold leading-6 text-[#30364d]">Enter Wiggly now and make your first creative pack.</p>
        <Link
          href="/create"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#07071a] px-5 text-sm font-black text-white shadow-[0_18px_40px_rgba(38,25,91,0.22)] transition hover:bg-[#17132d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c55ff]"
        >
          Enter Wiggly
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mt-8 max-w-xl rounded-[1.65rem] border border-white/80 bg-white/86 p-3 shadow-[0_24px_54px_rgba(38,25,91,0.12)] backdrop-blur">
      <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8d98b3]" htmlFor="waitlist-email">
        Work email
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
          className="min-h-13 flex-1 rounded-2xl border border-[#dce2ef] bg-[#f8faff] px-4 text-base font-bold text-[#07071a] outline-none transition placeholder:text-[#9aa6bd] focus:border-[#8c6cff] focus:bg-white focus:shadow-[0_0_0_4px_rgba(140,108,255,0.12)]"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="min-h-13 rounded-2xl bg-[#07071a] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(38,25,91,0.22)] transition hover:bg-[#17132d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c55ff] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Joining..." : "Get early access"}
        </button>
      </div>
      {status === "error" ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{errorMessage}</p>
      ) : null}
    </form>
  );
}
