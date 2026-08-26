import sharp from "sharp";

import { sampleNode } from "./runtime_channels.mjs";

const RASTER_SCALE = 0.5;
const MODEL_EPSILON = 0.05;

const READ_DEFORMATION_GROUPS = Object.freeze({
  "Top/Shaz_Rig/Body_Group/Body": {
    groupPath: "Top/Shaz_Rig/Body_Group/Deformation-Body",
    kind: "bone-chain",
  },
  "Top/Shaz_Rig/Body_Group/Pouch": {
    groupPath: "Top/Shaz_Rig/Body_Group/Deformation-Pouch",
    kind: "closed-curve-cage",
  },
});

function fieldPoint(value) {
  return { x: Number(value?.x ?? 0), y: Number(value?.y ?? 0) };
}

function fieldToModel(point, grid) {
  return { x: point.x * grid.x, y: -point.y * grid.y };
}

function addPolar(point, length, degrees) {
  const radians = Number(degrees) * Math.PI / 180;
  return {
    x: point.x + Number(length) * Math.cos(radians),
    y: point.y + Number(length) * Math.sin(radians),
  };
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function maxControlDelta(rest, current) {
  return Math.max(...rest.map((point, index) => distance(point, current[index])));
}

function cubicPoint(start, control1, control2, end, progress) {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * start.x
      + 3 * inverse ** 2 * progress * control1.x
      + 3 * inverse * progress ** 2 * control2.x
      + progress ** 3 * end.x,
    y: inverse ** 3 * start.y
      + 3 * inverse ** 2 * progress * control1.y
      + 3 * inverse * progress ** 2 * control2.y
      + progress ** 3 * end.y,
  };
}

function sampledNode(nodes, columns, nodePath, frame, sampleNodeAtFrame) {
  const node = nodes.get(nodePath);
  if (!node) throw new Error(`missing deformation node ${nodePath}`);
  return sampleNodeAtFrame
    ? sampleNodeAtFrame(node, columns, frame)
    : sampleNode(node, columns, frame);
}

function buildBoneChain({ nodes, columns, groupPath, frame, grid, sampleNodeAtFrame }) {
  const sampled = ["Bone", "Bone_1"].map((name) => sampledNode(
    nodes,
    columns,
    `${groupPath}/${name}`,
    frame,
    sampleNodeAtFrame,
  ).attrs);
  function chain(mode) {
    const rootAttrs = sampled[0];
    const rootOffset = mode === "rest" ? rootAttrs.restoffset : rootAttrs.offset;
    const rootOrientation = Number(mode === "rest" ? rootAttrs.restorientation : rootAttrs.orientation);
    const rootLength = Number(mode === "rest" ? rootAttrs.restlength : rootAttrs.length);
    const rootField = fieldPoint(rootOffset);
    const firstEndField = addPolar(rootField, rootLength, rootOrientation);
    const childAttrs = sampled[1];
    const childOrientation = rootOrientation + Number(
      mode === "rest" ? childAttrs.restorientation : childAttrs.orientation,
    );
    const childLength = Number(mode === "rest" ? childAttrs.restlength : childAttrs.length);
    const childEndField = addPolar(firstEndField, childLength, childOrientation);
    return [rootField, firstEndField, childEndField].map((point) => fieldToModel(point, grid));
  }
  function radii(mode) {
    const rootRadius = Number(mode === "rest" ? sampled[0].restradius : sampled[0].radius);
    const childRadius = Number(mode === "rest" ? sampled[1].restradius : sampled[1].radius);
    return [rootRadius, rootRadius, childRadius];
  }
  return {
    rest: chain("rest"),
    current: chain("current"),
    restRadii: radii("rest"),
    currentRadii: radii("current"),
  };
}

function curveSegment(start, attrs, mode) {
  const current = mode === "current";
  const end = fieldPoint(current ? attrs.offset : attrs.restingoffset);
  const length0 = Number(current ? attrs.length0 : attrs.restlength0);
  const length1 = Number(current ? attrs.length1 : attrs.restlength1);
  const orientation0 = Number(current ? attrs.orientation0 : attrs.restingorientation0);
  const orientation1 = Number(current ? attrs.orientation1 : attrs.restingorientation1);
  return {
    start,
    control1: addPolar(start, length0 * 0.1, orientation0),
    control2: addPolar(end, length1 * 0.1, 180 + orientation1),
    end,
  };
}

