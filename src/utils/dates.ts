// bare JavaScriptCore parses ISO 8601 and nothing else, and Date.parse of a zoneless
// "2026-05-03 17:31:46" is local time, which is never what a site means

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const ISO = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const RELATIVE = /(\d+)\s*(sec|second|min|minute|hour|hr|day|week|month|year|yr)s?\b/;
const WORD = /[A-Za-z]{3,}/;
const NUMBER = /\d+/g;

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Parses an ISO 8601 date-time with a zone (`2026-05-03T17:31:46Z`,
 * `...+02:00`), or a bare date (`2026-05-03`) as UTC midnight.
 *
 * A date-time with no zone is refused and returns `null` rather than guessed: the
 * engine would read it as local time, and a site publishing one means its own server
 * time, which is almost always UTC. Use `parseDateTime` for those.
 *
 * @returns epoch milliseconds, or `null` when the text is not zoned ISO 8601
 * @see https://www.rfc-editor.org/rfc/rfc3339#section-5.6 the date-time grammar
 * @see https://tc39.es/ecma262/#sec-date-time-string-format what `Date.parse` accepts
 */
export function parseISO(value: string): number | null {
  const trimmed = value.trim();
  if (!ISO.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Parses a zoneless `2026-05-03 17:31:46` or `2026-05-03T17:31` as UTC.
 *
 * The shape MySQL and most PHP sites emit. Seconds are optional.
 *
 * @returns epoch milliseconds, or `null` when the text is not this shape
 */
export function parseDateTime(value: string): number | null {
  const match = DATE_TIME.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? 0),
  );
}

/**
 * Parses a date written with an English month name, in any order, as UTC midnight.
 *
 * Handles `8 August 2025`, `August 8, 2025`, `Aug 8, 25`, `3 Dec 2024`. The month may
 * be any unambiguous prefix of three letters or more; a two-digit year is read as 2000s.
 * Whichever of the two numbers is four digits or above 31 is the year.
 *
 * @returns epoch milliseconds, or `null` when there is no recognisable month or not
 *   exactly two numbers
 */
export function parseMonthName(value: string): number | null {
  const word = WORD.exec(value)?.[0];
  if (!word) return null;
  const month = MONTHS.findIndex((name) => name.startsWith(word.toLowerCase()));
  if (month === -1) return null;

  const numbers = Array.from(value.matchAll(NUMBER), (match) => match[0]);
  if (numbers.length !== 2) return null;
  const [first, second] = numbers as [string, string];

  let day: number;
  let year: number;
  if (first.length === 4 || Number(first) > 31) {
    year = Number(first);
    day = Number(second);
  } else {
    day = Number(first);
    year = Number(second);
  }
  if (second.length <= 2 && first.length <= 2) year += 2000;
  if (day < 1 || day > 31) return null;
  return Date.UTC(year, month, day);
}

/**
 * Parses a relative date - `3 days ago`, `2 hours ago`, `today`, `yesterday`, `just now`
 * - against a reference time.
 *
 * `UP` is a badge some Madara sites show in place of a date, meaning today. Months are
 * 30 days and years 365; the site only ever stated the count, so nothing finer is
 * claimed.
 *
 * @param now the reference time in epoch milliseconds; defaults to the current time.
 *   Pass it explicitly in tests
 * @returns epoch milliseconds, or `null` when the text is not relative
 */
export function parseRelative(value: string, now: number = Date.now()): number | null {
  const lowered = value.trim().toLowerCase();
  if (lowered === "") return null;
  if (lowered === "up" || lowered.includes("today") || lowered.includes("just now")) return now;
  if (lowered.includes("yesterday")) return now - DAY;
  if (!lowered.includes("ago")) return null;

  const match = RELATIVE.exec(lowered);
  if (!match) return null;
  const count = Number(match[1]);
  const unit = unitMs(match[2] ?? "");
  return unit === null ? null : now - count * unit;
}

function unitMs(unit: string): number | null {
  switch (unit) {
    case "sec":
    case "second":
      return SECOND;
    case "min":
    case "minute":
      return MINUTE;
    case "hour":
    case "hr":
      return HOUR;
    case "day":
      return DAY;
    case "week":
      return WEEK;
    case "month":
      return MONTH;
    case "year":
    case "yr":
      return YEAR;
    default:
      return null;
  }
}

/**
 * Converts a Unix timestamp in seconds, as many APIs send, to epoch milliseconds.
 *
 * A timestamp already in milliseconds needs no conversion; the contract takes it as-is.
 */
export function fromEpochSeconds(seconds: number): number {
  return Math.round(seconds * SECOND);
}

/**
 * Tries `parseISO`, `parseDateTime`, `parseMonthName` and `parseRelative` in that order.
 *
 * Convenient when a site mixes formats on one page. When the format is known, call the
 * specific parser instead, so a change on the site fails loudly rather than being read
 * by the wrong one.
 *
 * @param now the reference time for relative dates; defaults to the current time
 * @returns epoch milliseconds, or `null` when no parser accepts the text
 */
export function parseDate(value: string, now: number = Date.now()): number | null {
  return (
    parseISO(value) ?? parseDateTime(value) ?? parseMonthName(value) ?? parseRelative(value, now)
  );
}
