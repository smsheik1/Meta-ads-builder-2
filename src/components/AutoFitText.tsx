import React, { useLayoutEffect, useRef, useState } from 'react';

interface AutoFitTextProps {
  children: React.ReactNode;
  plainText?: string;
  className?: string;
  maxFontSize?: number;
  minFontSize?: number;
  lineHeight?: number;
  fitPaddingX?: number;
  fitPaddingY?: number;
  style?: React.CSSProperties;
  textRef?: React.Ref<HTMLDivElement>;
  editable?: boolean;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function AutoFitText({
  children,
  plainText,
  className,
  maxFontSize = 96,
  minFontSize = 8,
  lineHeight = 1.04,
  fitPaddingX = 8,
  fitPaddingY = 4,
  style,
  textRef: externalTextRef,
  editable = false,
  onBlur,
  onKeyDown,
  onMouseDown,
  onDoubleClick,
}: AutoFitTextProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(24);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    const text = textRef.current;
    if (!slot || !text) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const copy = plainText ?? String(children ?? '');

    const wrapLines = (size: number, width: number, font: string) => {
      ctx.font = font;
      const lines: string[] = [];
      copy.split('\n').forEach((explicitLine) => {
        const words = explicitLine.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          lines.push('');
          return;
        }

        let line = words[0];
        for (let i = 1; i < words.length; i++) {
          const candidate = `${line} ${words[i]}`;
          if (ctx.measureText(candidate).width <= width) {
            line = candidate;
          } else {
            lines.push(line);
            line = words[i];
          }
        }
        lines.push(line);
      });

      const widest = lines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
      return { lines, widest };
    };

    const fitText = () => {
      const width = slot.clientWidth - fitPaddingX;
      const height = slot.clientHeight - fitPaddingY;
      if (width < 20 || height < 20) return;

      const styles = window.getComputedStyle(text);
      const fontFamily = styles.fontFamily || 'Inter, sans-serif';
      const fontWeight = styles.fontWeight || '700';
      const fontStyle = styles.fontStyle || 'normal';
      const originalWhiteSpace = text.style.whiteSpace;
      const originalWidth = text.style.width;
      const originalFontSize = text.style.fontSize;
      const originalLineHeight = text.style.lineHeight;
      let low = minFontSize;
      let high = maxFontSize;
      let best = low;

      text.style.whiteSpace = 'normal';
      text.style.width = `${Math.max(1, width)}px`;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const measurement = wrapLines(mid, width, `${fontStyle} ${fontWeight} ${mid}px ${fontFamily}`);

        text.style.fontSize = `${mid}px`;
        text.style.lineHeight = String(lineHeight);
        const renderedHeight = text.scrollHeight;
        const renderedWidth = text.scrollWidth;
        const verticalSafety = Math.max(6, Math.ceil(mid * 0.12));

        if (measurement.widest <= width && renderedWidth <= width && renderedHeight <= height - verticalSafety) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      text.style.whiteSpace = originalWhiteSpace;
      text.style.width = originalWidth;
      text.style.fontSize = originalFontSize;
      text.style.lineHeight = originalLineHeight;
      setFontSize(Math.max(minFontSize, best));
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    observer.observe(slot);
    return () => observer.disconnect();
  }, [children, fitPaddingX, fitPaddingY, lineHeight, maxFontSize, minFontSize, plainText]);

  return (
    <div ref={slotRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        ref={(node) => {
          textRef.current = node;
          if (typeof externalTextRef === 'function') externalTextRef(node);
          else if (externalTextRef && 'current' in externalTextRef) {
            (externalTextRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={className}
        contentEditable={editable}
        suppressContentEditableWarning={editable}
        spellCheck={editable ? false : undefined}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        style={{
          ...style,
          fontSize,
          lineHeight,
        }}
      >
        {children}
      </div>
    </div>
  );
}
