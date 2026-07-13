"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Unlock } from "lucide-react";
import type { StaticAdLayer, StaticLayerBinding } from "../scene/types";
import { findStaticLayer, flattenStaticLayers, replaceStaticLayer, updateFormatDraft, validateFormatDraft, type FormatDraft } from "./model";
import { scaleTextLayerToValue } from "./textResize";

const bindings: StaticLayerBinding[] = ["fixed", "brand", "campaign", "proof", "locked"];
const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950";

export function BuilderInspector({
  draft,
  draftChanged,
  readOnly,
  selectedLayerId,
}: {
  draft: FormatDraft;
  draftChanged: (draft: FormatDraft) => void;
  readOnly: boolean;
  selectedLayerId: string | null;
}) {
  const selectedLayer = selectedLayerId ? findStaticLayer(draft.scene.layout.layers, selectedLayerId) : null;
  const validation = validateFormatDraft(draft);
  const updateLayer = (patch: Partial<StaticAdLayer>) => {
    if (!selectedLayerId) return;
    const scene = replaceStaticLayer(draft.scene, selectedLayerId, (layer) => ({ ...layer, ...patch } as StaticAdLayer));
    draftChanged(updateFormatDraft(draft, { scene }));
  };
  const updateGeometry = (property: "x" | "y" | "width" | "height", value: number) => {
    if (selectedLayer?.type === "text" && (property === "width" || property === "height")) {
      updateLayer(scaleTextLayerToValue(selectedLayer, property, value));
      return;
    }
    updateLayer({ [property]: value });
  };
  const updateAnalysis = (change: (analysis: FormatDraft["analysis"]) => void) => {
    const analysis = structuredClone(draft.analysis);
    change(analysis);
    draftChanged(updateFormatDraft(draft, { analysis }));
  };

  return (
    <aside className="min-h-0 border-l border-black/10 bg-white" data-builder-inspector="true">
      <ScrollArea className="h-full">
        <div className="space-y-7 p-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black tracking-tight text-slate-950">Selected layer</h2>
              {selectedLayer ? <Badge variant="secondary">{selectedLayer.type}</Badge> : null}
            </div>
            {!selectedLayer ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-500">Select a visible layer on the canvas or in the layer list.</p>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="layer-name">Layer name</Label>
                  <Input id="layer-name" disabled={readOnly} value={selectedLayer.name} onChange={(event) => updateLayer({ name: event.target.value })} />
                </div>
                {selectedLayer.type === "text" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="layer-text">Text</Label>
                      <Textarea id="layer-text" disabled={readOnly} value={selectedLayer.text} onChange={(event) => updateLayer({ text: event.target.value })} />
                    </div>
                    <div className="grid grid-cols-[1fr_84px] gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="font-size">Size</Label>
                        <Input id="font-size" type="number" min={8} disabled={readOnly} value={selectedLayer.fontSize} onChange={(event) => updateLayer(scaleTextLayerToValue(selectedLayer, "fontSize", Number(event.target.value)))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="text-color">Color</Label>
                        <Input id="text-color" type="color" disabled={readOnly} value={selectedLayer.color} onChange={(event) => updateLayer({ color: event.target.value })} />
                      </div>
                    </div>
                  </>
                ) : null}
                {selectedLayer.type === "shape" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="shape-color">Fill color</Label>
                    <Input id="shape-color" type="color" disabled={readOnly} value={selectedLayer.fill} onChange={(event) => updateLayer({ fill: event.target.value })} />
                  </div>
                ) : null}
                {selectedLayer.type === "image" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="image-source">Image URL</Label>
                    <Input id="image-source" disabled={readOnly} value={selectedLayer.src} onChange={(event) => updateLayer({ src: event.target.value })} />
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  {(["x", "y", "width", "height"] as const).map((property) => (
                    <div className="space-y-1.5" key={property}>
                      <Label htmlFor={`layer-${property}`}>{property === "x" || property === "y" ? property.toUpperCase() : property}</Label>
                      <Input
                        id={`layer-${property}`}
                        type="number"
                        disabled={readOnly}
                        value={selectedLayer[property]}
                        onChange={(event) => updateGeometry(property, Number(event.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="layer-binding">Changes with</Label>
                  <select id="layer-binding" className={selectClass} disabled={readOnly} value={selectedLayer.binding} onChange={(event) => updateLayer({ binding: event.target.value as StaticLayerBinding })}>
                    {bindings.map((binding) => <option key={binding} value={binding}>{binding}</option>)}
                  </select>
                </div>
                <Button type="button" variant="outline" className="w-full" disabled={readOnly} onClick={() => updateLayer({ locked: !selectedLayer.locked })}>
                  {selectedLayer.locked ? <Unlock /> : <Lock />}
                  {selectedLayer.locked ? "Unlock layer" : "Lock layer"}
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-950">Lists</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Keep repeated items together and choose which one is active.</p>
            </div>
            {draft.analysis.lists.map((list, listIndex) => (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4" key={list.id}>
                <Label htmlFor={`list-${list.id}`}>{list.id.replaceAll("_", " ")}</Label>
                <select
                  id={`list-${list.id}`}
                  className={selectClass}
                  disabled={readOnly}
                  value={list.active_item_id || ""}
                  onChange={(event) => {
                    const activeItemId = event.target.value || null;
                    const activeItem = list.items.find((item) => item.id === activeItemId);
                    const activeValue = activeItem?.values[0]?.value;
                    const activeLayer = flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.semanticRole === `list:${list.id}:active`);
                    let scene = draft.scene;
                    if (activeLayer && activeValue && activeLayer.type === "text") {
                      scene = replaceStaticLayer(scene, activeLayer.id, (layer) => layer.type === "text" ? { ...layer, text: activeValue } : layer);
                    }
                    const analysis = structuredClone(draft.analysis);
                    analysis.lists[listIndex]!.active_item_id = activeItemId;
                    draftChanged(updateFormatDraft(draft, { analysis, scene }));
                  }}
                >
                  <option value="">No active item</option>
                  {list.items.map((item) => <option key={item.id} value={item.id}>{item.values[0]?.value || item.id}</option>)}
                </select>
                <div className="space-y-2">
                  {list.items.map((item, itemIndex) => (
                    <Input
                      aria-label={`${list.id} item ${itemIndex + 1}`}
                      disabled={readOnly}
                      key={item.id}
                      value={item.values[0]?.value || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        const analysis = structuredClone(draft.analysis);
                        analysis.lists[listIndex]!.items[itemIndex]!.values[0]!.value = value;
                        const itemValue = list.items[itemIndex]?.values[0];
                        const itemLayer = itemValue
                          ? flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.semanticRole === `list:${list.id}:${item.id}:${itemValue.key}`)
                          : null;
                        const activeLayer = flattenStaticLayers(draft.scene.layout.layers).find((layer) => layer.semanticRole === `list:${list.id}:active`);
                        const targetLayer = itemLayer?.type === "text"
                          ? itemLayer
                          : item.id === list.active_item_id && activeLayer?.type === "text" ? activeLayer : null;
                        const scene = targetLayer
                          ? replaceStaticLayer(draft.scene, targetLayer.id, (layer) => layer.type === "text" ? { ...layer, text: value } : layer)
                          : draft.scene;
                        draftChanged(updateFormatDraft(draft, { analysis, scene }));
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-950">Assets</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Correct what an image represents and when it may change.</p>
            </div>
            {draft.analysis.assets.map((asset, assetIndex) => (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4" key={asset.id}>
                <Input aria-label={`${asset.id} label`} disabled={readOnly} value={asset.label} onChange={(event) => updateAnalysis((analysis) => {
                  analysis.assets[assetIndex]!.label = event.target.value;
                })} />
                <select className={selectClass} aria-label={`${asset.id} binding`} disabled={readOnly} value={asset.binding} onChange={(event) => updateAnalysis((analysis) => {
                  analysis.assets[assetIndex]!.binding = event.target.value as typeof asset.binding;
                })}>
                  {(["fixed", "brand", "campaign", "locked"] as const).map((binding) => <option key={binding} value={binding}>{binding}</option>)}
                </select>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-950">Format skill</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Copy, refine, and paste the instructions that make this format work.</p>
            </div>
            <Textarea
              aria-label="Format skill"
              className="min-h-56 font-mono text-xs leading-5"
              disabled={readOnly}
              value={draft.skill}
              onChange={(event) => draftChanged(updateFormatDraft(draft, { skill: event.target.value }))}
            />
          </section>

          <section className="space-y-2 rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black">Publish check</h2>
              <Badge className={validation.valid ? "bg-emerald-400 text-emerald-950" : "bg-amber-300 text-amber-950"}>
                {validation.valid ? "Ready" : `${validation.errors.length} issues`}
              </Badge>
            </div>
            {!validation.valid ? <ul className="space-y-1 text-xs text-slate-300">{validation.errors.map((error) => <li key={error}>• {error}</li>)}</ul> : null}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
