# Graph Report - Meta-ads-builder-2  (2026-06-15)

## Corpus Check
- 161 files · ~230,276 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1249 nodes · 2199 edges · 82 communities (74 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d84b3c9d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]

## God Nodes (most connected - your core abstractions)
1. `AdScene` - 29 edges
2. `StoredWebsiteResearchResult` - 17 edges
3. `normalizeFirecrawlPayload()` - 16 edges
4. `compilerOptions` - 16 edges
5. `compilerOptions` - 15 edges
6. `normalizeJinaReaderPayload()` - 15 edges
7. `scripts` - 15 edges
8. `scripts` - 13 edges
9. `compilerOptions` - 13 edges
10. `buildDeterministicAdCandidates()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `makeScene()` --calls--> `getVisualizerVariantForCandidate()`  [EXTRACTED]
  v3/tests/reroll.test.ts → v3/features/scene/visualizerVariants.ts
- `POST()` --calls--> `getBillingStatus()`  [EXTRACTED]
  v3/app/api/billing/complete/route.ts → v3/lib/billing.ts
- `POST()` --calls--> `getOrSetBillingSessionId()`  [EXTRACTED]
  v3/app/api/billing/consume-run/route.ts → v3/lib/billing.ts
- `GET()` --calls--> `getBillingStatus()`  [EXTRACTED]
  v3/app/api/billing/status/route.ts → v3/lib/billing.ts
- `CreateControlPanel()` --calls--> `getFormatModule()`  [EXTRACTED]
  v3/app/create/CreateControlPanel.tsx → v3/features/formats/registry.ts

## Import Cycles
- None detected.

## Communities (82 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (80): callGemini(), callNvidiaNimChat(), NvidiaNimChatCompletion, DEFAULT_NVIDIA_NIM_BRAND_CURATOR_MODEL, NIM_MODEL_OPTIONS, withTimeout(), asArray(), BrandCuratorOptions (+72 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (41): generateFromResearch, latestForAnonymousId, listForResearchRun, loadResearchForGeneration, saveGeneratedScenes, generateForScene, claimNext, createFromScene (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (48): applySignalTuning(), applyVisualizerCurve(), clamp01(), compressWithRatio(), getIdleVisualizerPercent(), getVisualizerBarCount(), getVisualizerBars(), normalizeVisualizerType() (+40 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (46): FormatRenderProps, DEFAULT_NVIDIA_NIM_MEME_MODEL, buildDeterministicMemeVariants(), DANGLING_ENDING_WORDS, deterministicSlotsForTemplate(), endsWithDanglingWord(), extractMemeVariantsFromResponse(), ExtractMemeVariantsOptions (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (51): AdGenerationProvider, AdGenerationProviderStatus, asArray(), buildDeterministicAdCandidates(), candidateFromReceipt(), categoryNoun(), clampSentence(), cleanText() (+43 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (38): list, refreshSceneAudioUrl(), saveFromScene, toSavedDesign(), CreateQuickActions(), SaveStatus, ResearchConnected(), assertSavableAdScene() (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (25): AudioStatus, CreateDialogueModal(), DialogueStatus, buildDialogueScriptsPrompt(), buildFallbackDialogueScripts(), callGeminiDialogue(), cleanText(), cloneDialogueScript() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (24): getSceneDefaultFlashSlots(), AnyAdFormatModule, createFormatRegistry(), formatRegistry, getFormatModule(), getFormatModuleFromRegistry(), AdFormatModule, FormatEditorOption (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (28): devDependencies, @babel/parser, name, optionalDependencies, lightningcss-linux-arm64-gnu, lightningcss-linux-x64-gnu, @rspack/binding-linux-arm64-gnu, @tailwindcss/oxide-linux-arm64-gnu (+20 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (21): RenderMode, remotionFontFaceCss, AdRenderSurface(), AdRenderSurfaceProps, buildWigglyFontFaceCss(), WIGGLY_FONT_FACE_CSS, WIGGLY_FONT_STACK, AdScene (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (19): applyVoiceVisualizerPreset(), explainVoiceVisualizerPresetFromAnalysis(), getVoiceVisualizerPreset(), mean(), rms(), VoiceVisualizerPreset, VoiceVisualizerPresetDecision, VoiceVisualizerPresetId (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (21): checkConvexConnectivity(), checkNotDisabled(), checkPinnedTtsModel(), checkRemotionRuntime(), checkRequiredEnv(), dirname, fail(), filename (+13 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (20): getClientRendererVersion(), getWorkerRendererVersion(), bundleDir, ClaimedRenderJob, dirname, filename, getConvexUrl(), heartbeat() (+12 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (22): dependencies, class-variance-authority, clsx, convex, @google/genai, html-to-image, lucide-react, next (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (15): analyzeGeneratedWavAudio(), analyzeResampledMonoAudio(), findWavChunks(), percentile(), readAscii(), readMonoSample(), readPcmSample(), readUint16() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (18): POST(), paidUntilFromCheckoutPayload(), POST(), StripeSubscription, billingSecret(), earlyAccessMonthlyPriceCents(), freeWorkflowResetDays(), getOrSetBillingSessionId() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (17): createVisualizerAdScene(), pickSceneAccentColor(), AdSceneCandidate, createTintedVisualizerBackground(), fallbackVisualizerColors, getVisualizerVariantForCandidate(), hexToRgb(), isUsefulColor() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (10): ConvexClientProvider(), metadata, CreateResearchClient(), api, components, getV3ConvexUrl(), getInitialShare(), SharePage() (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (10): CreateCreativeBriefCard(), getCreativeBriefHighlights(), CreateIdeasList(), AdSceneGenerationResponse, BillingStatus, CreateModal, getAnonymousId(), WigglyMark() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (16): defaultRenderScene, RemotionAdScene(), getAdSceneDurationInFrames(), RemotionRoot(), audio, captions, cleanVoiceDecision, editedAudio (+8 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (18): getCanvasCanReroll(), getCanvasCanRerollNow(), createClientSource, createDir, createSources, dialogueModal, idle, keyboardSource (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (17): CanvasInteractionActions, CanvasInteractionBusyReason, CanvasInteractionEvent, CanvasInteractionModal, CanvasInteractionPanel, CanvasInteractionSnapshot, CanvasInteractionState, CanvasInteractionUiStatus (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (15): captionsFromWords(), cleanCaptionText(), DeepgramResponse, DeepgramTranscription, DeepgramUtterance, DeepgramWord, isDisabled(), normalizeDeepgramTranscription() (+7 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (16): createDefaultSceneLocks(), assertSameFrozenScene(), fetchDownloadReachable(), fetchReachable(), fetchTextReachable(), filename, normalizeBaseUrl(), parsePositiveInt() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 27 - "Community 27"
Cohesion: 0.32
Nodes (15): base64ToBytes(), createDialogueVoiceoverPrompt(), GeminiVoiceoverResult, generateGeminiDialogueVoiceover(), generateGeminiVoiceover(), getDialogueSpeakers(), getWavDurationMs(), isDisabled() (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (15): compilerOptions, allowJs, allowSyntheticDefaultImports, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (11): CreateCanvasColumn(), PhonePreviewFrame(), PreviewPlatform, previewPlatformOptions, BrandAvatar(), cx(), StatusBar(), createStarterPlaceholderScene() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (15): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (13): createGeneratedSceneAudio(), applySceneLocks(), getNextSceneIndex(), rerollScene(), SceneLocks, currentSceneWithAudio, makeScene(), rerolled (+5 more)

### Community 32 - "Community 32"
Cohesion: 0.19
Nodes (11): CreateCaptionModal(), BrandSnapshot, ResearchEvidence, ResearchProviderStatus, ResearchReceipts, StoredWebsiteResearchFailure, StoredWebsiteResearchResponse, StoredWebsiteResearchResult (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (15): scripts, build, convex:codegen, convex:dev, dev, remotion:still, render-worker, render-worker:watch (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (12): Active App, Before You Edit, Frontend QA, graphify, Next.js App Structure, Non-Negotiable Rules, Product Boundaries, Product Manager Guardrail (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.15
Nodes (12): Do Not Port, First v3 File Map, Freeze And Regression Tests, Phase Gates, Port Verbatim Or Nearly Verbatim, Prompts And Research Lessons, Renderer Lessons, Rule (+4 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (9): CreateLeftColumn(), CreateResearchProgressCard(), getProgressRows(), LoadStatus, ModelOption, WebsiteSubmitProgressFacts, WebsiteSubmitProgressStage, NIM_MEME_MODEL_OPTIONS (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.21
Nodes (8): isEditableShortcutTarget(), isRerollSpacebarKey(), UseCanvasKeyboardOptions, consumeWorkflowUsageSnapshot(), readWorkflowUsage(), readWorkflowUsageSnapshot(), WorkflowUsage, scenes

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Assumptions, Completion Signal, Create Generator Simplification Plan, Functionality That Moves To Builder, Functionality That Must Stay, Goal, One-Sentence Removal Summary, Phase 1: Remove Mini-Editor Behavior (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (11): AdScene Contract, Brand Snapshot, Convex Ownership, Core Flow, Format Registry, Goal, Non-Goals, Remotion (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (11): isStoredWebsiteResearchFailure(), assertResearchReady(), assertUsefulArray(), assertUsefulText(), defaultUrls, filename, genericBrandNames, parseUrls() (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (11): Audio Panel Redesign, Audio Reliability, Backlog Rules, Bill Shield Hardening, Handle transcription failures gracefully, Make abuse limits visible and tunable without redeploy, Make Remotion visualizers truly audio-reactive, Make voice selection moron-proof (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (9): POST(), consumeWorkflowRun(), freeWorkflowRunLimit(), getBillingStatus(), hasPaidAccess(), isDisabled(), isPaywallEnabled(), readPaidUntil() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.22
Nodes (6): CreateControlPanel(), CreatePanelId, curatedColors, panelOptions, uniqueColors(), FormatSpecificEditorField

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (9): Data Objects, Decision, First Launch Smoke Test, Hard Rules, MVP Scope, Pages, Product, Stack (+1 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (9): CONVEX_DEPLOY_KEY, CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL, NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_RENDERER_VERSION, NODE_ENV, PORT, TTS_MODEL (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.39
Nodes (6): BrandDumpModal(), getBrandDumpImages(), getUsefulClaims(), JsonDump(), summarizeJson(), uniqueNonEmptyStrings()

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (8): Current App, Deployment, Environment, Local Convex Env, Local Setup, Project Memory, Useful Commands, Wiggly

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 49 - "Community 49"
Cohesion: 0.36
Nodes (7): cleanText(), getCaptionWindowText(), getSceneAudioKey(), getVisibleCaptionText(), hasDisplayableCaptionTrack(), updateGeneratedAudioCaptionText(), AdSceneAudio

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (7): Health Gate, Non-Negotiables, Oracle Live Deployment, Production Readiness Definition, Required Environment, Runtime Owners, Wiggly v3 Production Runtime

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (8): devDependencies, playwright, @remotion/cli, tsx, @types/node, @types/react, @types/react-dom, typescript

### Community 52 - "Community 52"
Cohesion: 0.29
Nodes (6): name, overrides, postcss, private, type, version

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (4): DataModel, Doc, Id, TableNames

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (5): Practical Default, Pre-Change Checklist, Product Split, Rules, Wiggly Engineering Rules

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (5): ActionCtx, DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx

### Community 56 - "Community 56"
Cohesion: 0.60
Nodes (5): assert(), assertServerReachable(), baseUrl, launchBrowser(), main()

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (5): controlPanelSource, createClientSource, quickActionsSource, visualizerModuleSource, visualizerSchemaSource

### Community 58 - "Community 58"
Cohesion: 0.40
Nodes (4): Avnac Inspiration, v3 Architecture Rules, Wiggly v1 Reference, Wiggly v3 References

### Community 60 - "Community 60"
Cohesion: 0.40
Nodes (4): providerSource, rootPackageJson, v3EnvExample, workerSource

### Community 61 - "Community 61"
Cohesion: 0.40
Nodes (3): packageJson, repoRoot, smokeSource

### Community 62 - "Community 62"
Cohesion: 0.40
Nodes (4): allowedLargeCreateFiles, createDir, createFiles, oversizedFiles

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (3): repoRoot, workflowDir, workflowSource

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): packageJson, runtimeDoc, script, workflow

### Community 65 - "Community 65"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 67 - "Community 67"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 69 - "Community 69"
Cohesion: 0.50
Nodes (3): liveSmokeSource, packageJson, runtimeDoc

### Community 70 - "Community 70"
Cohesion: 0.50
Nodes (3): remotionSource, renderJobsSource, workerSource

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): appRoot, nextConfig, workspaceRoot

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (3): Phase 0, Rules, Wiggly v3

## Knowledge Gaps
- **579 isolated node(s):** `name`, `private`, `version`, `type`, `workspaces` (+574 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdScene` connect `Community 9` to `Community 32`, `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 43`, `Community 13`, `Community 49`, `Community 18`, `Community 19`, `Community 20`, `Community 25`, `Community 27`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `StoredWebsiteResearchResult` connect `Community 32` to `Community 1`, `Community 3`, `Community 4`, `Community 46`, `Community 17`, `Community 19`, `Community 25`, `Community 29`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `ResearchReceipts` connect `Community 32` to `Community 0`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _579 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05107252298263534 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05201636469900643 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05323653962492438 - nodes in this community are weakly interconnected._