import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('share page renders the exported video inside the saved platform overlay', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const sharePageSource = fs.readFileSync(path.join(process.cwd(), 'src/routes/ShareAdPage.tsx'), 'utf8');
  const platformFrameSource = fs.readFileSync(path.join(process.cwd(), 'src/components/PlatformFrame.tsx'), 'utf8');
  const phoneSectionEnd = sharePageSource.indexOf('<section className="mx-auto w-full max-w-[440px] space-y-5">');
  const phoneSectionSource = sharePageSource.slice(0, phoneSectionEnd);

  expect(appSource).toContain("import { ShareAdPage } from './routes/ShareAdPage';");
  expect(appSource).not.toContain('const ShareAdPage = ({');
  expect(sharePageSource).toContain('<PlatformFrame');
  expect(platformFrameSource).toContain('overlayControls?: React.ReactNode;');
  expect(sharePageSource).toContain('overlayControls={videoUrl && videoReady && shareHasAudio ? (');
  expect(platformFrameSource).toContain('<div className="absolute inset-0 z-50 pointer-events-none">');
  expect(sharePageSource).toContain('const stopShareVideo = () => {');
  expect(sharePageSource).toContain("video.pause();");
  expect(sharePageSource).toContain("'Stop'");
  expect(sharePageSource).toContain('const getSharePlatformFromSearch = () => {');
  expect(sharePageSource).toContain("new URLSearchParams(window.location.search).get('p')");
  expect(sharePageSource).toContain('const inferSharePlatformFromVideo = (width: number, height: number): PlatformType | null => {');
  expect(sharePageSource).toContain("const sharePlatform = getSharePlatformFromSearch() || record.platform || inferredSharePlatform || 'instagram-feed';");
  expect(sharePageSource).toContain("const shareHasAudio = getShareTextFromSearch('a') !== '0';");
  expect(sharePageSource).toContain('platform={sharePlatform}');
  expect(sharePageSource).toContain('brandLogo={shareBrandLogo || null}');
  expect(sharePageSource).toContain('metaCtaUrl={shareCtaUrl}');
  expect(sharePageSource).toContain('caption={record.subhead || record.headline}');
  expect(sharePageSource).toContain("const shareBrandLogo = getShareableBrandLogo(getShareTextFromSearch('l') || record.brandLogo);");
  expect(sharePageSource).toContain('Sponsored');
  expect(sharePageSource).toContain('const shareBrandInitials = getBrandInitials(shareBrandName);');
  expect(sharePageSource).toContain('href="/create"');
  expect(sharePageSource).toContain('onLoadedMetadata={(event) => {');
  expect(sharePageSource).toContain('setInferredSharePlatform(inferSharePlatformFromVideo(event.currentTarget.videoWidth, event.currentTarget.videoHeight));');
  expect(sharePageSource).toContain('object-contain transition-opacity');
  expect(sharePageSource).not.toContain('autoPlay');
  expect(sharePageSource).toContain('event.currentTarget.currentTime = 0.1;');
  expect(sharePageSource).toContain('video.currentTime = 0.1;');
  expect(phoneSectionSource).not.toContain('Wiggly Ad Page');
  expect(phoneSectionSource).not.toContain('src="/wiggly-logo.png"');
  expect(sharePageSource).not.toContain('Wiggly Ad Page');
  expect(sharePageSource).not.toContain('{record.headline}</h1>');
  expect(sharePageSource).not.toContain('{record.subhead && <p');
});

test('share links keep the selected platform even when the database cannot store it yet', async () => {
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
  const shareMetadataSource = fs.readFileSync(path.join(process.cwd(), 'src/features/share/shareMetadata.ts'), 'utf8');
  const shareLinkSource = fs.readFileSync(path.join(process.cwd(), 'src/features/share/useShareLink.ts'), 'utf8');

  expect(appSource).toContain('const { createShareLink } = useShareLink({');
  expect(appSource).not.toContain('const getShareMetadataFromSnapshot =');
  expect(shareMetadataSource).toContain('export const buildShareMetadataFromSnapshot = (snapshot: ShareMetadataSnapshot): ShareMetadata => {');
  expect(shareMetadataSource).not.toContain('useEditorStore.getState');
  expect(shareMetadataSource).not.toContain('getCurrentDesignTitle');
  expect(shareMetadataSource).not.toContain('|| brandName');
  expect(shareMetadataSource).not.toContain('|| ctaUrl');
  expect(shareMetadataSource).toContain('favicon');
  expect(shareMetadataSource).toContain("return null;");
  expect(shareLinkSource).toContain('if (!exportDownload.snapshot) {');
  expect(shareLinkSource).toContain('Make the video again before creating a share link.');
  expect(shareLinkSource).toContain('const shareSearch = new URLSearchParams();');
  expect(shareLinkSource).toContain("shareSearch.set('p', metadata.platform);");
  expect(shareLinkSource).toContain("shareSearch.set('u', metadata.ctaUrl);");
  expect(shareLinkSource).toContain("shareSearch.set('l', metadata.brandLogo);");
  expect(shareLinkSource).toContain("shareSearch.set('a', exportDownload.snapshot.settings.audioUrl ? '1' : '0');");
  expect(shareLinkSource).toContain("const nextUrl = `${window.location.origin}/s/${record.slug}${shareSearch.toString() ? `?${shareSearch.toString()}` : ''}`;");
});

test('share creation retries when optional share columns are missing from schema cache', async () => {
  const serverSource = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const shareRouteStart = serverSource.indexOf("app.post('/api/share-pages'");
  const shareRouteEnd = serverSource.indexOf("app.use('/api/remotion-assets'", shareRouteStart);
  const shareRouteSource = serverSource.slice(shareRouteStart, shareRouteEnd);

  expect(shareRouteSource).toContain('const baseShareRow = {');
  expect(shareRouteSource).toContain('const enhancedShareRow = {');
  expect(shareRouteSource).toContain('brand_logo_url: brandLogoUrl || null');
  expect(shareRouteSource).toContain('platform,');
  expect(shareRouteSource).toContain("includes('schema cache')");
  expect(shareRouteSource).toContain('insert = await insertShareRow(baseShareRow);');
});
