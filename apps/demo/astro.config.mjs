import { fileURLToPath } from "node:url";

import react from "@astrojs/react";
import { defineConfig } from "astro/config";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@claralight-design/symbol-kit-core": fileURLToPath(
          new URL("../../packages/core/src/index.ts", import.meta.url)
        )
      }
    },
    server: {
      fs: {
        allow: [workspaceRoot],
        strict: false
      }
    }
  }
});
