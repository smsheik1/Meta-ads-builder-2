import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('fallback brand headlines avoid chopped sentence fragments', () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');

  expect(serverSource).toContain('medspa|medical spa|skin|laser|aesthetic');
  expect(serverSource).toContain('Laser care without the guessing');
  expect(serverSource).toContain('need\\s+a\\s+clear');
  expect(serverSource).toContain('Cookies that arrive ready to impress');
  expect(serverSource).toContain('before\\s+they\\s+scroll');
  expect(serverSource).not.toContain('`${pain} is getting expensive`');
  expect(serverSource).not.toContain('They need a clear');
  expect(serverSource).not.toContain('`Why people choose ${brandName}`');
  expect(serverSource).not.toContain('`What makes ${brandName} worth noticing`');
});
