/**
 * Key-value pairs for a query string or form body.
 *
 * Pass an array of pairs when a key repeats or order matters (`[["tag[]", "a"], ["tag[]",
 * "b"]]`); a plain object is fine otherwise.
 */
export type Params = Iterable<readonly [string, string]> | Readonly<Record<string, string>>;

const HEX = 16;

/**
 * Percent-encodes one component to the RFC 3986 unreserved set: letters, digits, `-._~`.
 *
 * `encodeURIComponent` leaves `!'()*` alone. A site that signs its query string, or a WAF
 * that inspects it, encodes them, and a mismatch is a 403 that looks like a rotated key.
 * Spaces become `%20`, never `+`.
 */
export function encodeComponent(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(HEX).toUpperCase()}`,
  );
}

function pairs(params: Params): Array<readonly [string, string]> {
  return Symbol.iterator in params
    ? Array.from(params as Iterable<readonly [string, string]>)
    : Object.entries(params);
}

/**
 * Joins params into `a=1&b=2` with every key and value passed through `encodeComponent`.
 *
 * Pairs stay in the order given. A site that signs requests canonicalises `key[]` as
 * `key[0]`, `key[1]` in the order sent, so reordering here would break the signature.
 * Returns an empty string for no params.
 */
export function queryString(params: Params): string {
  return pairs(params)
    .map(([key, value]) => `${encodeComponent(key)}=${encodeComponent(value)}`)
    .join("&");
}

/**
 * Appends params to a URL, with `?` or `&` as the URL already needs.
 *
 * Returns the URL unchanged when there are no params.
 */
export function withQuery(url: string, params: Params): string {
  const query = queryString(params);
  if (query === "") return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

/**
 * Encodes params as an `application/x-www-form-urlencoded` body.
 *
 * Same encoding as `queryString`, so spaces are `%20` rather than `+`; every site tried
 * accepts either. Send it with `FORM_CONTENT_TYPE`.
 */
export function formBody(params: Params): string {
  return queryString(params);
}

/** The `Content-Type` header value to send with a `formBody`. */
export const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded; charset=UTF-8";
