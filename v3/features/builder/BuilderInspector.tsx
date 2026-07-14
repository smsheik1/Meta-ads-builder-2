"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, Lock, Search, Unlock, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import type { StaticAdLayer, StaticLayerBinding } from "../scene/types";
import { findStaticLayer, flattenStaticLayers, replaceStaticLayer, updateFormatDraft, validateFormatDraftReady, type FormatDraft, type MakerAssetRole } from "./model";
import { scaleTextLayerToValue } from "./textResize";

const bindings: StaticLayerBinding[] = ["fixed", "brand", "campaign", "proof", "locked"];
const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-950";
const assetRoles: MakerAssetRole[] = ["brand_identity", "story_setting", "news_subject", "supporting_visual", "decorative"];

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
  const [imageQuery, setImageQuery] = useState("");
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageSearchMessage, setImageSearchMessage] = useState("");

  useEffect(() => {
    setImageQuery(selectedLayer?.type === "image" ? selectedLayer.name : "");
    setImageResults([]);
    setImageSearching(false);
    setImageSearchMessage("");
  }, [selectedLayer?.id]);

  const layerControlsDisabled = readOnly || Boolean(selectedLayer?.locked);
  const validation = validateFormatDraftReady(draft);
  const updateLayer = (patch: Partial<StaticAdLayer>) => {
    if (!selectedLayerId) return;
    const scene = replaceStaticLayer(draft.scene, selectedLayerId, (layer) => ({ ...layer, ...patch } as StaticAdLayer));
    draftChanged(updateFormatDraft(draft, { scene }));
  };
  const bindingChanged = (semanticRole: string, binding: StaticLayerBinding) => {
    const [roleType, roleId] = semanticRole.split(":");
    if (!roleType || !roleId || !["field", "list", "asset"].includes(roleType)) return;
    const matchesRole = (layer: StaticAdLayer) => roleType === "list"
      ? layer.semanticRole.startsWith(`list:${roleId}:`)
      : layer.semanticRole === `${roleType}:${roleId}`;
    const updateLayers = (layers: StaticAdLayer[]): StaticAdLayer[] => layers.map((layer) => {
      if (layer.type === "group") return { ...layer, children: updateLayers(layer.children) };
      return matchesRole(layer) ? { ...layer, binding, locked: binding === "locked" } : layer;
    });
    const analysis = structuredClone(draft.analysis);
    if (roleType === "field") {
      const field = analysis.fields.find((item) => item.id === roleId);
      if (field) field.binding = binding === "locked" ? "fixed" : binding;
    }
    if (roleType === "list") {
      const list = analysis.lists.find((item) => item.id === roleId);
      if (list) list.binding = binding === "fixed" || binding === "locked" ? "fixed" : binding === "brand" ? "brand" : "campaign";
    }
    if (roleType === "asset") {
      const asset = analysis.assets.find((item) => item.id === roleId);
      if (asset) asset.binding = binding === "proof" ? "campaign" : binding;
    }
    if (binding === "fixed" || binding === "locked") {
      analysis.reroll_groups = analysis.reroll_groups
        .map((group) => ({ ...group, members: group.members.filter((member) => member !== roleId) }))
        .filter((group) => group.members.length > 0);
    }
    const scene = { ...draft.scene, layout: { ...draft.scene.layout, layers: updateLayers(draft.scene.layout.layers) } };
    draftChanged(updateFormatDraft(draft, { analysis, scene }));
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
  const searchImages = async () => {
    if (imageQuery.trim().length < 3) return;
    setImageSearching(true);
    setImageSearchMessage("");
    try {
      const response = await fetch("/api/maker/search-images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: imageQuery.trim() }),
      });
      const payload = await response.json() as { images?: string[]; error?: string };
      if (!response.ok || !payload.images?.length) throw new Error(payload.error || "No usable images found.");
      setImageResults(payload.images);
    } catch (error) {
      setImageSearchMessage(error instanceof Error ? error.message : "Image search stopped.");
    } finally {
      setImageSearching(false);
    }
  };

  return (
    <aside className="min-h-0 border-l border-black/10 bg-white" data-builder-inspector="true">
      <ScrollArea className="h-full">
        <div className="space-y-7 p-5">
          <section className="rounded-2xl bg-violet-50 p-4">
            <h2 className="text-sm font-black text-violet-950">Why this Format works</h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-violet-900">{draft.analysis.formula.premise}</p>
            <p className="mt-2 text-xs leading-5 text-violet-700"><strong>What changes:</strong> {draft.analysis.formula.adaptation_rule}</p>
          </section>

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
                  <Input id="layer-name" disabled={layerControlsDisabled} value={selectedLayer.name} onChange={(event) => updateLayer({ name: event.target.value })} />
                </div>
                {selectedLayer.type === "text" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="layer-text">Text</Label>
                      <Textarea id="layer-text" disabled={layerControlsDisabled} value={selectedLayer.text} onChange={(event) => updateLayer({ text: event.target.value })} />
                    </div>
                    <div className="grid grid-cols-[1fr_84px] gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="font-size">Size</Label>
                        <Input
                          key={`${selectedLayer.id}-font-size-${selectedLayer.fontSize}`}
                          id="font-size"
                          type="number"
                          min={8}
                          disabled={layerControlsDisabled}
                          defaultValue={selectedLayer.fontSize}
                          onBlur={(event) => {
                            const value = Number(event.currentTarget.value);
                            if (event.currentTarget.value.trim() && Number.isFinite(value)) updateLayer(scaleTextLayerToValue(selectedLayer, "fontSize", value));
                            else event.currentTarget.value = String(selectedLayer.fontSize);
                          }}
                          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="text-color">Color</Label>
                        <Input id="text-color" type="color" disabled={layerControlsDisabled} value={selectedLayer.color} onChange={(event) => updateLayer({ color: event.target.value })} />
                      </div>
                    </div>
                  </>
                ) : null}
                {selectedLayer.type === "shape" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="shape-color">Fill color</Label>
                    <Input id="shape-color" type="color" disabled={layerControlsDisabled} value={selectedLayer.fill} onChange={(event) => updateLayer({ fill: event.target.value })} />
                  </div>
                ) : null}
                {selectedLayer.type === "image" ? (
                  <div className="space-y-3">
                    <img alt={selectedLayer.alt} className="h-32 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" src={selectedLayer.src} />
                    <div className="space-y-1.5">
                      <Label htmlFor="image-source">Paste image URL</Label>
                      <Input id="image-source" disabled={layerControlsDisabled} value={selectedLayer.src} onChange={(event) => updateLayer({ src: event.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="image-shape">Image shape</Label>
                      <select
                        id="image-shape"
                        className={selectClass}
                        disabled={layerControlsDisabled}
                        value={selectedLayer.borderRadius >= Math.min(selectedLayer.width, selectedLayer.height) / 2 ? "circle" : selectedLayer.borderRadius > 0 ? "rounded" : "square"}
                        onChange={(event) => updateLayer({ borderRadius: event.target.value === "circle" ? Math.min(selectedLayer.width, selectedLayer.height) / 2 : event.target.value === "rounded" ? 16 : 0 })}
                      >
                        <option value="square">Square</option>
                        <option value="rounded">Rounded</option>
                        <option value="circle">Circle</option>
                      </select>
                    </div>
                    <Input
                      id={`replace-image-upload-${selectedLayer.id}`}
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={layerControlsDisabled}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateLayer({ src: String(reader.result || ""), alt: file.name });
                        reader.readAsDataURL(file);
                      }}
                    />
                    <Label
                      htmlFor={`replace-image-upload-${selectedLayer.id}`}
                      className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold shadow-sm hover:bg-slate-50"
                      aria-disabled={layerControlsDisabled}
                    >
                      <Upload className="size-4" /> Upload image
                    </Label>
                    <div className="flex gap-2">
                      <Input aria-label="Image search" disabled={layerControlsDisabled || imageSearching} value={imageQuery} onChange={(event) => setImageQuery(event.target.value)} />
                      <Button type="button" size="icon" variant="outline" disabled={layerControlsDisabled || imageQuery.trim().length < 3 || imageSearching} onClick={() => void searchImages()} aria-label="Search images">
                        {imageSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
                      </Button>
                    </div>
                    {imageSearchMessage ? <p className="text-xs font-semibold text-red-600" role="alert">{imageSearchMessage}</p> : null}
                    {imageResults.length ? (
                      <div className="grid grid-cols-3 gap-2" aria-label="Image search results">
                        {imageResults.map((imageUrl, index) => (
                          <button className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-violet-500" key={imageUrl} type="button" onClick={() => updateLayer({ src: imageUrl })} aria-label={`Use image result ${index + 1}`}>
                            <img alt="" className="aspect-square w-full object-cover" src={imageUrl} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3">
                  {(["x", "y", "width", "height"] as const).map((property) => (
                    <div className="space-y-1.5" key={property}>
                      <Label htmlFor={`layer-${property}`}>{property === "x" || property === "y" ? property.toUpperCase() : property}</Label>
                      <Input
                        key={`${selectedLayer.id}-${property}-${selectedLayer[property]}`}
                        id={`layer-${property}`}
                        type="number"
                        disabled={layerControlsDisabled}
                        defaultValue={selectedLayer[property]}
                        onBlur={(event) => {
                          const value = Number(event.currentTarget.value);
                          if (event.currentTarget.value.trim() && Number.isFinite(value)) updateGeometry(property, value);
                          else event.currentTarget.value = String(selectedLayer[property]);
                        }}
                        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="layer-binding">Changes with</Label>
                  <select id="layer-binding" className={selectClass} disabled={layerControlsDisabled} value={selectedLayer.binding} onChange={(event) => bindingChanged(selectedLayer.semanticRole, event.target.value as StaticLayerBinding)}>
                    {bindings.map((binding) => <option key={binding} value={binding}>{binding}</option>)}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={readOnly}
                  onClick={() => {
                    const roleType = selectedLayer.semanticRole.split(":")[0];
                    if (["field", "list", "asset"].includes(roleType || "")) {
                      bindingChanged(selectedLayer.semanticRole, selectedLayer.locked ? "fixed" : "locked");
                    } else {
                      updateLayer({ locked: !selectedLayer.locked });
                    }
                  }}
                >
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
                <select className={selectClass} aria-label={`${asset.id} role`} disabled={readOnly} value={asset.role} onChange={(event) => updateAnalysis((analysis) => {
                  analysis.assets[assetIndex]!.role = event.target.value as MakerAssetRole;
                })}>
                  {assetRoles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                </select>
                <select className={selectClass} aria-label={`${asset.id} binding`} disabled={readOnly} value={asset.binding} onChange={(event) => bindingChanged(`asset:${asset.id}`, event.target.value as StaticLayerBinding)}>
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
