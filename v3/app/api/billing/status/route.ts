import { NextResponse } from "next/server";
import { getBillingStatus } from "@/lib/billing";

export async function GET() {
  return NextResponse.json(await getBillingStatus());
}
