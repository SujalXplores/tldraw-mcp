import type { TLShape } from "tldraw";
import type { MCPShape, TldrawShapeType } from "../types";
import { getShapeDefaults } from "../lib/shape-defaults";
import { sanitizeShapeProps } from "../lib/shape-sanitizer";
import { validateNumber, validateShapeType } from "../lib/validation";

export class ShapeConverterService {
  toTldrawShape(mcpShape: MCPShape): TLShape {
    try {
      if (!mcpShape || typeof mcpShape !== "object") {
        console.error("[Converter] Cannot convert null/undefined shape");
        return this.createFallbackShape();
      }

      const safeId =
        typeof mcpShape.id === "string" && mcpShape.id.trim()
          ? mcpShape.id.trim()
          : `shape:${Date.now()}`;

      const safeType = validateShapeType(mcpShape.type);
      const safeX = validateNumber(mcpShape.x, -10000, 10000, 100);
      const safeY = validateNumber(mcpShape.y, -10000, 10000, 100);
      const safeRotation = validateNumber(mcpShape.rotation, 0, 2 * Math.PI, 0);
      const safeOpacity = validateNumber(mcpShape.opacity, 0, 1, 1);
      const sanitizedProps = sanitizeShapeProps(safeType, mcpShape.props as Record<string, unknown>);

      const tldrawShape: TLShape = {
        id: safeId as any,
        typeName: "shape",
        type: safeType,
        x: safeX,
        y: safeY,
        rotation: safeRotation,
        index: (mcpShape.index || "a1") as any,
        parentId: (mcpShape.parentId || "page:page") as any,
        isLocked: Boolean(mcpShape.isLocked),
        opacity: safeOpacity,
        props: sanitizedProps as any,
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
      };

      return tldrawShape;
    } catch (error) {
      console.error("[Converter] Error converting MCP shape:", error);
      return this.createFallbackShape();
    }
  }

  toTldrawShapes(mcpShapes: MCPShape[]): TLShape[] {
    if (!Array.isArray(mcpShapes)) {
      console.error("[Converter] Invalid shapes array:", typeof mcpShapes);
      return [];
    }

    const convertedShapes: TLShape[] = [];
    let errorCount = 0;

    mcpShapes.forEach((shape, index) => {
      try {
        if (!shape || typeof shape !== "object") {
          console.error(`[Converter] Skipping invalid shape at index ${index}`);
          errorCount++;
          return;
        }
        convertedShapes.push(this.toTldrawShape(shape));
      } catch (error) {
        console.error(`[Converter] Failed to convert shape ${index}:`, error);
        errorCount++;
      }
    });

    if (errorCount > 0) {
      console.warn(
        `[Converter] Batch conversion: ${convertedShapes.length} ok, ${errorCount} failed`,
      );
    }

    return convertedShapes;
  }

  private createFallbackShape(): TLShape {
    return {
      id: `fallback-${Date.now()}` as any,
      typeName: "shape",
      type: "geo",
      x: 100,
      y: 100,
      rotation: 0,
      index: "a1" as any,
      parentId: "page:page" as any,
      isLocked: false,
      opacity: 1,
      props: getShapeDefaults("geo") as any,
      meta: {},
    };
  }

  fromTldrawShape(tldrawShape: TLShape): MCPShape {
    try {
      const mcpShape: MCPShape = {
        id: tldrawShape.id,
        type: tldrawShape.type as TldrawShapeType,
        typeName: "shape",
        x: tldrawShape.x,
        y: tldrawShape.y,
        rotation: tldrawShape.rotation,
        index: tldrawShape.index,
        parentId: tldrawShape.parentId,
        isLocked: tldrawShape.isLocked,
        opacity: tldrawShape.opacity,
        props: tldrawShape.props,
        meta: tldrawShape.meta,
        updatedAt: new Date().toISOString(),
      };

      return mcpShape;
    } catch (error) {
      console.error("[Converter] Error converting Tldraw shape:", error);
      throw error;
    }
  }

  fromTldrawShapes(tldrawShapes: TLShape[]): MCPShape[] {
    return tldrawShapes.map((shape, index) => {
      try {
        return this.fromTldrawShape(shape);
      } catch (error) {
        console.error(`[Converter] Failed to convert shape ${index}:`, error);
        throw error;
      }
    });
  }

  validateAndRepair(mcpShape: MCPShape): MCPShape {
    try {
      const validType = validateShapeType(mcpShape.type);
      const repairedProps = sanitizeShapeProps(validType, mcpShape.props as Record<string, unknown>);

      const repairedShape: MCPShape = {
        id: typeof mcpShape.id === "string" ? mcpShape.id : `shape:${Date.now()}`,
        type: validType,
        typeName: "shape",
        x: validateNumber(mcpShape.x, -10000, 10000, 100),
        y: validateNumber(mcpShape.y, -10000, 10000, 100),
        rotation: validateNumber(mcpShape.rotation, 0, 2 * Math.PI, 0),
        index: mcpShape.index || "a1",
        parentId: mcpShape.parentId || "page:page",
        isLocked: Boolean(mcpShape.isLocked),
        opacity: validateNumber(mcpShape.opacity, 0, 1, 1),
        props: repairedProps,
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
        createdAt: mcpShape.createdAt,
        updatedAt: mcpShape.updatedAt || new Date().toISOString(),
        version: mcpShape.version,
      };

      return repairedShape;
    } catch (error) {
      console.error("[Converter] Error repairing shape:", error);

      return {
        id: mcpShape.id || `fallback-${Date.now()}`,
        type: "geo",
        typeName: "shape",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        props: getShapeDefaults("geo"),
        meta: {},
        updatedAt: new Date().toISOString(),
      };
    }
  }
}
