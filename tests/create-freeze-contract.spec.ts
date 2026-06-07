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
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const legacyCreateSource = `${appSource}\n${createPageSource}`;
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');
  const packageSource = fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8');

  expect(legacyCreateSource).not.toContain('canvas.captureStream');
  expect(legacyCreateSource).not.toContain('new MediaRecorder');
  expect(legacyCreateSource).not.toContain('Browser recorder fallback');
  expect(legacyCreateSource).not.toContain('/api/convert-to-mp4');
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
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const legacyCreateSource = `${appSource}\n${createPageSource}`;
  const serverSource = fs.readFileSync(path.join(repoRoot, 'server.ts'), 'utf8');

  expect(legacyCreateSource).not.toContain('creativeMode');
  expect(legacyCreateSource).not.toContain('phone-call');
  expect(legacyCreateSource).not.toContain('PhoneCallSimulator');
  expect(legacyCreateSource).not.toContain('SOCIAL_POSTING_ENABLED');
  expect(legacyCreateSource).not.toContain('postiz');
  expect(legacyCreateSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('/api/postiz');
  expect(serverSource).not.toContain('Postiz');
  expect(serverSource).not.toContain('postiz');
  expect(serverSource).not.toContain('POSTIZ');
  expect(serverSource).not.toContain('uploadPostiz');
});

test('legacy create page lives behind a slim route shell', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPagePath = path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx');
  const createPageSource = fs.readFileSync(createPagePath, 'utf8');

  expect(fs.existsSync(createPagePath)).toBe(true);
  expect(appSource).toContain("from './features/create/CreatePage'");
  expect(appSource).toContain('<CreatePage');
  expect(appSource.split(/\r?\n/).length).toBeLessThanOrEqual(750);

  [
    '<CreateFlow',
    '<CreateSidebar',
    '<CreatePreviewStage',
    '<CreateDesignLibrary',
    'useCreateMediaController({',
    'useCreateVoiceController({',
    'useCreateExportController({',
    'buildGeneratedAdApplication({',
  ].forEach((createInternal) => {
    expect(appSource).not.toContain(createInternal);
    expect(createPageSource).toContain(createInternal);
  });
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
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const savedDesignsSource = fs.readFileSync(savedDesignsPath, 'utf8');

  expect(fs.existsSync(savedDesignsPath)).toBe(true);
  expect(appSource).not.toContain('createSavedDesigns');
  expect(createPageSource).toContain("from './createSavedDesigns'");
  expect(appSource).not.toContain("from './lib/ad-history'");
  expect(createPageSource).not.toContain("from '../../lib/ad-history'");
  expect(createPageSource).not.toContain("const TEMPLATE_STORAGE_KEY = 'visualizer_ad_templates_v1'");
  expect(createPageSource).not.toContain('const captureMediaBlob');
  expect(savedDesignsSource).toContain('loadSavedTemplates');
  expect(savedDesignsSource).toContain('persistSavedTemplates');
  expect(savedDesignsSource).toContain('hydrateStoredMedia');
  expect(savedDesignsSource).toContain('saveDownloadedAdToHistoryItem');
  expect(savedDesignsSource).toContain('removeSavedAdHistoryItem');
});

