import { z } from "zod";
import { ContentRating, LanguageCode } from "./enums";
import { contractVersion, semver, sha256, slug, supersededSlug } from "./scalars";

/** Validates one `IndexEntry`. */
export const IndexEntry = z
  .strictObject({
    slug,
    replaces: z.array(supersededSlug).optional().meta({
      description:
        "Advisory copy of the manifest's `replaces`, so a list can explain a slug that vanished from it. Authoritative only in the manifest; never act on this copy.",
    }),
    name: z.string().min(1),
    version: semver,
    minAppVersion: semver,
    contractVersion,
    contentRating: ContentRating,
    languages: z.array(LanguageCode).min(1),
    size: z.int().positive().meta({ description: "Package bytes." }),
    sha256: sha256.meta({
      description: "Of the package file. With the slug, this is the package's identity.",
    }),
    updatedDate: z.iso.datetime(),
    downloadURL: z.string().min(1).meta({
      description:
        "Relative to the index URL's own base, so a list can be mirrored without editing entries.",
    }),
    iconURL: z.string().min(1).meta({ description: "Relative, as downloadURL." }),
    builtWith: z.string().min(1).optional().meta({
      description:
        "Version of the tool that packed this entry. Two lists disagreeing about one package's sha usually means different toolchains, not tampering.",
    }),
  })
  .meta({ id: "IndexEntry" });

/** Validates `index.json`, rejecting duplicate slugs. */
export const Index = z
  .strictObject({
    $schema: z.string().optional(),
    name: z.string().min(1),
    updatedDate: z.iso.datetime(),
    sources: z.array(IndexEntry),
  })
  .superRefine((index, ctx) => {
    const seen = new Set<string>();
    for (const [position, entry] of index.sources.entries()) {
      if (seen.has(entry.slug)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate slug "${entry.slug}"`,
          path: ["sources", position, "slug"],
        });
      }
      seen.add(entry.slug);
    }
  })
  .meta({ id: "Index", description: "index.json - what one source list publishes." });
