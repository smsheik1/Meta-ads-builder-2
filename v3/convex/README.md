# v3 Convex

This Convex directory is for the clean rebuild only. It is not wired into the live v1 app.

Phase 0 defines the table shape. Phase 1 adds functions for anonymous sessions and Firecrawl research.

Phase 1 uses Convex generic function refs because local `convex codegen` requires a logged-in Convex CLI access token. Once the local CLI is authenticated, switch these to generated `_generated` imports and commit the generated files.
