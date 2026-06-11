import { NextResponse } from "next/server";
import {
  getBillingStatus,
  getOrSetBillingSessionId,
  paidUntilFromNow,
  setPaidUntil,
} from "@/lib/billing";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const checkoutSessionId = String(body?.sessionId || "").trim();
  if (!checkoutSessionId) {
    return NextResponse.json({ error: "Checkout session is required." }, { status: 400 });
  }

  const sessionId = await getOrSetBillingSessionId();
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  const payload = await response.json();
  if (!response.ok || payload?.payment_status !== "paid" || payload?.client_reference_id !== sessionId) {
    return NextResponse.json({ error: "Payment is not complete yet." }, { status: 402 });
  }

  const paidUntil = paidUntilFromNow();
  await setPaidUntil(sessionId, paidUntil);
  return NextResponse.json({ ...(await getBillingStatus()), paid: true, paidUntil });
}
