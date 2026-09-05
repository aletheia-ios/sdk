import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    types: "src/types/index.ts",
    schemas: "src/schemas/index.ts",
    host: "src/host/index.ts",
    utils: "src/utils/index.ts",
  },
  format: "esm",
  // NOTE - neither node nor browser since the consumer runs in bare JavaScriptCore
  platform: "neutral",
  target: "es2022",
  dts: true,
  deps: { neverBundle: ["zod"] },
  hash: false,
  fixedExtension: false,
  exports: false,
});
