import crypto from "node:crypto";
import { cookies } from "next/headers";

const paidCookieName = "wiggly_paid_until";
const sessionCookieName = "wiggly_session";
const dayMs = 24 * 60 * 60 * 1000;

const isDisabled = (value: string | undefined) => ["0", "false", "off", "no"].includes(String(value || "").trim().toLowerCase());

export const isPaywallEnabled = (
  nodeEnv = process.env.NODE_ENV,
  paywallEnabled = process.env.PAYWALL_ENABLED,
) => nodeEnv === "production" && !isDisabled(paywallEnabled);
export const freeWorkflowRunLimit = () => Number(process.env.FREE_WORKFLOW_RUN_LIMIT || 2);
export const freeWorkflowResetDays = () => Number(process.env.FREE_WORKFLOW_RESET_DAYS || 7);
export const paidPassDays = () => Number(process.env.PAID_PASS_DAYS || 7);
export const paidPassPriceCents = () => Number(process.env.PAID_PASS_PRICE_CENTS || 100);
export const earlyAccessMonthlyPriceCents = () => Number(process.env.EARLY_ACCESS_MONTHLY_PRICE_CENTS || 900);

const billingSecret = () => process.env.AI_BILL_SHIELD_SECRET || process.env.SESSION_SECRET || "wiggly-dev-billing";

export type WorkflowUsage = {
  count: number;
  resetAt: number;
};

const workflowRunCounts = new Map<string, WorkflowUsage>();

export function hasPaidAccess(paidUntil: number, now = Date.now()) {
  return paidUntil > now;
}

export function workflowRunResetMs() {
  return freeWorkflowResetDays() * dayMs;
}

export function readWorkflowUsageSnapshot(
  current: WorkflowUsage | undefined,
  now = Date.now(),
  limit = freeWorkflowRunLimit(),
  resetMs = workflowRunResetMs(),
) {
  if (!current || current.resetAt <= now) {
    return { count: 0, remaining: limit, resetAt: now + resetMs };
  }

  return {
    count: current.count,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function consumeWorkflowUsageSnapshot(
  current: WorkflowUsage | undefined,
  now = Date.now(),
  limit = freeWorkflowRunLimit(),
  resetMs = workflowRunResetMs(),
) {
  const usage = readWorkflowUsageSnapshot(current, now, limit, resetMs);
  if (usage.count >= limit) {
    return { ok: false, usage };
  }

  const nextUsage = {
    count: usage.count + 1,
    resetAt: usage.resetAt,
  };

  return {
    ok: true,
    usage: {
      ...nextUsage,
      remaining: Math.max(0, limit - nextUsage.count),
    },
  };
}

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
  return readWorkflowUsageSnapshot(current, now);
}

export function consumeWorkflowRun(sessionId: string) {
  const now = Date.now();
  const key = `workflow:${sessionId}`;
  const current = workflowRunCounts.get(key);
  const result = consumeWorkflowUsageSnapshot(current, now);
  if (result.ok) {
    workflowRunCounts.set(key, {
      count: result.usage.count,
      resetAt: result.usage.resetAt,
    });
  }

  return {
    ok: result.ok,
    remaining: result.usage.remaining,
    resetAt: result.usage.resetAt,
  };
}

export async function getBillingStatus() {
  const sessionId = await getOrSetBillingSessionId();
  const paidUntil = await readPaidUntil(sessionId);
  const usage = readWorkflowUsage(sessionId);
  const paid = hasPaidAccess(paidUntil);
  if (!isPaywallEnabled()) {
    return {
      paid: true,
      paidUntil: 0,
      freeLimit: freeWorkflowRunLimit(),
      freeUsed: 0,
      freeRemaining: null,
      resetAt: usage.resetAt,
    };
  }
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
