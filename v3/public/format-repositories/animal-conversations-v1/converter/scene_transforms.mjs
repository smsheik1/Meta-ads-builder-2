import { indexColumns, sampleNode } from "./runtime_channels.mjs";

const FIELD_GRID = Object.freeze({ x: 208.328125, y: 156.25 });

function identity() {
  return [1, 0, 0, 1, 0, 0];
}

function multiply(left, right) {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function inverse(matrix) {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-12) throw new Error(`singular transform: ${matrix.join(",")}`);
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

function translation(x, y) {
  return [1, 0, 0, 1, x, y];
}

function scale(x, y) {
  return [x, 0, 0, y, 0, 0];
}

function rotation(degrees) {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [cosine, sine, -sine, cosine, 0, 0];
}

function skewX(degrees) {
  return [1, 0, Math.tan(degrees * Math.PI / 180), 1, 0, 0];
}

function applyToPoint(matrix, point) {
  return [
    matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
    matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
  ];
}

function localMatrix(sampledNode, convention = {}) {
  const invertY = convention.invertY ?? true;
  const invertAngle = convention.invertAngle ?? true;
  const fieldGrid = convention.fieldGrid ?? FIELD_GRID;
  const attrs = sampledNode.attrs ?? {};
  const isPeg = sampledNode.type === "PEG";
  const isRead = sampledNode.type === "READ";
  if (!isPeg && !isRead) return identity();

  const sourcePosition = isPeg
    ? (Array.isArray(attrs.position?.attr3dpath)
      ? attrs.position.attr3dpath
      : [attrs.position?.x ?? 0, attrs.position?.y ?? 0, attrs.position?.z ?? 0])
    : [attrs.offset?.x ?? 0, attrs.offset?.y ?? 0, attrs.offset?.z ?? 0];
  const yDirection = invertY ? -1 : 1;
  const position = [sourcePosition[0] * fieldGrid.x, yDirection * sourcePosition[1] * fieldGrid.y];
  const pivot = [
    (attrs.pivot?.x ?? 0) * fieldGrid.x,
    yDirection * (attrs.pivot?.y ?? 0) * fieldGrid.y,
  ];
  let scaleX = attrs.scale?.x ?? attrs.scale?.xy ?? 1;
  let scaleY = attrs.scale?.y ?? attrs.scale?.xy ?? 1;
  if (isRead && attrs.flipHor) scaleX *= -1;
  if (isRead && attrs.flipVert) scaleY *= -1;
  const angleDirection = invertAngle ? -1 : 1;
  const angle = angleDirection * (attrs.rotation?.anglez ?? attrs.angle ?? 0);
  const skew = angleDirection * (attrs.skew ?? 0);

  return [
    translation(position[0], position[1]),
    translation(pivot[0], pivot[1]),
    rotation(angle),
    skewX(skew),
    scale(scaleX, scaleY),
    translation(-pivot[0], -pivot[1]),
  ].reduce(multiply, identity());
}

function buildTransformGraph(scene) {
  const nodes = new Map(scene.nodes.map((node) => [node.path, node]));
  const groups = new Map(scene.groups.map((group) => [group.path, group]));
  const incoming = new Map();
  for (const edge of scene.links) {
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    incoming.get(edge.to).push(edge);
  }

  function sourceForGroup(groupPath, trail) {
    const candidates = incoming.get(groupPath) ?? [];
    for (const edge of candidates) {
      const source = resolveSource(edge.from, groups.get(groupPath)?.path, trail);
      if (source) return source;
    }
    return null;
  }

  function resolveSource(sourcePath, targetGroupPath, trail = new Set()) {
    if (trail.has(sourcePath)) throw new Error(`transform graph cycle at ${sourcePath}`);
    const nextTrail = new Set(trail).add(sourcePath);
    const sourceNode = nodes.get(sourcePath);
    if (sourceNode?.type === "PEG") return sourcePath;
    if (sourceNode?.type === "MULTIPORT_IN") {
      return sourceForGroup(sourceNode.groupPath, nextTrail);
    }
    if (groups.has(sourcePath)) return sourceForGroup(sourcePath, nextTrail);
    if (sourceNode?.type === "READ") return sourcePath;
    return null;
  }

  function parentPath(nodePath) {
    const node = nodes.get(nodePath);
    if (!node) throw new Error(`unknown node ${nodePath}`);
    for (const edge of incoming.get(nodePath) ?? []) {
      const source = resolveSource(edge.from, node.groupPath);
      if (source) return source;
    }
    return null;
  }

  return { groups, incoming, nodes, parentPath, sourceForGroup };
}

function worldMatrices(scene, frame, convention = {}) {
  const graph = buildTransformGraph(scene);
  const columns = indexColumns(scene);
  const sampleNodeAtFrame = convention.sampleNodeAtFrame ?? sampleNode;
  const samples = new Map(scene.nodes.map((node) => [
    node.path,
    sampleNodeAtFrame(node, columns, frame),
  ]));
  const matrices = new Map();
  const visiting = new Set();

  function world(nodePath) {
    if (matrices.has(nodePath)) return matrices.get(nodePath);
    if (visiting.has(nodePath)) throw new Error(`transform hierarchy cycle at ${nodePath}`);
    visiting.add(nodePath);
    const parent = graph.parentPath(nodePath);
    const local = localMatrix(samples.get(nodePath), convention);
    const matrix = parent ? multiply(world(parent), local) : local;
    visiting.delete(nodePath);
    matrices.set(nodePath, matrix);
    return matrix;
  }

  for (const node of scene.nodes) {
    if (node.type === "PEG" || node.type === "READ") world(node.path);
  }
  return matrices;
}

function relativeWorldMatrices(scene, frame, baseFrame = 1, convention = {}) {
  const base = worldMatrices(scene, baseFrame, convention);
  const current = worldMatrices(scene, frame, convention);
  return new Map([...current].map(([path, matrix]) => [
    path,
    multiply(matrix, inverse(base.get(path))),
  ]));
}

export {
  FIELD_GRID,
  applyToPoint,
  buildTransformGraph,
  identity,
  inverse,
  localMatrix,
  multiply,
  relativeWorldMatrices,
  worldMatrices,
};
