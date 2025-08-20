// src/services/shape-storage.ts

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

// Generator for tldraw-style shape IDs
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);
function generateShapeId(): TLShapeId {
  return `shape:${nanoid()}` as TLShapeId;
}

/**
 * In-memory shape storage service
 * In production, this would be replaced with a database
 */
export class ShapeStorageService implements MCPShapeStorage {
  public readonly shapes = new Map<string, MCPShape>();

  /**
   * Create a new shape
   */
  async createShape<T extends TldrawShapeType>(
    input: MCPShapeCreateInput<T>
  ): Promise<MCPShape<T>> {
    const id = generateShapeId();
    const now = new Date().toISOString();

    // Merge with defaults
    const defaultProps =
      SHAPE_DEFAULTS[input.type as keyof typeof SHAPE_DEFAULTS]() || {};
    const props = { ...defaultProps, ...input.props };

    const shape: MCPShape<T> = {
      id,
      type: input.type,
      typeName: "shape",
      x: input.x,
      y: input.y,
      rotation: input.rotation ?? 0,
      index: "a1" as any, // Would use proper fractional indexing in production
      parentId: input.parentId ?? ("page:main" as any),
      isLocked: input.isLocked ?? false,
      opacity: input.opacity ?? 1,
      props: props as any,
      meta: input.meta ?? {},
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.shapes.set(id, shape as MCPShape);
    return shape;
  }

  /**
   * Update an existing shape
   */
  async updateShape<T extends TldrawShapeType>(
    input: MCPShapeUpdateInput<T>
  ): Promise<MCPShape<T> | null> {
    const existingShape = this.shapes.get(input.id as unknown as string);
    if (!existingShape) return null;

    const updatedShape: MCPShape<T> = {
      ...existingShape,
      ...input,
      props: input.props
        ? { ...existingShape.props, ...input.props }
        : existingShape.props,
      updatedAt: new Date().toISOString(),
      version: (existingShape.version ?? 1) + 1,
    } as MCPShape<T>;

    this.shapes.set(input.id as unknown as string, updatedShape as MCPShape);
    return updatedShape;
  }

  /**
   * Delete a shape
   */
  async deleteShape(id: TLShapeId | string): Promise<boolean> {
    return this.shapes.delete(id as string);
  }

  /**
   * Get a shape by ID
   */
  async getShape<T extends TldrawShapeType>(
    id: TLShapeId | string
  ): Promise<MCPShape<T> | null> {
    const shape = this.shapes.get(id as string);
    return shape ? (shape as MCPShape<T>) : null;
  }

  /**
   * Get all shapes
   */
  async getAllShapes(): Promise<MCPShape[]> {
    return Array.from(this.shapes.values());
  }

  /**
   * Batch create shapes
   */
  async batchCreateShapes(inputs: MCPShapeCreateInput[]): Promise<MCPShape[]> {
    const promises = inputs.map((input) => this.createShape(input));
    return Promise.all(promises);
  }

  /**
   * Clear all shapes
   */
  async clearAllShapes(): Promise<void> {
    this.shapes.clear();
  }

  /**
   * Get shapes count
   */
  getShapesCount(): number {
    return this.shapes.size;
  }
}
