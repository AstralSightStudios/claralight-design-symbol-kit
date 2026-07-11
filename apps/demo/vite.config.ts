import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@claralight-design/symbol-kit-compiler": fileURLToPath(
        new URL("../../packages/compiler/src/index.ts", import.meta.url)
      ),
      "@claralight-design/symbol-kit-core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url)
      )
    }
  },
  server: {
    fs: {
      strict: false
    },
    host: "127.0.0.1"
  }
});