test('legacy create export media helpers live outside App', () => {
  const exportMediaPath = path.join(repoRoot, 'src', 'features', 'create', 'createExportMedia.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const exportMediaSource = fs.readFileSync(exportMediaPath, 'utf8');
  const exportControllerSource = fs.readFileSync(
    path.join(repoRoot, 'src', 'features', 'create', 'useCreateExportController.ts'),
    'utf8',
  );

  expect(fs.existsSync(exportMediaPath)).toBe(true);
  expect(appSource).not.toContain('createExportMedia');
  expect(createPageSource).toContain("from './createExportMedia'");
  expect(appSource).not.toContain('const tryRemotionExport');
  expect(exportControllerSource).toContain('const tryRemotionExport');
  expect(createPageSource).not.toContain('const getRemotionUploadExtension');
  expect(createPageSource).not.toContain('const appendMediaForRemotion');
  expect(createPageSource).not.toContain('const removeWhiteFromImageBlob');
  expect(createPageSource).not.toContain('const MIN_VALID_MP4_BYTES');
  expect(createPageSource).not.toContain('const isValidMp4Blob');
  expect(createPageSource).not.toContain('const formatBytes');
  expect(exportMediaSource).toContain('getMediaDurationSeconds');
  expect(exportMediaSource).toContain('appendMediaForRemotion');
  expect(exportMediaSource).toContain('ensureValidMp4Blob');
  expect(exportMediaSource).toContain('getValidMp4Bytes');
});

test('legacy create export and share state lives in controller hook', () => {
  const controllerPath = path.join(repoRoot, 'src', 'features', 'create', 'useCreateExportController.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const controllerSource = fs.readFileSync(controllerPath, 'utf8');

  expect(fs.existsSync(controllerPath)).toBe(true);
  expect(appSource).not.toContain('useCreateExportController');
  expect(createPageSource).toContain("from './useCreateExportController'");
  expect(createPageSource).toContain('const createRemotionSnapshot');
  expect(appSource).not.toContain("from './features/share/useShareLink'");
  expect(createPageSource).not.toContain("from '../../features/share/useShareLink'");
  expect(createPageSource).not.toContain('const [rendering, setRendering]');
  expect(createPageSource).not.toContain('const [exportDownload, setExportDownload]');
  expect(createPageSource).not.toContain('const [shareStatus, setShareStatus]');
  expect(createPageSource).not.toContain('const cancelExport');
  expect(createPageSource).not.toContain('const downloadSimulatedVideo');
  expect(createPageSource).not.toContain('const saveExportToHistoryOnce');
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
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const voiceWizardSource = fs.readFileSync(voiceWizardPath, 'utf8');
  const voiceScriptsSource = fs.readFileSync(voiceScriptsPath, 'utf8');

  expect(fs.existsSync(voiceWizardPath)).toBe(true);
  expect(fs.existsSync(voiceScriptsPath)).toBe(true);
  expect(appSource).not.toContain('CreateVoiceWizard');
  expect(appSource).not.toContain('createVoiceScripts');
  expect(createPageSource).toContain("from './CreateVoiceWizard'");
  expect(createPageSource).toContain("from './createVoiceScripts'");
  expect(appSource).not.toContain('const formatDialogueScriptCost');
  expect(appSource).not.toContain('const cleanDialogueScriptForVoiceover');
  expect(appSource).not.toContain('const captionsFromDialogueScript');
  expect(appSource).not.toContain('Check the business info, choose the words, edit anything, then make the audio.');
  expect(createPageSource.match(/\{voiceWizardModal\}/g)?.length).toBe(2);
  expect(voiceWizardSource).toContain('Make Voice Audio');
  expect(voiceWizardSource).toContain('Check the business info, choose the words, edit anything, then make the audio.');
  expect(voiceScriptsSource).toContain('formatDialogueScriptCost');
  expect(voiceScriptsSource).toContain('cleanDialogueScriptForVoiceover');
  expect(voiceScriptsSource).toContain('captionsFromDialogueScript');
});

test('legacy create voice controller state lives outside App', () => {
  const voiceControllerPath = path.join(repoRoot, 'src', 'features', 'create', 'useCreateVoiceController.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const voiceControllerSource = fs.readFileSync(voiceControllerPath, 'utf8');

  expect(fs.existsSync(voiceControllerPath)).toBe(true);
  expect(appSource).not.toContain('useCreateVoiceController');
  expect(createPageSource).toContain("from './useCreateVoiceController'");
  expect(appSource).not.toContain('const [dialogueScripts, setDialogueScripts]');
  expect(appSource).not.toContain('const [conversationWizardOpen, setConversationWizardOpen]');
  expect(appSource).not.toContain('const handleGenerateDialogueScripts');
  expect(appSource).not.toContain('const handleGenerateDialogueAudio');
  expect(appSource).not.toContain('const playDialoguePreview');
  expect(appSource).not.toContain('const stopDialoguePreview');
  expect(voiceControllerSource).toContain('const [dialogueScripts, setDialogueScripts]');
  expect(voiceControllerSource).toContain('const generateDialogueScripts');
  expect(voiceControllerSource).toContain('const generateDialogueAudio');
  expect(voiceControllerSource).toContain('const playDialoguePreview');
  expect(voiceControllerSource).toContain('generatedDialogueAudioUrl');
});

test('legacy create generated ad application logic lives outside App', () => {
  const applicationPath = path.join(repoRoot, 'src', 'features', 'create', 'createAdApplication.ts');
  const templateTypesPath = path.join(repoRoot, 'src', 'features', 'create', 'templates', 'types.ts');
  const templateRegistryPath = path.join(repoRoot, 'src', 'features', 'create', 'templates', 'registry.ts');
  const visualizerTemplatePath = path.join(repoRoot, 'src', 'features', 'create', 'templates', 'visualizerTemplate.ts');
  const conversationTemplatePath = path.join(repoRoot, 'src', 'features', 'create', 'templates', 'conversationTemplate.ts');
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const applicationSource = fs.readFileSync(applicationPath, 'utf8');
  const templateRegistrySource = fs.readFileSync(templateRegistryPath, 'utf8');
  const visualizerTemplateSource = fs.readFileSync(visualizerTemplatePath, 'utf8');
  const conversationTemplateSource = fs.readFileSync(conversationTemplatePath, 'utf8');

  expect(fs.existsSync(applicationPath)).toBe(true);
  expect(fs.existsSync(templateTypesPath)).toBe(true);
  expect(fs.existsSync(templateRegistryPath)).toBe(true);
  expect(fs.existsSync(visualizerTemplatePath)).toBe(true);
  expect(fs.existsSync(conversationTemplatePath)).toBe(true);
  expect(appSource).not.toContain('createAdApplication');
  expect(appSource).not.toContain('buildGeneratedAdApplication({');
  expect(createPageSource).toContain("from './createAdApplication'");
  expect(createPageSource).toContain('buildGeneratedAdApplication({');
  expect(appSource).not.toContain('const applyVariationToElement');
  expect(appSource).not.toContain("variation.format === 'conversation'");
  expect(appSource).not.toContain('const buildConversationAdElements');
  expect(appSource).not.toContain('const pickCanvasBrandLogo');
  expect(appSource).not.toContain('const buildCreativeBriefFromBrandBrain');
  expect(applicationSource).toContain('export const buildGeneratedAdApplication');
  expect(applicationSource).toContain('getCreateAdTemplateForVariation');
  expect(applicationSource).toContain('template.buildElements');
  expect(applicationSource).not.toContain("variation.format === 'conversation'");
  expect(applicationSource).not.toContain('const buildConversationAdElements');
  expect(applicationSource).not.toContain('const applyVariationToElement');
  expect(templateRegistrySource).toContain('CREATE_AD_TEMPLATES');
  expect(templateRegistrySource).toContain('getCreateAdTemplateForVariation');
  expect(visualizerTemplateSource).toContain('export const visualizerTemplate');
  expect(visualizerTemplateSource).toContain('const applyVisualizerTemplateElement');
  expect(conversationTemplateSource).toContain('export const conversationTemplate');
  expect(conversationTemplateSource).toContain('const buildConversationElements');
  expect(applicationSource).toContain('const buildCreativeBriefFromBrandBrain');
});

test('legacy create preview and design library UI live outside App', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const previewStagePath = path.join(repoRoot, 'src', 'features', 'create', 'components', 'CreatePreviewStage.tsx');
  const designLibraryPath = path.join(repoRoot, 'src', 'features', 'create', 'components', 'CreateDesignLibrary.tsx');
  const previewStageSource = fs.readFileSync(previewStagePath, 'utf8');
  const designLibrarySource = fs.readFileSync(designLibraryPath, 'utf8');

  expect(fs.existsSync(previewStagePath)).toBe(true);
  expect(fs.existsSync(designLibraryPath)).toBe(true);
  expect(appSource).not.toContain('CreatePreviewStage');
  expect(appSource).not.toContain('CreateDesignLibrary');
  expect(createPageSource).toContain("from './components/CreatePreviewStage'");
  expect(createPageSource).toContain("from './components/CreateDesignLibrary'");
  expect(createPageSource).toContain('<CreatePreviewStage');
  expect(createPageSource).toContain('<CreateDesignLibrary');
  expect(appSource).not.toContain('const TemplatePreview');
  expect(createPageSource).not.toContain('className="wiggly-studio flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 py-5"');
  expect(createPageSource).not.toContain('className="wiggly-library hidden w-72 shrink-0 flex-col overflow-hidden xl:flex"');
  expect(previewStageSource).toContain('export const CreatePreviewStage');
  expect(previewStageSource).toContain('CanvasEditor');
  expect(designLibrarySource).toContain('export const CreateDesignLibrary');
  expect(designLibrarySource).toContain('const TemplatePreview');
});

test('legacy create sidebar panels live outside App', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const sidebarPath = path.join(repoRoot, 'src', 'features', 'create', 'components', 'CreateSidebar.tsx');
  const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');

  expect(fs.existsSync(sidebarPath)).toBe(true);
  expect(appSource).not.toContain('CreateSidebar');
  expect(createPageSource).toContain("from './components/CreateSidebar'");
  expect(createPageSource).toContain('<CreateSidebar');
  expect(appSource).not.toContain('const HexColorInput');
  expect(createPageSource).not.toContain('className="wiggly-sidebar hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto overflow-x-hidden lg:flex"');
  expect(createPageSource).not.toContain('<PropertiesPanel />');
  expect(createPageSource).not.toContain('<DevTuningPanel />');
  expect(sidebarSource).toContain('export const CreateSidebar');
  expect(sidebarSource).toContain('const HexColorInput');
  expect(sidebarSource).toContain('<PropertiesPanel />');
  expect(sidebarSource).toContain('<DevTuningPanel />');
});

test('legacy create audio and media controller logic lives outside App', () => {
  const appSource = fs.readFileSync(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const createPageSource = fs.readFileSync(path.join(repoRoot, 'src', 'features', 'create', 'CreatePage.tsx'), 'utf8');
  const mediaControllerPath = path.join(repoRoot, 'src', 'features', 'create', 'useCreateMediaController.ts');
  const mediaControllerSource = fs.readFileSync(mediaControllerPath, 'utf8');

  expect(fs.existsSync(mediaControllerPath)).toBe(true);
  expect(appSource).not.toContain('useCreateMediaController');
  expect(createPageSource).toContain("from './useCreateMediaController'");
  expect(createPageSource).toContain('useCreateMediaController({');
  expect(appSource).not.toContain('const getAudioSignalStats');
  expect(appSource).not.toContain('const rememberAudioBlob');
  expect(createPageSource).not.toContain('const audioLibraryItems');
  expect(createPageSource).not.toContain('const updateCreateCaptions =');
  expect(appSource).not.toContain('TRANSCRIPTION_BACKOFF_KEY');
  expect(appSource).not.toContain('CURRENT_AUDIO_STORAGE_KEY');
  expect(mediaControllerSource).toContain('export function useCreateMediaController');
  expect(mediaControllerSource).toContain('const getAudioSignalStats');
  expect(mediaControllerSource).toContain('const rememberAudioBlob');
  expect(mediaControllerSource).toContain('const audioLibraryItems');
  expect(mediaControllerSource).toContain('const updateCreateCaptions =');
  expect(mediaControllerSource).toContain('TRANSCRIPTION_BACKOFF_KEY');
  expect(mediaControllerSource).toContain('CURRENT_AUDIO_STORAGE_KEY');
});
