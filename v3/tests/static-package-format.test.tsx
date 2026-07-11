import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createStaticPackageFixture } from "../features/formats/static-package/fixture";
import { validateStaticPackageScene } from "../features/formats/static-package/validate";
import { AdRenderSurface } from "../features/render/AdRenderSurface";

const scene = createStaticPackageFixture();
const validation = validateStaticPackageScene(scene);
assert.equal(validation.valid, true, validation.errors.join("\n"));

const markup = renderToStaticMarkup(createElement(AdRenderSurface, { scene }));
assert.match(markup, /data-render-surface="ad"/);
assert.match(markup, /data-format="static-package"/);
assert.match(markup, /data-static-package-canvas="true"/);
assert.match(markup, /data-static-layer-id="active-tool"/);
assert.match(markup, />Slack</);

const duplicate = createStaticPackageFixture();
duplicate.layout.layers[1] = { ...duplicate.layout.layers[1]!, id: duplicate.layout.layers[0]!.id };
assert.equal(validateStaticPackageScene(duplicate).valid, false);
assert.match(validateStaticPackageScene(duplicate).errors.join(" "), /duplicated/);

const missingText = createStaticPackageFixture();
const firstLayer = missingText.layout.layers[0];
assert.equal(firstLayer?.type, "text");
if (!firstLayer || firstLayer.type !== "text") throw new Error("Fixture text layer is missing.");
missingText.layout.layers[0] = { ...firstLayer, text: "" };
assert.equal(validateStaticPackageScene(missingText).valid, false);
assert.match(validateStaticPackageScene(missingText).errors.join(" "), /is empty/);

console.log("static-package format tests passed");
