# Wiggly

Wiggly is a focused creative studio for building visualizer-style Meta ads. It is designed for marketers who need to turn hooks, voiceover audio, captions, intro images, templates, and platform previews into export-ready MP4 ads without opening a video editor.

## What It Does

- Build ad creatives for feed, reels, and stories placements.
- Generate and refresh marketer-friendly hooks/headlines.
- Add audio, generated scripts, speaker-aware captions, visualizers, intro images, logos, buttons, and templates.
- Preview ads inside platform-style frames.
- Export MP4s through a Remotion server renderer for stable 60fps output.

## Architecture

- `src/App.tsx` owns the current editor shell and most orchestration.
- `src/components/` contains reusable editor, preview, text, platform, and properties UI.
- `src/lib/` contains shared product logic such as export snapshots, history, audio library, rich text, fonts, and visualizer math.
- `src/remotion/` contains the server-rendered MP4 composition.
- `server.ts` serves the app, API routes, transcription/script generation, media handling, and Remotion export.
- `.github/workflows/` handles CI and Oracle deployment.

## Local Development

```bash
npm install
npm run dev
```

The Vite client runs on `http://localhost:3000` and the API server runs on `http://localhost:3001` behind the dev proxy.

## Environment Variables

Create a local `.env` or `.env.local` file with:

```bash
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key
DEEPGRAM_API_KEY=your_deepgram_key
VITE_SUPABASE_URL=https://howclqjohkrvcdarajur.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=https://howclqjohkrvcdarajur.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
NODE_ENV=development
```

If Supabase env vars are missing, Wiggly share links fall back to local browser-only previews. Hosted links that friends can open require browser read keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) plus the server-only `SUPABASE_SERVICE_ROLE_KEY` for uploads.

Do not commit real API keys. Never use a `VITE_` prefix for the Supabase service role key.

## Quality Checks

```bash
npm run lint
npm run build
npm test
```

`npm run lint` currently runs TypeScript validation. Playwright tests live in `tests/`.

## Product Memory

Deferred technical and product decisions live in `ROADMAP.md`. Add future improvements there when something is intentionally pushed to v2.
