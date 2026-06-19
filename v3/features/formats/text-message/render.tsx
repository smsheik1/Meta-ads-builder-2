import type { CSSProperties, ReactNode } from "react";
import type { TextMessageAdScene } from "../../scene/types";
import type { FormatRenderProps } from "../types";

const fill: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
};

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "W";

const IonIcon = ({
  children,
  size,
}: {
  children: ReactNode;
  size: string;
}) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    viewBox="0 0 512 512"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
);

const ChevronBackIcon = ({ size }: { size: string }) => (
  <IonIcon size={size}>
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M328 112L184 256l144 144" />
  </IonIcon>
);

const VideoCamIcon = ({ size }: { size: string }) => (
  <IonIcon size={size}>
    <path d="M374.79 308.78L457.5 367a16 16 0 0022.5-14.62V159.62A16 16 0 00457.5 145l-82.71 58.22A16 16 0 00368 216.3v79.4a16 16 0 006.79 13.08z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
    <path d="M268 384H84a52.15 52.15 0 01-52-52V180a52.15 52.15 0 0152-52h184.48A51.68 51.68 0 01320 179.52V332a52.15 52.15 0 01-52 52z" fill="none" stroke="currentColor" strokeMiterlimit="10" strokeWidth="32" />
  </IonIcon>
);

const AddIcon = ({ size }: { size: string }) => (
  <IonIcon size={size}>
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M256 112v288M400 256H112" />
  </IonIcon>
);

const MicIcon = ({ size }: { size: string }) => (
  <IonIcon size={size}>
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" d="M192 448h128M384 208v32c0 70.4-57.6 128-128 128h0c-70.4 0-128-57.6-128-128v-32M256 368v80" />
    <path d="M256 64a63.68 63.68 0 00-64 64v111c0 35.2 29 65 64 65s64-29 64-65V128c0-36-28-64-64-64z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="32" />
  </IonIcon>
);

const CellularIcon = () => (
  <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "flex-end", gap: "0.28cqw", height: "2.4cqw" }}>
    {[0.8, 1.25, 1.75, 2.25].map((height, index) => (
      <span key={height} style={{ width: "0.48cqw", height: `${height}cqw`, borderRadius: "999px", backgroundColor: "#000000", opacity: index === 3 ? 1 : 0.85 }} />
    ))}
  </span>
);

const WifiIcon = () => (
  <svg aria-hidden="true" width="3.25cqw" height="2.45cqw" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.4 4.7C5.7 1 12.3 1 16.6 4.7" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4.6 7.8C7.1 5.8 10.9 5.8 13.4 7.8" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M7.8 10.8C8.5 10.3 9.5 10.3 10.2 10.8L9 12L7.8 10.8Z" fill="#000" />
  </svg>
);

const leftBubble: CSSProperties = {
  position: "relative",
  maxWidth: "82%",
  alignSelf: "flex-start",
  backgroundColor: "#E9E9EB",
  color: "#000000",
  borderRadius: "4.1cqw 4.1cqw 4.1cqw 1.1cqw",
  padding: "2.65cqw 3.15cqw",
  fontSize: "4.15cqw",
  fontWeight: 560,
  lineHeight: 1.08,
  letterSpacing: 0,
};

const rightBubble: CSSProperties = {
  ...leftBubble,
  alignSelf: "flex-end",
  backgroundColor: "#0A84FF",
  color: "#FFFFFF",
  borderRadius: "4.1cqw 4.1cqw 1.1cqw 4.1cqw",
};

const leftTail: CSSProperties = {
  position: "absolute",
  left: "-0.9cqw",
  bottom: 0,
  width: "2.1cqw",
  height: "2.5cqw",
  backgroundColor: "#E9E9EB",
  borderBottomRightRadius: "1.8cqw 1.55cqw",
};

const leftTailCutout: CSSProperties = {
  ...leftTail,
  left: "-2.95cqw",
  width: "2.9cqw",
  backgroundColor: "#FFFFFF",
};

const rightTail: CSSProperties = {
  position: "absolute",
  right: "-0.9cqw",
  bottom: 0,
  width: "2.1cqw",
  height: "2.5cqw",
  backgroundColor: "#0A84FF",
  borderBottomLeftRadius: "1.8cqw 1.55cqw",
};

const rightTailCutout: CSSProperties = {
  ...rightTail,
  right: "-2.95cqw",
  width: "2.9cqw",
  backgroundColor: "#FFFFFF",
};

