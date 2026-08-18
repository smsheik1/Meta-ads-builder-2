import assert from "node:assert/strict";
import test from "node:test";

import {
  closedCageMapping,
  nearestSegmentMapping,
} from "../runtime/vendor/deformation_chains.mjs";

function closePoint(actual, expected, epsilon = 1e-8) {
  assert.ok(Math.abs(actual.x - expected.x) <= epsilon, `${actual.x} != ${expected.x}`);
  assert.ok(Math.abs(actual.y - expected.y) <= epsilon, `${actual.y} != ${expected.y}`);
}

test("bone inverse mapping preserves along-chain progress and perpendicular distance", () => {
  const rest = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];
  closePoint(nearestSegmentMapping({ x: 4, y: 3 }, rest, rest), { x: 4, y: 3 });
  closePoint(nearestSegmentMapping({ x: -5, y: 3 }, rest, rest), { x: -5, y: 3 });
  closePoint(nearestSegmentMapping({ x: 25, y: 3 }, rest, rest), { x: 25, y: 3 });

  const translated = rest.map(({ x, y }) => ({ x, y: y + 5 }));
  closePoint(
    nearestSegmentMapping({ x: 14, y: 8 }, translated, rest),
    { x: 14, y: 3 },
  );

  closePoint(
    nearestSegmentMapping(
      { x: 15, y: 3 },
      rest,
      rest,
      [1, 1, 2],
      [1, 1, 1],
    ),
    { x: 15, y: 2 },
  );
});

test("closed curve cage inverse mapping preserves identity and translation", () => {
  const rest = [
    { x: -10, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 10 },
    { x: -10, y: 10 },
  ];
  closePoint(closedCageMapping({ x: 3, y: 4 }, rest, rest), { x: 3, y: 4 });

  const translated = rest.map(({ x, y }) => ({ x: x + 7, y: y - 2 }));
  closePoint(
    closedCageMapping({ x: 10, y: 2 }, translated, rest),
    { x: 3, y: 4 },
  );
});
