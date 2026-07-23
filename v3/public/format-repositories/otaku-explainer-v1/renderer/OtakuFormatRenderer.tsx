import type { CSSProperties } from "react";

export type OtakuCharacterPlacement = {
  asset: string;
  x: number;
  bottom: number;
  width: number;
  rotate?: number;
};

export type OtakuScene = {
  id: string;
  speaker: string;
  dialogue: string;
  background: string;
  estimatedDurationMs: number;
  durationMs?: number;
  audioPath?: string;
  characters: OtakuCharacterPlacement[];
  callout?: {
    label: string;
    theme: "neutral" | "question" | "warm" | "cool" | "violet" | "gold";
  };
};

export type OtakuAsset = {
  id: string;
  label: string;
  localPath: string;
};

export type OtakuAssetLibrary = {
  characters: OtakuAsset[];
  backgrounds: OtakuAsset[];
};

export type OtakuFormatRendererProps = {
  assets: OtakuAssetLibrary;
  durationMs: number;
  resolveAsset?: (localPath: string) => string;
  scene: OtakuScene;
  timeInSceneMs: number;
};

const packageBase = "/format-repositories/otaku-explainer-v1/";

const defaultResolveAsset = (localPath: string) => `${packageBase}${localPath}`;

type CalloutTheme = NonNullable<OtakuScene["callout"]>["theme"];

const calloutColors: Record<CalloutTheme, [string, string]> = {
  neutral: ["#ffffff", "#64748b"],
  question: ["#ffe66d", "#ff7b00"],
  warm: ["#ff5d4a", "#7d160b"],
  cool: ["#55d6ff", "#1154b7"],
  violet: ["#c98cff", "#5a2ad1"],
  gold: ["#fff06a", "#6c41ff"],
};

const speechFontSize = (dialogue: string) => {
  if (dialogue.length > 82) return 30;
  if (dialogue.length > 64) return 34;
  if (dialogue.length > 46) return 38;
  return 44;
};

function Callout({ callout }: { callout?: OtakuScene["callout"] }) {
  if (!callout) return null;
  const [bright, dark] = calloutColors[callout.theme];
  return (
    <div style={{
      position: "absolute",
      zIndex: 2,
      left: "42%",
      top: "57%",
      width: 145,
      padding: "18px 14px",
      border: `5px solid ${dark}`,
      borderRadius: 24,
      background: `linear-gradient(135deg, ${bright}, ${dark})`,
      boxShadow: `0 10px 30px ${dark}88, inset 0 0 0 3px rgba(255,255,255,.35)`,
      color: "white",
      fontFamily: "Arial Black, sans-serif",
      fontSize: 20,
      lineHeight: 1,
      textAlign: "center",
      transform: "rotate(-7deg)",
    }}>{callout.label}</div>
  );
}

export function OtakuFormatRenderer({
  assets,
  durationMs,
  resolveAsset = defaultResolveAsset,
  scene,
  timeInSceneMs,
}: OtakuFormatRendererProps) {
  const progress = Math.max(0, Math.min(1, timeInSceneMs / Math.max(1, durationMs)));
  const background = assets.backgrounds.find((asset) => asset.id === scene.background);
  const [bright] = scene.callout ? calloutColors[scene.callout.theme] : ["#ffffff"];
  return (
    <div style={{
      position: "relative",
      width: 720,
      height: 1280,
      overflow: "hidden",
      background: "#101827",
      color: "#111",
      fontFamily: "Arial Rounded MT Bold, Arial, sans-serif",
    }}>
      {background ? (
        <img
          src={resolveAsset(background.localPath)}
          alt=""
          style={{
            position: "absolute",
            inset: "-5% auto -5% -3%",
            width: "116%",
            height: "110%",
            objectFit: "cover",
            objectPosition: "center bottom",
            transform: `translate3d(${-8 * progress}%, 0, 0) scale(1.04)`,
            filter: "saturate(.9) contrast(1.02) brightness(.83)",
          }}
        />
      ) : null}

      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(7,12,24,.34) 0%, rgba(7,12,24,0) 32%, rgba(7,12,24,.12) 68%, rgba(7,12,24,.58) 100%)",
      }} />

      <Callout callout={scene.callout} />

      {scene.characters.map((placement, index) => {
        const character = assets.characters.find((asset) => asset.id === placement.asset);
        if (!character) return null;
        const isSpeaking = placement.asset === scene.speaker;
        const transform = [
          `rotate(${placement.rotate || 0}deg)`,
          `scale(${isSpeaking ? 1.035 : 1})`,
        ].join(" ");
        const style: CSSProperties = {
          position: "absolute",
          zIndex: isSpeaking ? 4 : 3,
          left: `${placement.x}%`,
          bottom: `${placement.bottom}%`,
          width: `${placement.width}%`,
          maxHeight: "73%",
          objectFit: "contain",
          objectPosition: "center bottom",
          transform,
          transformOrigin: "center bottom",
          filter: isSpeaking
            ? `drop-shadow(0 0 7px ${bright}) drop-shadow(0 12px 8px rgba(0,0,0,.55))`
            : "drop-shadow(0 11px 7px rgba(0,0,0,.55)) brightness(.9)",
          opacity: isSpeaking ? 1 : 0.94,
        };
        return <img key={`${scene.id}-${placement.asset}-${index}`} src={resolveAsset(character.localPath)} alt={character.label} style={style} />;
      })}

      <div style={{
        position: "absolute",
        zIndex: 6,
        top: "5.2%",
        left: "9%",
        width: "72%",
        minHeight: 206,
        padding: "38px 38px 34px",
        border: "7px solid #101010",
        borderRadius: "48% 48% 44% 46% / 50% 46% 52% 48%",
        background: "#fff",
        boxShadow: `0 13px 0 rgba(0,0,0,.26), 0 0 0 7px ${bright}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          color: "#0a0a0a",
          fontFamily: "Arial Rounded MT Bold, Arial, sans-serif",
          fontSize: speechFontSize(scene.dialogue),
          fontWeight: 800,
          lineHeight: 1.06,
          letterSpacing: -1.2,
          textAlign: "center",
          overflowWrap: "anywhere",
        }}>{scene.dialogue}</div>
        <div style={{
          position: "absolute",
          left: "24%",
          bottom: -28,
          width: 54,
          height: 54,
          borderRight: "7px solid #101010",
          borderBottom: "7px solid #101010",
          background: "white",
          transform: "rotate(38deg) skew(8deg, 8deg)",
        }} />
      </div>

      <div style={{
        position: "absolute",
        zIndex: 8,
        left: 24,
        bottom: 18,
        color: "rgba(255,255,255,.88)",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 0.3,
        textShadow: "0 2px 8px rgba(0,0,0,.8)",
      }}>@Wiggly_Format_Lab</div>
    </div>
  );
}
