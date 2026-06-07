import assert from "node:assert/strict";
import {
  isBlockedHostname,
  isPrivateIPv4,
  normalizePublicWebsiteUrl,
  normalizeWebsiteUrl,
} from "../features/research/url";

assert.equal(normalizeWebsiteUrl("ogtool.com").href, "https://ogtool.com/");
assert.equal(normalizeWebsiteUrl("HTTP://Example.com/path#section").href, "http://example.com/path");
assert.equal(normalizeWebsiteUrl("https://user:pass@Example.com/path").href, "https://example.com/path");

assert.equal(isPrivateIPv4("127.0.0.1"), true);
assert.equal(isPrivateIPv4("10.2.3.4"), true);
assert.equal(isPrivateIPv4("172.16.0.1"), true);
assert.equal(isPrivateIPv4("192.168.1.1"), true);
assert.equal(isPrivateIPv4("8.8.8.8"), false);

assert.equal(isBlockedHostname("localhost"), true);
assert.equal(isBlockedHostname("app.local"), true);
assert.equal(isBlockedHostname("::1"), true);
assert.equal(isBlockedHostname("ogtool.com"), false);

assert.throws(
  () => normalizePublicWebsiteUrl("localhost:3000"),
  /Local and private network websites cannot be researched/,
);
assert.throws(
  () => normalizePublicWebsiteUrl("ftp://example.com"),
  /Only http and https websites can be researched/,
);

console.log("research-url tests passed");