export function TextMessageFormatRenderer({
  scene,
  rerollFlash,
}: FormatRenderProps<TextMessageAdScene>) {
  const flashHeadline = rerollFlash?.roles.includes("headline")
    ? "wiggly-reroll-shine wiggly-reroll-shine-headline"
    : "";

  return (
    <div
      data-format="text-message"
      data-text-message-screen="true"
      style={{
        ...fill,
        containerType: "inline-size",
        overflow: "hidden",
        backgroundColor: "#F2F2F7",
        color: "#111827",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        data-text-message-phone="true"
          style={{
            ...fill,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            backgroundColor: "#FFFFFF",
          }}
      >
        <header
          data-text-message-status-bar="true"
          style={{
            position: "relative",
            height: "8cqw",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.55cqw 4.8cqw 0",
            backgroundColor: "#F9FAFB",
            color: "#000000",
            fontSize: "2.75cqw",
            fontWeight: 700,
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.75cqw", letterSpacing: 0 }}>
            <CellularIcon />
            <WifiIcon />
            <span
              aria-label="95 percent battery"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "5.1cqw",
                height: "2.9cqw",
                borderRadius: "0.82cqw",
                backgroundColor: "#111111",
                color: "#FFFFFF",
                fontSize: "1.65cqw",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              95
            </span>
          </span>
        </header>

        <header
          data-text-message-header="true"
          style={{
            position: "relative",
            height: "17.2cqw",
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 5cqw 2.45cqw",
            borderBottom: "0.18cqw solid #D8D8DC",
            backgroundColor: "#F9FAFB",
          }}
        >
          <div style={{ position: "absolute", left: "3.4cqw", bottom: "3.15cqw", color: "#007AFF", display: "flex", alignItems: "center" }}>
            <ChevronBackIcon size="7.2cqw" />
          </div>
          <div style={{ position: "absolute", right: "3.8cqw", bottom: "3.55cqw", color: "#007AFF", display: "flex", alignItems: "center" }}>
            <VideoCamIcon size="6.7cqw" />
          </div>
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <div
              style={{
                width: "9.8cqw",
                height: "9.8cqw",
                margin: "0 auto 1cqw",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: "999px",
                backgroundColor: "#D1D1D6",
                color: "#FFFFFF",
                fontSize: "3.65cqw",
                fontWeight: 700,
              }}
            >
              <span>{getInitials(scene.layout.contactName)}</span>
            </div>
            <p style={{ margin: 0, maxWidth: "52cqw", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "3.25cqw", fontWeight: 700, lineHeight: 1 }}>
              {scene.layout.contactName} <span style={{ color: "#3C3C43", opacity: 0.5 }}>&gt;</span>
            </p>
          </div>
        </header>

        <main
          data-text-message-thread="true"
          className={flashHeadline}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "0",
            minHeight: 0,
            overflow: "hidden",
            padding: "2.4cqw 3.65cqw",
          }}
        >
          <p
            data-text-message-timestamp="true"
            style={{
              margin: "0 0 1.4cqw",
              textAlign: "center",
              color: "#8E8E93",
              fontSize: "2.85cqw",
              fontWeight: 700,
            }}
          >
            {scene.layout.timestampLabel}
          </p>
          {scene.layout.messages.map((message, index) => {
            const showTail = scene.layout.messages[index + 1]?.side !== message.side;
            const samePreviousSide = scene.layout.messages[index - 1]?.side === message.side;
            const tail = message.side === "right" ? rightTail : leftTail;
            const tailCutout = message.side === "right" ? rightTailCutout : leftTailCutout;
            return (
              <p
                key={`${message.side}-${message.text}-${index}`}
                data-text-message-bubble={message.side}
                data-text-message-tail={showTail ? "true" : "false"}
                style={{
                  ...(message.side === "right" ? rightBubble : leftBubble),
                  marginTop: samePreviousSide ? "0.75cqw" : "2.1cqw",
                }}
              >
                {showTail ? (
                  <>
                    <span aria-hidden="true" data-text-message-tail-color="true" style={tail} />
                    <span aria-hidden="true" data-text-message-tail-cutout="true" style={tailCutout} />
                  </>
                ) : null}
                {message.text}
              </p>
            );
          })}
        </main>

        <footer
          data-text-message-compose="true"
          style={{
            height: "13.2cqw",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "2cqw",
            padding: "2.05cqw 3.45cqw 2.9cqw",
            borderTop: "0.18cqw solid #D8D8DC",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div style={{ width: "7.8cqw", height: "7.8cqw", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", backgroundColor: "#E5E5EA", color: "#6B7280" }}>
            <AddIcon size="4.8cqw" />
          </div>
          <div style={{ flex: 1, height: "8.15cqw", borderRadius: "999px", border: "0.32cqw solid #C7C7CC", backgroundColor: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2.8cqw" }}>
            <span style={{ color: "#C7C7CC", fontSize: "3.85cqw", fontWeight: 430 }}>iMessage</span>
            <span style={{ color: "#8E8E93", display: "flex", alignItems: "center" }}>
              <MicIcon size="4.45cqw" />
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
