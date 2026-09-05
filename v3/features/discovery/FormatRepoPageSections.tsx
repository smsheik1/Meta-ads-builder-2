import { AnimalConversationsConnections } from "./AnimalConversationsConnections";
import { AnimalConversationsIncludedAssets } from "./AnimalConversationsIncludedAssets";
import { BikiniBottomDanceOffConnections } from "./BikiniBottomDanceOffConnections";
import { BikiniBottomDanceOffIncludedAssets } from "./BikiniBottomDanceOffIncludedAssets";
import { ShazPuppetRuntimeConnections } from "./ShazPuppetRuntimeConnections";
import { ShazPuppetRuntimeIncludedAssets } from "./ShazPuppetRuntimeIncludedAssets";
import type { FormatRepoPagePresentation } from "./formatRepoPage.server";

export function FormatRepoConnections({
  presentation,
}: {
  presentation: Exclude<FormatRepoPagePresentation, { kind: "shared" }>;
}) {
  if (presentation.kind === "bikini-bottom-dance-off") {
    return <BikiniBottomDanceOffConnections data={presentation.trust} />;
  }
  if (presentation.kind === "animal-conversations") {
    return <AnimalConversationsConnections data={presentation.trust} />;
  }
  return <ShazPuppetRuntimeConnections data={presentation.trust} />;
}

export function FormatRepoIncludedAssets({
  presentation,
}: {
  presentation: Exclude<FormatRepoPagePresentation, { kind: "shared" }>;
}) {
  if (presentation.kind === "bikini-bottom-dance-off") {
    return <BikiniBottomDanceOffIncludedAssets data={presentation.trust} />;
  }
  if (presentation.kind === "animal-conversations") {
    return <AnimalConversationsIncludedAssets data={presentation.trust} />;
  }
  return <ShazPuppetRuntimeIncludedAssets data={presentation.trust} />;
}
