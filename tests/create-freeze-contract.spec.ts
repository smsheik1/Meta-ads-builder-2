import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const listSourceFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'test-results', 'tmp'].includes(entry.name)) return [];
      return listSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx|css|md)$/.test(entry.name)) return [];
    return [fullPath];
  });
};

test('legacy create owns its AdScene engine instead of importing create-v2 UI internals', () => {
  const sourceFiles = listSourceFiles(path.join(repoRoot, 'src'));
  const offenders = sourceFiles
    .filter((filePath) => !filePath.endsWith(path.join('src', 'engine', 'ad-scene', 'scene.ts')))
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('apps/web/features/create/scene'));

  expect(offenders).toEqual([]);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'engine', 'ad-scene', 'scene.ts'))).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'apps', 'web', 'features', 'create'))).toBe(false);
});

test('freeze docs name legacy create as the active product path', () => {
  const freezeDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'LEGACY_FREEZE.md'), 'utf8');

  expect(freezeDoc).toContain('`/create` is the active product path');
  expect(freezeDoc).not.toContain('Build new Wiggly product work in `apps/web`');
  expect(freezeDoc).not.toContain('http://localhost:3010/create-v2');
});

test('legacy create app has no browser recorder fallback renderer', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const packageSource = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8');

  expect(appSource).not.toContain('canvas.captureStream');
  expect(appSource).not.toContain('new MediaRecorder');
  expect(appSource).not.toContain('Browser recorder fallback');
  expect(appSource).not.toContain('/api/convert-to-mp4');
  expect(serverSource).not.toContain('/api/convert-to-mp4');
  expect(serverSource).not.toContain('uploadDisk');
  expect(serverSource).not.toContain('fluent-ffmpeg');
  expect(packageSource).not.toContain('fluent-ffmpeg');
});

test('legacy create website research timeout matches the server research budget', () => {
  const createFlowSource = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'CreateFlow.tsx'), 'utf8');

  expect(createFlowSource).toContain('const WEBSITE_RESEARCH_TIMEOUT_MS = 45000;');
  expect(createFlowSource).toContain('WEBSITE_RESEARCH_TIMEOUT_MS');
  expect(createFlowSource).not.toContain("}, 25000, 'That site is taking too long to read");
});

