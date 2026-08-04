import { Composition } from "remotion";
import { LinkedInShowcase, type LinkedInShowcaseCompositionProps } from "./LinkedInShowcase";

export const linkedInShowcaseCompositionId = "LinkedInShowcaseWrapper";

const defaultProps: LinkedInShowcaseCompositionProps = {
  brandLogoUrl: "wiggly-wordmark-3d-crop.png",
  durationInFrames: 90,
  fps: 30,
  productUrl: "wiggly-wordmark-3d-crop.png",
  videoUrl: "",
  wigglyLogoUrl: "wiggly-wordmark-3d-crop.png",
};

export function LinkedInShowcaseRoot() {
  return (
    <Composition
      id={linkedInShowcaseCompositionId}
      component={LinkedInShowcase}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={90}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames,
        fps: props.fps,
      })}
    />
  );
}
