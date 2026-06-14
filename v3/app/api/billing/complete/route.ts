import { NextResponse } from "next/server";
import {
  getBillingStatus,
  getOrSetBillingSessionId,
  paidUntilFromNow,
  setPaidUntil,
} from "@/lib/billing";

type StripeSubscription = {
  current_period_end?: number;
  status?: string;
  trial_end?: number;
};

function paidUntilFromCheckoutPayload(payload: { subscription?: string | StripeSubscription | null }) {
  const subscription = typeof payload.subscription === "object" && payload.subscription ? payload.subscription : null;
  const stripePeriodEndSeconds = subscription?.trial_end || subscription?.current_period_end || 0;
  return stripePeriodEndSeconds ? stripePeriodEndSeconds * 1000 : paidUntilFromNow();
}

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
  const params = new URLSearchParams();
  params.set("expand[0]", "subscription");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}?${params}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  const payload = await response.json();
  const subscription = typeof payload?.subscription === "object" && payload.subscription ? payload.subscription as StripeSubscription : null;
  const subscriptionIsValid = subscription?.status === "trialing" || subscription?.status === "active";
  if (!response.ok || !subscriptionIsValid || payload?.client_reference_id !== sessionId) {
    return NextResponse.json({ error: "Payment is not complete yet." }, { status: 402 });
  }

  const paidUntil = paidUntilFromCheckoutPayload(payload);
  await setPaidUntil(sessionId, paidUntil);
  return NextResponse.json({ ...(await getBillingStatus()), paid: true, paidUntil });
}
