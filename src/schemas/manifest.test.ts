import { expect, test } from "vitest";
import { SourceManifest } from "./manifest";

const MANIFEST = {
  slug: "komga",
  name: "Komga",
  description: "",
  version: "1.0.0",
  minAppVersion: "1.4.0",
  contractVersion: "1.0",
  languages: ["en"],
  baseURL: "${serverURL}",
  referer: "${serverURL}",
  hosts: ["${serverURL}"],
  contentRating: "mixed",
  sort: { default: "created,desc", options: [{ id: "created,desc", name: "Recent" }] },
  presets: [{ id: "recent", name: "Recent", order: 0, sort: "created,desc" }],
  settings: [{ type: "text", id: "serverURL", name: "Server address" }],
};

function paths(result: { error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return (result.error?.issues ?? []).map((issue) => issue.path.join("."));
}

test("a manifest templated over a declared setting parses", () => {
  // arrange
  const manifest = MANIFEST;

  // act
  const result = SourceManifest.safeParse(manifest);

  // assert
  expect(result.success).toBe(true);
});

test("cross-field refinements report every problem at its path", () => {
  // arrange
  const manifest = {
    ...MANIFEST,
    slug: "Bad_Slug",
    baseURL: "${nope}",
    sort: { default: "zzz", options: [{ id: "a", name: "A" }] },
    presets: [
      { id: "p", name: "P", order: 0, sort: "missing", route: "r" },
      { id: "p", name: "P2", order: 1 },
    ],
    extra: true,
  };

  // act
  const result = SourceManifest.safeParse(manifest);

  // assert
  expect(result.success).toBe(false);
  expect(paths(result)).toEqual(
    expect.arrayContaining([
      "slug",
      "baseURL",
      "sort.default",
      "presets.0.route",
      "presets.0.sort",
      "presets.1.id",
      "",
    ]),
  );
});

test("a preset whose sort is not a declared option is reported at its path", () => {
  // arrange
  const manifest = {
    ...MANIFEST,
    presets: [{ id: "p", name: "P", order: 0, sort: "missing" }],
  };

  // act
  const result = SourceManifest.safeParse(manifest);

  // assert
  expect(result.success).toBe(false);
  expect(paths(result)).toEqual(["presets.0.sort"]);
});
