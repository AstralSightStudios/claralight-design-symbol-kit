import { describe, expect, it } from "vitest";

import {
  NoopGeometryProcessor,
  type GeometryPath,
  type GeometryProcessor,
  type GeometryRegion
} from "../index.js";

const path: GeometryPath = {
  commands: [
    {
      type: "move",
      point: { x: 0, y: 0 }
    },
    {
      type: "line",
      point: { x: 10, y: 0 }
    },
    {
      type: "cubic",
      controlPoint1: { x: 10, y: 4 },
      controlPoint2: { x: 4, y: 10 },
      point: { x: 0, y: 10 }
    },
    {
      type: "close"
    }
  ]
};

const region: GeometryRegion = {
  paths: [path]
};

describe("geometry", () => {
  it("represents normalized paths with geometry-only commands", () => {
    expect(path.commands.map((command) => command.type)).toEqual([
      "move",
      "line",
      "cubic",
      "close"
    ]);
  });

  it("defines the geometry processor contract", () => {
    const processor: GeometryProcessor = {
      expandStroke: () => region,
      union: () => region,
      subtract: () => region
    };

    expect(processor.expandStroke(path, 2)).toBe(region);
    expect(processor.union([region])).toBe(region);
    expect(processor.subtract(region, region)).toBe(region);
  });

  it("fails explicitly when the noop backend is used", () => {
    const processor: GeometryProcessor = new NoopGeometryProcessor();
    const error = "Geometry backend is not implemented";

    expect(() => processor.expandStroke(path, 2)).toThrow(error);
    expect(() => processor.union([region])).toThrow(error);
    expect(() => processor.subtract(region, region)).toThrow(error);
  });
});
