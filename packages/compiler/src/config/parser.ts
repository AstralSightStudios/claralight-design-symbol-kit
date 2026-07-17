import { isSymbolWeight } from "@claralight-design/symbol-kit-core";

import type {
  CompilerConfigInput,
  SymbolOutputMode,
  SymbolStyleProfileConfigInput,
  SymbolVariantCombination,
  SymbolWeightProfileConfigInput
} from "./schema.js";

export function parseCompilerConfigInput(value: unknown): CompilerConfigInput {
  const input = readRecord(value, "Compiler config");
  return {
    ...(input["blacklist"] === undefined ? {} : { blacklist: parseBlacklist(input["blacklist"]) }),
    ...(input["colors"] === undefined ? {} : { colors: parseColors(input["colors"]) }),
    ...(input["opacity"] === undefined ? {} : { opacity: parseOpacity(input["opacity"]) }),
    ...(input["outline"] === undefined ? {} : { outline: parseOutline(input["outline"]) }),
    ...(input["styles"] === undefined ? {} : { styles: parseStyles(input["styles"]) }),
    ...(input["weights"] === undefined ? {} : { weights: parseWeights(input["weights"]) }),
    ...(input["rendering"] === undefined ? {} : { rendering: parseRendering(input["rendering"]) }),
    ...(input["semanticIds"] === undefined
      ? {}
      : { semanticIds: parseSemanticIds(input["semanticIds"]) }),
    ...(input["stroke"] === undefined ? {} : { stroke: parseStroke(input["stroke"]) }),
    ...(input["modes"] === undefined ? {} : { modes: parseModes(input["modes"]) })
  };
}

function parseBlacklist(value: unknown): NonNullable<CompilerConfigInput["blacklist"]> {
  const input = readRecord(value, "blacklist");
  const iconsInput =
    input["icons"] === undefined ? {} : readRecord(input["icons"], "blacklist.icons");
  const icons: Record<string, readonly SymbolVariantCombination[]> = {};
  for (const [name, combinations] of Object.entries(iconsInput)) {
    icons[name] = parseCombinations(combinations, `blacklist.icons.${name}`);
  }
  return {
    ...(input["combinations"] === undefined
      ? {}
      : { combinations: parseCombinations(input["combinations"], "blacklist.combinations") }),
    ...(input["icons"] === undefined ? {} : { icons })
  };
}

