import { expect, test } from "vitest";
import { Filters } from "./filters";

test("filters reject duplicate ids and unknown keys", () => {
  // arrange
  const good = [{ kind: "text", id: "author", name: "Author" }];
  const duplicated = [...good, ...good];
  const unknownKey = [{ kind: "text", id: "a", name: "A", bogus: 1 }];

  // act
  const results = [good, duplicated, unknownKey].map((input) => Filters.safeParse(input).success);

  // assert
  expect(results).toEqual([true, false, false]);
});
