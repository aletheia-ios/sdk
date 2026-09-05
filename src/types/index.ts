import type { z } from "zod";
import type * as S from "@/schemas";

/** A language the app can render. Rows in any other language are dropped, never relabelled. */
export type LanguageCode = z.infer<typeof S.LanguageCode>;

/** Content rating of one series, as this source draws that line. */
export type Classification = z.infer<typeof S.Classification>;

/** Publication status of one series. */
export type Publication = z.infer<typeof S.Publication>;

/** What selecting a filter option pulls into results. Only `"adult"` opens the gate. */
export type Sensitivity = z.infer<typeof S.Sensitivity>;

/** Whether the whole catalogue is adult. */
export type ContentRating = z.infer<typeof S.ContentRating>;

/** One filter the reader set, keyed by the filter id from `filters.json`. */
export type FilterSelection = z.infer<typeof S.FilterSelection>;

/** What the app asks a source to search for. */
export type SearchQuery = z.infer<typeof S.SearchQuery>;

/** Passed as the last argument of every call: the current values of the manifest's settings. */
export type Context = z.infer<typeof S.Context>;

/** A request description the host performs on the source's behalf. */
export type Request = z.infer<typeof S.Request>;

/** What the host hands back: status, headers, final URL and the body as text. */
export type Response = z.infer<typeof S.Response>;

/** One search result. */
export type SeriesStub = z.infer<typeof S.SeriesStub>;

/** Everything the details screen shows about one series. */
export type SeriesDetail = z.infer<typeof S.SeriesDetail>;

/** One chapter row. */
export type ChapterEntry = z.infer<typeof S.ChapterEntry>;

/** Dimensions a provider states for a page. */
export type PageSize = z.infer<typeof S.PageSize>;

/** One page of one chapter. The reader fetches the URL; the source never sees the bytes. */
export type PageURL = z.infer<typeof S.PageURL>;

/** Answer to "did anything change since I stored N chapters?". */
export type ChapterRevalidation = z.infer<typeof S.ChapterRevalidation>;

/** One piece of a comment body: text, an image, a video, or a spoiler wrapping more segments. */
export type Segment = S.Segment;

/** Who wrote a comment. */
export type CommentAuthor = z.infer<typeof S.CommentAuthor>;

/** One comment, with whatever replies arrived alongside it. */
export type Comment = z.infer<typeof S.Comment>;

/** One page of a chapter's discussion. */
export type CommentPage = z.infer<typeof S.CommentPage>;

/**
 * One page of results from `search`.
 *
 * `next` is opaque to the app: whatever a source puts here comes back untouched as the
 * following query's `cursor`. A page-numbered site returns the next page number as a
 * string; a keyset site returns its token. `null` means there is no more.
 */
export interface SearchPage<Item> {
  items: Item[];
  next: string | null;
}

/** One option of a select or multi-select filter. */
export type Option = z.infer<typeof S.Option>;

/** One control on the Refine sheet. */
export type Filter = z.infer<typeof S.Filter>;

/** The whole of `filters.json`, in display order. */
export type Filters = z.infer<typeof S.Filters>;

/** One ordering the search endpoint can apply. */
export type SortOption = z.infer<typeof S.SortOption>;

/** The one sort axis and its default. */
export type Sort = z.infer<typeof S.Sort>;

/** One tile on the source's home screen. */
export type Preset = z.infer<typeof S.Preset>;

/** A value the reader types, declared in the manifest and delivered through `Context`. */
export type Setting = z.infer<typeof S.Setting>;

/** A per-source request ceiling the host applies. */
export type RateLimit = z.infer<typeof S.RateLimit>;

/** `source.json`: everything the app knows about a source without running it. */
export type SourceManifest = z.infer<typeof S.SourceManifest>;

/** One thing the credential capture waits for: a cookie, or a meta tag sent back as a header. */
export type AuthRequirement = z.infer<typeof S.AuthRequirement>;

/** `auth.json`: how the host obtains a credential for a source behind a wall. */
export type AuthSpec = z.infer<typeof S.AuthSpec>;