function buildClosedCurveCage({ nodes, columns, groupPath, frame, grid, sampleNodeAtFrame }) {
  const offset = sampledNode(
    nodes,
    columns,
    `${groupPath}/Offset`,
    frame,
    sampleNodeAtFrame,
  ).attrs;
  const curves = ["Curve", "Curve_1", "Curve_2", "Curve_3"].map((name) => sampledNode(
    nodes,
    columns,
    `${groupPath}/${name}`,
    frame,
    sampleNodeAtFrame,
  ).attrs);
  function cage(mode) {
    let start = fieldPoint(mode === "current" ? offset.offset : offset.restingoffset);
    const points = [];
    for (const attrs of curves) {
      const segment = curveSegment(start, attrs, mode);
      for (const progress of [0, 0.25, 0.5, 0.75]) {
        points.push(fieldToModel(cubicPoint(
          segment.start,
          segment.control1,
          segment.control2,
          segment.end,
          progress,
        ), grid));
      }
      start = segment.end;
    }
    return points;
  }
  return { rest: cage("rest"), current: cage("current") };
}

function nearestSegmentMapping(
  point,
  current,
  rest,
  currentRadii = current.map(() => 1),
  restRadii = rest.map(() => 1),
) {
  let nearest = null;
  for (let index = 0; index + 1 < current.length; index += 1) {
    const currentStart = current[index];
    const currentEnd = current[index + 1];
    const dx = currentEnd.x - currentStart.x;
    const dy = currentEnd.y - currentStart.y;
    const squaredLength = dx * dx + dy * dy;
    const rawProgress = squaredLength === 0 ? 0 : (
      (point.x - currentStart.x) * dx + (point.y - currentStart.y) * dy
    ) / squaredLength;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const projected = {
      x: currentStart.x + progress * dx,
      y: currentStart.y + progress * dy,
    };
    const candidateDistance = distance(point, projected);
    if (!nearest || candidateDistance < nearest.distance) {
      nearest = {
        index,
        progress,
        rawProgress,
        projected,
        distance: candidateDistance,
        dx,
        dy,
      };
    }
  }
  const restStart = rest[nearest.index];
  const restEnd = rest[nearest.index + 1];
  const currentLength = Math.hypot(nearest.dx, nearest.dy) || 1;
  const lastSegment = current.length - 2;
  const mappingProgress = nearest.index === 0 && nearest.rawProgress < 0
    ? nearest.rawProgress
    : nearest.index === lastSegment && nearest.rawProgress > 1
      ? nearest.rawProgress
      : nearest.progress;
  const currentProjection = {
    x: current[nearest.index].x + mappingProgress * nearest.dx,
    y: current[nearest.index].y + mappingProgress * nearest.dy,
  };
  const currentNormal = { x: -nearest.dy / currentLength, y: nearest.dx / currentLength };
  const signedDistance = (point.x - currentProjection.x) * currentNormal.x
    + (point.y - currentProjection.y) * currentNormal.y;
  const restDx = restEnd.x - restStart.x;
  const restDy = restEnd.y - restStart.y;
  const restLength = Math.hypot(restDx, restDy) || 1;
  const restNormal = { x: -restDy / restLength, y: restDx / restLength };
  const radiusProgress = Math.max(0, Math.min(1, mappingProgress));
  const currentRadius = currentRadii[nearest.index]
    + (currentRadii[nearest.index + 1] - currentRadii[nearest.index]) * radiusProgress;
  const restRadius = restRadii[nearest.index]
    + (restRadii[nearest.index + 1] - restRadii[nearest.index]) * radiusProgress;
  const sourceDistance = signedDistance * restRadius / (currentRadius || 1);
  return {
    x: restStart.x + mappingProgress * restDx + sourceDistance * restNormal.x,
    y: restStart.y + mappingProgress * restDy + sourceDistance * restNormal.y,
  };
}

function centroid(points) {
  return points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
}

function barycentric(point, a, b, c) {
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denominator) < 1e-9) return null;
  const wa = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
  const wb = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
  return [wa, wb, 1 - wa - wb];
}

function closedCageMapping(point, current, rest) {
  const currentCenter = centroid(current);
  currentCenter.x /= current.length;
  currentCenter.y /= current.length;
  const restCenter = centroid(rest);
  restCenter.x /= rest.length;
  restCenter.y /= rest.length;
  let best = null;
  for (let index = 0; index < current.length; index += 1) {
    const next = (index + 1) % current.length;
    const weights = barycentric(point, currentCenter, current[index], current[next]);
    if (!weights) continue;
    const minimum = Math.min(...weights);
    if (!best || minimum > best.minimum) best = { index, next, weights, minimum };
    if (minimum >= -0.02) break;
  }
  if (!best || best.minimum < -0.08) return point;
  const [centerWeight, startWeight, endWeight] = best.weights;
  return {
    x: centerWeight * restCenter.x
      + startWeight * rest[best.index].x
      + endWeight * rest[best.next].x,
    y: centerWeight * restCenter.y
      + startWeight * rest[best.index].y
      + endWeight * rest[best.next].y,
  };
}

