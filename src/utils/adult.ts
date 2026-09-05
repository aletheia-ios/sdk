import type { ContentRating, Filter, FilterSelection, SearchQuery } from "@/types";

/**
 * Whether a search may return adult content.
 *
 * The gate is shut by default and opens only when the reader picked a filter option
 * whose `sensitivity` is `"adult"`, or when the whole source is `"adult"` - an adult-only
 * catalogue has no option to tick, since opening it is the request. A `"suggestive"`
 * option never opens it, and excluding an adult option does not either.
 *
 * This is the one shared rule; a source never re-derives it. What the source does with
 * the answer is its own: when the gate is shut the request must actively exclude adult
 * content - a `contentRating[]` list, an excluded tag id, `adult=False` - because most
 * sites default an unasked question the other way. Omitting the parameter is not the
 * same as excluding.
 *
 * @param query the search as the reader composed it
 * @param contentRating the manifest's `contentRating`
 * @param filters the manifest's `filters.json`, where option sensitivities live
 */
export function allowsAdult(
  query: SearchQuery,
  contentRating: ContentRating,
  filters: readonly Filter[],
): boolean {
  const sourceIsAdultOnly = contentRating === "adult";
  if (sourceIsAdultOnly) return true;

  const nothingSelected = query.filters.length === 0;
  if (nothingSelected) return false;

  const adultOptionsByFilter = indexAdultOptions(filters);
  const noAdultOptionExists = adultOptionsByFilter.size === 0;
  if (noAdultOptionExists) return false;

  return query.filters.some((selection) => opensGate(selection, adultOptionsByFilter));
}

/** Filter id to the ids of its options that open the gate. Filters with none are absent. */
type AdultOptions = Map<string, Set<string>>;

/**
 * Builds the lookup once so each selection is a map hit and a set hit, rather than a scan
 * of every filter and every option per selection.
 */
function indexAdultOptions(filters: readonly Filter[]): AdultOptions {
  const index: AdultOptions = new Map();

  for (const filter of filters) {
    const hasOptions = filter.kind === "select" || filter.kind === "multiSelect";
    if (!hasOptions) continue;

    const adultIds = filter.options
      .filter((option) => option.sensitivity === "adult")
      .map((option) => option.id);

    if (adultIds.length > 0) index.set(filter.id, new Set(adultIds));
  }

  return index;
}

/** Whether one selection includes an adult option of the filter it belongs to. */
function opensGate(selection: FilterSelection, adultOptionsByFilter: AdultOptions): boolean {
  const adultIds = adultOptionsByFilter.get(selection.id);
  if (adultIds === undefined) return false;

  return chosenOptionIds(selection).some((id) => adultIds.has(id));
}

/**
 * The option ids a selection turned on. A multi-select's excluded ids are not chosen, and
 * text and number filters have no options at all.
 */
function chosenOptionIds(selection: FilterSelection): readonly string[] {
  switch (selection.kind) {
    case "select":
      return [selection.optionID];
    case "multiSelect":
      return selection.included;
    default:
      return [];
  }
}
