import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@claralight-design/symbol-kit-compiler": fileURLToPath(
        new URL("../../packages/compiler/src/index.ts", import.meta.url)
      ),
      "@claralight-design/symbol-kit-core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url)
      )
    }
  }
});
