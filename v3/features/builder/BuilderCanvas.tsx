"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Moveable from "react-moveable";
import Selecto from "react-selecto";
import { AdRenderSurface } from "../render/AdRenderSurface";
import type { StaticAdLayer, StaticPackageAdScene } from "../scene/types";
import { findStaticLayer, replaceStaticLayer } from "./model";
import { useBuilderInteractionActions, useSelectedBuilderLayerId } from "./interactionStore";

type Geometry = Pick<StaticAdLayer, "x" | "y" | "width" | "height" | "rotation">;

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
              onResizeStart={beginTransaction}
              onResize={(event) => {
                const rotation = transactionStart.current?.rotation || 0;
                event.target.style.width = `${event.width}px`;
                event.target.style.height = `${event.height}px`;
                event.target.style.transform = `translate(${event.drag.beforeTranslate[0]}px, ${event.drag.beforeTranslate[1]}px) rotate(${rotation}deg)`;
              }}
              onResizeEnd={(event) => {
                const start = transactionStart.current;
                if (!start || !event.lastEvent) return;
                const scale = canvasScale();
                event.target.style.width = `${(start.width / scene.layout.canvas.width) * 100}%`;
                event.target.style.height = `${(start.height / scene.layout.canvas.height) * 100}%`;
                event.target.style.transform = `rotate(${start.rotation}deg)`;
                commitGeometry({
                  x: Math.round(start.x + event.lastEvent.drag.beforeTranslate[0] * scale),
                  y: Math.round(start.y + event.lastEvent.drag.beforeTranslate[1] * scale),
                  width: Math.max(8, Math.round(event.lastEvent.width * scale)),
                  height: Math.max(8, Math.round(event.lastEvent.height * scale)),
                });
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
