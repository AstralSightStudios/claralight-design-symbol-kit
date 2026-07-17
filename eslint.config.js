import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.astro/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/*.config.ts",
      "packages/astro/**",
      "packages/figma/**",
      "packages/flutter/**",
      "packages/react/**",
      "packages/unplugin/**",
      "packages/vue/**",
      "packages/core/src/symbols/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-inferrable-types": "off"
    }
  },
  {
    files: ["scripts/**/*.mjs", "packages/*/scripts/**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false
      }
    }
  }
);
