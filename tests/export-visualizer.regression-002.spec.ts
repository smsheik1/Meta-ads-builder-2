import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('browser recorder export uses the shared visualizer renderer', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const drawStart = appSource.indexOf('const draw = () => {');
  const drawEnd = appSource.indexOf('if (introImgEl && introDuration > 0)', drawStart);
  const browserRecorderDrawBlock = appSource.slice(drawStart, drawEnd);

  // Regression: downloaded fallback videos drifted from preview because this path
  // used a legacy canvas-only visualizer instead of the shared preview/export bars.
  expect(browserRecorderDrawBlock).toContain('getVisualizerBars({');
  expect(browserRecorderDrawBlock).toContain('normalizeVisualizerType(el.visualizerType)');
  expect(browserRecorderDrawBlock).not.toContain('drawAdvancedVisualizer(');
  expect(browserRecorderDrawBlock).not.toContain('compressVisualizerValue(');
});

test('local development does not rate-limit video export testing like production', async () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');

  expect(serverSource).toContain('limit: isProd ? 120 : 5000');
  expect(serverSource).toContain('limit: isProd ? 30 : 1000');
});
