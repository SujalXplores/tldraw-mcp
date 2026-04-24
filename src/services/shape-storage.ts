import { customAlphabet } from "nanoid";
import type {
  MCPShape,
  MCPShapeCreateInput,
  MCPShapeUpdateInput,
  MCPShapeStorage,
  TldrawShapeType,
  TLShapeId,
} from "../types";
import { SHAPE_DEFAULTS } from "../types";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

function generateShapeId(): TLShapeId {
  return `shape:${nanoid()}` as TLShapeId;
}

/**
 * In-memory shape storage. Replace with a database for persistence.
 * Methods are async to match the MCPShapeStorage interface contract,
 * allowing future database implementations without breaking changes.
 */
export class ShapeStorageService implements MCPShapeStorage {
  public readonly shapes = new Map<string, MCPShape>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async createShape<T extends TldrawShapeType>(
    input: MCPShapeCreateInput<T>,
  ): Promise<MCPShape<T>> {
    const id = generateShapeId();
    const now = new Date().toISOString();
    const defaultsFactory = SHAPE_DEFAULTS[input.type];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const defaultProps = defaultsFactory ? defaultsFactory() : {};

    const shape: MCPShape<T> = {
      id,
      type: input.type,
      typeName: "shape",
      x: input.x,
      y: input.y,
      rotation: input.rotation ?? 0,
      index: "a1",
      parentId: input.parentId ?? "page:main",
      isLocked: input.isLocked ?? false,
      opacity: input.opacity ?? 1,
      props: { ...defaultProps, ...input.props } as MCPShape<T>["props"],
      meta: input.meta ?? {},
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.shapes.set(id, shape);
    return shape;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async updateShape<T extends TldrawShapeType>(
    input: MCPShapeUpdateInput<T>,
  ): Promise<MCPShape<T> | null> {
    const existing = this.shapes.get(input.id);
    if (!existing) return null;

    const updated: MCPShape<T> = {
      ...existing,
      ...input,
      props: input.props ? { ...existing.props, ...input.props } : existing.props,
      updatedAt: new Date().toISOString(),
      version: (existing.version ?? 1) + 1,
    } as MCPShape<T>;

    this.shapes.set(input.id, updated);
    return updated;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async deleteShape(id: TLShapeId | string): Promise<boolean> {
    return this.shapes.delete(id);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getShape<T extends TldrawShapeType>(
    id: TLShapeId | string,
  ): Promise<MCPShape<T> | null> {
    const shape = this.shapes.get(id);
    return shape ? (shape as MCPShape<T>) : null;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAllShapes(): Promise<MCPShape[]> {
    return Array.from(this.shapes.values());
  }

  async batchCreateShapes(inputs: MCPShapeCreateInput[]): Promise<MCPShape[]> {
    return Promise.all(inputs.map((input) => this.createShape(input)));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async clearAllShapes(): Promise<void> {
    this.shapes.clear();
  }

  getShapesCount(): number {
    return this.shapes.size;
  }
}
