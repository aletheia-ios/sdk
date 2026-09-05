import { z } from "zod";

/** Validates a `FilterSelection`, one of the four kinds by `kind`. */
export const FilterSelection = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("text"), id: z.string(), value: z.string() }),
    z.object({ kind: z.literal("number"), id: z.string(), value: z.number() }),
    z.object({ kind: z.literal("select"), id: z.string(), optionID: z.string() }),
    z.object({
      kind: z.literal("multiSelect"),
      id: z.string(),
      included: z.array(z.string()),
      excluded: z.array(z.string()),
    }),
  ])
  .meta({ description: "One filter the reader set, keyed by the filter id from filters.json." });

/** Validates the `SearchQuery` the app passes to `search`. */
export const SearchQuery = z
  .object({
    text: z.string().nullable(),
    filters: z.array(FilterSelection),
    sort: z.string().nullable().meta({ description: "A sort option id, or null for the default." }),
    cursor: z.string().nullable().meta({
      description:
        "Opaque. The previous page's `next`, handed back untouched; null for the first page.",
    }),
    route: z.string().nullable().meta({
      description: "Opaque. Set by a preset's `route`; read only by the source that declared it.",
    }),
  })
  .meta({ description: "What the app asks a source to search for." });

/** Validates the `Context` passed as the last argument of every call. */
export const Context = z
  .object({
    settings: z.record(z.string(), z.union([z.string(), z.boolean()])).meta({
      description: "Current values of the settings declared in source.json, by id.",
    }),
  })
  .meta({ description: "Passed as the last argument of every call." });

/** Validates a `Request` a source hands to the host. */
export const Request = z
  .object({
    url: z.url(),
    method: z.enum(["GET", "POST"]).optional(),
    headers: z.record(z.string(), z.string()).optional().meta({
      description:
        "The host owns User-Agent, Cookie, Accept-Encoding and Content-Length; the rest pass through.",
    }),
    body: z.string().optional(),
    credentials: z.enum(["include", "omit"]).optional().meta({
      description: 'Whether the host applies this source\'s credential. Defaults to "include".',
    }),
  })
  .meta({ description: "A request description the host performs on the source's behalf." });

/** Validates the `Response` the host hands back. */
export const Response = z
  .object({
    status: z.int().meta({ description: "Never throws on status; the source decides." }),
    headers: z.record(z.string(), z.string()),
    url: z.string().meta({ description: "Final URL after redirects." }),
    text: z.string(),
  })
  .meta({ description: "What the host hands back. Text only; no source reads binary." });
