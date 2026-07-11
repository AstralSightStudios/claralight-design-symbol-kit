import type {
  SemanticColorRole,
  SemanticRole,
  SemanticSvgAst,
  SourcePaint,
  SourceSvgAst
} from "../ast/index.js";
import type { ResolvedCompilerConfig } from "../config/index.js";
import type { CompileDiagnostic } from "../diagnostics.js";

export interface SemanticClassificationResult {
  readonly semantic: SemanticSvgAst;
  readonly diagnostics: readonly CompileDiagnostic[];
}

export function classifySourceSvgAst(
  source: SourceSvgAst,
  config: ResolvedCompilerConfig
): SemanticSvgAst {
  return classifySourceSvgAstWithDiagnostics(source, config).semantic;
}

export function classifySourceSvgAstWithDiagnostics(
  source: SourceSvgAst,
  config: ResolvedCompilerConfig
): SemanticClassificationResult {
  const diagnostics: CompileDiagnostic[] = [];

  return {
    semantic: {
      name: source.name,
      viewBox: source.viewBox,
      paths: source.paths.map((path, index) => {
        const paint = resolveStrokeStyle(path.paint, config);
        const idClassification = classifySemanticId(path.id, paint, config);

        return {
          ...(path.id === undefined ? {} : { id: path.id }),
          d: path.d,
          path: path.path,
          paint,
          paintOrder: path.paintOrder,
          role: idClassification?.role ?? classifyPathRole(paint, config, index, diagnostics),
          colorRole: idClassification?.colorRole ?? classifyColorRole(path.id, paint, config)
        };
      })
    },
    diagnostics
  };
}

interface SemanticIdClassification {
  readonly role: SemanticRole;
  readonly colorRole: SemanticColorRole;
}

function classifySemanticId(
  id: string | undefined,
  paint: SourcePaint,
  config: ResolvedCompilerConfig
): SemanticIdClassification | undefined {
  if (!id?.startsWith(config.semanticIds.prefix)) {
    return undefined;
  }

  const segments = id.slice(config.semanticIds.prefix.length).split(config.semanticIds.separator);
  const roleName = segments[0];
  const colorRole = segments.includes(config.semanticIds.reverseModifier) ? "reverse" : "color";
  const roles = config.semanticIds.roles;

  if (roleName === roles.background) {
    return { role: "accent", colorRole };
  }
  if (roleName === roles.backgroundNoFill) {
    return { role: "background-no-fill", colorRole };
  }
  if (roleName === roles.backgroundNoDuotone) {
    return { role: "background-no-duotone", colorRole };
  }
  if (roleName === roles.duotoneLine) {
    return { role: "duotone-line", colorRole };
  }
  if (roleName === roles.line) {
    const opacity = getEffectiveOpacity(paint);
    return {
      role: matchesBuildOpacity(opacity, "lineOpacity", config) ? "line" : "primary",
      colorRole
    };
  }

  return undefined;
}

function classifyColorRole(
  id: string | undefined,
  paint: SourcePaint,
  config: ResolvedCompilerConfig
): SemanticColorRole {
  const segments = id?.split(config.semanticIds.separator) ?? [];
  if (segments.includes(config.semanticIds.reverseModifier)) {
    return "reverse";
  }

  const paints = [paint.fill, paint.stroke].filter(isClassifiablePaint);
  return paints.some((value) => matchesAnyPaint(value, config.colors.background))
    ? "reverse"
    : "color";
}

function classifyPathRole(
  paint: SourcePaint,
  config: ResolvedCompilerConfig,
  pathIndex: number,
  diagnostics: CompileDiagnostic[]
): SemanticRole {
  const fill = isClassifiablePaint(paint.fill) ? paint.fill : undefined;
  const stroke = isClassifiablePaint(paint.stroke) ? paint.stroke : undefined;

  if (fill === undefined && stroke === undefined) {
    diagnostics.push(
      createDiagnostic("semantic.paint-missing", pathIndex, "has no active fill or stroke")
    );
    return "unknown";
  }

  const roles: SemanticRole[] = [];

  if (fill !== undefined) {
    roles.push(classifyFill(fill, paint, config, pathIndex, diagnostics));
  }

  if (stroke !== undefined) {
    roles.push(classifyStroke(stroke, paint, config, pathIndex, diagnostics));
  }

  if (roles.includes("unknown")) {
    return "unknown";
  }

  const uniqueRoles = [...new Set(roles)];
  if (uniqueRoles.length === 1) {
    return uniqueRoles[0] ?? "unknown";
  }

  diagnostics.push(
    createDiagnostic(
      "semantic.mixed-paint-roles",
      pathIndex,
      `resolves to conflicting paint roles: ${uniqueRoles.join(", ")}`
    )
  );
  return "unknown";
}