/** One source as a list publishes it. */
export type IndexEntry = z.infer<typeof S.IndexEntry>;

/** `index.json`: what one source list publishes. */
export type Index = z.infer<typeof S.Index>;

/**
 * What every package must export: the four calls the app makes.
 *
 * Each receives a `Context` last, which a source that has no settings may leave off.
 * Implement it as a plain object and `export default` it; the bundle leaves it on
 * `globalThis.__source` for the host.
 *
 * Throw `SourceError` for the failures the app understands. Return the contract's shapes
 * exactly - the app validates every result.
 */
export interface Source {
  /**
   * Searches the catalogue.
   *
   * Reads `query.text`, `query.filters`, `query.sort` (or the manifest's default when
   * `null`), `query.cursor` for the page after the first, and `query.route` when a preset
   * declared one. When `allowsAdult` says the gate is shut, the request must exclude adult
   * content explicitly.
   */
  search: (query: SearchQuery, ctx: Context) => Promise<SearchPage<SeriesStub>>;

  /**
   * Everything about one series.
   *
   * The returned `slug` is canonical and may differ from the one asked for, when the site
   * redirected or the stub carried an alias.
   */
  details: (seriesSlug: string, ctx: Context) => Promise<SeriesDetail>;

  /**
   * Every chapter of one series, across every language the manifest lists.
   *
   * An empty array means the series genuinely has none. Throwing is the only way to say
   * "unknown". `scanlator` must be identical across fetches; use the source name when the
   * site attributes nothing.
   */
  chapters: (seriesSlug: string, ctx: Context) => Promise<ChapterEntry[]>;

  /**
   * The pages of one chapter, in reading order.
   *
   * Throw `SourceError("noPages")` for a chapter with nothing to read rather than returning
   * an empty array.
   */
  content: (seriesSlug: string, chapterSlug: string, ctx: Context) => Promise<PageURL[]>;
}

// the host derives capabilities from which of these methods the exported object has -
// a method that is not on the object is a capability the app never offers

/**
 * Opt-in: the source can fetch a chapter's discussion.
 *
 * Declare by intersection: `const source: Source & Commenting = { ... }`.
 */
export interface Commenting {
  /**
   * One page of the thread for a chapter.
   *
   * `next` is the previous page's `next`, or `null` for the first page. An empty `items`
   * means the thread is empty; throw when it could not be fetched, so the two never render
   * alike.
   */
  comments: (
    seriesSlug: string,
    chapterSlug: string,
    next: string | null,
    ctx: Context,
  ) => Promise<CommentPage>;

  /**
   * The replies a comment withheld, fetched only when the reader asks.
   *
   * Optional. Without it, `replyCount` beyond `replies.length` is shown as a count and
   * nothing more.
   */
  replies?: (commentId: string, ctx: Context) => Promise<Comment[]>;
}

/**
 * Opt-in: the source can answer "did anything change?" from one request instead of
 * walking the whole chapter feed.
 *
 * Only worth declaring when the site states a trustworthy total. `stored` counts the
 * app's local rows, which match the site only while nothing was dropped in parsing, so
 * the shortcut fails cheap when they diverge.
 */
export interface Revalidating {
  chaptersChanged: (
    seriesSlug: string,
    stored: number,
    ctx: Context,
  ) => Promise<ChapterRevalidation>;
}

/**
 * Opt-in: the source recognises its own anti-bot wall, or knows a 403 that is not one.
 *
 * The host asks this before deciding to capture a credential and retry.
 */
export interface ChallengeAware {
  /**
   * `true`: a wall, capture and retry. `false`: not a wall, hand the response back as-is.
   * `undefined`: no opinion, the host runs its own Cloudflare check.
   */
  isChallenge: (response: Response) => boolean | undefined;
}

/**
 * Opt-in: the health-check URL needs computing, typically a signature.
 *
 * Wins over the manifest's `pingURL`. Prefer the manifest field; it keeps the Sources
 * screen free of JavaScript for every source that can be.
 */
export interface SignedPing {
  pingURL: (ctx: Context) => string;
}
