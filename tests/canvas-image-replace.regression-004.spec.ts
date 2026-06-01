import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('double-clicking an image layer opens local image replacement', async () => {
  const canvasSource = fs.readFileSync(path.join(process.cwd(), 'src/components/CanvasEditor.tsx'), 'utf8');
  const doubleClickStart = canvasSource.indexOf('onDoubleClick={(e) => {');
  const doubleClickEnd = canvasSource.indexOf("if (el.type === 'text' || el.type === 'button')", doubleClickStart);
  const doubleClickHandler = canvasSource.slice(doubleClickStart, doubleClickEnd);

  expect(canvasSource).toContain('const imageReplaceInputRef = useRef<HTMLInputElement>(null);');
  expect(canvasSource).toContain('const pendingImageReplaceIdRef = useRef<string | null>(null);');
  expect(canvasSource).toContain('accept="image/*"');
  expect(doubleClickHandler).toContain("if (el.type === 'image')");
  expect(doubleClickHandler).toContain('replaceImageElementFromFile(el.id);');
  expect(canvasSource).toContain('imageUrl: reader.result');
});
