import {
  normalizeColor,
  validateNumber,
  validateEnum,
  validateShapeType,
} from "../lib/validation";
import {
  TLDRAW_COLORS,
  TLDRAW_SHAPE_TYPES,
  TLDRAW_FILLS,
  TLDRAW_SIZES,
} from "../lib/constants";

// ─── normalizeColor ──────────────────────────────────────────────

describe("normalizeColor", () => {
  it("returns valid tldraw colors unchanged", () => {
    for (const color of TLDRAW_COLORS) {
      expect(normalizeColor(color)).toBe(color);
    }
  });

  it("is case-insensitive", () => {
    expect(normalizeColor("Blue")).toBe("blue");
    expect(normalizeColor("RED")).toBe("red");
    expect(normalizeColor("Light-Blue")).toBe("light-blue");
  });

  it("trims whitespace", () => {
    expect(normalizeColor("  green  ")).toBe("green");
  });

  it("maps common color aliases", () => {
    expect(normalizeColor("purple")).toBe("violet");
    expect(normalizeColor("pink")).toBe("light-red");
    expect(normalizeColor("cyan")).toBe("light-blue");
    expect(normalizeColor("crimson")).toBe("red");
    expect(normalizeColor("emerald")).toBe("green");
    expect(normalizeColor("amber")).toBe("yellow");
    expect(normalizeColor("lavender")).toBe("light-violet");
    expect(normalizeColor("navy")).toBe("blue");
    expect(normalizeColor("gold")).toBe("yellow");
    expect(normalizeColor("silver")).toBe("grey");
    expect(normalizeColor("coral")).toBe("light-red");
  });

  it('returns "black" for unknown color strings', () => {
    expect(normalizeColor("chartreuse")).toBe("black");
    expect(normalizeColor("#ff0000")).toBe("black");
    expect(normalizeColor("rgb(255,0,0)")).toBe("black");
    expect(normalizeColor("")).toBe("black");
  });

  it('returns "black" for non-string inputs', () => {
    expect(normalizeColor(null)).toBe("black");
    expect(normalizeColor(undefined)).toBe("black");
    expect(normalizeColor(123)).toBe("black");
    expect(normalizeColor(true)).toBe("black");
    expect(normalizeColor({})).toBe("black");
    expect(normalizeColor([])).toBe("black");
  });
});

// ─── validateNumber ──────────────────────────────────────────────

describe("validateNumber", () => {
  it("returns valid numbers within range", () => {
    expect(validateNumber(50, 0, 100, 0)).toBe(50);
    expect(validateNumber(0, 0, 100, 50)).toBe(0);
    expect(validateNumber(100, 0, 100, 50)).toBe(100);
  });

  it("clamps numbers to min/max bounds", () => {
    expect(validateNumber(-1, 0, 100, 50)).toBe(0);
    expect(validateNumber(101, 0, 100, 50)).toBe(100);
    expect(validateNumber(-99999, -10000, 10000, 0)).toBe(-10000);
    expect(validateNumber(99999, -10000, 10000, 0)).toBe(10000);
  });

  it("returns fallback for non-number inputs", () => {
    expect(validateNumber("50", 0, 100, 42)).toBe(42);
    expect(validateNumber(null, 0, 100, 42)).toBe(42);
    expect(validateNumber(undefined, 0, 100, 42)).toBe(42);
    expect(validateNumber(true, 0, 100, 42)).toBe(42);
    expect(validateNumber({}, 0, 100, 42)).toBe(42);
    expect(validateNumber([], 0, 100, 42)).toBe(42);
  });

  it("returns fallback for NaN and Infinity", () => {
    expect(validateNumber(NaN, 0, 100, 42)).toBe(42);
    expect(validateNumber(Infinity, 0, 100, 42)).toBe(42);
    expect(validateNumber(-Infinity, 0, 100, 42)).toBe(42);
  });

  it("handles negative ranges", () => {
    expect(validateNumber(-5, -10, -1, -5)).toBe(-5);
    expect(validateNumber(0, -10, -1, -5)).toBe(-1);
    expect(validateNumber(-20, -10, -1, -5)).toBe(-10);
  });

  it("handles zero-width ranges", () => {
    expect(validateNumber(5, 5, 5, 5)).toBe(5);
    expect(validateNumber(0, 5, 5, 5)).toBe(5);
  });

  it("handles floating point values", () => {
    expect(validateNumber(0.5, 0, 1, 0)).toBe(0.5);
    expect(validateNumber(0.001, 0, 1, 0)).toBe(0.001);
  });
});

