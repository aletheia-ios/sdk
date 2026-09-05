import { z } from "zod";

/** Validates a `LanguageCode`. */
export const LanguageCode = z
  .enum(["en", "zh", "ja", "ko"])
  .meta({ description: "A language the app can render. Rows in any other language are dropped." });

/** Validates a `Classification`. */
export const Classification = z
  .enum(["Unknown", "Safe", "Suggestive", "Explicit"])
  .meta({ description: "Content rating of one series, as this source draws that line." });

/** Validates a `Publication`. */
export const Publication = z
  .enum(["Unknown", "Ongoing", "Completed", "Hiatus", "Cancelled"])
  .meta({ description: "Publication status of one series." });

/** Validates a filter option's `Sensitivity`. */
export const Sensitivity = z.enum(["none", "suggestive", "adult"]).meta({
  description:
    'What selecting a filter option pulls into results. "adult" is the only value that opens the adult gate; marking an option "adult" by mistake is a safety bug, not a wrong colour.',
});

/** Validates a manifest's `ContentRating`. */
export const ContentRating = z.enum(["mixed", "adult"]).meta({
  description:
    'Whether the whole catalogue is adult. An "adult" source is exempt from the gate, stamps every result adult, and is hidden from search by default.',
});
