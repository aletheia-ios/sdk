import { z } from "zod";

/** A package slug: lowercase letters, digits and hyphens. */
export const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens only")
  .meta({
    description: "Stable identifier. Series in a reader's library reference it; never change it.",
  });

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

/** One entry of the manifest's `hosts` allowlist: a hostname or a settings placeholder. */
export const host = z.string().min(1);

/** A SHA-256 digest as 64 lowercase hex characters. */
export const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
