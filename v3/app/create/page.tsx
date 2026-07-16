import { CreateResearchClient } from "./CreateResearchClient";
import { MakerFormatTestClient } from "./MakerFormatTestClient";

export default async function CreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const draftId = typeof params.makerTest === "string" ? params.makerTest : "";
  if (draftId) return <MakerFormatTestClient draftId={draftId} fixture={params.makerTestFixture === "saved"} />;
  return <CreateResearchClient />;
}
