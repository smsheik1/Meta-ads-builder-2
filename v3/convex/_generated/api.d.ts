/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adSceneStorage from "../adSceneStorage.js";
import type * as adScenes from "../adScenes.js";
import type * as audioAssets from "../audioAssets.js";
import type * as renderJobs from "../renderJobs.js";
import type * as researchRuns from "../researchRuns.js";
import type * as researchStorage from "../researchStorage.js";
import type * as sessions from "../sessions.js";
import type * as sharePages from "../sharePages.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adSceneStorage: typeof adSceneStorage;
  adScenes: typeof adScenes;
  audioAssets: typeof audioAssets;
  renderJobs: typeof renderJobs;
  researchRuns: typeof researchRuns;
  researchStorage: typeof researchStorage;
  sessions: typeof sessions;
  sharePages: typeof sharePages;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
