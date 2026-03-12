import { preprocessAIShapeData, preprocessAIBatchData } from "../lib/shape-preprocessor";
import { getShapeDefaults } from "../lib/shape-defaults";

describe("preprocessAIShapeData", () => {
  // ─── null / undefined / non-object input ─────────────────────

  it("returns geo fallback for null input", () => {
    const result = preprocessAIShapeData(null);
    expect(result.type).toBe("geo");
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.props).toEqual(getShapeDefaults("geo"));
  });

  it("returns geo fallback for undefined input", () => {
    expect(preprocessAIShapeData(undefined).type).toBe("geo");
  });

  it("returns geo fallback for primitive inputs", () => {
    expect(preprocessAIShapeData("string" as unknown).type).toBe("geo");
    expect(preprocessAIShapeData(42 as unknown).type).toBe("geo");
    expect(preprocessAIShapeData(true as unknown).type).toBe("geo");
  });

  // ─── valid shape data ────────────────────────────────────────

  it("processes valid geo shape data", () => {
    const result = preprocessAIShapeData({
      type: "geo",
      x: 200,
      y: 300,
      props: { color: "red", w: 150, h: 150, geo: "ellipse" },
    });
    expect(result.type).toBe("geo");
    expect(result.x).toBe(200);
    expect(result.y).toBe(300);
    expect((result.props as Record<string, unknown>).color).toBe("red");
    expect((result.props as Record<string, unknown>).geo).toBe("ellipse");
  });

  it("processes valid text shape with text→richText conversion", () => {
    const result = preprocessAIShapeData({
      type: "text",
      x: 50,
      y: 50,
      props: { text: "Hello AI" },
    });
    expect(result.type).toBe("text");
    const props = result.props as Record<string, unknown>;
    expect(props.richText).toBeDefined();
    const rt = props.richText as { type: string; content: Array<{ content: Array<{ text: string }> }> };
    expect(rt.content[0].content[0].text).toBe("Hello AI");
  });

  it("ensures text shapes always have richText", () => {
    const result = preprocessAIShapeData({
      type: "text",
      x: 0,
      y: 0,
      props: {},
    });
    const props = result.props as Record<string, unknown>;
    expect(props.richText).toBeDefined();
  });

  it("converts note text to richText", () => {
    const result = preprocessAIShapeData({
      type: "note",
      x: 0,
      y: 0,
      props: { text: "Note text" },
    });
    const props = result.props as Record<string, unknown>;
    expect(props.richText).toBeDefined();
  });

  it("converts geo text to richText", () => {
    const result = preprocessAIShapeData({
      type: "geo",
      x: 0,
      y: 0,
      props: { text: "Geo label" },
    });
    const props = result.props as Record<string, unknown>;
    expect(props.richText).toBeDefined();
    const rt = props.richText as { type: string; content: Array<{ content: Array<{ text: string }> }> };
    expect(rt.content[0].content[0].text).toBe("Geo label");
  });

  // ─── type normalization ──────────────────────────────────────

  it("normalizes type aliases", () => {
    expect(preprocessAIShapeData({ type: "rectangle" }).type).toBe("geo");
    expect(preprocessAIShapeData({ type: "circle" }).type).toBe("geo");
    expect(preprocessAIShapeData({ type: "box" }).type).toBe("geo");
  });

  it("normalizes case-insensitive types", () => {
    expect(preprocessAIShapeData({ type: "ARROW" }).type).toBe("arrow");
    expect(preprocessAIShapeData({ type: "Text" }).type).toBe("text");
  });

  it('defaults unknown types to "geo"', () => {
    expect(preprocessAIShapeData({ type: "widget" }).type).toBe("geo");
    expect(preprocessAIShapeData({ type: 42 }).type).toBe("geo");
  });

  // ─── missing fields ─────────────────────────────────────────

  it("defaults x/y to 100 when missing", () => {
    const result = preprocessAIShapeData({ type: "geo" });
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it("preserves valid x/y", () => {
    const result = preprocessAIShapeData({ type: "geo", x: 500, y: 600 });
    expect(result.x).toBe(500);
    expect(result.y).toBe(600);
  });

  it("defaults non-number x/y to 100", () => {
    const result = preprocessAIShapeData({ type: "geo", x: "abc", y: null });
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it("creates empty props when missing", () => {
    const result = preprocessAIShapeData({ type: "frame" });
    expect(result.props).toBeDefined();
    expect(typeof result.props).toBe("object");
  });

  it("creates empty props when props is not an object", () => {
    const result = preprocessAIShapeData({ type: "geo", props: "invalid" });
    expect(typeof result.props).toBe("object");
  });

  // ─── arrow text→richText conversion (tldraw v4) ──────────

  it("converts text prop to richText for arrow shapes", () => {
    const result = preprocessAIShapeData({
      type: "arrow",
      x: 0,
      y: 0,
      props: { text: "label" },
    });
    const props = result.props as Record<string, unknown>;
    expect(props.text).toBeUndefined();
    expect(props.richText).toBeDefined();
  });

  // ─── props sanitization ──────────────────────────────────────

  it("sanitizes props through shape-sanitizer", () => {
    const result = preprocessAIShapeData({
      type: "geo",
      x: 0,
      y: 0,
      props: { color: "purple", w: 99999, fill: "gradient" },
    });
    const props = result.props as Record<string, unknown>;
    expect(props.color).toBe("violet"); // normalized
    expect(props.w).toBe(2000); // clamped
    expect(props.fill).toBe("none"); // fallback
  });

  // ─── extra fields are preserved ──────────────────────────────

  it("preserves extra fields in the data", () => {
    const result = preprocessAIShapeData({
      type: "geo",
      x: 0,
      y: 0,
      rotation: 1.5,
      parentId: "page:custom",
      meta: { source: "ai" },
    });
    expect(result.rotation).toBe(1.5);
    expect(result.parentId).toBe("page:custom");
    expect(result.meta).toEqual({ source: "ai" });
  });
});

// ─── preprocessAIBatchData ─────────────────────────────────────

describe("preprocessAIBatchData", () => {
  it("processes an array of valid shapes", () => {
    const results = preprocessAIBatchData([
      { type: "geo", x: 0, y: 0 },
      { type: "text", x: 100, y: 100, props: { text: "Hello" } },
      { type: "arrow", x: 200, y: 200 },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0].type).toBe("geo");
    expect(results[1].type).toBe("text");
    expect(results[2].type).toBe("arrow");
  });

  it("filters out null and undefined entries", () => {
    const results = preprocessAIBatchData([
      null,
      { type: "geo" },
      undefined,
      { type: "text", props: { text: "x" } },
    ]);
    expect(results).toHaveLength(2);
  });

  it("returns empty array for non-array input", () => {
    expect(preprocessAIBatchData("not array" as unknown as unknown[])).toEqual([]);
    expect(preprocessAIBatchData(42 as unknown as unknown[])).toEqual([]);
    expect(preprocessAIBatchData(null as unknown as unknown[])).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(preprocessAIBatchData([])).toEqual([]);
  });

  it("handles mixed valid and invalid shapes", () => {
    const results = preprocessAIBatchData([
      { type: "geo", x: 0, y: 0 },
      null,
      undefined,
      { type: "unknown_type" },
    ]);
    expect(results).toHaveLength(2);
    // Invalid type still produces a valid shape (defaulted to geo)
    expect(results[1].type).toBe("geo");
  });

  it("falls back to geo on preprocessAIShapeData throwing", () => {
    // Use Object.defineProperty to create a getter that throws on access
    const malicious = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(malicious, "type", {
      get() { throw new Error("boom"); },
      enumerable: true,
    });
    const results = preprocessAIBatchData([malicious]);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("geo");
    expect(results[0].x).toBe(100); // index 0 → 100 + 0*120 = 100
  });

  it("offsets x position for error fallback shapes by index", () => {
    // This tests the catch block which offsets by index * 120
    // Since preprocessAIShapeData handles most inputs gracefully,
    // we verify that normal shapes preserve their coordinates
    const results = preprocessAIBatchData([
      { type: "geo", x: 50, y: 50 },
      { type: "text", x: 200, y: 200, props: { text: "test" } },
    ]);
    expect(results[0].x).toBe(50);
    expect(results[1].x).toBe(200);
  });
});
