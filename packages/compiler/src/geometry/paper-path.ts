import paper from "paper";
import { PaperOffset } from "paperjs-offset";

import type { SourcePaint, SourceStrokeLinecap, SourceStrokeLinejoin } from "../ast/index.js";

export interface GeometryPathInput {
  readonly d: string;
  readonly paint: SourcePaint;
  readonly strokeWidth: number;
  readonly filledStrokeWidth?: number;
}

export function initializeGeometry(width: number, height: number): void {
  paper.setup(new paper.Size(width, height));
}

export function materializePath(input: GeometryPathInput): paper.PathItem | undefined {
  const source = createPath(input.d);
  const hasFill = isActivePaint(input.paint.fill);
  const hasStroke = isActivePaint(input.paint.stroke);
  let result: paper.PathItem | undefined;

  if (hasFill) {
    result = source.clone({ insert: false });
  }

  if (hasStroke) {
    result = mergePathItems(result, outlineStroke(source, input.strokeWidth, input.paint));
  } else if (hasFill && input.filledStrokeWidth !== undefined && input.filledStrokeWidth > 0) {
    result?.remove();
    result = PaperOffset.offset(source, input.filledStrokeWidth / 2, {
      join: "round",
      insert: false,
      algorithm: "legacy"
    });
  }

  source.remove();
  return result;
}

export function unitePathItems(items: readonly paper.PathItem[]): paper.PathItem | undefined {
  return items.reduce<paper.PathItem | undefined>(
    (result, item) => mergePathItems(result, item),
    undefined
  );
}

export function subtractPathItem(subject: paper.PathItem, operand: paper.PathItem): paper.PathItem {
  const result = subject.subtract(operand, { insert: false, trace: true });
  subject.remove();
  operand.remove();
  return result;
}

export function serializePath(item: paper.PathItem): string {
  const reduced = item.reduce({ simplify: true }) as paper.PathItem;
  const pathData: string = reduced.pathData;

  if (reduced !== item) {
    reduced.remove();
  }

  return pathData;
}

function createPath(d: string): paper.Path | paper.CompoundPath {
  return new paper.CompoundPath({ pathData: d, insert: false });
}

function outlineStroke(
  path: paper.Path | paper.CompoundPath,
  strokeWidth: number,
  paint: Pick<SourcePaint, "strokeLinecap" | "strokeLinejoin">
): paper.PathItem {
  return PaperOffset.offsetStroke(path, strokeWidth / 2, {
    cap: mapStrokeCap(paint.strokeLinecap),
    join: mapStrokeJoin(paint.strokeLinejoin),
    insert: false,
    algorithm: "legacy"
  });
}

function mergePathItems(left: paper.PathItem | undefined, right: paper.PathItem): paper.PathItem {
  if (left === undefined) {
    return right;
  }

  const result = left.unite(right, { insert: false });
  left.remove();
  right.remove();
  return result;
}

function mapStrokeCap(value: SourceStrokeLinecap | undefined): "round" | "butt" {
  return value === "round" ? "round" : "butt";
}

function mapStrokeJoin(value: SourceStrokeLinejoin | undefined): "round" | "bevel" | "miter" {
  return value ?? "miter";
}

function isActivePaint(value: string | undefined): boolean {
  return value !== undefined && value.trim().toLowerCase() !== "none";
}
