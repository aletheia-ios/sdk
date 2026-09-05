import type { Request, Response } from "@/types";

declare global {
  var __host: Host;

  // same names node's types use, so the two declarations merge when both are present;
  // methods, not properties, because node declares them as methods and a property
  // of the same name is a duplicate under merging
  interface Console {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  var console: Console;
}

/**
 * An opaque reference to an element the host holds on its side of the bridge.
 *
 * The parsed document never crosses into JavaScript; every query goes back to the host
 * with one of these. Handles are released when the call that created them returns.
 */
export type Handle = number;

/**
 * One child of an element, as the host reports it: a text node with its text, or an
 * element by handle.
 */
export type ChildNode = { kind: "text"; text: string } | { kind: "element"; handle: Handle };

/**
 * The bridge the app installs into a source's JavaScript context before `main.js` runs.
 *
 * Two doors out of the sandbox: the network and an HTML parser. Sources do not call this
 * directly; the wrappers in `@aletheia-ios/sdk/host` (`fetchJSON`, `parseHTML`, ...) do, so
 * a change to the bridge never reaches a source's own code.
 */
export interface Host {
  /**
   * Performs a request on the source's behalf.
   *
   * The host applies the credential, enforces the manifest's `hosts` allowlist and rate
   * limit, handles any challenge, and resolves once with the final response. It never
   * rejects on HTTP status.
   */
  fetch: (request: Request) => Promise<Response>;

  /** HTML parsing, backed by the host's own parser. Selectors use jsoup's dialect. */
  html: {
    /** Parses a document and returns a handle to its root. */
    parse: (text: string) => Handle;

    /** Runs a CSS selector under an element and returns the matches in document order. */
    select: (handle: Handle, selector: string) => Handle[];

    /** An attribute's value, or an empty string when absent. */
    attr: (handle: Handle, name: string) => string;

    /** The element's text with descendants, whitespace normalised. */
    text: (handle: Handle) => string;

    /** The element's own text, excluding descendants. */
    ownText: (handle: Handle) => string;

    /** The element's text with descendants, whitespace preserved. */
    wholeText: (handle: Handle) => string;

    /** The contents of a script or style element. */
    data: (handle: Handle) => string;

    /** The element's `class` attribute as written. */
    className: (handle: Handle) => string;

    /** The element's tag name, lowercase. */
    tagName: (handle: Handle) => string;

    /** The element's direct children, text nodes included. */
    childNodes: (handle: Handle) => ChildNode[];

    /** The parent element, or `null` at the root. */
    parent: (handle: Handle) => Handle | null;

    /** Converts an HTML fragment to the Markdown subset the app renders. */
    markdown: (html: string) => string;
  };
}

/**
 * The installed bridge.
 *
 * @throws when called outside the Aletheia host, for example in a bare Node process
 *   without a `__host` stub.
 */
export function host(): Host {
  if (typeof __host === "undefined") {
    throw new Error("__host is not installed: this bundle is running outside the Aletheia host");
  }

  return __host;
}