test('legacy create app no longer carries dead phone-call or Postiz branches', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');

  expect(appSource).not.toContain('creativeMode');
  expect(appSource).not.toContain('phone-call');
  expect(appSource).not.toContain('PhoneCallSimulator');
  expect(appSource).not.toContain('SOCIAL_POSTING_ENABLED');
  expect(appSource).not.toContain('postiz');
  expect(appSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('/api/postiz');
  expect(serverSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('postiz');
  expect(serverSource).not.toContain('POSTIZ');
  expect(serverSource).not.toContain('uploadPostiz');
});

test('legacy create render path has no phone-call composition branch', () => {
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const remotionRootSource = fs.readFileSync(path.join(repoRoot, 'src', 'remotion', 'Root.tsx'), 'utf8');
  const exportSnapshotSource = fs.readFileSync(path.join(repoRoot, 'src', 'lib', 'export-snapshot.ts'), 'utf8');

  expect(serverSource).not.toContain('PhoneCallRender');
  expect(serverSource).not.toContain('isPhoneCallSnapshot');
  expect(serverSource).not.toContain('PHONE_CALL_EXPORT_DIMENSIONS');
  expect(remotionRootSource).not.toContain('PhoneCallRender');
  expect(remotionRootSource).not.toContain('RemotionPhoneCall');
  expect(exportSnapshotSource).not.toContain('PhoneCallSnapshot');
  expect(exportSnapshotSource).not.toContain('PHONE_CALL_EXPORT_DIMENSIONS');

  expect(fs.existsSync(path.join(repoRoot, 'src', 'remotion', 'RemotionPhoneCall.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'components', 'PhoneCallScene.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'components', 'PhoneCallSimulator.tsx'))).toBe(false);
  expect(fs.existsSync(path.join(repoRoot, 'src', 'lib', 'phone-call.ts'))).toBe(false);
});

test('legacy create dialogue generation stays outside the server monolith', () => {
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const dialoguePath = path.join(repoRoot, 'src', 'server', 'dialogue-generation.ts');
  const dialogueSource = fs.readFileSync(dialoguePath, 'utf8');

  expect(fs.existsSync(dialoguePath)).toBe(true);
  expect(serverSource).toContain('generateDialogueScriptsResponse(req.body)');
  expect(serverSource).toContain('generateDialogueAudioResponse(req.body)');
  expect(serverSource).not.toContain('DIALOGUE_SCRIPT_EXAMPLES');
  expect(serverSource).not.toContain('gibberishPattern');
  expect(serverSource).not.toContain('pcmBase64ToWavBase64');
  expect(dialogueSource).toContain('DIALOGUE_SCRIPT_SHAPE_RULES');
  expect(dialogueSource).toContain('PINNED_TTS_MODEL');
});

test('legacy create formats are centralized before adding new ad formats', () => {
  const registryPath = path.join(repoRoot, 'src', 'features', 'formats', 'registry.ts');
  const visualizerPath = path.join(repoRoot, 'src', 'features', 'formats', 'visualizer.ts');
  const conversationPath = path.join(repoRoot, 'src', 'features', 'formats', 'conversation.ts');
  const createFlowSource = fs.readFileSync(path.join(repoRoot, 'src', 'components', 'CreateFlow.tsx'), 'utf8');
  const adGenerationSource = fs.readFileSync(path.join(repoRoot, 'src', 'server', 'ad-generation.ts'), 'utf8');
  const registrySource = fs.readFileSync(registryPath, 'utf8');

  expect(fs.existsSync(registryPath)).toBe(true);
  expect(fs.existsSync(visualizerPath)).toBe(true);
  expect(fs.existsSync(conversationPath)).toBe(true);
  expect(registrySource).toContain('ACTIVE_GENERATED_FORMATS');
  expect(registrySource).toContain('CREATE_FORMAT_MODES');
  expect(registrySource).toContain('conversationFormat');
  expect(createFlowSource).toContain("from '../features/formats/registry'");
  expect(adGenerationSource).toContain("from '../features/formats/registry'");
  expect(adGenerationSource).toContain('isCreateFormatActive');
  expect(adGenerationSource).not.toContain('isGeneratedAdFormat');
  expect(createFlowSource).not.toContain('const ACTIVE_GENERATED_FORMATS');
  expect(createFlowSource).not.toContain('const PAUSED_CREATE_FORMATS');
  expect(adGenerationSource).not.toContain("const allowed: GeneratedAdFormat[] = ['visualizer', 'conversation']");
});

test('legacy create saved-design persistence lives outside App', () => {
  const savedDesignsPath = path.join(repoRoot, 'src', 'features', 'create', 'createSavedDesigns.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const savedDesignsSource = fs.readFileSync(savedDesignsPath, 'utf8');

  expect(fs.existsSync(savedDesignsPath)).toBe(true);
  expect(appSource).toContain("from './features/create/createSavedDesigns'");
  expect(appSource).not.toContain("from './lib/ad-history'");
  expect(appSource).not.toContain("const TEMPLATE_STORAGE_KEY = 'visualizer_ad_templates_v1'");
  expect(appSource).not.toContain('const captureMediaBlob');
  expect(savedDesignsSource).toContain('loadSavedTemplates');
  expect(savedDesignsSource).toContain('persistSavedTemplates');
  expect(savedDesignsSource).toContain('hydrateStoredMedia');
  expect(savedDesignsSource).toContain('saveDownloadedAdToHistoryItem');
  expect(savedDesignsSource).toContain('removeSavedAdHistoryItem');
});

test('legacy create export media helpers live outside App', () => {
  const exportMediaPath = path.join(repoRoot, 'src', 'features', 'create', 'createExportMedia.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const exportMediaSource = fs.readFileSync(exportMediaPath, 'utf8');
  const exportControllerSource = fs.readFileSync(
    path.join(repoRoot, 'src', 'features', 'create', 'useCreateExportController.ts'),
    'utf8',
  );

  expect(fs.existsSync(exportMediaPath)).toBe(true);
  expect(appSource).toContain("from './features/create/createExportMedia'");
  expect(appSource).not.toContain('const tryRemotionExport');
  expect(exportControllerSource).toContain('const tryRemotionExport');
  expect(appSource).not.toContain('const getRemotionUploadExtension');
  expect(appSource).not.toContain('const appendMediaForRemotion');
  expect(appSource).not.toContain('const removeWhiteFromImageBlob');
  expect(appSource).not.toContain('const MIN_VALID_MP4_BYTES');
  expect(appSource).not.toContain('const isValidMp4Blob');
  expect(appSource).not.toContain('const formatBytes');
  expect(exportMediaSource).toContain('getMediaDurationSeconds');
  expect(exportMediaSource).toContain('appendMediaForRemotion');
  expect(exportMediaSource).toContain('ensureValidMp4Blob');
  expect(exportMediaSource).toContain('getValidMp4Bytes');
});

test('legacy create export and share state lives in controller hook', () => {
  const controllerPath = path.join(repoRoot, 'src', 'features', 'create', 'useCreateExportController.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const controllerSource = fs.readFileSync(controllerPath, 'utf8');

  expect(fs.existsSync(controllerPath)).toBe(true);
  expect(appSource).toContain("from './features/create/useCreateExportController'");
  expect(appSource).toContain('const createRemotionSnapshot');
  expect(appSource).not.toContain("from './features/share/useShareLink'");
  expect(appSource).not.toContain('const [rendering, setRendering]');
  expect(appSource).not.toContain('const [exportDownload, setExportDownload]');
  expect(appSource).not.toContain('const [shareStatus, setShareStatus]');
  expect(appSource).not.toContain('const cancelExport');
  expect(appSource).not.toContain('const downloadSimulatedVideo');
  expect(appSource).not.toContain('const saveExportToHistoryOnce');
  expect(controllerSource).toContain('useShareLink');
  expect(controllerSource).toContain('const [rendering, setRendering]');
  expect(controllerSource).toContain('const [exportDownload, setExportDownload]');
  expect(controllerSource).toContain('const [shareStatus, setShareStatus]');
  expect(controllerSource).toContain('const cancelExport');
  expect(controllerSource).toContain('const downloadSimulatedVideo');
  expect(controllerSource).toContain('const saveExportToHistoryOnce');
});

test('legacy create voice wizard markup and helpers live outside App', () => {
  const voiceWizardPath = path.join(repoRoot, 'src', 'features', 'create', 'CreateVoiceWizard.tsx');
  const voiceScriptsPath = path.join(repoRoot, 'src', 'features', 'create', 'createVoiceScripts.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const voiceWizardSource = fs.readFileSync(voiceWizardPath, 'utf8');
  const voiceScriptsSource = fs.readFileSync(voiceScriptsPath, 'utf8');

  expect(fs.existsSync(voiceWizardPath)).toBe(true);
  expect(fs.existsSync(voiceScriptsPath)).toBe(true);
  expect(appSource).toContain("from './features/create/CreateVoiceWizard'");
  expect(appSource).toContain("from './features/create/createVoiceScripts'");
  expect(appSource).not.toContain('const formatDialogueScriptCost');
  expect(appSource).not.toContain('const cleanDialogueScriptForVoiceover');
  expect(appSource).not.toContain('const captionsFromDialogueScript');
  expect(appSource).not.toContain('Check the business info, choose the words, edit anything, then make the audio.');
  expect(appSource.match(/\{voiceWizardModal\}/g)?.length).toBe(2);
  expect(voiceWizardSource).toContain('Make Voice Audio');
  expect(voiceWizardSource).toContain('Check the business info, choose the words, edit anything, then make the audio.');
  expect(voiceScriptsSource).toContain('formatDialogueScriptCost');
  expect(voiceScriptsSource).toContain('cleanDialogueScriptForVoiceover');
  expect(voiceScriptsSource).toContain('captionsFromDialogueScript');
});
