import { expect, test } from "vitest";
import {
  fromEpochSeconds,
  parseDate,
  parseDateTime,
  parseISO,
  parseMonthName,
  parseRelative,
} from "./dates";

const NOW = Date.UTC(2026, 8, 5, 12, 0, 0);
const DAY = 86_400_000;

test("parseISO accepts a zoned date-time", () => {
  // arrange
  const input = "2026-05-03T17:31:46.123+02:00";

  // act
  const result = parseISO(input);

  // assert
  expect(result).toBe(Date.UTC(2026, 4, 3, 15, 31, 46, 123));
});

test("parseISO accepts a bare date as utc midnight", () => {
  // arrange
  const input = "2026-05-03";

  // act
  const result = parseISO(input);

  // assert
  expect(result).toBe(Date.UTC(2026, 4, 3));
});

test("parseISO refuses a zoneless date-time and non-iso text", () => {
  // arrange
  const inputs = ["2026-05-03 17:31:46", "Aug 8, 25", ""];

  // act
  const results = inputs.map(parseISO);

  // assert
  expect(results).toEqual([null, null, null]);
});

test("parseDateTime reads a zoneless timestamp as utc", () => {
  // arrange
  const inputs = ["2026-05-03 17:31:46", "2026-05-03T17:31", "nope"];

  // act
  const results = inputs.map(parseDateTime);

  // assert
  expect(results).toEqual([Date.UTC(2026, 4, 3, 17, 31, 46), Date.UTC(2026, 4, 3, 17, 31), null]);
});

test("parseMonthName handles day-month-year and month-day-year in either order", () => {
  // arrange
  const inputs = ["8 August 2025", "August 8, 2025", "Aug 8, 25", "3 Dec 2024"];

  // act
  const results = inputs.map(parseMonthName);

  // assert
  expect(results).toEqual([
    Date.UTC(2025, 7, 8),
    Date.UTC(2025, 7, 8),
    Date.UTC(2025, 7, 8),
    Date.UTC(2024, 11, 3),
  ]);
});

test("parseMonthName returns null without a month or with an unknown one", () => {
  // arrange
  const inputs = ["Chapter 12", "Foo 8, 2025"];

  // act
  const results = inputs.map(parseMonthName);

  // assert
  expect(results).toEqual([null, null]);
});

test("parseRelative subtracts the stated amount", () => {
  // arrange
  const inputs = ["2 days ago", "1 hour ago", "3 weeks ago"];

  // act
  const results = inputs.map((input) => parseRelative(input, NOW));

  // assert
  expect(results).toEqual([NOW - 2 * DAY, NOW - 3_600_000, NOW - 3 * 7 * DAY]);
});

test("parseRelative reads the badges and words that mean today or yesterday", () => {
  // arrange
  const inputs = ["UP", "today", "yesterday"];

  // act
  const results = inputs.map((input) => parseRelative(input, NOW));

  // assert
  expect(results).toEqual([NOW, NOW, NOW - DAY]);
});

test("parseRelative refuses an amount without ago, and empty text", () => {
  // arrange
  const inputs = ["2 days", ""];

  // act
  const results = inputs.map((input) => parseRelative(input, NOW));

  // assert
  expect(results).toEqual([null, null]);
});

test("fromEpochSeconds scales to milliseconds", () => {
  // arrange
  const seconds = 1_700_000_000;

  // act
  const result = fromEpochSeconds(seconds);

  // assert
  expect(result).toBe(1_700_000_000_000);
});

test("parseDate falls through iso, zoneless, month name, relative", () => {
  // arrange
  const inputs = [
    "2026-05-03T00:00:00Z",
    "2026-05-03 01:02:03",
    "May 3, 2026",
    "5 min ago",
    "garbage",
  ];

  // act
  const results = inputs.map((input) => parseDate(input, NOW));

  // assert
  expect(results).toEqual([
    Date.UTC(2026, 4, 3),
    Date.UTC(2026, 4, 3, 1, 2, 3),
    Date.UTC(2026, 4, 3),
    NOW - 300_000,
    null,
  ]);
});

test("parseMonthName refuses a day outside 1 to 31", () => {
  // arrange
  const inputs = ["Aug 40, 2025", "0 August 2025"];

  // act
  const results = inputs.map(parseMonthName);

  // assert
  expect(results).toEqual([null, null]);
});

test("parseRelative knows every unit spelling", () => {
  // arrange
  const inputs = [
    "30 sec ago",
    "30 seconds ago",
    "1 minute ago",
    "2 hrs ago",
    "3 months ago",
    "1 yr ago",
    "2 years ago",
  ];

  // act
  const results = inputs.map((input) => parseRelative(input, NOW));

  // assert
  expect(results).toEqual([
    NOW - 30_000,
    NOW - 30_000,
    NOW - 60_000,
    NOW - 2 * 3_600_000,
    NOW - 3 * 30 * DAY,
    NOW - 365 * DAY,
    NOW - 2 * 365 * DAY,
  ]);
});
