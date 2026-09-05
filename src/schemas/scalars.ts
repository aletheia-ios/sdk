import { z } from "zod";

/**
 * Reverse-DNS: two or more dot-separated segments of lowercase alphanumerics, hyphens
 * allowed inside a segment but not at either end.
 *
 * Namespaced rather than a bare word because the slug is a global key. A reader's library
 * rows reference it, so two publishers both shipping `mangadex` would collide and whoever
 * installed first would own the name for everyone. Prefix with a domain you control.
 */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*)+$/;

/** Length cap, matching the column a host stores a slug in. */
const SLUG_MAX = 128;

/** A package slug, such as `com.example.mangadex`. */
export const slug = z
  .string()
  .max(SLUG_MAX)
  .regex(SLUG, "reverse-dns, such as com.example.mangadex")
  .meta({
    description:
      "Stable namespaced identifier, such as com.example.mangadex. Series in a reader's library reference it; never change it.",
  });

/**
 * A slug some other package used to publish under.
 *
 * Looser than `slug` on purpose: what it names may predate the namespaced form, and it
 * identifies something that no longer ships rather than anything being validated here.
 */
export const supersededSlug = z.string().min(1).max(SLUG_MAX);

/** A `major.minor.patch` version string. */
export const semver = z.string().regex(/^\d+\.\d+\.\d+$/, "expected major.minor.patch");

/** A `major.minor` contract version string. */
export const contractVersion = z
  .string()
  .regex(/^\d+\.\d+$/, "expected major.minor")
  .meta({ description: "The host bridge shape this package was built against." });

/** An integer of epoch milliseconds. */
export const epochMs = z.int().meta({ description: "Milliseconds since the Unix epoch." });

/** Matches every `${settingId}` in a manifest field, capturing the id. Global; reset before reuse. */
export const placeholder = /\$\{([A-Za-z][A-Za-z0-9_]*)\}/g;

/** A manifest URL field: an absolute URL, or a string that starts with a settings placeholder. */
export const templatedURL = z
  .union([z.url(), z.string().regex(/^\$\{[A-Za-z][A-Za-z0-9_]*\}/)])
  .meta({ description: "An absolute URL, or one starting with a ${settingId} placeholder." });

/**
 * A `hosts` entry: either a settings placeholder, or a hostname of at least two labels.
 *
 * Two labels is a floor rather than a formality. A host matches its own subdomains, so a
 * single-label entry such as `com` would quietly become a wildcard. The author could list
 * those hosts individually anyway, so this grants them nothing new; what it protects is the
 * disclosure, since the install sheet shows a reader the declared hosts and `com` tells them
 * nothing true about where the source goes.
 *
 * It does not catch a multi-label public suffix such as `co.uk`. Doing that properly needs
 * the public suffix list, which is not worth carrying here.
 */
const HOST = /^(\$\{[A-Za-z][A-Za-z0-9_]*\}|[^.\s/]+(\.[^.\s/]+)+)$/;

/** One entry of the manifest's `hosts` allowlist: a hostname or a settings placeholder. */
export const host = z
  .string()
  .min(1)
  .regex(HOST, "a literal host needs at least two labels, since subdomains of it also match")
  .meta({ description: "A hostname, or a ${settingId} placeholder resolving to one." });

/** A SHA-256 digest as 64 lowercase hex characters. */
export const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
