'use client';

import { FormEvent, useEffect, useReducer, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Globe2, Loader2, Lock, Wand2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { AudioOptionsPanel, type AudioPanelStatus } from '@/features/audio/AudioOptionsPanel';
import { scriptCacheMatches, type DialogueScript } from '@/features/audio/dialogueScripts';
import { AdSceneCanvas } from '@/features/render/AdSceneCanvas';
import type { AdCopyResult } from '@/features/research/adCopy';
import type { ResearchQuality } from '@/features/research/researchQuality';
import type { WebsiteResearch } from '@/features/research/websiteResearch';
import { getAdSceneBrandKey, type AdScene } from './scene';
import { ogToolScene } from './fixtures';
import { reduceAdScene } from './sceneReducer';
import { SavedDesignsPanel } from './SavedDesignsPanel';
import { ExportPanel } from './ExportPanel';
import { createSavedDesign, loadSavedDesign, type SavedDesign } from './sceneAdapters';
import { sceneHasSavedSnapshot } from './savedDesigns';
import { getOrCreateAnonymousSessionId } from './anonymousSession';

type CreateSceneResponse = {
  scene?: AdScene;
  research?: WebsiteResearch;
  quality?: ResearchQuality;
  adCopy?: AdCopyResult;
  error?: string;
};

type AudioScriptsResponse = {
  scripts?: DialogueScript[];
  sourceSceneId?: string;
  error?: string;
};

type CreateAudioResponse = {
  audioUrl?: string;
  transcript?: string;
  captions?: AdScene['audio']['captions'];
  durationMs?: number;
  sourceSceneId?: string;
  scriptId?: string;
  error?: string;
};

type ShareSceneResponse = {
  shareUrl?: string;
  error?: string;
};

type RenderSceneTicketResponse = {
  downloadUrl?: string;
  filename?: string;
  error?: string;
};

export function CreateFoundation() {
  const [scene, dispatch] = useReducer(reduceAdScene, ogToolScene);
  const [websiteUrl, setWebsiteUrl] = useState(scene.brand.websiteUrl);
  const [research, setResearch] = useState<WebsiteResearch | null>(null);
  const [quality, setQuality] = useState<ResearchQuality | null>(null);
  const [status, setStatus] = useState<'idle' | 'researching' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);
  const [scriptOptions, setScriptOptions] = useState<DialogueScript[]>([]);
  const [scriptSceneId, setScriptSceneId] = useState(scene.id);
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [audioStatus, setAudioStatus] = useState<AudioPanelStatus>('idle');
  const [audioError, setAudioError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [savedError, setSavedError] = useState('');
  const [exportStatus, setExportStatus] = useState<'idle' | 'rendering' | 'ready' | 'error'>('idle');
  const [exportError, setExportError] = useState('');
  const [exportDownloadUrl, setExportDownloadUrl] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'saving' | 'ready' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');

  const resetAudioPanel = (nextSceneId: string) => {
    setScriptOptions([]);
    setScriptSceneId(nextSceneId);
    setSelectedScriptId('');
    setAudioStatus('idle');
    setAudioError('');
    setAudioPanelOpen(false);
    setExportStatus('idle');
    setExportError('');
    setExportDownloadUrl('');
    setShareStatus('idle');
    setShareUrl('');
    setShareError('');
  };

  const generateScene = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('researching');
    setError('');

    try {
      const response = await fetch('/api/create-scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      });
      const payload = await response.json() as CreateSceneResponse;

      if (!response.ok || !payload.scene || !payload.research) {
        setResearch(payload.research ?? null);
        setQuality(payload.quality ?? null);
        throw new Error(payload.error || 'Something broke while researching that website.');
      }

      dispatch({ type: 'loadScene', scene: payload.scene });
      setWebsiteUrl(payload.scene.brand.websiteUrl);
      setResearch(payload.research);
      setQuality(payload.quality ?? null);
      resetAudioPanel(payload.scene.id);
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something broke while researching that website.');
      setStatus('error');
    }
  };

  const firstReceipt = scene.brand.receipts.specificClaims[0] ||
    scene.brand.receipts.exactSiteLanguage[0] ||
    scene.brand.receipts.buyerMoments[0] ||
    'No specific receipt found yet.';
  const convexSavedDesigns = useQuery(api.savedDesigns.list, sessionId ? { sessionId } : 'skip') as SavedDesign[] | undefined;
  const upsertSavedDesignMutation = useMutation(api.savedDesigns.upsert);
  const deleteSavedDesignMutation = useMutation(api.savedDesigns.remove);
  const savedDesigns = convexSavedDesigns ?? [];
  const savedDesignsLoading = Boolean(sessionId) && convexSavedDesigns === undefined;
  const currentSceneSaved = sceneHasSavedSnapshot(savedDesigns, scene);
  const selectedScript = scriptOptions.find((script) => script.id === selectedScriptId) || scriptOptions[0] || null;

  useEffect(() => {
    try {
      setSessionId(getOrCreateAnonymousSessionId(window.localStorage));
    } catch {
      setSavedError('Saved designs could not connect in this browser.');
    }
  }, []);

  const saveCurrentDesign = () => {
    if (!sessionId) {
      setSavedError('Saved designs are still connecting. Try again in a second.');
      return;
    }

    const existing = savedDesigns.find((design) => design.scene.id === scene.id);
    const design = createSavedDesign(scene, scene.creative.headline, Date.now(), existing?.id);

    void upsertSavedDesignMutation({
      sessionId,
      sceneId: scene.id,
      design,
    }).then(() => {
      setSavedError('');
    }).catch((caught) => {
      console.error('[create-v2 save-design]', caught);
      setSavedError('This browser could not save the ad.');
    });
  };

  const openSavedDesign = (design: SavedDesign) => {
    const nextScene = loadSavedDesign(design);
    dispatch({ type: 'loadScene', scene: nextScene });
    setWebsiteUrl(nextScene.brand.websiteUrl);
    setResearch(null);
    setQuality(null);
    setError('');
    setStatus('ready');
    resetAudioPanel(nextScene.id);
  };

  const removeSavedDesign = (designId: string) => {
    if (!sessionId) {
      setSavedError('Saved designs are still connecting. Try again in a second.');
      return;
    }

    void deleteSavedDesignMutation({
      sessionId,
      designId,
    }).then(() => {
      setSavedError('');
    }).catch(() => {
      setSavedError('This browser could not delete that saved ad.');
    });
  };

  const downloadVideo = async () => {
    if (exportStatus === 'ready' && exportDownloadUrl) {
      window.location.assign(exportDownloadUrl);
      return;
    }

    setExportStatus('rendering');
    setExportError('');
    setExportDownloadUrl('');

    try {
      const response = await fetch('/api/render-scene-ticket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scene }),
      });
      const payload = await response.json() as RenderSceneTicketResponse;

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error || 'Video download failed.');
      }

      const nextDownloadUrl = `${window.location.origin}${payload.downloadUrl}`;
      setExportDownloadUrl(nextDownloadUrl);
      setExportStatus('ready');
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : 'Video download failed.');
      setExportStatus('error');
    }
  };

  const createShareLink = async () => {
    setShareStatus('saving');
    setShareError('');
    setShareUrl('');

    try {
      const response = await fetch('/api/share-scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scene }),
      });
      const payload = await response.json() as ShareSceneResponse;

      if (!response.ok || !payload.shareUrl) {
        throw new Error(payload.error || 'Could not create share link.');
      }

      const nextShareUrl = `${window.location.origin}${payload.shareUrl}`;
      setShareUrl(nextShareUrl);
      setShareStatus('ready');
      await navigator.clipboard?.writeText(nextShareUrl).catch(() => undefined);
    } catch (caught) {
      setShareError(caught instanceof Error ? caught.message : 'Could not create share link.');
      setShareStatus('error');
    }
  };

  const loadScriptOptions = async (force = false) => {
    setAudioPanelOpen(true);
    setAudioError('');

    if (!force && scriptCacheMatches(scene.id, scriptSceneId, scriptOptions)) {
      setSelectedScriptId(selectedScriptId || scriptOptions[0]?.id || '');
      setAudioStatus('ready');
      return;
    }

    setAudioStatus('writing');

    try {
      const response = await fetch('/api/create-audio-scripts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scene, count: 5 }),
      });
      const payload = await response.json() as AudioScriptsResponse;

      if (!response.ok || !payload.scripts?.length || payload.sourceSceneId !== scene.id) {
        throw new Error(payload.error || 'Could not write voice options for this ad.');
      }

      setScriptOptions(payload.scripts);
      setScriptSceneId(scene.id);
      setSelectedScriptId(payload.scripts[0]?.id || '');
      setAudioStatus('ready');
    } catch (caught) {
      setAudioError(caught instanceof Error ? caught.message : 'Could not write voice options for this ad.');
      setAudioStatus('error');
    }
  };

  const makeAudio = async () => {
    if (!selectedScript) return;
    setAudioError('');
    setAudioStatus('making');

    try {
      const response = await fetch('/api/create-audio', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id, script: selectedScript }),
      });
      const payload = await response.json() as CreateAudioResponse;

      if (!response.ok || !payload.audioUrl || payload.sourceSceneId !== scene.id) {
        throw new Error(payload.error || 'Could not make audio for this ad.');
      }

      dispatch({
        type: 'updateAudio',
        audio: {
          status: 'generated',
          url: payload.audioUrl,
          transcript: payload.transcript || selectedScript.lines.map((line) => line.text).join('\n'),
          captions: payload.captions || [],
          sourceSceneId: payload.sourceSceneId,
          scriptId: payload.scriptId || selectedScript.id,
          durationMs: payload.durationMs || null,
          brandKey: getAdSceneBrandKey(scene),
        },
      });
      setAudioStatus('ready');
    } catch (caught) {
      setAudioError(caught instanceof Error ? caught.message : 'Could not make audio for this ad.');
      setAudioStatus('error');
    }
  };

  return (
    <main className="min-h-screen px-5 py-8 md:px-10">
      <div className="mx-auto grid min-w-0 max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <section className="flex min-w-0 flex-col justify-center gap-6">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Create v2 foundation
            </p>
            <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-normal text-slate-950 md:text-6xl">
              Drop in your website and watch the magic happen.
            </h1>
            <p className="max-w-xl text-base font-semibold leading-7 text-slate-600">
              Wiggly reads the page, pulls real selling evidence, and turns it into
              one clean ad scene without touching the frozen legacy app.
            </p>
          </div>

          <form
            className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
            onSubmit={generateScene}
          >
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Website
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
              <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-slate-950 outline-none"
                placeholder="https://yourbrand.com"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" disabled={status === 'researching'}>
                {status === 'researching' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {status === 'researching' ? 'Reading website' : 'Generate ad scene'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => dispatch({
                  type: 'setLock',
                  field: 'headline',
                  locked: !scene.locks.headline,
                })}
              >
                <Lock className="h-4 w-4" />
                {scene.locks.headline ? 'Unlock headline' : 'Lock headline'}
              </Button>
            </div>
            {error && (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                {error}
              </p>
            )}
          </form>

          <SavedDesignsPanel
            currentSceneSaved={currentSceneSaved}
            savedDesigns={savedDesigns}
            savedError={savedError}
            savedLoading={savedDesignsLoading}
            onDeleteDesign={removeSavedDesign}
            onLoadDesign={openSavedDesign}
            onSaveDesign={saveCurrentDesign}
          />

          <ExportPanel
            exportDownloadUrl={exportDownloadUrl}
            exportError={exportError}
            exportStatus={exportStatus}
            shareError={shareError}
            shareStatus={shareStatus}
            shareUrl={shareUrl}
            onCreateShareLink={createShareLink}
            onDownloadVideo={downloadVideo}
          />

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Creative brief
            </p>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Offer</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.offer}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Audience</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{scene.brand.audience}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-wide text-slate-400">Receipt</dt>
                <dd className="mt-1 text-sm font-black leading-6 text-slate-950">{firstReceipt}</dd>
              </div>
            </dl>
            {research && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-bold text-slate-500">
                  Read {research.headings.length} headings and {research.paragraphs.length} page snippets from {research.host}
                  {quality ? ` · ${quality.level} research (${quality.score}/100)` : ''}.
                </p>
                <div className="flex flex-wrap gap-2">
                  {research.providerStatus.map((provider) => (
                    <span
                      key={`${provider.provider}-${provider.status}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500"
                      title={provider.reason}
                    >
                      {provider.provider} {provider.status}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {audioPanelOpen && (
            <AudioOptionsPanel
              audioError={audioError}
              audioStatus={audioStatus}
              scriptOptions={scriptOptions}
              selectedScriptId={selectedScriptId}
              onMakeAudio={makeAudio}
              onNewOptions={() => loadScriptOptions(true)}
              onSelectScript={setSelectedScriptId}
            />
          )}
        </section>

        <AdSceneCanvas scene={scene} onAddAudio={() => loadScriptOptions(false)} />
      </div>
    </main>
  );
}
