import { ShapeStorageService } from "../services/shape-storage";
import type { MCPShapeCreateInput } from "../types";

function makeGeoInput(overrides?: Partial<MCPShapeCreateInput<"geo">>): MCPShapeCreateInput<"geo"> {
  return {
    type: "geo",
    x: 100,
    y: 100,
    props: { geo: "rectangle", color: "black", w: 100, h: 100 },
    ...overrides,
  } as MCPShapeCreateInput<"geo">;
}

describe("ShapeStorageService", () => {
  let service: ShapeStorageService;

  beforeEach(() => {
    service = new ShapeStorageService();
  });

  // ─── createShape ─────────────────────────────────────────────

  describe("createShape", () => {
    it("creates a shape with generated id", async () => {
      const shape = await service.createShape(makeGeoInput());

      expect(shape.id).toMatch(/^shape:/);
      expect(shape.type).toBe("geo");
      expect(shape.typeName).toBe("shape");
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(100);
      expect(shape.version).toBe(1);
      expect(shape.createdAt).toBeDefined();
      expect(shape.updatedAt).toBeDefined();
    });

    it("generates unique ids for each shape", async () => {
      const s1 = await service.createShape(makeGeoInput());
      const s2 = await service.createShape(makeGeoInput());

      expect(s1.id).not.toBe(s2.id);
    });

    it("applies default values", async () => {
      const shape = await service.createShape(makeGeoInput());

      expect(shape.rotation).toBe(0);
      expect(shape.index).toBe("a1");
      expect(shape.parentId).toBe("page:main");
      expect(shape.isLocked).toBe(false);
      expect(shape.opacity).toBe(1);
      expect(shape.meta).toEqual({});
    });

    it("uses provided optional values", async () => {
      const shape = await service.createShape(makeGeoInput({
        rotation: 1.5,
        parentId: "page:custom",
        isLocked: true,
        opacity: 0.5,
        meta: { source: "test" },
      }));

      expect(shape.rotation).toBe(1.5);
      expect(shape.parentId).toBe("page:custom");
      expect(shape.isLocked).toBe(true);
      expect(shape.opacity).toBe(0.5);
      expect(shape.meta).toEqual({ source: "test" });
    });

    it("merges input props with defaults", async () => {
      const shape = await service.createShape(makeGeoInput({
        props: { color: "red" } as MCPShapeCreateInput<"geo">["props"],
      }));

      expect(shape.props).toHaveProperty("color", "red");
    });

    it("handles shape type with no SHAPE_DEFAULTS factory (fallback to {})", async () => {
      // Force a type key that doesn't exist in SHAPE_DEFAULTS
      const shape = await service.createShape({
        type: "nonexistent_type" as "geo",
        x: 50,
        y: 50,
        props: {} as MCPShapeCreateInput<"geo">["props"],
      });

      expect(shape.type).toBe("nonexistent_type");
      expect(shape.x).toBe(50);
    });

    it("increments shape count", async () => {
      expect(service.getShapesCount()).toBe(0);

      await service.createShape(makeGeoInput());
      expect(service.getShapesCount()).toBe(1);

      await service.createShape(makeGeoInput());
      expect(service.getShapesCount()).toBe(2);
    });
  });

  // ─── getShape ────────────────────────────────────────────────

  describe("getShape", () => {
    it("retrieves an existing shape by id", async () => {
      const created = await service.createShape(makeGeoInput());
      const retrieved = await service.getShape(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.type).toBe(created.type);
    });

    it("returns null for non-existent id", async () => {
      const result = await service.getShape("shape:doesnotexist");
      expect(result).toBeNull();
    });

    it("returns null for empty string id", async () => {
      const result = await service.getShape("");
      expect(result).toBeNull();
    });
  });

  // ─── getAllShapes ────────────────────────────────────────────

  describe("getAllShapes", () => {
    it("returns empty array when no shapes", async () => {
      const shapes = await service.getAllShapes();
      expect(shapes).toEqual([]);
    });

    it("returns all shapes", async () => {
      await service.createShape(makeGeoInput());
      await service.createShape(makeGeoInput({ type: "geo", x: 200, y: 200 }));

      const shapes = await service.getAllShapes();
      expect(shapes).toHaveLength(2);
    });
  });

  // ─── updateShape ─────────────────────────────────────────────

  describe("updateShape", () => {
    it("updates position of existing shape", async () => {
      const created = await service.createShape(makeGeoInput());
      const updated = await service.updateShape({
        id: created.id,
        x: 500,
        y: 600,
      });

      expect(updated).not.toBeNull();
      expect(updated?.x).toBe(500);
      expect(updated?.y).toBe(600);
      expect(updated?.type).toBe("geo");
    });

    it("increments version on update", async () => {
      const created = await service.createShape(makeGeoInput());
      expect(created.version).toBe(1);

      const updated = await service.updateShape({ id: created.id, x: 200 });
      expect(updated?.version).toBe(2);

      const updated2 = await service.updateShape({ id: created.id, x: 300 });
      expect(updated2?.version).toBe(3);
    });

    it("updates updatedAt timestamp", async () => {
      const created = await service.createShape(makeGeoInput());
      // Small delay to ensure timestamps differ
      await new Promise((r) => setTimeout(r, 10));
      const updated = await service.updateShape({ id: created.id, x: 200 });

      expect(updated?.updatedAt).not.toBe(created.updatedAt);
    });

    it("merges props on update", async () => {
      const created = await service.createShape(makeGeoInput());
      const updated = await service.updateShape({
        id: created.id,
        props: { color: "red" } as Record<string, unknown>,
      });

      expect(updated?.props).toHaveProperty("color", "red");
      // Original props should be preserved
      expect(updated?.props).toHaveProperty("geo");
    });

    it("returns null for non-existent shape", async () => {
      const result = await service.updateShape({
        id: "shape:doesnotexist" as unknown as import("../types").TLShapeId,
        x: 100,
      });
      expect(result).toBeNull();
    });

    it("handles shape with undefined version (defaults to 1 then increments)", async () => {
      const created = await service.createShape(makeGeoInput());
      // Manually remove version from the stored shape to test the ?? 1 fallback
      const stored = service.shapes.get(created.id as unknown as string);
      if (stored) {
        delete (stored as Record<string, unknown>).version;
      }

      const updated = await service.updateShape({ id: created.id, x: 300 });
      expect(updated?.version).toBe(2); // (undefined ?? 1) + 1 = 2
    });

    it("does not change count", async () => {
      const created = await service.createShape(makeGeoInput());
      expect(service.getShapesCount()).toBe(1);

      await service.updateShape({ id: created.id, x: 999 });
      expect(service.getShapesCount()).toBe(1);
    });

    it("preserves existing props when update has no props", async () => {
      const created = await service.createShape(makeGeoInput());
      const updated = await service.updateShape({ id: created.id, x: 500 });

      // Props should remain from creation since no props were in the update
      expect(updated?.props).toEqual(created.props);
    });
  });

  // ─── deleteShape ─────────────────────────────────────────────

  describe("deleteShape", () => {
    it("deletes an existing shape", async () => {
      const created = await service.createShape(makeGeoInput());
      const deleted = await service.deleteShape(created.id);

      expect(deleted).toBe(true);
      expect(service.getShapesCount()).toBe(0);
    });

    it("returns false for non-existent shape", async () => {
      const deleted = await service.deleteShape("shape:doesnotexist");
      expect(deleted).toBe(false);
    });

    it("shape is no longer retrievable after deletion", async () => {
      const created = await service.createShape(makeGeoInput());
      await service.deleteShape(created.id);

      const retrieved = await service.getShape(created.id);
      expect(retrieved).toBeNull();
    });
  });

  // ─── batchCreateShapes ───────────────────────────────────────

  describe("batchCreateShapes", () => {
    it("creates multiple shapes at once", async () => {
      const inputs = [
        makeGeoInput({ x: 0, y: 0 }),
        makeGeoInput({ x: 100, y: 100 }),
        makeGeoInput({ x: 200, y: 200 }),
      ];

      const shapes = await service.batchCreateShapes(inputs);

      expect(shapes).toHaveLength(3);
      expect(shapes[0].x).toBe(0);
      expect(shapes[1].x).toBe(100);
      expect(shapes[2].x).toBe(200);
      expect(service.getShapesCount()).toBe(3);
    });

    it("generates unique ids for batch shapes", async () => {
      const inputs = Array.from({ length: 10 }, (_, i) =>
        makeGeoInput({ x: i * 100 }),
      );

      const shapes = await service.batchCreateShapes(inputs);
      const ids = new Set(shapes.map((s) => s.id));
      expect(ids.size).toBe(10);
    });

    it("returns empty array for empty input", async () => {
      const shapes = await service.batchCreateShapes([]);
      expect(shapes).toEqual([]);
    });
  });

  // ─── clearAllShapes ──────────────────────────────────────────

  describe("clearAllShapes", () => {
    it("removes all shapes", async () => {
      await service.createShape(makeGeoInput());
      await service.createShape(makeGeoInput());
      expect(service.getShapesCount()).toBe(2);

      await service.clearAllShapes();
      expect(service.getShapesCount()).toBe(0);
      expect(await service.getAllShapes()).toEqual([]);
    });

    it("is idempotent on empty store", async () => {
      await service.clearAllShapes();
      expect(service.getShapesCount()).toBe(0);
    });
  });

  // ─── getShapesCount ──────────────────────────────────────────

  describe("getShapesCount", () => {
    it("returns 0 for empty store", () => {
      expect(service.getShapesCount()).toBe(0);
    });

    it("reflects creates and deletes", async () => {
      const s1 = await service.createShape(makeGeoInput());
      const s2 = await service.createShape(makeGeoInput());
      expect(service.getShapesCount()).toBe(2);

      await service.deleteShape(s1.id);
      expect(service.getShapesCount()).toBe(1);

      await service.deleteShape(s2.id);
      expect(service.getShapesCount()).toBe(0);
    });
  });

  // ─── full lifecycle ──────────────────────────────────────────

  describe("full CRUD lifecycle", () => {
    it("create → read → update → read → delete → read", async () => {
      // Create
      const shape = await service.createShape(makeGeoInput({ x: 10, y: 20 }));
      expect(shape.x).toBe(10);

      // Read
      const read1 = await service.getShape(shape.id);
      expect(read1?.x).toBe(10);

      // Update
      const updated = await service.updateShape({ id: shape.id, x: 99 });
      expect(updated?.x).toBe(99);

      // Read updated
      const read2 = await service.getShape(shape.id);
      expect(read2?.x).toBe(99);
      expect(read2?.version).toBe(2);

      // Delete
      const deleted = await service.deleteShape(shape.id);
      expect(deleted).toBe(true);

      // Read after delete
      const read3 = await service.getShape(shape.id);
      expect(read3).toBeNull();
    });
  });
});
