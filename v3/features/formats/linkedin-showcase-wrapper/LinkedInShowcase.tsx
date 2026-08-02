import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";

export type LinkedInShowcaseCompositionProps = {
  brandLogoUrl: string;
  durationInFrames: number;
  fps: number;
  productUrl: string;
  videoUrl: string;
  wigglyLogoUrl: string;
};

const resolvePublicAsset = (src: string) => (
  /^https?:\/\//.test(src) ? src : staticFile(src.replace(/^\//, ""))
);

const plusStyle = (top: number): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top,
  width: 1080,
  textAlign: "center",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: 92,
  fontWeight: 700,
  lineHeight: 1,
});

export function LinkedInShowcase({
  brandLogoUrl,
  productUrl,
  videoUrl,
  wigglyLogoUrl,
}: LinkedInShowcaseCompositionProps) {
  return (
    <AbsoluteFill style={{ background: "#ffffff", color: "#090909" }}>
      <AbsoluteFill style={{ boxShadow: "inset 0 0 0 3px #111111" }} />
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: 1152 }}>
        <Img
          src={resolvePublicAsset(brandLogoUrl)}
          style={{ position: "absolute", left: 245, top: 38, width: 590, height: 210, objectFit: "contain" }}
        />
        <div style={plusStyle(268)}>+</div>
        <Img
          src={resolvePublicAsset(productUrl)}
          style={{ position: "absolute", left: 370, top: 350, width: 340, height: 270, objectFit: "contain" }}
        />
        <div style={plusStyle(625)}>+</div>
        <Img
          src={resolvePublicAsset(wigglyLogoUrl)}
          style={{ position: "absolute", left: 245, top: 760, width: 590, height: 205, objectFit: "contain" }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 885,
            top: 475,
            width: 190,
            height: 128,
            background: "#090909",
            clipPath: "polygon(0 34%, 62% 34%, 62% 0, 100% 50%, 62% 100%, 62% 66%, 0 66%)",
          }}
        />
      </div>
      <OffthreadVideo
        src={resolvePublicAsset(videoUrl)}
        style={{ position: "absolute", left: 1152, top: 0, width: 608, height: 1080, objectFit: "contain" }}
      />
    </AbsoluteFill>
  );
}
