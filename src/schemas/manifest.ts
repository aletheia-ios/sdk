import { z } from "zod";
import { ContentRating, LanguageCode } from "./enums";
import { FilterSelection } from "./query";
import {
  contractVersion,
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
  referer: templatedURL.meta({ description: "Sent on every image and cover fetch." }),
  pingURL: templatedURL.optional().meta({
    description: "Health check target. Defaults to baseURL; a `pingURL()` export overrides both.",
  }),
  hosts: z.array(host).meta({
    description:
      "The only hosts the script may fetch. Empty is legal for an offline fixture source.",
  }),
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

/** Every `${id}` in a URL field must name a declared setting. */
function checkPlaceholders(manifest: ManifestShape, ctx: z.RefinementCtx): void {
  const settingIds = new Set((manifest.settings ?? []).map((entry) => entry.id));
  const templated: [string, string | undefined][] = [
    ["baseURL", manifest.baseURL],
    ["referer", manifest.referer],
    ["pingURL", manifest.pingURL],
    ...manifest.hosts.map((value, index): [string, string] => [`hosts.${index}`, value]),
  ];
  for (const [field, value] of templated) {
    for (const [, id] of (value ?? "").matchAll(placeholder)) {
      if (id !== undefined && !settingIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `"\${${id}}" does not name a declared setting`,
          path: field.split("."),
        });
      }
    }
  }
}

/**
 * Validates `source.json`.
 *
 * Beyond the field shapes: preset ids are unique, a preset's sort names a declared sort
 * option, and every `${placeholder}` in a URL field names a declared setting.
 */
export const SourceManifest = manifestShape
  .superRefine((manifest, ctx) => {
    checkPresets(manifest, ctx);
    checkPlaceholders(manifest, ctx);
  })
  .meta({
    id: "SourceManifest",
    description: "source.json - everything the app knows about a source without running it.",
  });
