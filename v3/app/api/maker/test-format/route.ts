import { NextResponse } from "next/server";
import type { StoredWebsiteResearchResult } from "@/features/research/types";
import { generateMakerFormatTestVariations } from "@/features/formats/static-package/testGeneration.server";
import { createSerperImageSearch, resolveMakerFormatTestImages } from "@/features/formats/static-package/imageSearch.server";
import {
  assertMakerFormatTestProductUsable,
  makerFormatTestContractSchema,
  selectMakerTestProduct,
} from "@/features/formats/static-package/testRuntime";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const payload = await request.json() as {
      answers?: Array<{ question?: unknown; answer?: unknown }>;
      contract?: unknown;
      productHandle?: unknown;
      research?: unknown;
    };
    const contract = makerFormatTestContractSchema.parse(payload.contract);
    const research = payload.research as StoredWebsiteResearchResult;
    if (!research?.researchRunId || !research.brand?.name || !research.brandBrief) {
      return NextResponse.json({ error: "Website research is missing or incomplete." }, { status: 400 });
    }
    const productHandle = String(payload.productHandle || "").trim();
    const product = assertMakerFormatTestProductUsable(
      contract,
      productHandle ? selectMakerTestProduct(research.productCatalog, productHandle) : null,
    );
    const answers = (payload.answers || []).slice(0, 3).map((answer) => ({
      question: String(answer.question || "").trim(),
      answer: String(answer.answer || "").trim(),
    }));
    if (contract.questions.some((question) => !answers.find((answer) => answer.question === question)?.answer)) {
      return NextResponse.json({ error: "Answer the required Format questions before generating." }, { status: 400 });
    }
    const plan = await generateMakerFormatTestVariations({ answers, contract, product, research });
    const generation = await resolveMakerFormatTestImages(
      plan,
      createSerperImageSearch({ preferredHost: research.host }),
      {
        target: `${research.brand.name} ${product?.title || ""}`,
        assetRoles: Object.fromEntries(contract.assets.map((asset) => [asset.id, asset.role.replaceAll("_", " ")])),
      },
    );
    return NextResponse.json({ generation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Maker Format test generation failed.";
    console.error("[wiggly:maker-format-test] stopped", { message });
    return NextResponse.json({ error: `Test generation stopped: ${message} Nothing was repaired or retried.` }, { status: 422 });
  }
}
