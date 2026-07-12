import { NextResponse } from "next/server";
import { analyzeMakerReference } from "@/features/builder/referenceAnalysis.server";

export const runtime = "nodejs";
export const maxDuration = 300;

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.WIGGLY_MAKER_LIVE_ANALYSIS !== "true") {
    return NextResponse.json({ error: "Live Maker analysis is disabled." }, { status: 503 });
  }
  try {
    const form = await request.formData();
    const file = form.get("reference");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose one reference image." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Reference must be a PNG, JPG, or WebP image." }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Reference image must be smaller than 12 MB." }, { status: 400 });
    return NextResponse.json(await analyzeMakerReference(file));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reference analysis failed.";
    console.error("[wiggly:maker-analysis] stopped", { message });
    return NextResponse.json({ error: `Analysis stopped: ${message} Nothing was repaired or retried.` }, { status: 422 });
  }
}
