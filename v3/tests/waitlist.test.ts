import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "../features/waitlist/email";
import { syncWaitlistSignupToLoops } from "../features/waitlist/loops";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

assert.equal(normalizeWaitlistEmail("  SHAZ@WIGGLY.SO "), "shaz@wiggly.so");
assert.equal(isValidWaitlistEmail("shaz@wiggly.so"), true);
assert.equal(isValidWaitlistEmail("not-an-email"), false);

const homePage = read("app/page.tsx");
assert.ok(homePage.includes("WaitlistPage"), "Root route should render early access page.");
assert.ok(!homePage.includes("redirect(\"/create\")"), "Root route should not redirect straight to /create.");
assert.ok(existsSync(join(root, "app/waitlist/page.tsx")), "/waitlist route should exist.");

const waitlistPage = read("app/waitlist/WaitlistPage.tsx");
const formatCarousel = read("app/waitlist/WaitlistFormatCarousel.tsx");
assert.ok(waitlistPage.includes("WaitlistFormatCarousel"), "Waitlist hero should show the format carousel.");
assert.ok(waitlistPage.includes("Your product page, turned into ads worth watching."), "Waitlist hero should use the product-focused headline.");
assert.ok(!waitlistPage.includes("Launch blocker"), "Internal launch notes must never appear on the public homepage.");
assert.ok(!waitlistPage.includes("creative-pack-demo.mp4"), "The public homepage should not expose internal asset paths.");
assert.ok(formatCarousel.includes("Previous format") && formatCarousel.includes("Next format"), "Format carousel controls should be visible and accessible.");
assert.ok(formatCarousel.includes("setInterval"), "Format carousel should auto-rotate.");
assert.ok(formatCarousel.includes("three-d-breakdown") && formatCarousel.includes("video-meme"), "Format carousel should feature real Wiggly formats.");
assert.ok(
  formatCarousel.includes("homepage-dialogue.mp3") && formatCarousel.includes("Play Brainrot dialogue"),
  "Brainrot preview should expose a visible control for its real dialogue audio.",
);
assert.ok(
  formatCarousel.includes("brainrotPreviewBeats") && formatCarousel.includes("activeBeat.speaker"),
  "Brainrot preview should synchronize captions and speaker emphasis instead of showing two static characters.",
);
assert.ok(
  existsSync(join(root, "public/brainrot/homepage-dialogue.mp3")),
  "Brainrot preview dialogue should be bundled so the homepage does not depend on a provider call.",
);

const schema = read("convex/schema.ts");
assert.ok(schema.includes("waitlistSignups"), "Convex schema should store waitlist signups.");
assert.ok(schema.includes(".index(\"by_email\""), "Waitlist signups should dedupe by email.");

const loopsCalls: Array<{ url: string; method?: string; body: any }> = [];
await syncWaitlistSignupToLoops({
  email: "founder@wiggly.so",
  source: "linkedin",
  referrer: "https://linkedin.com/",
  utmSource: "li",
  utmCampaign: "launch",
  ref: "post",
}, {
  apiKey: "test-key",
  fetcher: async (url, init) => {
    loopsCalls.push({
      url,
      method: init.method,
      body: JSON.parse(String(init.body)),
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  },
});
assert.equal(loopsCalls[0].url, "https://app.loops.so/api/v1/contacts/update");
assert.equal(loopsCalls[0].method, "PUT");
assert.equal(loopsCalls[0].body.userGroup, "early-access");
assert.equal(loopsCalls[0].body.utmCampaign, "launch");
assert.equal(loopsCalls[1].url, "https://app.loops.so/api/v1/events/send");
assert.equal(loopsCalls[1].method, "POST");
assert.equal(loopsCalls[1].body.eventName, "waitlist_signup");
await assert.rejects(
  () => syncWaitlistSignupToLoops({ email: "founder@wiggly.so" }, { apiKey: "" }),
  /LOOPS_API_KEY/,
);
await assert.rejects(
  () => syncWaitlistSignupToLoops({ email: "founder@wiggly.so" }, {
    apiKey: "test-key",
    fetcher: async () => new Response("server exploded", { status: 500 }),
  }),
  /server exploded/,
);

console.log("waitlist tests passed");
