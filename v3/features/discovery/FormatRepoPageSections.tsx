import { AnimalConversationsConnections } from "./AnimalConversationsConnections";
import { AnimalConversationsIncludedAssets } from "./AnimalConversationsIncludedAssets";
import { BikiniBottomDanceOffConnections } from "./BikiniBottomDanceOffConnections";
import { BikiniBottomDanceOffIncludedAssets } from "./BikiniBottomDanceOffIncludedAssets";
import type { FormatRepoPagePresentation } from "./formatRepoPage.server";

export function FormatRepoConnections({
  presentation,
}: {
  presentation: FormatRepoPagePresentation;
}) {
  return presentation.kind === "bikini-bottom-dance-off" ? (
    <BikiniBottomDanceOffConnections data={presentation.trust} />
  ) : (
    <AnimalConversationsConnections data={presentation.trust} />
  );
}

export function FormatRepoIncludedAssets({
  presentation,
}: {
  presentation: FormatRepoPagePresentation;
}) {
  return presentation.kind === "bikini-bottom-dance-off" ? (
    <BikiniBottomDanceOffIncludedAssets data={presentation.trust} />
  ) : (
    <AnimalConversationsIncludedAssets data={presentation.trust} />
  );
}
