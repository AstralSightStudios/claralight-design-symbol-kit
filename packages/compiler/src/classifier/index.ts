import type { SemanticRole, SemanticSvgAst, SourcePaint, SourceSvgAst } from "../ast/index.js";
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

        return {
          ...(path.id === undefined ? {} : { id: path.id }),
          d: path.d,
          path: path.path,
          paint,
          paintOrder: path.paintOrder,
          role: classifyPathRole(paint, config, index, diagnostics)
        };
      })
    },
    diagnostics
  };
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

  if (matchesAnyPaint(fill, config.colors.background)) {
    if (matchesOpacity(opacity, config.opacity.full, config.opacity.tolerance)) {
      return "cutout";
    }

    diagnostics.push(createOpacityDiagnostic(pathIndex, opacity, config));
    return "unknown";
  }

  if (!matchesPrimaryColor(fill, config)) {
    diagnostics.push(createColorDiagnostic(pathIndex, fill));
    return "unknown";
  }

  if (matchesOpacity(opacity, config.opacity.full, config.opacity.tolerance)) {
    return "primary";
  }

  const accentOpacities = Object.values(config.styles).map((profile) => profile.accentOpacity);
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

  if (!matchesPrimaryColor(stroke, config)) {
    diagnostics.push(createColorDiagnostic(pathIndex, stroke));
    return "unknown";
  }

  const opacity = paint.opacity * (paint.strokeOpacity ?? 1);
  if (!matchesOpacity(opacity, config.opacity.full, config.opacity.tolerance)) {
    diagnostics.push(createOpacityDiagnostic(pathIndex, opacity, config));
    return "unknown";
  }

  return "primary";
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
    config.opacity.full,
    ...Object.values(config.styles).map((profile) => profile.accentOpacity)
  ];

  return createDiagnostic(
    "semantic.opacity-mismatch",
    pathIndex,
    `uses opacity ${String(opacity)}; expected one of ${[...new Set(expected)].join(", ")}`
  );
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
