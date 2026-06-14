import { NextResponse } from "next/server";
import {
  earlyAccessMonthlyPriceCents,
  getOrSetBillingSessionId,
  paidPassDays,
  paidPassPriceCents,
} from "@/lib/billing";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
  }

  const sessionId = await getOrSetBillingSessionId();
  const origin = process.env.APP_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("client_reference_id", sessionId);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(paidPassPriceCents()));
  params.set("line_items[0][price_data][product_data][name]", "Wiggly 7-day starter pass");
  params.set("line_items[1][quantity]", "1");
  params.set("line_items[1][price_data][currency]", "usd");
  params.set("line_items[1][price_data][unit_amount]", String(earlyAccessMonthlyPriceCents()));
  params.set("line_items[1][price_data][recurring][interval]", "month");
  params.set("line_items[1][price_data][product_data][name]", "Wiggly early access");
  params.set("subscription_data[trial_period_days]", String(paidPassDays()));
  params.set("subscription_data[metadata][wiggly_session_id]", sessionId);
  params.set("success_url", `${origin}/create?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${origin}/create?checkout=cancelled`);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = await response.json();
  if (!response.ok || !payload?.url) {
    return NextResponse.json({ error: payload?.error?.message || "Could not start checkout." }, { status: response.status || 500 });
  }

  return NextResponse.json({ url: payload.url });
}
