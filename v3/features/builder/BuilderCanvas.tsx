"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { AdRenderSurface } from "../render/AdRenderSurface";
import type { StaticAdLayer, StaticPackageAdScene } from "../scene/types";
import { findStaticLayer, replaceStaticLayer } from "./model";
import { useBuilderInteractionActions, useSelectedBuilderLayerId } from "./interactionStore";
import { isCornerResize, scaleTextLayer } from "./textResize";

type Geometry = Pick<StaticAdLayer, "x" | "y" | "width" | "height" | "rotation"> & { fontSize?: number };

export function BuilderCanvas({
  readOnly,
  scene,
  sceneChanged,
}: {
  readOnly: boolean;
  scene: StaticPackageAdScene;
  sceneChanged: (scene: StaticPackageAdScene) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const transactionStart = useRef<Geometry | null>(null);
  const pendingResize = useRef<Partial<Geometry> | null>(null);
  const selectedLayerId = useSelectedBuilderLayerId();
  const actions = useBuilderInteractionActions();
  const selectedLayer = useMemo(
    () => selectedLayerId ? findStaticLayer(scene.layout.layers, selectedLayerId) : null,
    [scene.layout.layers, selectedLayerId],
  );
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = selectedLayerId
      ? canvasRef.current?.querySelector<HTMLElement>(`[data-static-layer-id="${CSS.escape(selectedLayerId)}"]`) || null
      : null;
    setTarget(element);
  }, [scene, selectedLayerId]);

  const canvasScale = () => scene.layout.canvas.width / (canvasRef.current?.getBoundingClientRect().width || scene.layout.canvas.width);
  const beginTransaction = () => {
    if (!selectedLayer) return;
    transactionStart.current = {
      x: selectedLayer.x,
      y: selectedLayer.y,
      width: selectedLayer.width,
      height: selectedLayer.height,
      rotation: selectedLayer.rotation,
      fontSize: selectedLayer.type === "text" ? selectedLayer.fontSize : undefined,
    };
  };
  const commitGeometry = (geometry: Partial<Geometry>) => {
    if (!selectedLayerId) return;
    sceneChanged(replaceStaticLayer(scene, selectedLayerId, (layer) => ({ ...layer, ...geometry } as StaticAdLayer)));
    transactionStart.current = null;
  };

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-auto rounded-[28px] border border-black/10 bg-[#e8e4da] p-6 shadow-inner" data-builder-canvas-stage="true">
      <div
        ref={canvasRef}
        className="relative w-full max-w-[720px] overflow-hidden bg-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        data-builder-canvas-viewport="true"
        style={{ aspectRatio: `${scene.layout.canvas.width} / ${scene.layout.canvas.height}` }}
      >
        <AdRenderSurface scene={scene} />
        {!readOnly ? (
          <>
            <Selecto
              container={canvasRef.current}
              dragContainer={canvasRef.current}
              hitRate={10}
              selectByClick
              selectableTargets={["[data-static-layer-id]:not([data-static-layer-locked='true'])"]}
              onSelectEnd={(event) => {
                const layerId = event.selected.at(-1)?.getAttribute("data-static-layer-id");
                if (layerId) actions.selectionChanged(layerId);
                else actions.selectionCleared();
              }}
            />
            <Moveable
              target={selectedLayer?.locked ? null : target}
              container={canvasRef.current}
              draggable
              resizable
              rotatable
              snappable
              useResizeObserver
              renderDirections={selectedLayer?.type === "text" ? ["nw", "ne", "sw", "se", "w", "e"] : true}
              bounds={{ left: 0, top: 0, right: 0, bottom: 0, position: "css" }}
              onDragStart={beginTransaction}
              onDrag={(event) => {
                const rotation = transactionStart.current?.rotation || 0;
                event.target.style.transform = `translate(${event.beforeTranslate[0]}px, ${event.beforeTranslate[1]}px) rotate(${rotation}deg)`;
              }}
              onDragEnd={(event) => {
                const start = transactionStart.current;
                if (!start || !event.lastEvent) return;
                const scale = canvasScale();
                event.target.style.transform = `rotate(${start.rotation}deg)`;
                commitGeometry({
                  x: Math.round(start.x + event.lastEvent.beforeTranslate[0] * scale),
                  y: Math.round(start.y + event.lastEvent.beforeTranslate[1] * scale),
                });
              }}
              onResizeStart={(event) => {
                beginTransaction();
                pendingResize.current = null;
                if (selectedLayer?.type === "text" && isCornerResize(event.direction)) {
                  event.setRatio(selectedLayer.width / selectedLayer.height);
                }
              }}
              onResize={(event) => {
                const start = transactionStart.current;
                if (!start) return;
                const scale = canvasScale();
                const rotation = start.rotation || 0;
                let width = event.width;
                let height = event.height;
                let fontSize = start.fontSize;

                if (selectedLayer?.type === "text" && isCornerResize(event.direction)) {
                  const textGeometry = scaleTextLayer(selectedLayer, (event.width * scale) / start.width);
                  width = textGeometry.width / scale;
                  height = textGeometry.height / scale;
                  fontSize = textGeometry.fontSize;
                  event.target.style.fontSize = `${fontSize / scale}px`;
                } else if (selectedLayer?.type === "text") {
                  event.target.style.width = `${width}px`;
                  const textContent = event.target.firstElementChild as HTMLElement | null;
                  const renderedTextHeight = textContent?.getBoundingClientRect().height || event.height;
                  height = Math.max(renderedTextHeight, selectedLayer.fontSize * selectedLayer.lineHeight / scale);
                }

                event.target.style.width = `${width}px`;
                event.target.style.height = `${height}px`;
                event.target.style.transform = `translate(${event.drag.beforeTranslate[0]}px, ${event.drag.beforeTranslate[1]}px) rotate(${rotation}deg)`;
                pendingResize.current = {
                  x: Math.round(start.x + event.drag.beforeTranslate[0] * scale),
                  y: Math.round(start.y + event.drag.beforeTranslate[1] * scale),
                  width: Math.max(8, Math.round(width * scale)),
                  height: Math.max(8, Math.ceil(height * scale)),
                  ...(fontSize === undefined ? {} : { fontSize }),
                };
              }}
              onResizeEnd={(event) => {
                const start = transactionStart.current;
                if (!start || !event.lastEvent) return;
                const scale = canvasScale();
                event.target.style.width = `${(start.width / scene.layout.canvas.width) * 100}%`;
                event.target.style.height = `${(start.height / scene.layout.canvas.height) * 100}%`;
                if (start.fontSize !== undefined) {
                  event.target.style.fontSize = `${(start.fontSize / scene.layout.canvas.width) * 100}cqw`;
                }
                event.target.style.transform = `rotate(${start.rotation}deg)`;
                commitGeometry(pendingResize.current || {
                  x: Math.round(start.x + event.lastEvent.drag.beforeTranslate[0] * scale),
                  y: Math.round(start.y + event.lastEvent.drag.beforeTranslate[1] * scale),
                  width: Math.max(8, Math.round(event.lastEvent.width * scale)),
                  height: Math.max(8, Math.round(event.lastEvent.height * scale)),
                });
                pendingResize.current = null;
              }}
              onRotateStart={beginTransaction}
              onRotate={(event) => {
                event.target.style.transform = `rotate(${event.beforeRotate}deg)`;
              }}
              onRotateEnd={(event) => {
                const start = transactionStart.current;
                if (!start || !event.lastEvent) return;
                event.target.style.transform = `rotate(${start.rotation}deg)`;
                commitGeometry({ rotation: Math.round(event.lastEvent.beforeRotate) });
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
