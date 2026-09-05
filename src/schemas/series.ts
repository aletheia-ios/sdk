import { z } from "zod";
import { Classification, LanguageCode, Publication } from "./enums";
import { epochMs } from "./scalars";

/** Validates a `SeriesStub` returned by `search`. */
export const SeriesStub = z
  .object({
    slug: z.string().min(1),
    title: z.string(),
    cover: z.url().nullable(),
    adult: z.boolean().meta({
      description:
        "A claim, not a guess: true only when the source knows, false only when it can guarantee.",
    }),
  })
  .meta({ description: "One search result." });

/** Validates a `SeriesDetail` returned by `details`. */
export const SeriesDetail = z
  .object({
    slug: z.string().min(1).meta({
      description: "Canonical. May differ from the slug the stub was opened with.",
    }),
    title: z.string(),
    altTitles: z.array(z.string()),
    synopsis: z.string(),
    url: z.url(),
    classification: Classification,
    publication: Publication,
    covers: z.array(z.url()).meta({ description: "Best first. Every one may be fetched to disk." }),
    tags: z.array(z.string()),
    authors: z.array(z.string()),
  })
  .meta({ description: "Everything the details screen shows about one series." });

/** Validates a `ChapterEntry` returned by `chapters`. */
export const ChapterEntry = z
  .object({
    slug: z.string().min(1),
    title: z.string(),
    number: z.number(),
    language: LanguageCode,
    scanlator: z.string().min(1).meta({
      description:
        "Keys scanlator priority, so it must be identical across fetches. Use the source name when the site attributes nothing.",
    }),
    url: z.url(),
    publishedDate: epochMs.nullable().meta({
      description: "Null when the source cannot say; the host substitutes its own sentinel.",
    }),
  })
  .meta({ description: "One chapter row." });

/** Validates a `PageSize`. */
export const PageSize = z
  .object({
    width: z.int().positive(),
    height: z.int().positive(),
    exactness: z.enum(["exact", "ratio"]).meta({
      description:
        'Only "exact" may drive splitting or texture decisions; "ratio" survives normalisation.',
    }),
  })
  .meta({ description: "Dimensions the provider states. Never fetched separately." });

/** Validates a `PageURL` returned by `content`. */
export const PageURL = z
  .object({
    index: z.int().nonnegative(),
    url: z.url(),
    size: PageSize.optional(),
    meta: z.record(z.string(), z.string()).optional().meta({
      description:
        "Opaque. Stored with the page and handed back untouched to any later per-page call.",
    }),
  })
  .meta({
    description:
      "One page of one chapter. The reader fetches the URL; the source never sees the bytes.",
  });

/** Builds the schema for a `SearchPage` of the given item schema. */
export function searchPage<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    next: z.string().nullable().meta({
      description:
        "Opaque. The app hands it back as the next query's `cursor`; null means no more.",
    }),
  });
}

/** Validates a `ChapterRevalidation` returned by `chaptersChanged`. */
export const ChapterRevalidation = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("unchanged") }),
    z.object({ kind: z.literal("changed"), entries: z.array(ChapterEntry) }),
  ])
  .meta({
    description:
      'Answer to "did anything change since I stored N chapters?". An empty "changed" means the series genuinely has none.',
  });
