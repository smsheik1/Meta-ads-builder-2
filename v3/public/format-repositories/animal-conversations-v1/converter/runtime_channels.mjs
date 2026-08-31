function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function expandedScalarKeys(column) {
  const keys = [];
  for (const point of column.points ?? []) {
    for (const frame of point.frames ?? []) {
      keys.push({
        frame,
        value: point.value,
        constantSegment: Boolean(point.constantSegment),
      });
    }
  }
  keys.sort((left, right) => left.frame - right.frame);
  return keys;
}

function sampleKeys(keys, frame, interpolate) {
  if (keys.length === 0) return null;
  if (frame <= keys[0].frame) return keys[0].value;
  if (frame >= keys.at(-1).frame) return keys.at(-1).value;
  for (let index = 1; index < keys.length; index += 1) {
    const right = keys[index];
    if (frame > right.frame) continue;
    const left = keys[index - 1];
    if (frame === right.frame) return right.value;
    if (left.constantSegment) return left.value;
    const progress = clamp((frame - left.frame) / Math.max(1, right.frame - left.frame), 0, 1);
    return interpolate(left.value, right.value, progress);
  }
  return keys.at(-1).value;
}

function sampleScalarColumn(column, frame) {
  return sampleKeys(
    expandedScalarKeys(column),
    frame,
    (left, right, progress) => left + (right - left) * progress,
  );
}

function samplePath3dColumn(column, frame) {
  const velocityByFrame = new Map();
  for (const point of column.path3d?.velocity?.points ?? []) {
    for (const velocityFrame of point.frames ?? []) {
      velocityByFrame.set(velocityFrame, point);
    }
  }
  const hasVelocityMetadata = velocityByFrame.size > 0;
  const keys = [...(column.path3d?.points ?? [])].map((point) => ({
    ...point,
    constantSegment: velocityByFrame.get(point.frame)?.constantSegment ?? false,
  })).sort((left, right) => left.frame - right.frame);

  if (hasVelocityMetadata && keys.length > 1
    && frame > keys[0].frame && frame < keys.at(-1).frame) {
    for (let index = 1; index < keys.length; index += 1) {
      const right = keys[index];
      if (frame >= right.frame) continue;
      const left = keys[index - 1];
      if (!left.constantSegment) {
        throw new Error(
          `unsupported nonconstant Harmony path3D segment ${column.name ?? "<unnamed>"} ${left.frame}-${right.frame}`,
        );
      }
      break;
    }
  }
  return sampleKeys(keys, frame, (left, right, progress) => left.map(
    (value, index) => value + (right[index] - value) * progress,
  ));
}

function drawingAtFrame(column, frame) {
  const exposures = (column.exposures ?? []).flatMap((exposure) =>
    exposure.frames.map((exposureFrame) => ({ frame: exposureFrame, drawing: exposure.drawing })),
  ).sort((left, right) => left.frame - right.frame);
  const exact = exposures.find((exposure) => exposure.frame === frame);
  if (exact) return exact.drawing;
  if (!(column.heldFrames ?? []).includes(frame)) return null;
  const previous = exposures.filter((exposure) => exposure.frame < frame).at(-1);
  if (!previous) return null;
  const heldFrames = new Set(column.heldFrames ?? []);
  for (let candidate = previous.frame + 1; candidate <= frame; candidate += 1) {
    if (!heldFrames.has(candidate)) return null;
  }
  return previous.drawing;
}

function childAt(value, name) {
  const matches = value?.children?.[name];
  if (!matches || matches.length !== 1) return null;
  return matches[0];
}

function attributeAtPath(node, dottedPath) {
  let value = node.attrs;
  for (const part of dottedPath.split(".")) {
    value = childAt(value, part);
    if (!value) return null;
  }
  return value;
}

function literal(value) {
  if (value === undefined || value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function sampleAttribute(node, dottedPath, columnsByName, frame) {
  const attribute = attributeAtPath(node, dottedPath);
  if (!attribute) return null;
  const columnName = attribute.attributes?.col;
  if (columnName) {
    const column = columnsByName.get(columnName);
    if (!column) throw new Error(`${node.path}.${dottedPath} references missing column ${columnName}`);
    if (column.type === 0) return drawingAtFrame(column, frame);
    if (column.type === 2) return samplePath3dColumn(column, frame);
    if (column.type === 3) return sampleScalarColumn(column, frame);
    throw new Error(`${node.path}.${dottedPath} references unsupported column type ${column.type}`);
  }
  return literal(attribute.attributes?.val ?? attribute.attributes?.defaultValue);
}

function sampledXmlValue(value, columnsByName, frame, context = "attribute") {
  const columnName = value?.attributes?.col;
  if (columnName) {
    const column = columnsByName.get(columnName);
    if (!column) throw new Error(`${context} references missing column ${columnName}`);
    if (column.type === 0) return drawingAtFrame(column, frame);
    if (column.type === 2) return samplePath3dColumn(column, frame);
    if (column.type === 3) return sampleScalarColumn(column, frame);
    throw new Error(`${context} references unsupported column type ${column.type}`);
  }

  const childEntries = Object.entries(value?.children ?? {});
  if (childEntries.length > 0) {
    return Object.fromEntries(childEntries.map(([name, records]) => {
      const sampled = records.map((record, index) => sampledXmlValue(
        record,
        columnsByName,
        frame,
        `${context}.${name}[${index}]`,
      ));
      return [name, sampled.length === 1 ? sampled[0] : sampled];
    }));
  }
  if (value?.text !== undefined) return value.text;
  return literal(value?.attributes?.val ?? value?.attributes?.defaultValue);
}

function sampleNode(node, columnsByName, frame) {
  return {
    path: node.path,
    type: node.type,
    options: sampledXmlValue(node.options, columnsByName, frame, `${node.path}.options`),
    attrs: sampledXmlValue(node.attrs, columnsByName, frame, `${node.path}.attrs`),
  };
}

function resolveReadDrawing(manifest, scene, node, frame) {
  if (node.type !== "READ") throw new Error(`${node.path} is not a READ node`);
  const elementAttribute = attributeAtPath(node, "drawing.element");
  const columnName = elementAttribute?.attributes?.col;
  if (!columnName) throw new Error(`${node.path} has no drawing element column`);
  const column = scene.columns.find((candidate) => candidate.name === columnName);
  if (!column || column.type !== 0) {
    throw new Error(`${node.path} references invalid drawing column ${columnName}`);
  }
  const element = manifest.elements.find((candidate) => candidate.id === column.elementId);
  if (!element) throw new Error(`${node.path} references missing element ${column.elementId}`);
  const drawing = drawingAtFrame(column, frame);
  if (drawing === null) return null;
  if (!element.drawings.includes(drawing)) {
    throw new Error(`${node.path} exposes unknown ${element.name} drawing ${drawing}`);
  }
  return {
    elementId: element.id,
    element: element.name,
    drawing,
    file: `${element.rootFolder}/${element.folder}/${element.folder}-${drawing}.tvg`,
  };
}

function indexColumns(scene) {
  return new Map(scene.columns.map((column) => [column.name, column]));
}

export {
  attributeAtPath,
  drawingAtFrame,
  expandedScalarKeys,
  indexColumns,
  resolveReadDrawing,
  sampleAttribute,
  sampleNode,
  samplePath3dColumn,
  sampledXmlValue,
  sampleScalarColumn,
};
