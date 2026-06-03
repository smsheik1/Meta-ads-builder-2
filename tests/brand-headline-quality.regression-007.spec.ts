import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('fallback brand headlines avoid chopped sentence fragments', () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const headlinePromptSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/headline-variations.ts'), 'utf8');

  expect(serverSource).toContain('medspa|medical spa|skin|laser|aesthetic');
  expect(serverSource).toContain('Laser care without the guessing');
  expect(serverSource).toContain('need\\s+a\\s+clear');
  expect(serverSource).toContain('Cookies that arrive ready to impress');
  expect(serverSource).toContain('Gear that keeps up with your pace');
  expect(serverSource).toContain('performance footwear and athletic apparel');
  expect(serverSource).toContain('&#x([0-9a-f]+);');
  expect(serverSource).toContain('before\\s+they\\s+scroll');
  expect(serverSource).toContain('hijack|hack|steal|trick|game|exploit|dominate');
  expect(headlinePromptSource).toContain('Do not use scammy or exploit-y verbs');
  expect(appSource).toContain('const isLikelyLogoAsset = (value: string | null | undefined) => {');
  expect(appSource).toContain('avatar|author|headshot|portrait|profile|team|founder|person|people|user|testimonial|speaker|staff');
  expect(appSource).toContain('return candidates.find(isLikelyLogoAsset) || null;');
  expect(appSource).toContain('brandBrain.brandAssets?.images.favicon || realCanvasLogo || null');
  expect(serverSource).not.toContain('`${pain} is getting expensive`');
  expect(serverSource).not.toContain('They need a clear');
  expect(serverSource).not.toContain('`Why people choose ${brandName}`');
  expect(serverSource).not.toContain('`What makes ${brandName} worth noticing`');
});