function bilinearSample(data, width, height, x, y, output, outputOffset) {
  if (x < -0.5 || y < -0.5 || x > width - 0.5 || y > height - 0.5) return;
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const samples = [
    [x0, y0, (1 - fx) * (1 - fy)],
    [x1, y0, fx * (1 - fy)],
    [x0, y1, (1 - fx) * fy],
    [x1, y1, fx * fy],
  ];
  let alpha = 0;
  const premultiplied = [0, 0, 0];
  for (const [sampleX, sampleY, weight] of samples) {
    const offset = (sampleY * width + sampleX) * 4;
    const normalizedAlpha = data[offset + 3] / 255;
    alpha += normalizedAlpha * weight;
    for (let channel = 0; channel < 3; channel += 1) {
      premultiplied[channel] += data[offset + channel] * normalizedAlpha * weight;
    }
  }
  output[outputOffset + 3] = Math.round(alpha * 255);
  if (alpha <= 1e-8) return;
  for (let channel = 0; channel < 3; channel += 1) {
    output[outputOffset + channel] = Math.round(premultiplied[channel] / alpha);
  }
}

async function warpRaster(buffer, asset, deformation) {
  const sourceWidth = Math.max(1, Math.round(asset.canvas.width * RASTER_SCALE));
  const sourceHeight = Math.max(1, Math.round(asset.canvas.height * RASTER_SCALE));
  const { data } = await sharp(buffer)
    .resize({ width: sourceWidth, height: sourceHeight, fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const maximumDisplacement = maxControlDelta(deformation.rest, deformation.current);
  const maximumRadiusScale = deformation.currentRadii
    ? Math.max(...deformation.currentRadii.map((radius, index) => (
      radius / (deformation.restRadii[index] || 1)
    )))
    : 1;
  const radialExpansion = Math.max(0, maximumRadiusScale - 1)
    * Math.max(asset.canvas.width, asset.canvas.height) / 2;
  const margin = Math.ceil((maximumDisplacement + radialExpansion) * RASTER_SCALE) + 4;
  const outputWidth = sourceWidth + margin * 2;
  const outputHeight = sourceHeight + margin * 2;
  const output = Buffer.alloc(outputWidth * outputHeight * 4);
  const origin = {
    x: asset.modelOrigin.x - margin / RASTER_SCALE,
    y: asset.modelOrigin.y - margin / RASTER_SCALE,
  };
  const mapPoint = deformation.kind === "bone-chain"
    ? nearestSegmentMapping
    : closedCageMapping;
  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const destinationModel = {
        x: origin.x + x / RASTER_SCALE,
        y: origin.y + y / RASTER_SCALE,
      };
      const sourceModel = mapPoint(
        destinationModel,
        deformation.current,
        deformation.rest,
        deformation.currentRadii,
        deformation.restRadii,
      );
      const sourceX = (sourceModel.x - asset.modelOrigin.x) * RASTER_SCALE;
      const sourceY = (sourceModel.y - asset.modelOrigin.y) * RASTER_SCALE;
      bilinearSample(
        data,
        sourceWidth,
        sourceHeight,
        sourceX,
        sourceY,
        output,
        (y * outputWidth + x) * 4,
      );
    }
  }
  return {
    buffer: await sharp(output, { raw: { width: outputWidth, height: outputHeight, channels: 4 } })
      .png()
      .toBuffer(),
    canvas: { width: outputWidth, height: outputHeight },
    modelOrigin: origin,
    modelUnitsPerPixel: 1 / RASTER_SCALE,
    maximumDisplacement,
  };
}

async function deformRegisteredAsset({
  buffer,
  asset,
  nodePath,
  nodes,
  columns,
  frame,
  grid,
  sampleNodeAtFrame,
}) {
  const configuration = READ_DEFORMATION_GROUPS[nodePath];
  if (!configuration) return null;
  const build = configuration.kind === "bone-chain" ? buildBoneChain : buildClosedCurveCage;
  const controls = build({
    nodes,
    columns,
    groupPath: configuration.groupPath,
    frame,
    grid,
    sampleNodeAtFrame,
  });
  const maximumDisplacement = maxControlDelta(controls.rest, controls.current);
  const maximumRadiusDelta = controls.currentRadii
    ? Math.max(...controls.currentRadii.map((radius, index) => (
      Math.abs(radius - controls.restRadii[index])
    )))
    : 0;
  if (maximumDisplacement <= MODEL_EPSILON && maximumRadiusDelta <= 1e-6) return null;
  return warpRaster(buffer, asset, { ...controls, kind: configuration.kind });
}

export {
  MODEL_EPSILON,
  READ_DEFORMATION_GROUPS,
  buildBoneChain,
  buildClosedCurveCage,
  closedCageMapping,
  deformRegisteredAsset,
  nearestSegmentMapping,
};
