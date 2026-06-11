import crypto from "node:crypto";
import { cookies } from "next/headers";

const paidCookieName = "wiggly_paid_until";
const sessionCookieName = "wiggly_session";
const dayMs = 24 * 60 * 60 * 1000;

const isDisabled = (value: string | undefined) => ["0", "false", "off", "no"].includes(String(value || "").trim().toLowerCase());

export const isPaywallEnabled = () => !isDisabled(process.env.PAYWALL_ENABLED);
export const freeWorkflowRunLimit = () => Number(process.env.FREE_WORKFLOW_RUN_LIMIT || 2);
export const paidPassDays = () => Number(process.env.PAID_PASS_DAYS || 7);
export const paidPassPriceCents = () => Number(process.env.PAID_PASS_PRICE_CENTS || 100);

const billingSecret = () => process.env.AI_BILL_SHIELD_SECRET || process.env.SESSION_SECRET || "wiggly-dev-billing";

type WorkflowUsage = {
  count: number;
  resetAt: number;
};

const workflowRunCounts = new Map<string, WorkflowUsage>();

function sign(value: string) {
  return crypto
    .createHmac("sha256", billingSecret())
    .update(value)
    .digest("base64url");
}

function signedSessionCookie(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

function readSignedSessionId(rawCookie: string | undefined) {
  if (!rawCookie) return null;
  const [sessionId, signature] = rawCookie.split(".");
  if (!sessionId || !signature) return null;
  const expected = sign(sessionId);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? sessionId : null;
  } catch {
    return null;
  }
}

export async function getOrSetBillingSessionId() {
  const cookieStore = await cookies();
  const existing = readSignedSessionId(cookieStore.get(sessionCookieName)?.value);
  if (existing) return existing;

  const sessionId = crypto.randomUUID();
  cookieStore.set(sessionCookieName, signedSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: dayMs / 1000,
    path: "/",
  });
  return sessionId;
}

function signPaidUntil(sessionId: string, paidUntil: number) {
  return sign(`${sessionId}:${paidUntil}`);
}

export async function readPaidUntil(sessionId: string) {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(paidCookieName)?.value;
  if (!rawCookie) return 0;
  const [paidUntilText, signature] = rawCookie.split(".");
  const paidUntil = Number(paidUntilText);
  if (!Number.isFinite(paidUntil) || !signature || paidUntil <= Date.now()) return 0;
  const expected = signPaidUntil(sessionId, paidUntil);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? paidUntil : 0;
  } catch {
    return 0;
  }
}

export async function setPaidUntil(sessionId: string, paidUntil: number) {
  const cookieStore = await cookies();
  cookieStore.set(paidCookieName, `${paidUntil}.${signPaidUntil(sessionId, paidUntil)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.max(0, Math.floor((paidUntil - Date.now()) / 1000)),
    path: "/",
  });
}

export function readWorkflowUsage(sessionId: string) {
  const now = Date.now();
  const current = workflowRunCounts.get(`workflow:${sessionId}`);
  const limit = freeWorkflowRunLimit();
  if (!current || current.resetAt <= now) return { count: 0, remaining: limit, resetAt: now + dayMs };
  return {
    count: current.count,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function consumeWorkflowRun(sessionId: string) {
  const now = Date.now();
  const key = `workflow:${sessionId}`;
  const current = workflowRunCounts.get(key);
  const limit = freeWorkflowRunLimit();
  if (!current || current.resetAt <= now) {
    workflowRunCounts.set(key, { count: 1, resetAt: now + dayMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: now + dayMs };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }
  current.count += 1;
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export async function getBillingStatus() {
  const sessionId = await getOrSetBillingSessionId();
  const paidUntil = await readPaidUntil(sessionId);
  const usage = readWorkflowUsage(sessionId);
  const paid = paidUntil > Date.now();
  return {
    paid,
    paidUntil,
    freeLimit: freeWorkflowRunLimit(),
    freeUsed: usage.count,
    freeRemaining: paid ? null : usage.remaining,
    resetAt: usage.resetAt,
  };
}

export function paidUntilFromNow() {
  return Date.now() + paidPassDays() * dayMs;
}