function classifyFill(
  fill: string,
  paint: SourcePaint,
  config: ResolvedCompilerConfig,
  pathIndex: number,
  diagnostics: CompileDiagnostic[]
): SemanticRole {
  const opacity = paint.opacity * (paint.fillOpacity ?? 1);

  if (matchesOpacity(opacity, 0, config.opacity.tolerance)) {
    return "hidden";
  }

  if (matchesAnyPaint(fill, config.colors.background)) {
    if (matchesPrimaryOpacity(opacity, config)) {
      return "cutout";
    }

    diagnostics.push(createOpacityDiagnostic(pathIndex, opacity, config));
    return "unknown";
  }

  if (!matchesPrimaryColor(fill, config)) {
    diagnostics.push(createColorDiagnostic(pathIndex, fill));
    return "unknown";
  }

  const buildRole = classifyConfiguredFillOpacity(opacity, config);
  if (buildRole !== undefined) {
    return buildRole;
  }

  if (matchesPrimaryOpacity(opacity, config)) {
    return "primary";
  }

  const accentOpacities = getBackgroundOpacityTiers(config);
  if (accentOpacities.some((value) => matchesOpacity(opacity, value, config.opacity.tolerance))) {
    return "accent";
  }

  if (accentOpacities.length === 0 && opacity < config.opacity.secondaryThreshold) {
    return "secondary";
  }

  diagnostics.push(createOpacityDiagnostic(pathIndex, opacity, config));
  return "unknown";
}

function classifyStroke(
  stroke: string,
  paint: SourcePaint,
  config: ResolvedCompilerConfig,
  pathIndex: number,
  diagnostics: CompileDiagnostic[]
): SemanticRole {
  if (paint.strokeWidth === undefined || paint.strokeWidth <= 0) {
    diagnostics.push(
      createDiagnostic(
        paint.strokeWidth === undefined
          ? "semantic.stroke-width-missing"
          : "semantic.stroke-width-invalid",
        pathIndex,
        paint.strokeWidth === undefined
          ? "has a stroke without stroke-width"
          : `has invalid stroke-width ${String(paint.strokeWidth)}`
      )
    );
    return "unknown";
  }

  const opacity = paint.opacity * (paint.strokeOpacity ?? 1);
  if (matchesOpacity(opacity, 0, config.opacity.tolerance)) {
    return "hidden";
  }

  if (!matchesPrimaryColor(stroke, config)) {
    diagnostics.push(createColorDiagnostic(pathIndex, stroke));
    return "unknown";
  }

  if (matchesBuildOpacity(opacity, "duotoneLineOpacity", config)) {
    return "duotone-line";
  }
  if (matchesBuildOpacity(opacity, "lineOpacity", config)) {
    return "line";
  }

  if (!matchesPrimaryOpacity(opacity, config)) {
    diagnostics.push(createOpacityDiagnostic(pathIndex, opacity, config));
    return "unknown";
  }

  return "primary";
}

function classifyConfiguredFillOpacity(
  opacity: number,
  config: ResolvedCompilerConfig
): SemanticRole | undefined {
  if (matchesStyleOpacity(opacity, "noFillBackgroundOpacity", config)) {
    return "background-no-fill";
  }
  if (matchesStyleOpacity(opacity, "noDuotoneBackgroundOpacity", config)) {
    return "background-no-duotone";
  }
  if (matchesStyleOpacity(opacity, "backgroundOpacity", config)) {
    return "accent";
  }
  return undefined;
}

type StyleOpacityField =
  | "lineOpacity"
  | "duotoneLineOpacity"
  | "backgroundOpacity"
  | "noFillBackgroundOpacity"
  | "noDuotoneBackgroundOpacity";

function matchesBuildOpacity(
  value: number,
  field: StyleOpacityField,
  config: ResolvedCompilerConfig
): boolean {
  const expected = config.styles["build"]?.[field];
  return (
    expected !== undefined &&
    expected > 0 &&
    matchesOpacity(value, expected, config.opacity.tolerance)
  );
}

