import type { SymbolWeightProfilesConfigInput } from "../config/index.js";
import type { MaterializedVariantGeometry } from "../ir/index.js";
import { parsePathData } from "../parser/index.js";
import type { RenderingLayerKind, RenderingPathNode } from "../rendering/index.js";
import { lowerPathAst } from "./lowering/index.js";
import type { GeometryMaterializationInput, GeometryMaterializer } from "./materializer.js";
import {
  initializeGeometry,
  materializePath,
  serializePath,
  subtractPathItem,
  unitePathItems
} from "./paper-path.js";
import type { GeometryPath, GeometryRegion } from "./types.js";

type PaperPathItem = NonNullable<ReturnType<typeof materializePath>>;

export interface PaperGeometryMaterializerOptions {
  readonly sourceStrokeWidth: number;
  readonly weights: SymbolWeightProfilesConfigInput;
}

export function createPaperGeometryMaterializer(
  options: PaperGeometryMaterializerOptions
): GeometryMaterializer {
  return {
    materialize(input) {
      initializeGeometry(input.rendering.viewBox.width, input.rendering.viewBox.height);
      const targetStrokeWidth = requireStrokeWidth(input, options);

      switch (input.rendering.kind) {
        case "fill":
          return materializeFill(input, targetStrokeWidth, options.sourceStrokeWidth);
        case "outline":
          return {
            primary: materializeLayer(
              findLayerPaths(input, "primary"),
              targetStrokeWidth,
              options.sourceStrokeWidth,
              true
            )
          };
        case "duotone": {
          const primary = materializeLayer(
            findLayerPaths(input, "primary"),
            targetStrokeWidth,
            options.sourceStrokeWidth,
            true
          );
          const accentPaths = findLayerPaths(input, "accent");

          return accentPaths.length === 0
            ? { primary }
            : {
                primary,
                accent: materializeLayer(
                  accentPaths,
                  targetStrokeWidth,
                  options.sourceStrokeWidth,
                  false
                )
              };
        }
      }
    }
  };
}

function materializeFill(
  input: GeometryMaterializationInput,
  targetStrokeWidth: number,
  sourceStrokeWidth: number
): MaterializedVariantGeometry {
  const foreground = unitePathItems(
    materializePathItems(
      findLayerPaths(input, "foreground"),
      targetStrokeWidth,
      sourceStrokeWidth,
      true
    )
  );
  const background = unitePathItems(
    materializePathItems(
      findLayerPaths(input, "background"),
      targetStrokeWidth,
      sourceStrokeWidth,
      false
    )
  );

  if (foreground === undefined) {
    background?.remove();
    return { primary: { paths: [] } };
  }

  const result = background === undefined ? foreground : subtractPathItem(foreground, background);
  return { primary: createGeometryRegion([result]) };
}

function materializeLayer(
  paths: readonly RenderingPathNode[],
  targetStrokeWidth: number,
  sourceStrokeWidth: number,
  thickenFilledPaths: boolean
): GeometryRegion {
  return createGeometryRegion(
    materializePathItems(paths, targetStrokeWidth, sourceStrokeWidth, thickenFilledPaths)
  );
}

function materializePathItems(
  paths: readonly RenderingPathNode[],
  targetStrokeWidth: number,
  sourceStrokeWidth: number,
  thickenFilledPaths: boolean
): readonly PaperPathItem[] {
  return paths.flatMap((path) => {
    const geometry = materializePath({
      d: path.d,
      paint: path.paint,
      strokeWidth: targetStrokeWidth,
      ...(thickenFilledPaths && targetStrokeWidth > sourceStrokeWidth
        ? { filledStrokeWidth: targetStrokeWidth - sourceStrokeWidth }
        : {})
    });

    return geometry === undefined ? [] : [geometry];
  });
}

function createGeometryRegion(items: readonly PaperPathItem[]): GeometryRegion {
  return {
    paths: items.flatMap(createGeometryPath)
  };
}

function createGeometryPath(item: PaperPathItem): readonly GeometryPath[] {
  const pathData = serializePath(item);
  item.remove();

  return pathData.trim().length === 0 ? [] : [lowerPathAst(parsePathData(pathData))];
}

function findLayerPaths(
  input: GeometryMaterializationInput,
  kind: RenderingLayerKind
): readonly RenderingPathNode[] {
  return input.rendering.layers
    .filter((layer) => layer.kind === kind)
    .flatMap((layer) => layer.paths);
}

function requireStrokeWidth(
  input: GeometryMaterializationInput,
  options: PaperGeometryMaterializerOptions
): number {
  const strokeWidth = options.weights[input.weight]?.strokeWidth;
  if (strokeWidth === undefined) {
    throw new Error(`Paper geometry materializer weight profile is missing: ${input.weight}.`);
  }

  return strokeWidth;
}
