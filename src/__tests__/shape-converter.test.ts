import { ShapeConverterService } from "../services/shape-converter";
import type { MCPShape } from "../types";

function makeMCPShape(overrides?: Partial<MCPShape>): MCPShape {
  return {
    id: "shape:test123",
    type: "geo",
    typeName: "shape",
    x: 100,
    y: 200,
    rotation: 0,
    index: "a1",
    parentId: "page:page",
    isLocked: false,
    opacity: 1,
    props: { geo: "rectangle", color: "black", w: 100, h: 100 },
    meta: {},
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    version: 1,
    ...overrides,
  } as MCPShape;
}

describe("ShapeConverterService", () => {
  let converter: ShapeConverterService;

  beforeEach(() => {
    converter = new ShapeConverterService();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── toTldrawShape ───────────────────────────────────────────

  describe("toTldrawShape", () => {
    it("converts a valid MCPShape to TLShape", () => {
      const tl = converter.toTldrawShape(makeMCPShape());

      expect(tl.id).toBe("shape:test123");
      expect(tl.type).toBe("geo");
      expect(tl.typeName).toBe("shape");
      expect(tl.x).toBe(100);
      expect(tl.y).toBe(200);
      expect(tl.rotation).toBe(0);
      expect(tl.opacity).toBe(1);
      expect(tl.isLocked).toBe(false);
    });

    it("sanitizes props during conversion", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        props: { color: "purple", w: 99999 } as unknown as MCPShape["props"],
      }));

      expect((tl.props as Record<string, unknown>).color).toBe("violet");
      expect((tl.props as Record<string, unknown>).w).toBe(2000);
    });

    it("validates and clamps coordinates", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        x: -999999,
        y: 999999,
      }));

      expect(tl.x).toBe(-10000);
      expect(tl.y).toBe(10000);
    });

    it("clamps rotation to 0..2π", () => {
      const tl = converter.toTldrawShape(makeMCPShape({ rotation: -1 }));
      expect(tl.rotation).toBe(0);
    });

    it("clamps opacity to 0..1", () => {
      const tl = converter.toTldrawShape(makeMCPShape({ opacity: 2 }));
      expect(tl.opacity).toBe(1);

      const tl2 = converter.toTldrawShape(makeMCPShape({ opacity: -0.5 }));
      expect(tl2.opacity).toBe(0);
    });

    it("generates fallback id when id is empty", () => {
      const tl = converter.toTldrawShape(makeMCPShape({ id: "" as MCPShape["id"] }));
      expect(tl.id).toContain("shape:");
    });

    it("normalizes type aliases", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        type: "rectangle" as MCPShape["type"],
      }));
      expect(tl.type).toBe("geo");
    });

    it("returns fallback shape for null/undefined input", () => {
      const tl = converter.toTldrawShape(null as unknown as MCPShape);
      expect(tl.type).toBe("geo");
      expect(tl.x).toBe(100);
      expect(tl.y).toBe(100);
    });

    it("defaults index and parentId", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        index: undefined as unknown as string,
        parentId: undefined as unknown as string,
      }));
      expect(tl.index).toBe("a1");
      expect(tl.parentId).toBe("page:page");
    });

    it("preserves meta if valid object", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        meta: { custom: "value" },
      }));
      expect(tl.meta).toEqual({ custom: "value" });
    });

    it("defaults meta to empty object for non-object", () => {
      const tl = converter.toTldrawShape(makeMCPShape({
        meta: "invalid" as unknown as Record<string, unknown>,
      }));
      expect(tl.meta).toEqual({});
    });

    it("returns fallback when toTldrawShape throws internally", () => {
      // Create a shape where property access throws
      const badShape = makeMCPShape();
      Object.defineProperty(badShape, "type", {
        get() { throw new Error("property access error"); },
      });
      const tl = converter.toTldrawShape(badShape);
      expect(tl.type).toBe("geo");
      expect(tl.x).toBe(100);
    });
  });

  // ─── toTldrawShapes ──────────────────────────────────────────

  describe("toTldrawShapes", () => {
    it("converts array of MCPShapes", () => {
      const shapes = [
        makeMCPShape({ id: "shape:a" as MCPShape["id"] }),
        makeMCPShape({ id: "shape:b" as MCPShape["id"], type: "text" }),
      ];

      const results = converter.toTldrawShapes(shapes);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("shape:a");
      expect(results[1].type).toBe("text");
    });

    it("returns empty array for non-array input", () => {
      const results = converter.toTldrawShapes("not array" as unknown as MCPShape[]);
      expect(results).toEqual([]);
    });

    it("returns empty array for empty input", () => {
      expect(converter.toTldrawShapes([])).toEqual([]);
    });

    it("skips null entries and logs warnings", () => {
      const shapes = [
        makeMCPShape(),
        null as unknown as MCPShape,
        makeMCPShape({ id: "shape:good" as MCPShape["id"] }),
      ];

      const results = converter.toTldrawShapes(shapes);
      // null entries produce fallback shapes (since toTldrawShape handles null)
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("catches and counts errors from individual shape conversion", () => {
      // Mock toTldrawShape to throw on the second call
      const origFn = converter.toTldrawShape.bind(converter);
      let callCount = 0;
      jest.spyOn(converter, "toTldrawShape").mockImplementation((shape) => {
        callCount++;
        if (callCount === 2) throw new Error("conversion error");
        return origFn(shape);
      });

      const shapes = [makeMCPShape(), makeMCPShape()];
      const results = converter.toTldrawShapes(shapes);

      // First shape converts, second throws and is caught
      expect(results).toHaveLength(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("1 ok"),
      );
    });
  });

  // ─── fromTldrawShape ─────────────────────────────────────────

  describe("fromTldrawShape", () => {
    it("converts a TLShape back to MCPShape", () => {
      const mcp = makeMCPShape();
      const tl = converter.toTldrawShape(mcp);
      const back = converter.fromTldrawShape(tl);

      expect(back.id).toBe(mcp.id);
      expect(back.type).toBe("geo");
      expect(back.typeName).toBe("shape");
      expect(back.x).toBe(mcp.x);
      expect(back.y).toBe(mcp.y);
      expect(back.updatedAt).toBeDefined();
    });

    it("throws and logs when conversion fails", () => {
      const badTlShape = converter.toTldrawShape(makeMCPShape());
      Object.defineProperty(badTlShape, "id", {
        get() { throw new Error("read error"); },
      });

      expect(() => converter.fromTldrawShape(badTlShape)).toThrow("read error");
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ─── fromTldrawShapes ────────────────────────────────────────

  describe("fromTldrawShapes", () => {
    it("converts array of TLShapes", () => {
      const shapes = [
        makeMCPShape({ id: "shape:x" as MCPShape["id"] }),
        makeMCPShape({ id: "shape:y" as MCPShape["id"] }),
      ];
      const tlShapes = converter.toTldrawShapes(shapes);
      const back = converter.fromTldrawShapes(tlShapes);

      expect(back).toHaveLength(2);
      expect(back[0].id).toBe("shape:x");
      expect(back[1].id).toBe("shape:y");
    });

    it("throws and logs when individual shape conversion fails", () => {
      const goodTl = converter.toTldrawShape(makeMCPShape());
      const badTl = converter.toTldrawShape(makeMCPShape());
      Object.defineProperty(badTl, "id", {
        get() { throw new Error("bad shape"); },
      });

      expect(() => converter.fromTldrawShapes([goodTl, badTl])).toThrow("bad shape");
      expect(console.error).toHaveBeenCalled();
    });
  });

  // ─── validateAndRepair ───────────────────────────────────────

  describe("validateAndRepair", () => {
    it("repairs invalid coordinates", () => {
      const shape = makeMCPShape({ x: -999999, y: 999999 });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.x).toBe(-10000);
      expect(repaired.y).toBe(10000);
    });

    it("repairs invalid type", () => {
      const shape = makeMCPShape({ type: "widget" as MCPShape["type"] });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.type).toBe("geo");
    });

    it("repairs non-string id", () => {
      const shape = makeMCPShape({ id: 42 as unknown as MCPShape["id"] });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.id).toContain("shape:");
    });

    it("defaults index and parentId when null/undefined", () => {
      const shape = makeMCPShape({
        index: undefined as unknown as string,
        parentId: undefined as unknown as string,
      });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.index).toBe("a1");
      expect(repaired.parentId).toBe("page:page");
    });

    it("defaults updatedAt when undefined", () => {
      const shape = makeMCPShape({
        updatedAt: undefined,
      });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.updatedAt).toBeDefined();
      expect(typeof repaired.updatedAt).toBe("string");
    });

    it("repairs invalid opacity", () => {
      const shape = makeMCPShape({ opacity: 5 });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.opacity).toBe(1);
    });

    it("sanitizes props", () => {
      const shape = makeMCPShape({
        props: { color: "purple", w: -10 } as unknown as MCPShape["props"],
      });
      const repaired = converter.validateAndRepair(shape);

      expect((repaired.props as Record<string, unknown>).color).toBe("violet");
    });

    it("preserves valid fields", () => {
      const shape = makeMCPShape({
        x: 500,
        y: 600,
        createdAt: "2024-06-01T00:00:00Z",
        version: 3,
      });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.x).toBe(500);
      expect(repaired.y).toBe(600);
      expect(repaired.createdAt).toBe("2024-06-01T00:00:00Z");
      expect(repaired.version).toBe(3);
    });

    it("defaults meta to empty object for invalid meta", () => {
      const shape = makeMCPShape({
        meta: "invalid" as unknown as Record<string, unknown>,
      });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.meta).toEqual({});
    });

    it("preserves valid meta", () => {
      const shape = makeMCPShape({ meta: { source: "ai", score: 0.95 } });
      const repaired = converter.validateAndRepair(shape);

      expect(repaired.meta).toEqual({ source: "ai", score: 0.95 });
    });

    it("returns fallback geo when repair throws internally", () => {
      const badShape = makeMCPShape();
      Object.defineProperty(badShape, "type", {
        get() { throw new Error("repair error"); },
      });

      const repaired = converter.validateAndRepair(badShape);
      expect(repaired.type).toBe("geo");
      expect(repaired.x).toBe(100);
      expect(console.error).toHaveBeenCalled();
    });

    it("uses fallback id in catch block when id is nullish", () => {
      const badShape = makeMCPShape();
      Object.defineProperty(badShape, "type", {
        get() { throw new Error("repair error"); },
      });
      Object.defineProperty(badShape, "id", {
        get() { return undefined; },
      });

      const repaired = converter.validateAndRepair(badShape);
      expect(repaired.id).toContain("fallback-");
    });
  });
});
