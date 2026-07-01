import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "../features/waitlist/email";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

assert.equal(normalizeWaitlistEmail("  SHAZ@WIGGLY.SO "), "shaz@wiggly.so");
assert.equal(isValidWaitlistEmail("shaz@wiggly.so"), true);
assert.equal(isValidWaitlistEmail("not-an-email"), false);

const homePage = read("app/page.tsx");
assert.ok(homePage.includes("WaitlistPage"), "Root route should render early access page.");
assert.ok(!homePage.includes("redirect(\"/create\")"), "Root route should not redirect straight to /create.");
assert.ok(existsSync(join(root, "app/waitlist/page.tsx")), "/waitlist route should exist.");

const schema = read("convex/schema.ts");
assert.ok(schema.includes("waitlistSignups"), "Convex schema should store waitlist signups.");
assert.ok(schema.includes(".index(\"by_email\""), "Waitlist signups should dedupe by email.");

console.log("waitlist tests passed");
