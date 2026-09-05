import { expect, test } from "vitest";
import type { Filter, FilterSelection, SearchQuery } from "@/types";
import { allowsAdult } from "./adult";

const FILTERS: Filter[] = [
  {
    kind: "multiSelect",
    id: "genres",
    name: "Genres",
    canExclude: true,
    options: [
      { id: "1", name: "Action" },
      { id: "2", name: "Ecchi", sensitivity: "suggestive" },
      { id: "3", name: "Hentai", sensitivity: "adult" },
    ],
  },
  {
    kind: "select",
    id: "mature",
    name: "Mature",
    options: [{ id: "included", name: "Included", sensitivity: "adult" }],
  },
  { kind: "text", id: "author", name: "Author" },
];

function query(filters: FilterSelection[]): SearchQuery {
  return { text: null, filters, sort: null, cursor: null, route: null };
}

test("the gate is shut with no selection", () => {
  // arrange
  const q = query([]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(false);
});

test("an adult-only source is always open", () => {
  // arrange
  const q = query([]);

  // act
  const result = allowsAdult(q, "adult", FILTERS);

  // assert
  expect(result).toBe(true);
});

test("a suggestive option does not open the gate", () => {
  // arrange
  const q = query([{ kind: "multiSelect", id: "genres", included: ["2"], excluded: [] }]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(false);
});

test("an included adult option opens the gate", () => {
  // arrange
  const q = query([{ kind: "multiSelect", id: "genres", included: ["1", "3"], excluded: [] }]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(true);
});

test("a selected adult option opens the gate", () => {
  // arrange
  const q = query([{ kind: "select", id: "mature", optionID: "included" }]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(true);
});

test("excluding an adult option does not open the gate", () => {
  // arrange
  const q = query([{ kind: "multiSelect", id: "genres", included: [], excluded: ["3"] }]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(false);
});

test("an unknown filter id or a text filter is ignored", () => {
  // arrange
  const unknown = query([{ kind: "select", id: "nope", optionID: "3" }]);
  const text = query([{ kind: "text", id: "author", value: "3" }]);

  // act
  const results = [allowsAdult(unknown, "mixed", FILTERS), allowsAdult(text, "mixed", FILTERS)];

  // assert
  expect(results).toEqual([false, false]);
});

test("a selection whose kind does not match its filter is ignored", () => {
  // arrange
  const q = query([{ kind: "number", id: "genres", value: 3 }]);

  // act
  const result = allowsAdult(q, "mixed", FILTERS);

  // assert
  expect(result).toBe(false);
});
