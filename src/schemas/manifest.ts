import { z } from "zod";
import { ContentRating, LanguageCode } from "./enums";
import { FilterSelection } from "./query";
import {
  contractVersion,
  headerName,
  host,
  placeholder,
  semver,
  slug,
  supersededSlug,
  templatedURL,
} from "./scalars";

/** Validates one `SortOption`. Also the shape of a select setting's options. */
export const SortOption = z.strictObject({
  id: z.string().min(1).meta({ description: "What the script receives as `query.sort`." }),
  name: z.string().min(1).meta({ description: "What the reader sees." }),
});

/** Validates the manifest's `sort`, requiring `default` to name one of its options. */
export const Sort = z
  .strictObject({
    default: z.string().min(1),
    options: z.array(SortOption).min(1),
  })
  .refine((sort) => sort.options.some((option) => option.id === sort.default), {
    message: "default must be one of the option ids",
    path: ["default"],
  })
  .meta({
    id: "Sort",
    description:
      "The one sort axis. Declare only orderings the search endpoint can apply to a narrowed result set; a ranked shelf that ignores text is a preset route, not a sort.",
  });

/** Validates one `Preset`, refusing one that names both a sort and a route. */
export const Preset = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    subtitle: z.string().optional(),
    order: z.int().nonnegative(),
    hidden: z.boolean().optional(),
    filters: z.array(FilterSelection).optional(),
    sort: z.string().optional().meta({
      description: "A declared sort option id. The preset is a normal search with this sort.",
    }),
    route: z.string().optional().meta({
      description:
        "Opaque key the source reads to pick a shelf endpoint. The preset then ignores text and filters.",
    }),
  })
  .refine((preset) => !(preset.sort && preset.route), {
    message: "a preset is a sort or a route, never both",
    path: ["route"],
  })
  .meta({ id: "Preset", description: "One tile on the source's home screen." });

/** The fields every setting type shares. */
const settingFields = {
  id: z
    .string()
    .min(1)
    .meta({ description: "Key in ctx.settings, and the name usable as ${id} in URL fields." }),
  name: z.string().min(1).meta({ description: "Label the reader sees." }),
};

/** Validates one `Setting`, one of the four types by `type`. */
export const Setting = z
  .discriminatedUnion("type", [
    z.strictObject({
      type: z.literal("text"),
      ...settingFields,
      placeholder: z.string().optional(),
      optional: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("secret"),
      ...settingFields,
      optional: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("toggle"),
      ...settingFields,
      default: z.boolean().optional(),
    }),
    z.strictObject({
      type: z.literal("select"),
      ...settingFields,
      options: z.array(SortOption).min(1),
      default: z.string().optional(),
    }),
  ])
  .meta({
    id: "Setting",
    description:
      'A value the reader types. "secret" is stored in the Keychain; the rest on the source row. A required one left empty disables the source.',
  });

/** Validates a `RateLimit`. */
export const RateLimit = z
  .strictObject({
    requests: z.int().positive(),
    per: z.number().positive().meta({ description: "Seconds." }),
  })
  .meta({ id: "RateLimit", description: "Applied by the host on top of its per-host cap." });

/** One kind's headers: names are RFC 7230 tokens, values may use `${settingId}` placeholders. */
const HeaderMap = z.record(headerName, z.string());

/** Validates the manifest's `headers`: one optional map per request kind. */
const Headers = z
  .strictObject({
    all: HeaderMap.optional().meta({
      description: "Added to every request kind. A named kind wins over it on the same header.",
    }),
    api: HeaderMap.optional().meta({
      description:
        "Every request the package makes through the bridge: search, details, chapters, page lists, comments.",
    }),
    pages: HeaderMap.optional().meta({
      description: "Page images in the reader, downloads and the asset store.",
    }),
    covers: HeaderMap.optional().meta({
      description: "Cover art. Applies on declared hosts only.",
    }),
    ping: HeaderMap.optional().meta({ description: "The health badge request." }),
  })
  .meta({
    description:
      "Extra request headers by kind. Precedence, lowest to highest: app defaults, `all`, the kind, the script's own call headers (api only), the captured login. `Host` and `Content-Length` are refused. Values may use ${settingId}, but a secret setting only in `api` and `ping`: `all`, `pages` and `covers` can reach any host.",
  });

