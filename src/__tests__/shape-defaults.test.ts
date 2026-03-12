import { getShapeDefaults } from "../lib/shape-defaults";
import { TLDRAW_SHAPE_TYPES } from "../lib/constants";

describe("getShapeDefaults", () => {
  it("returns defaults for every known shape type without throwing", () => {
    for (const type of TLDRAW_SHAPE_TYPES) {
      expect(() => getShapeDefaults(type)).not.toThrow();
      const result = getShapeDefaults(type);
      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();
    }
  });

  // ─── geo ─────────────────────────────────────────────────────

  it("returns correct geo defaults", () => {
    const d = getShapeDefaults("geo");
    expect(d.geo).toBe("rectangle");
    expect(d.w).toBe(100);
    expect(d.h).toBe(100);
    expect(d.color).toBe("black");
    expect(d.fill).toBe("none");
    expect(d.dash).toBe("draw");
    expect(d.font).toBe("draw");
    expect(d.size).toBe("m");
    expect(d.align).toBe("middle");
    expect(d.verticalAlign).toBe("middle");
    expect(d.labelColor).toBe("black");
    expect(d.growY).toBe(0);
    expect(d.scale).toBe(1);
    expect(d.url).toBe("");
    expect(d.richText).toBeDefined();
    const rt = d.richText as { type: string; content: unknown[] };
    expect(rt.type).toBe("doc");
  });

  // ─── text ────────────────────────────────────────────────────

  it("returns correct text defaults with richText", () => {
    const d = getShapeDefaults("text");
    expect(d.autoSize).toBe(true);
    expect(d.color).toBe("black");
    expect(d.font).toBe("draw");
    expect(d.size).toBe("m");
    expect(d.textAlign).toBe("start");
    expect(d.w).toBe(8);
    expect(d.scale).toBe(1);
    expect(d.richText).toBeDefined();
    const rt = d.richText as { type: string; content: unknown[] };
    expect(rt.type).toBe("doc");
  });

  // ─── arrow ───────────────────────────────────────────────────

  it("returns correct arrow defaults", () => {
    const d = getShapeDefaults("arrow");
    expect(d.arrowheadEnd).toBe("arrow");
    expect(d.arrowheadStart).toBe("none");
    expect(d.bend).toBe(0);
    expect(d.color).toBe("black");
    expect(d.start).toEqual({ x: 0, y: 0 });
    expect(d.end).toEqual({ x: 100, y: 100 });
    expect(d.kind).toBe("arc");
    expect(d.labelPosition).toBe(0.5);
    expect(d.text).toBeUndefined();
    expect(d.richText).toBeDefined();
    const rt = d.richText as { type: string; content: unknown[] };
    expect(rt.type).toBe("doc");
  });

  // ─── draw ────────────────────────────────────────────────────

  it("returns correct draw defaults", () => {
    const d = getShapeDefaults("draw");
    expect(d.color).toBe("black");
    expect(d.isClosed).toBe(false);
    expect(d.isComplete).toBe(false);
    expect(d.isPen).toBe(false);
    expect(d.segments).toEqual([]);
    expect(d.size).toBe("m");
    expect(d.scaleX).toBe(1);
    expect(d.scaleY).toBe(1);
  });

  // ─── highlight ───────────────────────────────────────────────

  it("returns correct highlight defaults", () => {
    const d = getShapeDefaults("highlight");
    expect(d.color).toBe("yellow");
    expect(d.segments).toEqual([]);
    expect(d.scaleX).toBe(1);
    expect(d.scaleY).toBe(1);
  });

  // ─── note ────────────────────────────────────────────────────

  it("returns correct note defaults", () => {
    const d = getShapeDefaults("note");
    expect(d.align).toBe("middle");
    expect(d.color).toBe("black");
    expect(d.fontSizeAdjustment).toBe(0);
    expect(d.richText).toBeDefined();
  });

  // ─── frame ───────────────────────────────────────────────────

  it("returns correct frame defaults", () => {
    const d = getShapeDefaults("frame");
    expect(d.w).toBe(160);
    expect(d.h).toBe(90);
    expect(d.name).toBe("");
    expect(d.color).toBe("black");
  });

  // ─── group ───────────────────────────────────────────────────

  it("returns empty object for group", () => {
    expect(getShapeDefaults("group")).toEqual({});
  });

  // ─── default / unknown type ──────────────────────────────────

  it("returns empty object for unknown type (default case)", () => {
    // Force an unknown type through to hit the default branch
    expect(getShapeDefaults("unknown_type" as never)).toEqual({});
  });

  // ─── embed / bookmark / image / video / line ─────────────────

  it("returns correct embed defaults", () => {
    const d = getShapeDefaults("embed");
    expect(d.w).toBe(300);
    expect(d.h).toBe(300);
    expect(d.url).toBe("");
  });

  it("returns correct bookmark defaults", () => {
    const d = getShapeDefaults("bookmark");
    expect(d.w).toBe(200);
    expect(d.h).toBe(100);
    expect(d.url).toBe("");
    expect(d.assetId).toBeNull();
  });

  it("returns correct image defaults", () => {
    const d = getShapeDefaults("image");
    expect(d.w).toBe(100);
    expect(d.h).toBe(100);
    expect(d.altText).toBe("");
    expect(d.flipX).toBe(false);
    expect(d.flipY).toBe(false);
    expect(d.playing).toBe(true);
    expect(d.crop).toBeNull();
  });

  it("returns correct video defaults", () => {
    const d = getShapeDefaults("video");
    expect(d.w).toBe(100);
    expect(d.h).toBe(100);
    expect(d.autoplay).toBe(false);
    expect(d.playing).toBe(false);
    expect(d.time).toBe(0);
  });

  it("returns correct line defaults", () => {
    const d = getShapeDefaults("line");
    expect(d.color).toBe("black");
    expect(d.dash).toBe("draw");
    expect(d.spline).toBe("line");
    expect(d.points).toEqual({});
  });
});