// ─── validateEnum ────────────────────────────────────────────────

describe("validateEnum", () => {
  const fills = TLDRAW_FILLS;
  const sizes = TLDRAW_SIZES;

  it("returns valid enum values unchanged", () => {
    expect(validateEnum("none", fills, "none")).toBe("none");
    expect(validateEnum("semi", fills, "none")).toBe("semi");
    expect(validateEnum("solid", fills, "none")).toBe("solid");
    expect(validateEnum("pattern", fills, "none")).toBe("pattern");
  });

  it("is case-insensitive", () => {
    expect(validateEnum("NONE", fills, "solid")).toBe("none");
    expect(validateEnum("Semi", fills, "solid")).toBe("semi");
    expect(validateEnum("SOLID", fills, "none")).toBe("solid");
  });

  it("returns fallback for invalid strings", () => {
    expect(validateEnum("gradient", fills, "none")).toBe("none");
    expect(validateEnum("", fills, "none")).toBe("none");
    expect(validateEnum("striped", fills, "solid")).toBe("solid");
  });

  it("returns fallback for non-string inputs", () => {
    expect(validateEnum(null, fills, "none")).toBe("none");
    expect(validateEnum(undefined, fills, "none")).toBe("none");
    expect(validateEnum(42, fills, "none")).toBe("none");
    expect(validateEnum(true, sizes, "m")).toBe("m");
    expect(validateEnum({}, sizes, "l")).toBe("l");
  });

  it("works with different enum arrays", () => {
    expect(validateEnum("m", sizes, "s")).toBe("m");
    expect(validateEnum("xl", sizes, "s")).toBe("xl");
    expect(validateEnum("xxl", sizes, "s")).toBe("s");
  });
});

// ─── validateShapeType ───────────────────────────────────────────

describe("validateShapeType", () => {
  it("returns valid shape types unchanged", () => {
    for (const type of TLDRAW_SHAPE_TYPES) {
      expect(validateShapeType(type)).toBe(type);
    }
  });

  it("is case-insensitive", () => {
    expect(validateShapeType("GEO")).toBe("geo");
    expect(validateShapeType("Text")).toBe("text");
    expect(validateShapeType("ARROW")).toBe("arrow");
  });

  it("trims whitespace", () => {
    expect(validateShapeType("  geo  ")).toBe("geo");
  });

  it("maps shape type aliases to canonical types", () => {
    expect(validateShapeType("rectangle")).toBe("geo");
    expect(validateShapeType("circle")).toBe("geo");
    expect(validateShapeType("box")).toBe("geo");
    expect(validateShapeType("triangle")).toBe("geo");
    expect(validateShapeType("square")).toBe("geo");
    expect(validateShapeType("ellipse")).toBe("geo");
    expect(validateShapeType("diamond")).toBe("geo");
    expect(validateShapeType("shape")).toBe("geo");
    expect(validateShapeType("polygon")).toBe("geo");
  });

  it('returns "geo" for unknown type strings', () => {
    expect(validateShapeType("widget")).toBe("geo");
    expect(validateShapeType("canvas")).toBe("geo");
    expect(validateShapeType("")).toBe("geo");
  });

  it('returns "geo" for non-string inputs', () => {
    expect(validateShapeType(null)).toBe("geo");
    expect(validateShapeType(undefined)).toBe("geo");
    expect(validateShapeType(42)).toBe("geo");
    expect(validateShapeType(true)).toBe("geo");
    expect(validateShapeType({})).toBe("geo");
  });
});
