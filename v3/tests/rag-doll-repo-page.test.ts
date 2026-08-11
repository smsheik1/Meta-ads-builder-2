import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { getPublishedDiscoveryEntries } from "../features/discovery/catalog";
import { getDiscoveryFormatProfile } from "../features/discovery/formatProof.server";
import { buildDiscoveryHandoffPrompt } from "../features/discovery/handoff";

const route = readFileSync("app/format-lab/rag-doll/page.tsx", "utf8");
assert.match(route, /SkaiImageFormatPage/);
assert.match(route, /rag-doll/);
assert.equal(
  existsSync("public/format-repositories/rag-doll-v1/downloads/wiggly-rag-doll-format-kit.zip"),
  true,
);

const profile = getDiscoveryFormatProfile("rag-doll");
assert.ok(profile?.handoff, "Rag Doll should offer a runnable agent handoff.");
assert.equal(profile.version, "1.0.0");
assert.equal(profile.technicalHref, "/format-lab/rag-doll");
assert.equal(profile.proofEntries.length, 7);
assert.equal(
  profile.proofEntries[0]?.media.src,
  "/format-repositories/rag-doll-v1/assets/source/carousel-02.jpg",
  "The hero should use the proof with the original photo visibly inset at the top-right.",
);
assert.ok(
  profile.proofEntries.every((entry) => entry.media.src.includes("carousel-")),
  "Every Rag Doll proof should use a source carousel image with its reference inset baked in.",
);
assert.equal(
  getPublishedDiscoveryEntries()
    .filter((entry) => entry.format.slug === "rag-doll").length,
  1,
  "The seven examples belong inside one Discoverable Format.",
);
assert.equal(
  profile.handoff.firstQuestion,
  "Which photo should I turn into a handmade felt character?",
);

const prompt = buildDiscoveryHandoffPrompt(profile, "https://wiggly.agentenamel.com");
assert.match(prompt, /latest published Wiggly Format/);
assert.match(prompt, /Never use a paid provider without my explicit approval/);
assert.doesNotMatch(prompt, /Exact public version:|Required inputs:|Working rules:/);
assert.ok(prompt.length < 1_000);

console.log("Rag Doll Repo page tests passed.");
