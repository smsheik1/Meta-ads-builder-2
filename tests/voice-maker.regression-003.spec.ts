import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('opening voice maker closes the change voice flyout', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const handlerStart = appSource.indexOf('const handleOpenConversationWizard = () => {');
  const handlerEnd = appSource.indexOf('const handleSelectDialogueScript', handlerStart);
  const handlerSource = appSource.slice(handlerStart, handlerEnd);

  expect(handlerSource).toContain('setAudioFlyoutOpen(false);');
  expect(handlerSource).toContain("setAudioFlyoutView('choices');");
  expect(handlerSource).toContain('setConversationWizardOpen(true);');
});
