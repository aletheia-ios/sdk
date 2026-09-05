// bare JavaScriptCore has no TextEncoder, TextDecoder, atob or btoa

/**
 * Encodes text as UTF-8 bytes.
 *
 * The first step of signing a request or hashing a string: signatures are computed over
 * bytes, and a site's own JavaScript did the same encoding before it signed. Equivalent
 * to `new TextEncoder().encode(text)`, which bare JavaScriptCore does not provide.
 *
 * @see https://www.rfc-editor.org/rfc/rfc3629#section-3 UTF-8 byte layout
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encode the Web API this stands in for
 */
export function utf8Encode(text: string): Uint8Array {
  const out: number[] = [];
  for (const character of text) {
    const point = character.codePointAt(0) ?? 0;
    if (point < 0x80) {
      out.push(point);
    } else if (point < 0x800) {
      out.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    } else if (point < 0x10000) {
      out.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    } else {
      out.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/**
 * Decodes UTF-8 bytes to text.
 *
 * Lenient: a truncated or malformed sequence produces whatever code point the available
 * bytes make, never a throw and never U+FFFD. Decrypted page lists and unscrambled payloads
 * are the usual input, and those are either wholly right or wholly garbage.
 *
 * @see https://www.rfc-editor.org/rfc/rfc3629#section-3 UTF-8 byte layout
 * @see https://encoding.spec.whatwg.org/#utf-8-decoder the strict decoder `TextDecoder` implements, for the difference
 */
export function utf8Decode(bytes: Uint8Array): string {
  let out = "";
  let index = 0;
  while (index < bytes.length) {
    const lead = bytes[index] ?? 0;
    let point: number;
    let extra: number;
    if (lead < 0x80) {
      point = lead;
      extra = 0;
    } else if ((lead & 0xe0) === 0xc0) {
      point = lead & 0x1f;
      extra = 1;
    } else if ((lead & 0xf0) === 0xe0) {
      point = lead & 0x0f;
      extra = 2;
    } else {
      point = lead & 0x07;
      extra = 3;
    }
    for (let offset = 1; offset <= extra; offset += 1) {
      point = (point << 6) | ((bytes[index + offset] ?? 0) & 0x3f);
    }
    out += String.fromCodePoint(point);
    index += extra + 1;
  }
  return out;
}

const STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const URL_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const LOOKUP = new Map<string, number>();
for (const [index, character] of Array.from(STANDARD).entries()) LOOKUP.set(character, index);
LOOKUP.set("-", 62);
LOOKUP.set("_", 63);

/** How `base64Encode` writes its output. */
export interface Base64Options {
  /**
   * Use the URL-safe alphabet (`-_` instead of `+/`). Default `false`.
   *
   * @see https://www.rfc-editor.org/rfc/rfc4648#section-5
   */
  url?: boolean;
  /** Append `=` padding. Defaults to `true` for the standard alphabet and `false` for URL-safe. */
  pad?: boolean;
}

/**
 * Encodes bytes as Base64.
 *
 * Defaults match `btoa`: the standard alphabet, padded. A signed query parameter usually
 * wants `{ url: true }`, which is unpadded unless `pad` says otherwise - the form
 * `Buffer.toString("base64url")` produces.
 *
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-4 the standard alphabet
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-5 the URL-safe alphabet
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa the Web API this stands in for
 */
export function base64Encode(bytes: Uint8Array, options: Base64Options = {}): string {
  const alphabet = options.url ? URL_SAFE : STANDARD;
  const filler = (options.pad ?? !options.url) ? "=" : "";
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    out += encodeTriple(bytes, index, alphabet, filler);
  }
  return out;
}

/** Four output characters for the up-to-three bytes at `index`, padded with `filler`. */
function encodeTriple(bytes: Uint8Array, index: number, alphabet: string, filler: string): string {
  const a = bytes[index] ?? 0;
  const b = bytes[index + 1];
  const c = bytes[index + 2];
  const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
  const third = b === undefined ? filler : alphabet[(triple >> 6) & 63];
  const fourth = c === undefined ? filler : alphabet[triple & 63];
  return `${alphabet[(triple >> 18) & 63]}${alphabet[(triple >> 12) & 63]}${third}${fourth}`;
}

/**
 * Decodes Base64 to bytes.
 *
 * Accepts either alphabet, with or without padding, and ignores whitespace, so a value
 * lifted out of an HTML attribute or a wrapped script literal decodes without cleanup.
 * Stricter than `atob` in one way: `atob` rejects the URL-safe characters, this accepts
 * them.
 *
 * @throws on a character outside both alphabets.
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-3.3 on non-alphabet characters
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/atob the Web API this stands in for
 */
export function base64Decode(text: string): Uint8Array {
  const clean = text.replace(/[\s=]/g, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const value = LOOKUP.get(character);
    if (value === undefined) throw new Error(`invalid base64 character "${character}"`);
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

/**
 * Encodes bytes as lowercase hex, two characters per byte.
 *
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-8 base 16 encoding
 */
export function hexEncode(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

/**
 * Decodes hex to bytes. Either case, whitespace ignored.
 *
 * @throws on an odd number of digits or a non-hex pair.
 * @see https://www.rfc-editor.org/rfc/rfc4648#section-8 base 16 encoding
 */
export function hexDecode(text: string): Uint8Array {
  const clean = text.replace(/\s/g, "");
  if (clean.length % 2 !== 0) throw new Error("odd-length hex");
  const out = new Uint8Array(clean.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    const pair = clean.slice(index * 2, index * 2 + 2);
    const value = Number.parseInt(pair, 16);
    if (Number.isNaN(value)) throw new Error(`invalid hex pair "${pair}"`);
    out[index] = value;
  }
  return out;
}
