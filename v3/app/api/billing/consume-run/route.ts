import { NextResponse } from "next/server";
import {
  consumeWorkflowRun,
  getBillingStatus,
  getOrSetBillingSessionId,
  isPaywallEnabled,
  readPaidUntil,
} from "@/lib/billing";

export async function POST() {
  if (!isPaywallEnabled()) return NextResponse.json(await getBillingStatus());

  const sessionId = await getOrSetBillingSessionId();
  const paidUntil = await readPaidUntil(sessionId);
  if (paidUntil > Date.now()) return NextResponse.json(await getBillingStatus());

  const usage = consumeWorkflowRun(sessionId);
  if (!usage.ok) {
    return NextResponse.json({
      error: "You used your 2 free Wiggly runs. Unlock more for $1.",
      code: "PAYWALL_REQUIRED",
      freeRemaining: 0,
      resetAt: usage.resetAt,
    }, { status: 402 });
  }

  return NextResponse.json(await getBillingStatus());
}
