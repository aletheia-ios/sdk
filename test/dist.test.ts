import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";

// these read the built package through its own exports map, so they fail if the build
// stops producing what the map promises

const ZOD_IMPORT = /from\s+["']zod["']/;
const HOSTS_DESCRIPTION = /only hosts/i;

function published(subpath: string): Promise<string> {
  return readFile(new URL(import.meta.resolve(`@aletheia-ios/sdk/${subpath}`)), "utf8");
}

test("device-side bundles carry no zod", async () => {
  // arrange
  const subpaths = ["types", "host", "utils"];

  // act
  const bundles = await Promise.all(subpaths.map(published));

  // assert
  for (const bundle of bundles) expect(bundle).not.toMatch(ZOD_IMPORT);
});

test("the types bundle has no runtime", async () => {
  // arrange
  const subpath = "types";

  // act
  const bundle = await published(subpath);

  // assert
  expect(bundle.trim()).toBe("");
});

test("json schemas are emitted with field descriptions", async () => {
  // arrange
  const subpath = "json-schema/source.json";

  // act
  const schema = JSON.parse(await published(subpath));

  // assert
  expect(schema.$ref).toBe("#/$defs/SourceManifest");
  expect(schema.$defs.SourceManifest.properties.hosts.description).toMatch(HOSTS_DESCRIPTION);
});
