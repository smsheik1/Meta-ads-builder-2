import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('share page renders the exported video inside the shared platform frame', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const shareStart = appSource.indexOf('const ShareAdPage = ({');
  const shareEnd = appSource.indexOf('const normalizeHexColor', shareStart);
  const sharePageSource = appSource.slice(shareStart, shareEnd);
  const phoneSectionEnd = sharePageSource.indexOf('<section className="mx-auto w-full max-w-[440px] space-y-5">');
  const phoneSectionSource = sharePageSource.slice(0, phoneSectionEnd);

  expect(sharePageSource).toContain('<PlatformFrame');
  expect(sharePageSource).toContain("platform={record.platform || 'instagram-feed'}");
  expect(sharePageSource).toContain('caption={record.subhead || record.headline}');
  expect(phoneSectionSource).not.toContain('Wiggly Ad Page');
  expect(phoneSectionSource).not.toContain('aspect-[4/5] bg-[#FAFAF7]');
});
