import {
  TLDRAW_SHAPE_TYPES,
  TLDRAW_COLORS,
  TLDRAW_GEO_TYPES,
  TLDRAW_FILLS,
  TLDRAW_DASHES,
  TLDRAW_SIZES,
  TLDRAW_FONTS,
  TLDRAW_ALIGNS,
  TLDRAW_ARROWHEADS,
  COLOR_MAPPING,
  SHAPE_TYPE_ALIASES,
} from "../lib/constants";

describe("constants", () => {
  it("TLDRAW_SHAPE_TYPES contains all 13 shape types", () => {
    const expected = [
      "arrow", "bookmark", "draw", "embed", "frame",
      "geo", "group", "highlight", "image", "line",
      "note", "text", "video",
    ];
    expect([...TLDRAW_SHAPE_TYPES].sort()).toEqual(expected.sort());
    expect(TLDRAW_SHAPE_TYPES.length).toBe(13);
  });

  it("TLDRAW_COLORS has 13 colors", () => {
    expect(TLDRAW_COLORS.length).toBe(13);
    expect(TLDRAW_COLORS).toContain("black");
    expect(TLDRAW_COLORS).toContain("blue");
    expect(TLDRAW_COLORS).toContain("red");
    expect(TLDRAW_COLORS).toContain("light-blue");
  });

  it("TLDRAW_GEO_TYPES has known geometry types", () => {
    expect(TLDRAW_GEO_TYPES.length).toBeGreaterThanOrEqual(18);
    expect(TLDRAW_GEO_TYPES).toContain("rectangle");
    expect(TLDRAW_GEO_TYPES).toContain("ellipse");
    expect(TLDRAW_GEO_TYPES).toContain("triangle");
    expect(TLDRAW_GEO_TYPES).toContain("diamond");
    expect(TLDRAW_GEO_TYPES).toContain("star");
    expect(TLDRAW_GEO_TYPES).toContain("rhombus");
    expect(TLDRAW_GEO_TYPES).toContain("hexagon");
    expect(TLDRAW_GEO_TYPES).toContain("octagon");
    expect(TLDRAW_GEO_TYPES).toContain("cloud");
    expect(TLDRAW_GEO_TYPES).toContain("heart");
    expect(TLDRAW_GEO_TYPES).toContain("x-box");
    expect(TLDRAW_GEO_TYPES).toContain("check-box");
    expect(TLDRAW_GEO_TYPES).toContain("arrow-left");
    expect(TLDRAW_GEO_TYPES).toContain("arrow-right");
    expect(TLDRAW_GEO_TYPES).toContain("arrow-up");
    expect(TLDRAW_GEO_TYPES).toContain("arrow-down");
    expect(TLDRAW_GEO_TYPES).toContain("oval");
    expect(TLDRAW_GEO_TYPES).toContain("trapezoid");
  });

  it("TLDRAW_FILLS has known fill values", () => {
    expect(TLDRAW_FILLS).toContain("none");
    expect(TLDRAW_FILLS).toContain("semi");
    expect(TLDRAW_FILLS).toContain("solid");
    expect(TLDRAW_FILLS).toContain("pattern");
  });

  it("TLDRAW_DASHES has known dash values", () => {
    expect(TLDRAW_DASHES).toContain("draw");
    expect(TLDRAW_DASHES).toContain("solid");
    expect(TLDRAW_DASHES).toContain("dashed");
    expect(TLDRAW_DASHES).toContain("dotted");
  });

  it("TLDRAW_SIZES has s/m/l/xl", () => {
    expect(TLDRAW_SIZES).toEqual(expect.arrayContaining(["s", "m", "l", "xl"]));
  });

  it("TLDRAW_FONTS has known font families", () => {
    expect(TLDRAW_FONTS).toContain("draw");
    expect(TLDRAW_FONTS).toContain("sans");
    expect(TLDRAW_FONTS).toContain("serif");
    expect(TLDRAW_FONTS).toContain("mono");
  });

  it("TLDRAW_ALIGNS has start/middle/end", () => {
    expect(TLDRAW_ALIGNS).toContain("start");
    expect(TLDRAW_ALIGNS).toContain("middle");
    expect(TLDRAW_ALIGNS).toContain("end");
  });

  it("TLDRAW_ARROWHEADS has known arrowhead types", () => {
    expect(TLDRAW_ARROWHEADS).toContain("none");
    expect(TLDRAW_ARROWHEADS).toContain("arrow");
    expect(TLDRAW_ARROWHEADS).toContain("triangle");
    expect(TLDRAW_ARROWHEADS).toContain("diamond");
  });

  it("COLOR_MAPPING maps all aliases to valid tldraw colors", () => {
    for (const [alias, target] of Object.entries(COLOR_MAPPING)) {
      expect(typeof alias).toBe("string");
      expect(TLDRAW_COLORS).toContain(target);
    }
  });

  it("COLOR_MAPPING has expected aliases", () => {
    expect(COLOR_MAPPING.purple).toBe("violet");
    expect(COLOR_MAPPING.pink).toBe("light-red");
    expect(COLOR_MAPPING.cyan).toBe("light-blue");
    expect(COLOR_MAPPING.navy).toBe("blue");
  });

  it("SHAPE_TYPE_ALIASES maps all aliases to valid shape types", () => {
    for (const [alias, target] of Object.entries(SHAPE_TYPE_ALIASES)) {
      expect(typeof alias).toBe("string");
      expect(TLDRAW_SHAPE_TYPES).toContain(target);
    }
  });

  it("SHAPE_TYPE_ALIASES has expected aliases", () => {
    expect(SHAPE_TYPE_ALIASES.rectangle).toBe("geo");
    expect(SHAPE_TYPE_ALIASES.circle).toBe("geo");
    expect(SHAPE_TYPE_ALIASES.box).toBe("geo");
    expect(SHAPE_TYPE_ALIASES.triangle).toBe("geo");
  });

  it("all const arrays are readonly (frozen at type level)", () => {
    // TypeScript const assertions make these readonly,
    // but we verify they are still arrays at runtime
    expect(Array.isArray(TLDRAW_SHAPE_TYPES)).toBe(true);
    expect(Array.isArray(TLDRAW_COLORS)).toBe(true);
    expect(Array.isArray(TLDRAW_GEO_TYPES)).toBe(true);
  });

  it("all const arrays have no duplicates", () => {
    const checkNoDuplicates = (arr: readonly string[], name: string) => {
      const unique = new Set(arr);
      expect(unique.size).toBe(arr.length);
      if (unique.size !== arr.length) {
        throw new Error(`Duplicates found in ${name}`);
      }
    };

    checkNoDuplicates(TLDRAW_SHAPE_TYPES, "TLDRAW_SHAPE_TYPES");
    checkNoDuplicates(TLDRAW_COLORS, "TLDRAW_COLORS");
    checkNoDuplicates(TLDRAW_GEO_TYPES, "TLDRAW_GEO_TYPES");
    checkNoDuplicates(TLDRAW_FILLS, "TLDRAW_FILLS");
    checkNoDuplicates(TLDRAW_DASHES, "TLDRAW_DASHES");
    checkNoDuplicates(TLDRAW_SIZES, "TLDRAW_SIZES");
    checkNoDuplicates(TLDRAW_FONTS, "TLDRAW_FONTS");
    checkNoDuplicates(TLDRAW_ALIGNS, "TLDRAW_ALIGNS");
    checkNoDuplicates(TLDRAW_ARROWHEADS, "TLDRAW_ARROWHEADS");
  });
});
