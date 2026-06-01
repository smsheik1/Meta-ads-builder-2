import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('brand research preserves website reviews as proof', () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const promptSource = fs.readFileSync(path.join(process.cwd(), 'src/lib/prompts/brand-brain.ts'), 'utf8');

  expect(serverSource).toContain('extractReviewSnippets');
  expect(serverSource).toContain('reviews: normalizeStringArray(input.reviews');
  expect(serverSource).toContain('...(brandAssets?.reviews || [])');
  expect(promptSource).toContain('customer reviews or testimonials');
});
