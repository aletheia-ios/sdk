/**
 * What went wrong, in terms the app can act on.
 *
 * - `noPages` - the chapter exists but has nothing to read. The app shows "Nothing to
 *   Read" and offers another source. Throw it rather than returning an empty list, or the
 *   reader opens on nothing and blames the app.
 * - `notFound` - the series or chapter is gone from the site. A search index that
 *   answered but has no such id looks exactly like this.
 * - `badResponse` - the site answered with a status the source cannot use. `fetchText`
 *   and `fetchJSON` throw this for anything outside 2xx, with the status attached.
 * - `parse` - the body was not what the source expected: not JSON, a page list that is
 *   missing, a protector wrapper that was never observed before.
 */
export type SourceErrorCode = "noPages" | "notFound" | "badResponse" | "parse";

/** What a `SourceError` may carry besides its code and message. */
export interface SourceErrorOptions {
  /** The HTTP status, for `badResponse`. */
  status?: number;
  /** The underlying error, when this one wraps another. */
  cause?: unknown;
}

/**
 * An error a source throws on purpose.
 *
 * The app reads `code` and maps it onto its own error types, so what the reader sees is
 * the app's wording, not the message here. The message is for logs. Anything else a
 * source throws is reported as a generic failure with its message logged.
 */
export class SourceError extends Error {
  /** Which of the known failures this is. */
  readonly code: SourceErrorCode;
  /** The HTTP status, when the failure was a response. */
  readonly status: number | undefined;

  /**
   * @param code which failure this is
   * @param message detail for the logs; defaults to the code
   * @param options the status for a `badResponse`, and the cause when wrapping another error
   */
  constructor(code: SourceErrorCode, message?: string, options: SourceErrorOptions = {}) {
    super(message ?? code, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "SourceError";
    this.code = code;
    this.status = options.status;
  }
}
