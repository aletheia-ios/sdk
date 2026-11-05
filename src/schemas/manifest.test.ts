import { expect, test } from "vitest";
import { SourceManifest } from "./manifest";

const MANIFEST = {
  slug: "com.example.komga",
  name: "Komga",
  description: "",
  version: "1.0.0",
  minAppVersion: "1.4.0",
  contractVersion: "1.0",
  languages: ["en"],
  baseURL: "${serverURL}",
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

test("a slug must be namespaced, so two publishers cannot claim the same name", () => {
  // arrange
  const bare = { ...MANIFEST, slug: "mangadex" };
  const trailing = { ...MANIFEST, slug: "com.example." };
  const hyphenEdge = { ...MANIFEST, slug: "com.example.-mangadex" };
  const hyphenated = { ...MANIFEST, slug: "com.example.weeb-central" };

  // act
  const results = [bare, trailing, hyphenEdge, hyphenated].map((manifest) =>
    SourceManifest.safeParse(manifest),
  );

  // assert
  expect(results.map((result) => result.success)).toEqual([false, false, false, true]);
  expect(paths(results[0] as { error?: { issues: { path: PropertyKey[] }[] } })).toContain("slug");
});

test("a literal host needs two labels, but a placeholder does not", () => {
  // arrange
  const single = { ...MANIFEST, hosts: ["com"] };
  const twoLabels = { ...MANIFEST, hosts: ["example.com"] };
  const templated = { ...MANIFEST, hosts: ["${serverURL}"] };
  const prefixed = { ...MANIFEST, hosts: ["${serverURL}.example.com"] };

  // act
  const results = [single, twoLabels, templated, prefixed].map((manifest) =>
    SourceManifest.safeParse(manifest),
  );

  // assert
  expect(results.map((result) => result.success)).toEqual([false, true, true, true]);
});

test("replaces accepts the bare slugs a rename supersedes", () => {
  // arrange
  const manifest = { ...MANIFEST, replaces: ["mangadex", "com.example.old-mangadex"] };

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

const SECRET = { type: "secret", id: "token", name: "Token" };

function withHeaders(headers: unknown, settings: unknown[] = []) {
  return SourceManifest.safeParse({
    ...MANIFEST,
    settings: [...MANIFEST.settings, ...settings],
    headers,
  });
}

test("a scoped headers map, or none, parses", () => {
  // arrange
  const scoped = {
    all: { "User-Agent": "Aletheia/1.0.1" },
    pages: { referer: "${serverURL}", origin: "https://example.com" },
  };

  // act
  const results = [SourceManifest.safeParse(MANIFEST), withHeaders(scoped)];

  // assert
  expect(results.map((result) => result.success)).toEqual([true, true]);
});

test("an unknown kind, or a leftover referer field, fails", () => {
  // arrange
  const typo = withHeaders({ page: { x: "b" } });
  const referer = SourceManifest.safeParse({ ...MANIFEST, referer: "https://example.com" });

  // act
  const results = [typo, referer];

  // assert
  expect(results.map((result) => result.success)).toEqual([false, false]);
});

test("no header name is refused, Host and Content-Length included", () => {
  // arrange
  const names = ["Host", "HOST", "content-length", "Content-Length", "cookie"];

  // act
  const results = names.map((name) => withHeaders({ api: { [name]: "x" } }));

  // assert
  expect(results.map((result) => result.success)).toEqual([true, true, true, true, true]);
});

test("keys differing only in case fail within a kind but not across kinds", () => {
  // arrange
  const duplicate = withHeaders({ all: { "User-Agent": "a", "user-agent": "b" } });
  const across = withHeaders({ all: { "User-Agent": "a" }, api: { "user-agent": "b" } });
  const badName = withHeaders({ all: { "bad name": "a" } });

  // act
  const results = [duplicate, across, badName];

  // assert
  expect(results.map((result) => result.success)).toEqual([false, true, false]);
  expect(paths(duplicate as { error?: { issues: { path: PropertyKey[] }[] } })).toEqual([
    "headers.all.user-agent",
  ]);
});

test("a header placeholder must name a declared setting", () => {
  // arrange
  const declared = withHeaders({ pages: { referer: "${serverURL}" } });
  const undeclared = withHeaders({ pages: { referer: "${missing}" } });

  // act
  const results = [declared, undeclared];

  // assert
  expect(results.map((result) => result.success)).toEqual([true, false]);
  expect(paths(undeclared as { error?: { issues: { path: PropertyKey[] }[] } })).toEqual([
    "headers.pages.referer",
  ]);
});

test("a secret setting reaches api and ping headers only", () => {
  // arrange
  const value = { authorization: "Bearer ${token}" };

  // act
  const results = ["all", "pages", "covers", "api", "ping"].map((kind) =>
    withHeaders({ [kind]: value }, [SECRET]),
  );

  // assert
  expect(results.map((result) => result.success)).toEqual([false, false, false, true, true]);
});
