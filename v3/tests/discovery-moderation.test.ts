import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const clientSource = readFileSync("app/discover/DiscoveryClient.tsx", "utf8");
const moderationSource = readFileSync("convex/discoveryModeration.ts", "utf8");
const schemaSource = readFileSync("convex/schema.ts", "utf8");

assert.ok(
  clientSource.includes('get("curate") === "1"') &&
    clientSource.includes("curationButton") &&
    clientSource.includes("Hide from Discovery"),
  "Curation controls should be visible only in explicit curation mode.",
);
assert.ok(
  clientSource.includes("wiggly-owner-access-token") &&
    clientSource.includes("api.discoveryModeration.hide"),
  "Curation should reuse the existing private owner key.",
);
assert.ok(
  moderationSource.includes("WIGGLY_MAKER_ACCESS_TOKEN") &&
    moderationSource.indexOf("requireOwnerAccess(accessToken)") <
      moderationSource.indexOf('ctx.db.insert("discoveryHiddenEntries"'),
  "The server must validate owner access before hiding an entry.",
);
assert.equal(
  moderationSource.includes("NEXT_PUBLIC"),
  false,
  "The owner secret must never move into a public environment variable.",
);
assert.ok(
  schemaSource.includes("discoveryHiddenEntries") &&
    schemaSource.includes('.index("by_entryId", ["entryId"])'),
  "Hidden entries should persist globally without deleting their media or direct links.",
);

console.log("discovery moderation tests passed");
