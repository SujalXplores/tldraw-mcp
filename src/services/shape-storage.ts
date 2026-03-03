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
 */
export class ShapeStorageService implements MCPShapeStorage {
  public readonly shapes = new Map<string, MCPShape>();

  async createShape<T extends TldrawShapeType>(
    input: MCPShapeCreateInput<T>
  ): Promise<MCPShape<T>> {
    const id = generateShapeId();
    const now = new Date().toISOString();
    const defaultProps =
      SHAPE_DEFAULTS[input.type as keyof typeof SHAPE_DEFAULTS]() || {};

    const shape: MCPShape<T> = {
      id,
      type: input.type,
      typeName: "shape",
      x: input.x,
      y: input.y,
      rotation: input.rotation ?? 0,
      index: "a1" as any,
      parentId: input.parentId ?? ("page:main" as any),
      isLocked: input.isLocked ?? false,
      opacity: input.opacity ?? 1,
      props: { ...defaultProps, ...input.props } as any,
      meta: input.meta ?? {},
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.shapes.set(id, shape as MCPShape);
    return shape;
  }

  async updateShape<T extends TldrawShapeType>(
    input: MCPShapeUpdateInput<T>
  ): Promise<MCPShape<T> | null> {
    const existing = this.shapes.get(input.id as unknown as string);
    if (!existing) return null;

    const updated: MCPShape<T> = {
      ...existing,
      ...input,
      props: input.props
        ? { ...existing.props, ...input.props }
        : existing.props,
      updatedAt: new Date().toISOString(),
      version: (existing.version ?? 1) + 1,
    } as MCPShape<T>;

    this.shapes.set(input.id as unknown as string, updated as MCPShape);
    return updated;
  }

  async deleteShape(id: TLShapeId | string): Promise<boolean> {
    return this.shapes.delete(id as string);
  }

  async getShape<T extends TldrawShapeType>(
    id: TLShapeId | string
  ): Promise<MCPShape<T> | null> {
    return (this.shapes.get(id as string) as MCPShape<T>) ?? null;
  }

  async getAllShapes(): Promise<MCPShape[]> {
    return Array.from(this.shapes.values());
  }

  async batchCreateShapes(inputs: MCPShapeCreateInput[]): Promise<MCPShape[]> {
    return Promise.all(inputs.map((input) => this.createShape(input)));
  }

  async clearAllShapes(): Promise<void> {
    this.shapes.clear();
  }

  getShapesCount(): number {
    return this.shapes.size;
  }
}
