import type { Request, Response } from "@/types";
import { SourceError } from "@/utils/error";
import { host } from "./bridge";

/** The 2xx range: `from` inclusive, `to` exclusive. */
const SUCCESS = { from: 200, to: 300 };

/**
 * Performs a request through the host and returns the response as-is.
 *
 * The status is whatever the site answered; nothing is thrown for a 4xx or 5xx. Use this
 * when a status is a branch the source needs to read, such as a 404 that means "look in
 * the archive instead". For the common case, `fetchText` and `fetchJSON` throw on
 * anything outside 2xx.
 *
 * The host applies the source's credential, enforces the manifest's `hosts` allowlist and
 * rate limit, and handles any challenge before this resolves. A challenge sheet the reader
 * has to tap through happens inside this one `await`.
 *
 * @throws on a host the manifest does not allow, on cancellation, and on network failure.
 */
export function request(req: Request): Promise<Response> {
  return host().fetch(req);
}

/**
 * Performs a request and returns the body as text.
 *
 * @throws `SourceError` with code `badResponse` and the status when the status is outside
 *   2xx, plus everything `request` throws.
 */
export async function fetchText(req: Request): Promise<string> {
  const response = await request(req);
  if (response.status < SUCCESS.from || response.status >= SUCCESS.to) {
    throw new SourceError("badResponse", `${response.status} from ${req.url}`, {
      status: response.status,
    });
  }
  return response.text;
}

/**
 * Performs a request and parses the body as JSON.
 *
 * The type parameter is a promise about the site's shape, not a check; nothing validates
 * the parsed value against it.
 *
 * @throws `SourceError` with code `parse` when the body is not JSON, plus everything
 *   `fetchText` throws.
 */
export async function fetchJSON<T>(req: Request): Promise<T> {
  const text = await fetchText(req);
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    // biome-ignore lint/style/useErrorCause: the cause is forwarded through SourceError's options
    throw new SourceError("parse", `not json: ${req.url}`, { cause });
  }
}
