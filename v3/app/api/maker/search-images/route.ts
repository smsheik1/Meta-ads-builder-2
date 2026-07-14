import { NextResponse } from "next/server";
import { searchSerperImages } from "@/features/formats/static-package/imageSearch.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const query = String((await request.json() as { query?: unknown }).query || "").trim();
    if (query.length < 3 || query.length > 180) {
      return NextResponse.json({ error: "Describe the image in 3 to 180 characters." }, { status: 400 });
    }
    const images = await searchSerperImages({ query });
    if (!images.length) return NextResponse.json({ error: `No usable images found for “${query}”.` }, { status: 404 });
    return NextResponse.json({ images });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image search stopped.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
