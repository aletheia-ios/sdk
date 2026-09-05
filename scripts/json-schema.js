import { mkdir, writeFile } from "node:fs/promises";
import { AuthSpec, Filters, Index, SourceManifest } from "@aletheia-ios/sdk/schemas";
import { z } from "zod";

const out = new URL("../dist/json-schema/", import.meta.url);
await mkdir(out, { recursive: true });

const files = {
  "source.json": SourceManifest,
  "filters.json": Filters,
  "auth.json": AuthSpec,
  "index.json": Index,
};

await Promise.all(
  Object.entries(files).map(([name, schema]) => {
    const json = z.toJSONSchema(schema, { io: "input", target: "draft-2020-12" });
    return writeFile(new URL(name, out), `${JSON.stringify(json, null, 2)}\n`);
  }),
);
