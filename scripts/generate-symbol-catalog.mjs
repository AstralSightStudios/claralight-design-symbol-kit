import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import process from "node:process";

import { format, resolveConfig } from "prettier";

import { compileSymbol, createPaperGeometryMaterializer } from "../packages/compiler/dist/index.js";
import { SymbolWeight, createCompiledSymbol } from "../packages/core/dist/index.js";

const rootDirectory = resolve(import.meta.dirname, "..");
const prettierOptions = (await resolveConfig(join(rootDirectory, "package.json"))) ?? {};
const sourceDirectory = join(rootDirectory, "test");
const outputDirectory = join(rootDirectory, "packages/core/src/symbols");
const sourceWeightOverrides = new Map([
  ["CreatorConsoleLogo", SymbolWeight.Ultralight],
  ["Recycle", SymbolWeight.Ultralight],
  ["WindowsLogo", SymbolWeight.Ultralight]
]);
const weightNames = new Map([
  ["UltraLight", SymbolWeight.Ultralight],
  ["Thin", SymbolWeight.Thin],
  ["Light", SymbolWeight.Light],
  ["Regular", SymbolWeight.Regular],
  ["Medium", SymbolWeight.Medium]
]);
const weightMembers = new Map([
  [SymbolWeight.Ultralight, "Ultralight"],
  [SymbolWeight.Thin, "Thin"],
  [SymbolWeight.Light, "Light"],
  [SymbolWeight.Regular, "Regular"],
  [SymbolWeight.Medium, "Medium"],
  [SymbolWeight.Semibold, "Semibold"],
  [SymbolWeight.Bold, "Bold"],
  [SymbolWeight.Heavy, "Heavy"],
  [SymbolWeight.Black, "Black"]
]);

const config = await loadCompilerConfig();
const targetWeights = Object.keys(config.weights);
const materializer = createPaperGeometryMaterializer({ weights: config.weights });
const entries = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
  .sort((left, right) => left.name.localeCompare(right.name));

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const symbols = [];

for (const entry of entries) {
  const name = basename(entry.name, ".svg");
  assertIdentifier(name);
  const svg = await readFile(join(sourceDirectory, entry.name), "utf8");
  const sourceWeight = sourceWeightOverrides.get(name);
  const result = compileSymbol({
    name,
    sources: [
      {
        ...(sourceWeight === undefined ? {} : { weight: sourceWeight }),
        targetWeights,
        fileName: entry.name,
        svg
      }
    ],
    config,
    geometryMaterializer: materializer
  });
  const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (errors.length > 0 || result.symbol === undefined) {
    const details = errors
      .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
      .join("\n");
    throw new Error(`无法生成 ${name}：\n${details}`);
  }

  const identifier = `${name}Symbol`;
  const serialized = serializeSymbol(createCompiledSymbol(result.symbol));
  await writeTypeScript(
    join(outputDirectory, `${name}.ts`),
    `import { SymbolWeight, type CompiledSymbol } from "../index.js";\n\nexport const ${identifier}: CompiledSymbol = ${serialized};\n`
  );
  symbols.push({ name, identifier });
}

const imports = symbols
  .map(({ name, identifier }) => `import { ${identifier} } from "./${name}.js";`)
  .join("\n");
const exports = symbols
  .map(({ name, identifier }) => `export { ${identifier} } from "./${name}.js";`)
  .join("\n");
const catalog = symbols.map(({ name, identifier }) => `  ${name}: ${identifier}`).join(",\n");
const symbolName = symbols.map(({ name }) => `"${name}"`).join(" | ");

await writeTypeScript(
  join(outputDirectory, "index.ts"),
  `import type { CompiledSymbol } from "../index.js";\n${imports}\n\n${exports}\n\nexport type SymbolName = ${symbolName};\n\nexport const symbols: Readonly<Record<SymbolName, CompiledSymbol>> = {\n${catalog}\n};\n`
);

process.stdout.write(`已生成 ${String(symbols.length)} 个图标数据。\n`);

async function loadCompilerConfig() {
  const weights = {};
  const widthDirectory = join(sourceDirectory, "Width");
  const widthEntries = await readdir(widthDirectory, { withFileTypes: true });

  for (const entry of widthEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".tokens.json")) {
      continue;
    }
    const tokens = JSON.parse(await readFile(join(widthDirectory, entry.name), "utf8"));
    const modeName = tokens.$extensions?.["com.figma.modeName"];
    const weight = weightNames.get(modeName);
    const strokeWidth = tokens.Width?.["Stroke Width"]?.$value;
    if (weight === undefined || typeof strokeWidth !== "number") {
      throw new Error(`Width Token 无效：${entry.name}`);
    }
    weights[weight] = { strokeWidth };
  }

  const styles = {};
  const styleDirectory = join(sourceDirectory, "Style");
  const styleEntries = await readdir(styleDirectory, { withFileTypes: true });

  for (const entry of styleEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".tokens.json")) {
      continue;
    }
    const tokens = JSON.parse(await readFile(join(styleDirectory, entry.name), "utf8"));
    const modeName = tokens.$extensions?.["com.figma.modeName"];
    const fill = tokens.Fill;
    if (typeof modeName !== "string" || fill === undefined) {
      throw new Error(`Style Token 无效：${entry.name}`);
    }
    styles[modeName.toLowerCase()] = {
      color: fill.Color.$value.hex,
      reverse: fill.Reverse.$value.hex,
      lineOpacity: fill["Line Opacity"].$value / 100,
      duotoneLineOpacity: fill["Duotone Line Opacity"].$value / 100,
      backgroundOpacity: fill["BG Opacity"].$value / 100,
      noFillBackgroundOpacity: fill["NoFill BG Opacity"].$value / 100,
      noDuotoneBackgroundOpacity: fill["NoDuo BG Opacity"].$value / 100
    };
  }

  const foreground = [...new Set(Object.values(styles).map((style) => style.color))];
  const background = [...new Set(Object.values(styles).map((style) => style.reverse))].filter(
    (color) =>
      !foreground.some((foregroundColor) => foregroundColor.toLowerCase() === color.toLowerCase())
  );

  return {
    colors: { foreground, background },
    styles,
    weights,
    rendering: {
      duotoneFillOpacity: 0.2,
      fillFillOpacity: 1
    },
    modes: ["outline", "fill", "duotone"]
  };
}

function serializeSymbol(symbol) {
  const json = JSON.stringify(symbol, null, 2);
  return json.replace(/"weight": "([^"]+)"/g, (_match, weight) => {
    const member = weightMembers.get(weight);
    if (member === undefined) {
      throw new Error(`未知字重：${weight}`);
    }
    return `"weight": SymbolWeight.${member}`;
  });
}

function assertIdentifier(value) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(value)) {
    throw new Error(`图标名称不是有效的 TypeScript 标识符：${value}`);
  }
}

async function writeTypeScript(path, source) {
  const formatted = await format(source, { ...prettierOptions, parser: "typescript" });
  await writeFile(path, formatted, "utf8");
}
