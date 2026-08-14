import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const v3Root = path.resolve(scriptRoot, "..");
const outputPath = path.join(
  v3Root,
  "public/format-repositories/bikini-bottom-dance-off-v1/agent-runs/voice-discovery/raw-fish-model-search.json",
);

const targets = [
  {
    characterIds: ["sonic-modern"],
    label: "Sonic the Hedgehog (Modern)",
    queries: ["Sonic the Hedgehog", "Modern Sonic"],
  },
  {
    characterIds: ["flynn-rider"],
    label: "Flynn Rider",
    queries: ["Flynn Rider", "Eugene Fitzherbert"],
  },
  {
    characterIds: ["kermit-pirate", "kermit-sci-fi"],
    label: "Kermit the Frog",
    queries: ["Kermit the Frog", "Kermit"],
  },
  {
    characterIds: ["agent-p"],
    label: "Agent P / Perry the Platypus",
    queries: ["Perry the Platypus", "Agent P"],
  },
  {
    characterIds: ["mario"],
    label: "Mario",
    queries: ["Super Mario", "Mario"],
  },
  {
    characterIds: ["olaf"],
    label: "Olaf",
    queries: ["Olaf Frozen", "Olaf"],
  },
  {
    characterIds: ["aqua"],
    label: "Aqua (Kingdom Hearts)",
    queries: ["Aqua Kingdom Hearts", "Aqua KH"],
  },
  {
    characterIds: ["ratchet"],
    label: "Ratchet",
    queries: ["Ratchet and Clank", "Ratchet"],
  },
  {
    characterIds: ["larry"],
    label: "Larry the Lobster",
    queries: ["Larry the Lobster", "Larry Lobster SpongeBob"],
  },
  {
    characterIds: ["man-ray"],
    label: "Man Ray",
    queries: ["Man Ray SpongeBob", "Manray SpongeBob"],
  },
  {
    characterIds: ["batman-animated"],
    label: "Batman (Animated Series)",
    queries: ["Batman Animated Series", "Kevin Conroy Batman"],
  },
  {
    characterIds: ["batman-beyond"],
    label: "Batman Beyond / Terry McGinnis",
    queries: ["Batman Beyond", "Terry McGinnis"],
  },
  {
    characterIds: ["dr-doofenshmirtz"],
    label: "Dr. Doofenshmirtz",
    queries: ["Dr Doofenshmirtz", "Heinz Doofenshmirtz"],
  },
  {
    characterIds: ["ferb"],
    label: "Ferb Fletcher",
    queries: ["Ferb Fletcher", "Ferb"],
  },
  {
    characterIds: ["phineas"],
    label: "Phineas Flynn",
    queries: ["Phineas Flynn", "Phineas"],
  },
];

const skippedExistingVoices = [
  { characterId: "spongebob", referenceId: "9845e056f37b470d9a1005e41c864e25" },
  { characterId: "patrick", referenceId: "d1520b60870b4e9aa01eab5bfefb1c45" },
  { characterId: "mr-krabs", referenceId: "394d3112f0da41049c42177f3ca31c5a" },
  { characterId: "squilliam", referenceId: "f12d545dcc1149bab3b68bba84822a1e" },
  { characterId: "squidward", referenceId: "1b28ff723a204fe08c26d8695f796b84" },
  { characterId: "sandy", referenceId: "783d32b03d0c4ff28dd66455364d8665" },
];

const knownFutureVoices = [
  {
    characterId: "spider-man",
    rosterStatus: "not-yet-motion-ready",
    referenceId: "c9c0183c624d4b85a1345bc2ec4a10bf",
    source: "user-supplied",
  },
];

const apiKey = process.env.FISH_STUDIO_APIKEY?.trim();
if (!apiKey) {
  throw new Error("FISH_STUDIO_APIKEY is missing. Load the definitive secrets.env before running this audit.");
}

const requestedCharacter = process.argv
  .find((argument) => argument.startsWith("--character="))
  ?.slice("--character=".length);
const selectedTargets = requestedCharacter
  ? targets.filter((target) => target.characterIds.includes(requestedCharacter))
  : targets;
if (selectedTargets.length === 0) {
  throw new Error(`Unknown voice-audit character: ${requestedCharacter}`);
}

function compactModel(model) {
  return {
    referenceId: model._id,
    title: model.title,
    description: model.description || "",
    state: model.state,
    type: model.type,
    visibility: model.visibility,
    languages: model.languages || [],
    tags: model.tags || [],
    taskCount: model.task_count || 0,
    likeCount: model.like_count || 0,
    author: model.author
      ? { id: model.author._id, nickname: model.author.nickname }
      : null,
    samples: (model.samples || []).map((sample) => ({
      title: sample.title || "",
      text: sample.text || "",
      audioUrl: sample.audio || "",
    })),
  };
}

async function searchModels(title) {
  const models = [];
  for (let pageNumber = 1; pageNumber <= 4; pageNumber += 1) {
    const url = new URL("https://api.fish.audio/model");
    url.searchParams.set("title", title);
    url.searchParams.set("page_size", "50");
    url.searchParams.set("page_number", String(pageNumber));
    url.searchParams.set("sort_by", "task_count");
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Fish Audio model search failed with ${response.status}: ${body.slice(0, 240)}`);
    }
    const payload = await response.json();
    models.push(...(payload.items || []));
    if (!payload.has_more) {
      return { total: payload.total || models.length, models };
    }
  }
  return { total: models.length, models, truncated: true };
}

const searches = [];
for (const [index, target] of selectedTargets.entries()) {
  console.log(`[${index + 1}/${selectedTargets.length}] ${target.label}`);
  const queryEvidence = [];
  const candidates = new Map();
  for (const query of target.queries) {
    const result = await searchModels(query);
    queryEvidence.push({ query, total: result.total, truncated: Boolean(result.truncated) });
    for (const model of result.models) {
      if (model.type !== "tts" || model.state !== "trained" || model.dmca_taken_down) continue;
      const existing = candidates.get(model._id);
      if (existing) {
        existing.matchedQueries.push(query);
      } else {
        candidates.set(model._id, {
          ...compactModel(model),
          matchedQueries: [query],
        });
      }
    }
  }
  searches.push({
    characterIds: target.characterIds,
    label: target.label,
    queries: queryEvidence,
    candidates: [...candidates.values()].sort(
      (left, right) => right.taskCount - left.taskCount || right.likeCount - left.likeCount,
    ),
  });
}

const audit = {
  schemaVersion: 1,
  provider: "Fish Audio",
  endpoint: "GET https://api.fish.audio/model",
  queriedAt: new Date().toISOString(),
  policy: "Search only. No TTS generation. Existing voices are skipped. Multiple credible candidates require user selection.",
  roster: {
    motionReadyCharacters: 22,
    skippedExistingVoices,
    searchedVoiceIdentities: selectedTargets.length,
    searchedCharacterIds: selectedTargets.reduce(
      (count, target) => count + target.characterIds.length,
      0,
    ),
    knownFutureVoices,
  },
  searches,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
