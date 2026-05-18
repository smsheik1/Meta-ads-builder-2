import { test, expect } from '@playwright/test';

test('server health reports configured services', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);

  const health = await response.json();
  expect(health).toMatchObject({
    ok: true,
  });
});