const manifestShape = z.strictObject({
  $schema: z.string().optional(),
  slug,
  replaces: z.array(supersededSlug).optional().meta({
    description:
      "Slugs this package takes over from, so a rename or a handover reconnects a reader's existing library rows instead of stranding them.",
  }),
  name: z.string().min(1),
  description: z.string(),
  version: semver,
  minAppVersion: semver.meta({ description: 'An older app reads "needs app update".' }),
  contractVersion,
  languages: z.array(LanguageCode).min(1),
  baseURL: templatedURL,
  pingURL: templatedURL.optional().meta({
    description: "Health check target. Defaults to baseURL; a `pingURL()` export overrides both.",
  }),
  hosts: z.array(host).meta({
    description:
      "The only hosts the script may fetch. Empty is legal for an offline fixture source.",
  }),
  headers: Headers.optional(),
  rateLimit: RateLimit.optional(),
  contentRating: ContentRating,
  quotableSlug: z.boolean().optional().meta({
    description:
      "Whether a series slug is a code people quote (a gallery number). Shows and copies it in the UI.",
  }),
  sort: Sort,
  presets: z.array(Preset).optional(),
  settings: z.array(Setting).optional(),
});

type ManifestShape = z.infer<typeof manifestShape>;

/** Preset ids must be unique, and a preset's sort must be one of the declared sort options. */
function checkPresets(manifest: ManifestShape, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  for (const [index, preset] of (manifest.presets ?? []).entries()) {
    if (seen.has(preset.id)) {
      ctx.addIssue({
        code: "custom",
        message: `duplicate preset id "${preset.id}"`,
        path: ["presets", index, "id"],
      });
    }
    seen.add(preset.id);
    if (preset.sort && !manifest.sort.options.some((option) => option.id === preset.sort)) {
      ctx.addIssue({
        code: "custom",
        message: `preset sort "${preset.sort}" is not a declared sort option`,
        path: ["presets", index, "sort"],
      });
    }
  }
}

const REFUSED_HEADERS = ["host", "content-length"];

/** Kinds the app does not gate to declared hosts, so they must never carry a secret. */
const UNGATED_KINDS = ["all", "pages", "covers"];

/** Every header as `[kind, name, value]`. */
function headerEntries(manifest: ManifestShape): [string, string, string][] {
  return Object.entries(manifest.headers ?? {}).flatMap(([kind, map]) =>
    Object.entries(map ?? {}).map(([name, value]): [string, string, string] => [kind, name, value]),
  );
}

/**
 * The app sets `Host` and `Content-Length` itself, so they are refused; two names in one kind
 * differing only in case would be ambiguous; and a secret setting must not reach a header the
 * app sends to hosts the package never declared.
 */
function checkHeaders(manifest: ManifestShape, ctx: z.RefinementCtx): void {
  const secretIds = new Set(
    (manifest.settings ?? []).filter((entry) => entry.type === "secret").map((entry) => entry.id),
  );
  const seen = new Set<string>();
  for (const [kind, name, value] of headerEntries(manifest)) {
    const path = ["headers", kind, name];
    const lower = `${kind}:${name.toLowerCase()}`;
    if (REFUSED_HEADERS.includes(name.toLowerCase())) {
      ctx.addIssue({
        code: "custom",
        message: `header "${name}" is set by the app and cannot be declared`,
        path,
      });
    } else if (seen.has(lower)) {
      ctx.addIssue({
        code: "custom",
        message: `header "${name}" repeats another key that differs only in case`,
        path,
      });
    }
    seen.add(lower);
    if (!UNGATED_KINDS.includes(kind)) continue;
    for (const [, id] of value.matchAll(placeholder)) {
      if (id !== undefined && secretIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `"\${${id}}" is a secret setting; "${kind}" headers can reach any host, so only "api" and "ping" may use it`,
          path,
        });
      }
    }
  }
}

/** Every `${id}` in a URL or header field must name a declared setting. */
function checkPlaceholders(manifest: ManifestShape, ctx: z.RefinementCtx): void {
  const settingIds = new Set((manifest.settings ?? []).map((entry) => entry.id));
  const templated: [string[], string | undefined][] = [
    [["baseURL"], manifest.baseURL],
    [["pingURL"], manifest.pingURL],
    ...manifest.hosts.map((value, index): [string[], string] => [["hosts", String(index)], value]),
    ...headerEntries(manifest).map(([kind, name, value]): [string[], string] => [
      ["headers", kind, name],
      value,
    ]),
  ];
  for (const [path, value] of templated) {
    for (const [, id] of (value ?? "").matchAll(placeholder)) {
      if (id !== undefined && !settingIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `"\${${id}}" does not name a declared setting`,
          path,
        });
      }
    }
  }
}

/**
 * Validates `source.json`.
 *
 * Beyond the field shapes: preset ids are unique, a preset's sort names a declared sort
 * option, and every `${placeholder}` in a URL or header field names a declared setting.
 */
export const SourceManifest = manifestShape
  .superRefine((manifest, ctx) => {
    checkPresets(manifest, ctx);
    checkPlaceholders(manifest, ctx);
    checkHeaders(manifest, ctx);
  })
  .meta({
    id: "SourceManifest",
    description: "source.json - everything the app knows about a source without running it.",
  });
