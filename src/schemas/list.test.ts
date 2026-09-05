import { expect, test } from "vitest";
import { Index } from "./list";

const ENTRY = {
  slug: "mangadex",
  name: "MangaDex",
  version: "1.0.0",
  minAppVersion: "1.4.0",
  contractVersion: "1.0",
  contentRating: "mixed",
  languages: ["en"],
  size: 1,
  sha256: "a".repeat(64),
  updatedDate: "2026-09-05T00:00:00Z",
  downloadURL: "../packages/mangadex-v1.0.0.althsource",
  iconURL: "../icons/mangadex.png",
};

test("index rejects duplicate slugs", () => {
  // arrange
  const index = { name: "Sample", updatedDate: "2026-09-05T00:00:00Z", sources: [ENTRY] };
  const duplicated = { ...index, sources: [ENTRY, ENTRY] };

  // act
  const results = [index, duplicated].map((input) => Index.safeParse(input).success);

  // assert
  expect(results).toEqual([true, false]);
});
