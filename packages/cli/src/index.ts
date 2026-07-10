#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import {
  generateFigmaSvgSet,
  type CompilerConfigInput,
  type SymbolOutputMode,
  type SymbolWeightProfilesConfigInput
} from "@claralight-design/symbol-kit-compiler";

interface CliOptions {
  readonly input: string;
  readonly widthTokens: string;
  readonly styleTokens: string;
  readonly outDir: string;
  readonly name?: string;
}

interface TokenExtensions {
  readonly "com.figma.modeName"?: unknown;
}

interface WidthTokenFile {
  readonly Width?: {
    readonly "Stroke Width"?: {
      readonly $value?: unknown;
    };
  };
  readonly $extensions?: TokenExtensions;
}

interface StyleTokenFile {
  readonly Fill?: {
    readonly Color?: {
      readonly $value?: {
        readonly hex?: unknown;
      };
    };
    readonly "BG Opacity"?: {
      readonly $value?: unknown;
    };
  };
  readonly $extensions?: TokenExtensions;
}

type ConfiguredWeight = keyof SymbolWeightProfilesConfigInput;

const WEIGHT_NAMES = new Map<string, ConfiguredWeight>([
  ["ultralight", "ultralight" as ConfiguredWeight],
  ["thin", "thin" as ConfiguredWeight],
  ["light", "light" as ConfiguredWeight],
  ["regular", "regular" as ConfiguredWeight],
  ["medium", "medium" as ConfiguredWeight],
  ["semibold", "semibold" as ConfiguredWeight],
  ["bold", "bold" as ConfiguredWeight],
  ["heavy", "heavy" as ConfiguredWeight],
  ["black", "black" as ConfiguredWeight]
]);

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (command !== "build") {
    throw new Error(
      "用法：symbol-kit build --input <svg> --width-tokens <目录> --style-tokens <目录> --out-dir <目录> [--name <名称>]"
    );
  }

  const options = parseOptions(args);
  const inputPath = resolve(options.input);
  const outDir = resolve(options.outDir);
  const name = options.name ?? basename(inputPath, ".svg");
  const [svg, config] = await Promise.all([
    readFile(inputPath, "utf8"),
    loadCompilerConfig(resolve(options.widthTokens), resolve(options.styleTokens))
  ]);
  const result = generateFigmaSvgSet({ name, svg, config });

  if (result.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    const details = result.diagnostics
      .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
      .join("\n");
    throw new Error(`SVG 生成失败：\n${details}`);
  }

  await Promise.all(
    result.files.map(async (file) => {
      const outputPath = join(outDir, file.fileName);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, `${file.svg}\n`, "utf8");
    })
  );

  const manifest = {
    name,
    source: inputPath,
    variants: result.files.map(({ weight, style, fileName }) => ({
      weight,
      style,
      file: fileName
    }))
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(`已生成 ${String(result.files.length)} 个 SVG：${outDir}\n`);
}

function parseOptions(args: readonly string[]): CliOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (flag === undefined || !flag.startsWith("--") || value === undefined) {
      throw new Error("构建参数必须使用 --参数 值 的格式。");
    }

    values.set(flag.slice(2), value);
  }

  const name = values.get("name");

  return {
    input: requireOption(values, "input"),
    widthTokens: requireOption(values, "width-tokens"),
    styleTokens: requireOption(values, "style-tokens"),
    outDir: requireOption(values, "out-dir"),
    ...(name === undefined ? {} : { name })
  };
}

function requireOption(values: ReadonlyMap<string, string>, name: string): string {
  const value = values.get(name);
  if (value === undefined || value.length === 0) {
    throw new Error(`缺少构建参数：--${name}`);
  }
  return value;
}

async function loadCompilerConfig(
  widthTokensDirectory: string,
  styleTokensDirectory: string
): Promise<CompilerConfigInput> {
  const [weights, styleFiles] = await Promise.all([
    loadWeightProfiles(widthTokensDirectory),
    readTokenFiles<StyleTokenFile>(styleTokensDirectory)
  ]);
  const duotone = styleFiles.find(
    (tokens) => normalizeModeName(readModeName(tokens)) === "duotone"
  );
  const foreground = styleFiles
    .map((tokens) => tokens.Fill?.Color?.$value?.hex)
    .find((value): value is string => typeof value === "string");
  const bgOpacity = duotone?.Fill?.["BG Opacity"]?.$value;

  if (typeof bgOpacity !== "number" || !Number.isFinite(bgOpacity)) {
    throw new Error("Duotone tokens 缺少有效的 Fill.BG Opacity。");
  }

  const modes: readonly SymbolOutputMode[] = ["outline", "fill", "duotone"];

  return {
    ...(foreground === undefined ? {} : { colors: { foreground: [foreground] } }),
    styles: {
      duotone: {
        accentOpacity: bgOpacity / 100
      }
    },
    weights,
    modes
  };
}

async function loadWeightProfiles(directory: string): Promise<SymbolWeightProfilesConfigInput> {
  const files = await readTokenFiles<WidthTokenFile>(directory);
  const profiles: Partial<Record<ConfiguredWeight, { strokeWidth: number }>> = {};

  for (const tokens of files) {
    const modeName = normalizeModeName(readModeName(tokens));
    const weight = WEIGHT_NAMES.get(modeName);
    const strokeWidth = tokens.Width?.["Stroke Width"]?.$value;

    if (weight === undefined) {
      throw new Error(`无法识别 Width tokens 模式：${readModeName(tokens)}`);
    }
    if (typeof strokeWidth !== "number" || !Number.isFinite(strokeWidth) || strokeWidth <= 0) {
      throw new Error(`Width tokens 模式 ${readModeName(tokens)} 缺少有效的 Stroke Width。`);
    }

    profiles[weight] = { strokeWidth };
  }

  return profiles;
}

async function readTokenFiles<T>(directory: string): Promise<readonly T[]> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tokens.json"))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    throw new Error(`tokens 目录中没有 .tokens.json 文件：${directory}`);
  }

  return Promise.all(
    entries.map(
      async (entry) => JSON.parse(await readFile(join(directory, entry.name), "utf8")) as T
    )
  );
}

function readModeName(tokens: { readonly $extensions?: TokenExtensions }): string {
  const modeName = tokens.$extensions?.["com.figma.modeName"];
  if (typeof modeName !== "string" || modeName.length === 0) {
    throw new Error("tokens 文件缺少 com.figma.modeName。");
  }
  return modeName;
}

function normalizeModeName(value: string): string {
  return value.replaceAll(/[^a-z]/giu, "").toLowerCase();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
