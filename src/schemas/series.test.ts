import { expect, test } from "vitest";
import { SeriesStub, searchPage } from "./series";

test("searchPage builds a page schema over the given item", () => {
  // arrange
  const schema = searchPage(SeriesStub);
  const page = {
    items: [{ slug: "a", title: "A", cover: null, adult: false }],
    next: "2",
  };
  const broken = { items: [{ slug: "" }], next: null };

  // act
  const results = [page, broken].map((input) => schema.safeParse(input).success);

  // assert
  expect(results).toEqual([true, false]);
});
