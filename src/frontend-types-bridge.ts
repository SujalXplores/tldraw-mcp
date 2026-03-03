// Bridge between Tldraw's real types and our local types

import type {
  IndexKey as TldrawIndexKey,
  TLParentId as TldrawParentId,
  TLShapeId as TldrawShapeId,
  TLShape as TldrawTLShape,
  TLShapePartial as TldrawTLShapePartial,
} from "tldraw";

// Our local types (simplified for API use)
import type { IndexKey, TLParentId, TLShapeId, TLShape as LocalTLShape } from "./types";

/**
 * Convert Tldraw IndexKey to backend string representation
 */
export function toBackendIndexKey(key: TldrawIndexKey): IndexKey {
  return key as string as IndexKey;
}

/**
 * Convert Tldraw ParentId to backend string representation
 */
export function toBackendParentId(id: TldrawParentId): TLParentId {
  return id as string as TLParentId;
}

/**
 * Convert Tldraw ShapeId to backend string representation
 */
export function toBackendShapeId(id: TldrawShapeId): TLShapeId {
  return id as string as TLShapeId;
}

/**
 * Convert backend IndexKey to Tldraw IndexKey
 */
export function toFrontendIndexKey(key: IndexKey): TldrawIndexKey {
  return key as string as TldrawIndexKey;
}

/**
 * Convert backend ParentId to Tldraw ParentId
 */
export function toFrontendParentId(id: TLParentId): TldrawParentId {
  return id as string as TldrawParentId;
}

/**
 * Convert backend ShapeId to Tldraw ShapeId
 */
export function toFrontendShapeId(id: TLShapeId): TldrawShapeId {
  return id as string as TldrawShapeId;
}

/**
 * Convert from Tldraw's real TLShape to our local TLShape
 */
export function toLocalTLShape(tldrawShape: TldrawTLShape): LocalTLShape {
  return {
    id: toBackendShapeId(tldrawShape.id),
    typeName: "shape" as const,
    type: tldrawShape.type,
    x: tldrawShape.x,
    y: tldrawShape.y,
    rotation: tldrawShape.rotation,
    index: toBackendIndexKey(tldrawShape.index),
    parentId: toBackendParentId(tldrawShape.parentId),
    isLocked: tldrawShape.isLocked,
    opacity: tldrawShape.opacity,
    props: tldrawShape.props,
    meta: tldrawShape.meta,
  } as LocalTLShape;
}

/**
 * Convert from our local TLShape to Tldraw's real TLShape
 */
export function toTldrawTLShape(localShape: LocalTLShape): TldrawTLShape {
  return {
    id: toFrontendShapeId(localShape.id),
    typeName: "shape" as const,
    type: localShape.type,
    x: localShape.x,
    y: localShape.y,
    rotation: localShape.rotation,
    index: toFrontendIndexKey(localShape.index),
    parentId: toFrontendParentId(localShape.parentId),
    isLocked: localShape.isLocked,
    opacity: localShape.opacity,
    props: localShape.props,
    meta: localShape.meta,
  } as TldrawTLShape;
}

/**
 * Convert array of local shapes to Tldraw shapes
 */
export function toTldrawShapes(localShapes: LocalTLShape[]): TldrawTLShape[] {
  return localShapes.map(toTldrawTLShape);
}

/**
 * Convert array of Tldraw shapes to local shapes
 */
export function toLocalShapes(tldrawShapes: TldrawTLShape[]): LocalTLShape[] {
  return tldrawShapes.map(toLocalTLShape);
}

/**
 * Create a Tldraw-compatible shape partial for updates
 */
export function createTldrawShapePartial(localShape: LocalTLShape): TldrawTLShapePartial {
  return {
    id: toFrontendShapeId(localShape.id),
    type: localShape.type,
    x: localShape.x,
    y: localShape.y,
    rotation: localShape.rotation,
    isLocked: localShape.isLocked,
    opacity: localShape.opacity,
    props: localShape.props,
    meta: localShape.meta,
  } as TldrawTLShapePartial;
}

/**
 * Utility functions for working with IDs
 */
export class IdConverter {
  /**
   * Ensure a shape ID has the proper format for Tldraw
   */
  static ensureTldrawShapeId(id: string): TldrawShapeId {
    if (!id.startsWith("shape:")) {
      return `shape:${id}` as TldrawShapeId;
    }
    return id as TldrawShapeId;
  }

  /**
   * Extract the raw ID from a Tldraw shape ID
   */
  static extractRawId(id: TldrawShapeId): string {
    const idStr = id as string;
    return idStr.startsWith("shape:") ? idStr.slice(6) : idStr;
  }

  /**
   * Generate a random shape ID for Tldraw
   */
  static generateTldrawShapeId(): TldrawShapeId {
    const randomId = Math.random().toString(36).substr(2, 9);
    return `shape:${randomId}` as TldrawShapeId;
  }

  /**
   * Ensure a parent ID has the proper format for Tldraw
   */
  static ensureTldrawParentId(id: string): TldrawParentId {
    if (!id.startsWith("page:") && !id.startsWith("shape:")) {
      return `page:${id}` as TldrawParentId;
    }
    return id as TldrawParentId;
  }

  /**
   * Generate a valid index key for Tldraw positioning
   */
  static generateTldrawIndexKey(): TldrawIndexKey {
    // This is a simplified version - Tldraw uses fractional indexing
    return `a${Math.random().toString(36).substr(2, 8)}` as TldrawIndexKey;
  }
}

/**
 * Type guards for checking ID formats
 */
export class IdValidator {
  static isValidTldrawShapeId(id: string): id is TldrawShapeId {
    return typeof id === "string" && id.startsWith("shape:");
  }

  static isValidTldrawParentId(id: string): id is TldrawParentId {
    return typeof id === "string" && (id.startsWith("page:") || id.startsWith("shape:"));
  }

  static isValidTldrawIndexKey(key: string): key is TldrawIndexKey {
    return typeof key === "string" && key.length > 0;
  }
}
