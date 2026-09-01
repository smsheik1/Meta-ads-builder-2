"use client";

import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import posthog from "posthog-js";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  normalizeDiscoverySubmission,
  type DiscoverySubmissionInput,
  validateDiscoverySubmission,
} from "@/features/discovery/submission";

const emptySubmission: DiscoverySubmissionInput = {
  creatorName: "",
  contactEmail: "",
  formatUrl: "",
  outputUrls: ["", "", ""],
  promise: "",
  sourceCredit: "",
};

export function DiscoverySubmissionForm() {
  const submitFormat = useMutation(api.discoverySubmissions.submit);
  const [submission, setSubmission] = useState(emptySubmission);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState("");

  const update = <Key extends keyof DiscoverySubmissionInput>(
    key: Key,
    value: DiscoverySubmissionInput[Key],
  ) => {
    setSubmission((current) => ({ ...current, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeDiscoverySubmission(submission);
    const validationError = validateDiscoverySubmission(normalized);
    if (validationError) {
      setStatus("error");
      setError(validationError);
      return;
    }

    setStatus("loading");
    setError("");
    try {
      await submitFormat(normalized);
      posthog.capture("format_submission_completed");
      setStatus("ready");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Could not send this Format. Try again.");
    }
  };

  if (status === "ready") {
    return (
      <div className="rounded-lg border-2 border-[#080817] bg-[#c9ff55] p-7 shadow-[7px_7px_0_#080817]">
        <Check className="size-10" aria-hidden="true" />
        <h2 className="mt-5 text-4xl font-black leading-none">It is in the review pile.</h2>
        <p className="mt-4 max-w-lg text-base font-bold leading-6 text-[#30374b]">
          Wiggly will review the proof, the recipe, and the credit before anything goes public.
        </p>
        <Button
          type="button"
          onClick={() => {
            setSubmission(emptySubmission);
            setStatus("idle");
          }}
          className="mt-6 min-h-12 border-2 border-[#080817] bg-[#080817] px-5 font-black text-white"
        >
          Send another Format
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="rounded-lg border-2 border-[#080817] bg-white p-5 shadow-[7px_7px_0_#080817] sm:p-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="creator-name" className="font-black">Your name</Label>
          <Input
            id="creator-name"
            value={submission.creatorName}
            onChange={(event) => update("creatorName", event.target.value)}
            autoComplete="name"
            placeholder="Maya Chen"
            className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="contact-email" className="font-black">Email</Label>
          <Input
            id="contact-email"
            type="email"
            inputMode="email"
            value={submission.contactEmail}
            onChange={(event) => update("contactEmail", event.target.value)}
            autoComplete="email"
            placeholder="you@studio.com"
            className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Label htmlFor="format-url" className="font-black">Format link or package URL</Label>
        <Input
          id="format-url"
          type="url"
          inputMode="url"
          value={submission.formatUrl}
          onChange={(event) => update("formatUrl", event.target.value)}
          placeholder="https://..."
          className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
        />
      </div>

      <fieldset className="mt-6 grid gap-3">
        <legend className="font-black">Three real output links</legend>
        <p className="text-sm font-bold text-[#667087]">Show three finished ads made with this Format.</p>
        {submission.outputUrls.map((url, index) => (
          <div key={index} className="grid grid-cols-[28px_1fr] items-center gap-3">
            <span className="text-center text-sm font-black text-[#667087]">{index + 1}</span>
            <Input
              aria-label={`Output ${index + 1} URL`}
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => {
                const next = [...submission.outputUrls];
                next[index] = event.target.value;
                update("outputUrls", next);
              }}
              placeholder="https://..."
              className="h-12 border-2 border-[#aeb6c7] bg-[#fffdf8] px-4 font-bold focus-visible:ring-[#52d6ff]"
            />
          </div>
        ))}
      </fieldset>

      <div className="mt-6 grid gap-2">
        <div className="flex items-end justify-between gap-4">
          <Label htmlFor="format-promise" className="font-black">What does it make easy?</Label>
          <span className="text-xs font-black text-[#667087]">{submission.promise.length}/160</span>
        </div>
        <Textarea
          id="format-promise"
          value={submission.promise}
          onChange={(event) => update("promise", event.target.value)}
          maxLength={160}
          placeholder="Turn a product mechanism into a clear 20-second story."
          className="min-h-24 resize-y border-2 border-[#aeb6c7] bg-[#fffdf8] p-4 font-bold leading-6 focus-visible:ring-[#52d6ff]"
        />
      </div>

      <div className="mt-6 grid gap-2">
        <Label htmlFor="source-credit" className="font-black">Source or remix credit</Label>
        <Textarea
          id="source-credit"
          value={submission.sourceCredit}
          onChange={(event) => update("sourceCredit", event.target.value)}
          maxLength={300}
          placeholder="Original work, or name the Format you remixed."
          className="min-h-20 resize-y border-2 border-[#aeb6c7] bg-[#fffdf8] p-4 font-bold leading-6 focus-visible:ring-[#52d6ff]"
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="mt-5 rounded-md border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={status === "loading"}
        className="mt-6 min-h-14 w-full border-2 border-[#080817] bg-[#080817] px-6 text-base font-black text-white shadow-[4px_4px_0_#52d6ff]"
      >
        {status === "loading" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {status === "loading" ? "Sending..." : "Send for review"}
        {status !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
      </Button>
      <p className="mt-4 text-center text-xs font-bold leading-5 text-[#667087]">
        Nothing is published automatically.
      </p>
    </form>
  );
}
