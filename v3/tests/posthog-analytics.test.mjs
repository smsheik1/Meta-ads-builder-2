import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const instrumentation = readFileSync("instrumentation-client.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const workflow = readFileSync("../.github/workflows/deploy-v3-oracle.yml", "utf8");
const handoff = readFileSync("features/discovery/DiscoveryFormatHandoff.tsx", "utf8");
const submission = readFileSync("app/submit/DiscoverySubmissionForm.tsx", "utf8");
const waitlist = readFileSync("app/waitlist/WaitlistSignupForm.tsx", "utf8");

assert.match(instrumentation, /posthog\.init/);
assert.match(instrumentation, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
assert.match(instrumentation, /defaults: "2026-05-30"/);
assert.match(instrumentation, /autocapture: false/);
assert.match(instrumentation, /disable_session_recording: true/);
assert.match(envExample, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=/);
assert.doesNotMatch(envExample, /^POSTHOG_KEY=/m);
assert.match(workflow, /NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN/);
assert.match(workflow, /NEXT_PUBLIC_POSTHOG_HOST/);
assert.match(handoff, /format_handoff_started/);
assert.match(submission, /format_submission_completed/);
assert.match(waitlist, /waitlist_joined/);

console.log("PostHog analytics guardrails passed");
