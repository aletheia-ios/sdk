import { z } from "zod";
import { Sensitivity } from "./enums";

/** Validates one `Option` of a select or multi-select filter. */
export const Option = z
  .strictObject({
    id: z
      .string()
      .min(1)
      .meta({ description: "What the script receives. Use the site's own value." }),
    name: z.string().min(1).meta({ description: "What the reader sees." }),
    sensitivity: Sensitivity.optional(),
  })
  .meta({ id: "Option" });

/** The fields every filter kind shares. */
const base = {
  id: z
    .string()
    .min(1)
    .meta({ description: "What the script receives. Use the site's own parameter name." }),
  name: z.string().min(1).meta({ description: "What the reader sees." }),
};

/** Validates one `Filter`, one of the four kinds by `kind`. */
export const Filter = z
  .discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("text"), ...base }),
    z.strictObject({ kind: z.literal("number"), ...base }),
    z.strictObject({ kind: z.literal("select"), ...base, options: z.array(Option).min(1) }),
    z.strictObject({
      kind: z.literal("multiSelect"),
      ...base,
      options: z.array(Option).min(1),
      canExclude: z
        .boolean()
        .meta({ description: "Whether the site can exclude an option, not just include it." }),
    }),
  ])
  .meta({ id: "Filter", description: "One control on the Refine sheet." });

/** Validates `filters.json` as a whole, rejecting duplicate filter ids. */
export const Filters = z
  .array(Filter)
  .superRefine((filters, ctx) => {
    const seen = new Set<string>();
    for (const [index, filter] of filters.entries()) {
      if (seen.has(filter.id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate filter id "${filter.id}"`,
          path: [index, "id"],
        });
      }
      seen.add(filter.id);
    }
  })
  .meta({
    id: "Filters",
    description: "filters.json - in display order. Read by the app, never by the script.",
  });