function parseCombinations(value: unknown, label: string): readonly SymbolVariantCombination[] {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array.`);
  }
  return value.map((entry, index) => {
    const combination = readRecord(entry, `${label}[${String(index)}]`);
    const weight = readString(combination["weight"], `${label}[${String(index)}].weight`);
    const mode = readString(combination["mode"], `${label}[${String(index)}].mode`);
    if (!isSymbolWeight(weight)) {
      throw new TypeError(`${label}[${String(index)}].weight is invalid.`);
    }
    if (!isOutputMode(mode)) {
      throw new TypeError(`${label}[${String(index)}].mode is invalid.`);
    }
    return { weight, mode };
  });
}

function parseColors(value: unknown): NonNullable<CompilerConfigInput["colors"]> {
  const input = readRecord(value, "colors");
  return {
    ...(input["foreground"] === undefined
      ? {}
      : { foreground: readStringArray(input["foreground"], "colors.foreground") }),
    ...(input["background"] === undefined
      ? {}
      : { background: readStringArray(input["background"], "colors.background") })
  };
}

function parseOpacity(value: unknown): NonNullable<CompilerConfigInput["opacity"]> {
  const input = readRecord(value, "opacity");
  return parseNumberFields(input, "opacity", ["full", "tolerance", "secondaryThreshold"]);
}

function parseOutline(value: unknown): NonNullable<CompilerConfigInput["outline"]> {
  const input = readRecord(value, "outline");
  const foreground = input["foreground"];
  if (foreground === undefined) {
    return {};
  }
  if (foreground !== "drop" && foreground !== "convert-to-background") {
    throw new TypeError("outline.foreground is invalid.");
  }
  return { foreground };
}

function parseStyles(value: unknown): NonNullable<CompilerConfigInput["styles"]> {
  const input = readRecord(value, "styles");
  return Object.fromEntries(
    Object.entries(input).map(([name, profile]) => [name, parseStyleProfile(profile, name)])
  );
}

function parseStyleProfile(value: unknown, name: string): SymbolStyleProfileConfigInput {
  const input = readRecord(value, `styles.${name}`);
  return {
    color: readString(input["color"], `styles.${name}.color`),
    reverse: readString(input["reverse"], `styles.${name}.reverse`),
    lineOpacity: readNumber(input["lineOpacity"], `styles.${name}.lineOpacity`),
    duotoneLineOpacity: readNumber(
      input["duotoneLineOpacity"],
      `styles.${name}.duotoneLineOpacity`
    ),
    ...(input["noFillLineOpacity"] === undefined
      ? {}
      : {
          noFillLineOpacity: readNumber(
            input["noFillLineOpacity"],
            `styles.${name}.noFillLineOpacity`
          )
        }),
    ...(input["noDuotoneLineOpacity"] === undefined
      ? {}
      : {
          noDuotoneLineOpacity: readNumber(
            input["noDuotoneLineOpacity"],
            `styles.${name}.noDuotoneLineOpacity`
          )
        }),
    ...(input["onlyFillLineOpacity"] === undefined
      ? {}
      : {
          onlyFillLineOpacity: readNumber(
            input["onlyFillLineOpacity"],
            `styles.${name}.onlyFillLineOpacity`
          )
        }),
    ...(input["onlyDuotoneLineOpacity"] === undefined
      ? {}
      : {
          onlyDuotoneLineOpacity: readNumber(
            input["onlyDuotoneLineOpacity"],
            `styles.${name}.onlyDuotoneLineOpacity`
          )
        }),
    backgroundOpacity: readNumber(input["backgroundOpacity"], `styles.${name}.backgroundOpacity`),
    noFillBackgroundOpacity: readNumber(
      input["noFillBackgroundOpacity"],
      `styles.${name}.noFillBackgroundOpacity`
    ),
    noDuotoneBackgroundOpacity: readNumber(
      input["noDuotoneBackgroundOpacity"],
      `styles.${name}.noDuotoneBackgroundOpacity`
    )
  };
}

function parseWeights(value: unknown): NonNullable<CompilerConfigInput["weights"]> {
  const input = readRecord(value, "weights");
  const profiles: Record<string, SymbolWeightProfileConfigInput> = {};
  for (const [name, profileValue] of Object.entries(input)) {
    if (!isSymbolWeight(name)) {
      throw new TypeError(`weights.${name} is invalid.`);
    }
    const profile = readRecord(profileValue, `weights.${name}`);
    profiles[name] = {
      strokeWidth: readNumber(profile["strokeWidth"], `weights.${name}.strokeWidth`),
      ...(profile["tolerance"] === undefined
        ? {}
        : { tolerance: readNumber(profile["tolerance"], `weights.${name}.tolerance`) })
    };
  }
  return profiles;
}

function parseRendering(value: unknown): NonNullable<CompilerConfigInput["rendering"]> {
  return parseNumberFields(readRecord(value, "rendering"), "rendering", [
    "duotoneFillOpacity",
    "fillFillOpacity"
  ]);
}

function parseSemanticIds(value: unknown): NonNullable<CompilerConfigInput["semanticIds"]> {
  const input = readRecord(value, "semanticIds");
  const roles =
    input["roles"] === undefined
      ? undefined
      : parseStringFields(readRecord(input["roles"], "semanticIds.roles"), "semanticIds.roles", [
          "line",
          "duotoneLine",
          "lineNoFill",
          "lineNoDuotone",
          "lineOnlyFill",
          "lineOnlyDuotone",
          "background",
          "backgroundNoFill",
          "backgroundNoDuotone"
        ]);
  return {
    ...parseStringFields(input, "semanticIds", ["prefix", "separator", "reverseModifier"]),
    ...(roles === undefined ? {} : { roles })
  };
}

function parseStroke(value: unknown): NonNullable<CompilerConfigInput["stroke"]> {
  const input = readRecord(value, "stroke");
  const strokeLinecap = input["strokeLinecap"];
  const strokeLinejoin = input["strokeLinejoin"];
  if (
    strokeLinecap !== undefined &&
    strokeLinecap !== "butt" &&
    strokeLinecap !== "round" &&
    strokeLinecap !== "square"
  ) {
    throw new TypeError("stroke.strokeLinecap is invalid.");
  }
  if (
    strokeLinejoin !== undefined &&
    strokeLinejoin !== "miter" &&
    strokeLinejoin !== "round" &&
    strokeLinejoin !== "bevel"
  ) {
    throw new TypeError("stroke.strokeLinejoin is invalid.");
  }
  return {
    ...(strokeLinecap === undefined ? {} : { strokeLinecap }),
    ...(strokeLinejoin === undefined ? {} : { strokeLinejoin })
  };
}

function parseModes(value: unknown): readonly SymbolOutputMode[] {
  if (!Array.isArray(value)) {
    throw new TypeError("modes must be an array.");
  }
  return value.map((mode, index) => {
    if (typeof mode !== "string" || !isOutputMode(mode)) {
      throw new TypeError(`modes[${String(index)}] is invalid.`);
    }
    return mode;
  });
}

function parseNumberFields<const T extends readonly string[]>(
  input: Readonly<Record<string, unknown>>,
  label: string,
  fields: T
): Partial<Record<T[number], number>> {
  return Object.fromEntries(
    fields.flatMap((field) =>
      input[field] === undefined
        ? []
        : [[field, readNumber(input[field], `${label}.${field}`)] as const]
    )
  ) as Partial<Record<T[number], number>>;
}

function parseStringFields<const T extends readonly string[]>(
  input: Readonly<Record<string, unknown>>,
  label: string,
  fields: T
): Partial<Record<T[number], string>> {
  return Object.fromEntries(
    fields.flatMap((field) =>
      input[field] === undefined
        ? []
        : [[field, readString(input[field], `${label}.${field}`)] as const]
    )
  ) as Partial<Record<T[number], string>>;
}

function readRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }
  return value;
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function readStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new TypeError(`${label} must be an array of strings.`);
  }
  return value;
}

function isOutputMode(value: string): value is SymbolOutputMode {
  return value === "outline" || value === "fill" || value === "duotone";
}
