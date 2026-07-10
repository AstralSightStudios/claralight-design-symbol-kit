import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
}

interface TypeScriptConfig {
  readonly references?: readonly { readonly path: string }[];
}

function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, "utf8")) as unknown;
}

describe("core boundary", () => {
  it("does not depend on compiler", () => {
    const packageManifest = readJson(
      new URL("../../package.json", import.meta.url)
    ) as PackageManifest;
    const tsconfig = readJson(new URL("../../tsconfig.json", import.meta.url)) as TypeScriptConfig;
    const declaredPackages = {
      ...packageManifest.dependencies,
      ...packageManifest.devDependencies
    };

    expect(declaredPackages).not.toHaveProperty("@claralight-design/symbol-kit-compiler");
    expect(tsconfig.references ?? []).not.toContainEqual({ path: "../compiler" });
  });
});