function matchesStyleOpacity(
  value: number,
  field: StyleOpacityField,
  config: ResolvedCompilerConfig
): boolean {
  return Object.values(config.styles).some((profile) => {
    const expected = profile[field];
    return expected > 0 && matchesOpacity(value, expected, config.opacity.tolerance);
  });
}

function getEffectiveOpacity(paint: SourcePaint): number {
  if (isClassifiablePaint(paint.stroke)) {
    return paint.opacity * (paint.strokeOpacity ?? 1);
  }
  return paint.opacity * (paint.fillOpacity ?? 1);
}

function resolveStrokeStyle(paint: SourcePaint, config: ResolvedCompilerConfig): SourcePaint {
  if (!isClassifiablePaint(paint.stroke)) {
    return paint;
  }

  return {
    ...paint,
    strokeLinecap: config.stroke.strokeLinecap ?? paint.strokeLinecap ?? "butt",
    strokeLinejoin: config.stroke.strokeLinejoin ?? paint.strokeLinejoin ?? "miter"
  };
}

function matchesPrimaryColor(value: string, config: ResolvedCompilerConfig): boolean {
  return config.colors.foreground.length === 0 || matchesAnyPaint(value, config.colors.foreground);
}

function isClassifiablePaint(value: string | undefined): value is string {
  return value !== undefined && normalizePaintValue(value) !== "none";
}

function matchesAnyPaint(value: string, configuredValues: readonly string[]): boolean {
  const normalizedValue = normalizePaintValue(value);
  return configuredValues.some(
    (configuredValue) => normalizePaintValue(configuredValue) === normalizedValue
  );
}

function matchesOpacity(value: number, expected: number, tolerance: number): boolean {
  return Math.abs(value - expected) <= tolerance;
}

function normalizePaintValue(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized === "black") {
    return "#000000";
  }
  if (normalized === "white") {
    return "#ffffff";
  }

  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/u.exec(normalized);
  if (shortHex !== null) {
    const [, red, green, blue] = shortHex;
    if (red !== undefined && green !== undefined && blue !== undefined) {
      return `#${red}${red}${green}${green}${blue}${blue}`;
    }
  }

  return normalized;
}

function createColorDiagnostic(pathIndex: number, color: string): CompileDiagnostic {
  return createDiagnostic(
    "semantic.paint-color-mismatch",
    pathIndex,
    `uses unconfigured paint color "${color}"`
  );
}

function createOpacityDiagnostic(
  pathIndex: number,
  opacity: number,
  config: ResolvedCompilerConfig
): CompileDiagnostic {
  const expected = [
    0,
    config.opacity.full,
    ...getPrimaryOpacityTiers(config),
    ...getBackgroundOpacityTiers(config)
  ];

  return createDiagnostic(
    "semantic.opacity-mismatch",
    pathIndex,
    `uses opacity ${String(opacity)}; expected one of ${[...new Set(expected)].join(", ")}`
  );
}

function matchesPrimaryOpacity(value: number, config: ResolvedCompilerConfig): boolean {
  return getPrimaryOpacityTiers(config).some((expected) =>
    matchesOpacity(value, expected, config.opacity.tolerance)
  );
}

function getPrimaryOpacityTiers(config: ResolvedCompilerConfig): readonly number[] {
  return uniqueVisibleOpacities([
    config.opacity.full,
    ...Object.values(config.styles).flatMap((profile) => [
      profile.lineOpacity,
      profile.duotoneLineOpacity
    ])
  ]);
}

function getBackgroundOpacityTiers(config: ResolvedCompilerConfig): readonly number[] {
  return uniqueVisibleOpacities(
    Object.values(config.styles).flatMap((profile) => [
      profile.backgroundOpacity,
      profile.noFillBackgroundOpacity,
      profile.noDuotoneBackgroundOpacity
    ])
  );
}

function uniqueVisibleOpacities(values: readonly number[]): readonly number[] {
  return [...new Set(values.filter((value) => value > 0))];
}

function createDiagnostic(code: string, pathIndex: number, detail: string): CompileDiagnostic {
  return {
    severity: "error",
    code,
    message: `Path ${String(pathIndex)} ${detail}.`
  };
}

export { inferSymbolWeight } from "./weight.js";
export type { SymbolWeightInferenceResult } from "./weight.js";
