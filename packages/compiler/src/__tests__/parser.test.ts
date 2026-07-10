import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parsePathData, parseSvgSource } from "../index.js";

const creditCardSvg = readFileSync(
  new URL("../../../../test/CreditCard.svg", import.meta.url),
  "utf8"
);

describe("parseSvgSource", () => {
  it("parses the CreditCard SVG fixture into SourceSvgAst", () => {
    const source = parseSvgSource({
      name: "CreditCard",
      svg: creditCardSvg
    });

    expect(source.name).toBe("CreditCard");
    expect(source.viewBox).toEqual({ x: 0, y: 0, width: 32, height: 32 });
    expect(source.paths).toHaveLength(4);
    expect(source.paths.map((path) => path.paintOrder)).toEqual([0, 1, 2, 3]);
    expect(source.paths[0]?.paint).toEqual({ fill: "black", opacity: 0.2 });
    expect(source.paths[0]?.path.commands).toHaveLength(12);
    expect(source.paths[2]?.paint).toEqual({
      fill: "none",
      stroke: "black",
      strokeWidth: 0.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      opacity: 1
    });
  });

  it("parses supported paint attributes and inherited svg values", () => {
    const source = parseSvgSource({
      name: "paint",
      svg: [
        '<svg viewBox="-1,-2,32,24" fill="#111111" stroke="#222222"',
        ' stroke-width="2" opacity="0.5" fill-opacity="0.4">',
        '<path id="shape" d="M0 0L1 1Z" opacity="0.5" stroke-opacity="0.3"/>',
        "</svg>"
      ].join("")
    });

    expect(source.paths[0]).toEqual({
      id: "shape",
      d: "M0 0L1 1Z",
      path: parsePathData("M0 0L1 1Z"),
      paint: {
        fill: "#111111",
        stroke: "#222222",
        strokeWidth: 2,
        opacity: 0.25,
        fillOpacity: 0.4,
        strokeOpacity: 0.3
      },
      paintOrder: 0
    });
  });

  it("rejects invalid SVG roots and viewBox values", () => {
    expect(() => parseSvgSource({ name: "missing-root", svg: "<path />" })).toThrow(
      "SVG source must contain an svg root element."
    );
    expect(() =>
      parseSvgSource({ name: "missing-view-box", svg: "<svg><path d='M0 0Z'/></svg>" })
    ).toThrow("SVG root requires a viewbox attribute.");
  });
});

describe("parsePathData", () => {
  it("parses required absolute and relative commands", () => {
    const path = parsePathData(
      [
        "M1 2 3 4L5 6H7V8C9 10 11 12 13 14Q15 16 17 18Z",
        "m1 2 3 4l5 6h7v8c9 10 11 12 13 14q15 16 17 18z"
      ].join("")
    );

    expect(path.commands.map((command) => command.type)).toEqual([
      "move",
      "line",
      "line",
      "horizontalLine",
      "verticalLine",
      "cubicCurve",
      "quadraticCurve",
      "close",
      "move",
      "line",
      "line",
      "horizontalLine",
      "verticalLine",
      "cubicCurve",
      "quadraticCurve",
      "close"
    ]);
    expect(path.commands[0]).toMatchObject({ relative: false, point: { x: 1, y: 2 } });
    expect(path.commands[8]).toMatchObject({ relative: true, point: { x: 1, y: 2 } });
  });

  it("parses every path from the CreditCard SVG fixture", () => {
    const source = parseSvgSource({ name: "CreditCard", svg: creditCardSvg });
    const paths = source.paths.map((path) => path.path);

    expect(paths.map((path) => path.commands.length)).toEqual([12, 176, 2, 4]);
    expect(paths[0]?.commands.map((command) => command.type)).toContain("cubicCurve");
    expect(paths[3]?.commands.filter((command) => command.type === "move")).toHaveLength(2);
  });

  it("rejects arc commands explicitly", () => {
    expect(() => parsePathData("M0 0A10 10 0 0 1 20 20")).toThrow(
      "SVG path arc commands are not supported: A."
    );
    expect(() => parsePathData("m0 0a10 10 0 0 1 20 20")).toThrow(
      "SVG path arc commands are not supported: a."
    );
  });

  it("rejects incomplete and unsupported commands", () => {
    expect(() => parsePathData("M0 0L10")).toThrow(
      "SVG path command L requires parameter groups of 2."
    );
    expect(() => parsePathData("M0 0S1 2 3 4")).toThrow("Unsupported SVG path command: S.");
  });
});
