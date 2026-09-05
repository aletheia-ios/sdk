import { type Handle, host } from "./bridge";

/**
 * One child of an element: a text node with its text, or a child element.
 *
 * Walk these when the structure matters and a selector cannot express it - a container
 * whose own text nodes are the values, or a comment body where text and images
 * interleave.
 */
export type Node = { kind: "text"; text: string } | { kind: "element"; element: Element };

/**
 * An element in a document the host parsed.
 *
 * Every method is one call across the bridge; the element itself stays on the host's side.
 * Selectors use jsoup's dialect rather than `querySelector`'s, so `:contains(text)`,
 * `:containsData(text)` and `:has(selector)` work here and would not in a browser.
 *
 * Instances are only valid during the source call that created them. Do not keep one
 * across calls.
 */
export class Element {
  /** The host-side reference this element wraps. */
  readonly handle: Handle;

  constructor(handle: Handle) {
    this.handle = handle;
  }

  /** Every element under this one matching the selector, in document order. */
  select(selector: string): Element[] {
    return host()
      .html.select(this.handle, selector)
      .map((handle) => new Element(handle));
  }

  /** The first element under this one matching the selector, or `null`. */
  first(selector: string): Element | null {
    const [handle] = host().html.select(this.handle, selector);
    return handle === undefined ? null : new Element(handle);
  }

  /** An attribute's value, or an empty string when the attribute is absent. */
  attr(name: string): string {
    return host().html.attr(this.handle, name);
  }

  /** The text of this element and its descendants, whitespace normalised to single spaces. */
  text(): string {
    return host().html.text(this.handle);
  }

  /** The text directly inside this element, excluding descendants. */
  ownText(): string {
    return host().html.ownText(this.handle);
  }

  /** The text of this element and its descendants with whitespace kept as written. */
  wholeText(): string {
    return host().html.wholeText(this.handle);
  }

  /**
   * The raw contents of a `script` or `style` element.
   *
   * `text()` returns an empty string for those; this is the way to read an inline script,
   * for example one that assigns a page list to a variable.
   */
  data(): string {
    return host().html.data(this.handle);
  }

  /** The `class` attribute as written, space-separated. */
  className(): string {
    return host().html.className(this.handle);
  }

  /** The tag name, lowercase. */
  tagName(): string {
    return host().html.tagName(this.handle);
  }

  /** The direct children in order, text nodes included. */
  childNodes(): Node[] {
    return host()
      .html.childNodes(this.handle)
      .map((node) =>
        node.kind === "text" ? node : { kind: "element", element: new Element(node.handle) },
      );
  }

  /** The parent element, or `null` at the document root. */
  parent(): Element | null {
    const handle = host().html.parent(this.handle);
    return handle === null ? null : new Element(handle);
  }
}

/**
 * Parses an HTML document, or a fragment, and returns its root element.
 *
 * Parsing happens on the host with the same parser the app uses everywhere else, so what
 * a selector matches here is exactly what it matches in the app.
 */
export function parseHTML(text: string): Element {
  return new Element(host().html.parse(text));
}

/**
 * Converts an HTML fragment to the Markdown subset the app renders in a synopsis.
 *
 * Keeps links, bold, italic, strikethrough, underline and line breaks; drops every other
 * tag and keeps its text. Use it for a synopsis a site serves as HTML.
 */
export function markdown(html: string): string {
  return host().html.markdown(html);
}
