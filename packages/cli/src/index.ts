#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import {
  compileSvgSymbol,
  generateSymbolSvgFiles,
  resolveCompilerConfig,
  type CompilerConfigInput,
  type SymbolOutputMode,
  type SymbolStyleProfileConfigInput,
  type SymbolStyleProfilesConfigInput,
  type SymbolWeightProfilesConfigInput
} from "@claralight-design/symbol-kit-compiler";
import {
  createCompiledSymbol,
  parseSymbolWeight,
  type CompiledSymbol
} from "@claralight-design/symbol-kit-core";

interface CliOptions {
  readonly input: string;
  readonly widthTokens: string;
  readonly styleTokens: string;
  readonly outDir: string;
  readonly name?: string;
  readonly flutterAssetsDir?: string;
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
    readonly Reverse?: {
      readonly $value?: {
        readonly hex?: unknown;
      };
    };
    readonly "Line Opacity"?: {
      readonly $value?: unknown;
    };
    readonly "Duotone Line Opacity"?: {
      readonly $value?: unknown;
    };
    readonly "BG Opacity"?: {
      readonly $value?: unknown;
    };
    readonly "NoFill BG Opacity"?: {
      readonly $value?: unknown;
    };
    readonly "NoDuo BG Opacity"?: {
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
  ["medium", "medium" as ConfiguredWeight]
]);

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (command !== "build") {
    throw new Error(
      "用法：symbol-kit build --input <svg> --width-tokens <目录> --style-tokens <目录> --out-dir <目录> [--name <名称>] [--flutter-assets-dir <目录>]"
    );
  }

  const options = parseOptions(args);
  const inputPath = resolve(options.input);
  const outDir = resolve(options.outDir);
  const inputStats = await stat(inputPath);
  const isDirectoryInput = inputStats.isDirectory();
  const [sources, config] = await Promise.all([
    readSvgSources(inputPath, options.name),
    loadCompilerConfig(resolve(options.widthTokens), resolve(options.styleTokens))
  ]);
  const targetWeights = Object.keys(config.weights ?? {}).map(parseSymbolWeight);
  const accentOpacity = resolveCompilerConfig({ project: config }).rendering.duotoneFillOpacity;
  const builds = sources.map((source) => {
    const compiled = compileSvgSymbol({
      name: source.name,
      svg: source.svg,
      config,
      targetWeights
    });
    const files =
      compiled.symbol === undefined
        ? []
        : generateSymbolSvgFiles(compiled.symbol, { accentOpacity });
    return { source, compiled, files };
  });
  const failures = builds.flatMap(({ source, compiled }) =>
    compiled.diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => `${source.name}: ${diagnostic.code}: ${diagnostic.message}`)
  );

  if (failures.length > 0) {
    throw new Error(`SVG 生成失败：\n${failures.join("\n")}`);
  }

  await Promise.all(
    builds.map(async ({ source, compiled, files }) => {
      const symbolOutDir = isDirectoryInput ? join(outDir, source.name) : outDir;
      if (compiled.symbol === undefined) {
        throw new Error(`Symbol IR 生成失败：${source.name}`);
      }
      const compiledSymbol = createCompiledSymbol(compiled.symbol);
      await rm(symbolOutDir, { recursive: true, force: true });
      await Promise.all(
        files.map(async (file) => {
          const outputPath = join(symbolOutDir, file.fileName);
          await mkdir(dirname(outputPath), { recursive: true });
          await writeFile(outputPath, `${file.svg}\n`, "utf8");
        })
      );
      await Promise.all([
        writeCompiledSymbol(symbolOutDir, compiledSymbol),
        writeManifest(symbolOutDir, source, files, `${source.name}.symbol.json`)
      ]);
    })
  );

  if (isDirectoryInput) {
    await mkdir(outDir, { recursive: true });
    await writeFile(
      join(outDir, "manifest.json"),
      `${JSON.stringify(
        {
          symbols: builds.map(({ source, files }) => ({
            name: source.name,
            source: source.path,
            variants: files.length,
            directory: source.name,
            symbol: `${source.name}/${source.name}.symbol.json`
          }))
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  if (options.flutterAssetsDir !== undefined) {
    const flutterAssetsDir = resolve(options.flutterAssetsDir);
    if (flutterAssetsDir === outDir) {
      throw new Error("--flutter-assets-dir 不能与 --out-dir 相同。");
    }
    const compiledSymbols = builds.map(({ source, compiled }) => {
      if (compiled.symbol === undefined) {
        throw new Error(`Symbol IR 生成失败：${source.name}`);
      }
      return createCompiledSymbol(compiled.symbol);
    });
    await writeFlutterAssets(flutterAssetsDir, compiledSymbols);
  }

  const fileCount = builds.reduce((total, build) => total + build.files.length, 0);
  process.stdout.write(
    `已生成 ${String(builds.length)} 个图标、${String(fileCount)} 个 SVG 和 ${String(builds.length)} 个 Symbol JSON：${outDir}\n`
  );
}

interface SvgSource {
  readonly name: string;
  readonly path: string;
  readonly svg: string;
}

async function readSvgSources(inputPath: string, name?: string): Promise<readonly SvgSource[]> {
  const inputStats = await stat(inputPath);

  if (inputStats.isFile()) {
    return [
      {
        name: name ?? basename(inputPath, ".svg"),
        path: inputPath,
        svg: await readFile(inputPath, "utf8")
      }
    ];
  }

  if (!inputStats.isDirectory()) {
    throw new Error(`构建输入必须是 SVG 文件或目录：${inputPath}`);
  }

  const entries = (await readdir(inputPath, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".svg"))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    throw new Error(`构建目录中没有 SVG 文件：${inputPath}`);
  }

  return Promise.all(
    entries.map(async (entry) => {
      const path = join(inputPath, entry.name);
      return {
        name: basename(entry.name, ".svg"),
        path,
        svg: await readFile(path, "utf8")
      };
    })
  );
}

async function writeManifest(
  outDir: string,
  source: SvgSource,
  files: readonly { readonly weight: string; readonly style: string; readonly fileName: string }[],
  symbolFile: string
): Promise<void> {
  const manifest = {
    name: source.name,
    source: source.path,
    symbol: symbolFile,
    variants: files.map(({ weight, style, fileName }) => ({
      weight,
      style,
      file: fileName
    }))
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function writeCompiledSymbol(outDir: string, symbol: CompiledSymbol): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(
    join(outDir, `${symbol.name}.symbol.json`),
    `${JSON.stringify(symbol, null, 2)}\n`,
    "utf8"
  );
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
  const flutterAssetsDir = values.get("flutter-assets-dir");

  return {
    input: requireOption(values, "input"),
    widthTokens: requireOption(values, "width-tokens"),
    styleTokens: requireOption(values, "style-tokens"),
    outDir: requireOption(values, "out-dir"),
    ...(name === undefined ? {} : { name }),
    ...(flutterAssetsDir === undefined ? {} : { flutterAssetsDir })
  };
}

async function writeFlutterAssets(
  assetsDir: string,
  symbols: readonly CompiledSymbol[]
): Promise<void> {
  await rm(assetsDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await Promise.all(
    symbols.map((symbol) =>
      writeFile(
        join(assetsDir, `${symbol.name}.symbol.json`),
        `${JSON.stringify(symbol, null, 2)}\n`,
        "utf8"
      )
    )
  );
  const catalog = {
    format: "claralight-symbol-catalog",
    version: 1,
    symbols: Object.fromEntries(
      [...symbols]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((symbol) => [symbol.name, `${symbol.name}.symbol.json`])
    )
  };
  await writeFile(
    join(assetsDir, "catalog.symbols.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8"
  );
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
  const styles = loadStyleProfiles(styleFiles);
  const foreground = unique(Object.values(styles).map((profile) => profile.color));
  const background = unique(Object.values(styles).map((profile) => profile.reverse)).filter(
    (color) => !foreground.some((foregroundColor) => sameColor(color, foregroundColor))
  );

  const modes = resolveOutputModes(styles);

  return {
    colors: { foreground, background },
    styles,
    weights,
    rendering: {
      duotoneFillOpacity: 0.2,
      fillFillOpacity: 1
    },
    modes
  };
}

function loadStyleProfiles(files: readonly StyleTokenFile[]): SymbolStyleProfilesConfigInput {
  const profiles: Record<string, SymbolStyleProfileConfigInput> = {};

  for (const tokens of files) {
    const name = normalizeModeName(readModeName(tokens));
    profiles[name] = {
      color: readColor(tokens, "Color"),
      reverse: readColor(tokens, "Reverse"),
      lineOpacity: readPercentage(tokens, "Line Opacity"),
      duotoneLineOpacity: readPercentage(tokens, "Duotone Line Opacity"),
      backgroundOpacity: readPercentage(tokens, "BG Opacity"),
      noFillBackgroundOpacity: readPercentage(tokens, "NoFill BG Opacity"),
      noDuotoneBackgroundOpacity: readPercentage(tokens, "NoDuo BG Opacity")
    };
  }

  if (profiles["normal"] === undefined) {
    throw new Error("缺少必需的 Style tokens 模式：normal");
  }

  return profiles;
}

function resolveOutputModes(styles: SymbolStyleProfilesConfigInput): readonly SymbolOutputMode[] {
  const modes: SymbolOutputMode[] = ["outline"];

  if (styles["fill"] !== undefined) {
    modes.push("fill");
  }
  if (styles["duotone"] !== undefined) {
    modes.push("duotone");
  }

  return modes;
}

function readColor(tokens: StyleTokenFile, name: "Color" | "Reverse"): string {
  const value = tokens.Fill?.[name]?.$value?.hex;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${readModeName(tokens)} tokens 缺少有效的 Fill.${name}。`);
  }
  return value;
}

type OpacityTokenName =
  "Line Opacity" | "Duotone Line Opacity" | "BG Opacity" | "NoFill BG Opacity" | "NoDuo BG Opacity";

function readPercentage(tokens: StyleTokenFile, name: OpacityTokenName): number {
  const value = tokens.Fill?.[name]?.$value;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${readModeName(tokens)} tokens 缺少有效的 Fill.${name}。`);
  }
  return value / 100;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function sameColor(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
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
