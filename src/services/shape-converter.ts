import type { TLShape, TLShapeId, IndexKey, TLParentId } from "tldraw";
import type { MCPShape } from "../types";
import { getShapeDefaults } from "../lib/shape-defaults";
import { sanitizeShapeProps } from "../lib/shape-sanitizer";
import { validateNumber, validateShapeType } from "../lib/validation";

export class ShapeConverterService {
  toTldrawShape(mcpShape: MCPShape): TLShape {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
      const sanitizedProps = sanitizeShapeProps(
        safeType,
        mcpShape.props as Record<string, unknown>,
      );

      // Constructed from validated data - cast needed for discriminated union compatibility
      const tldrawShape = {
        id: safeId as TLShapeId,
        typeName: "shape" as const,
        type: safeType,
        x: safeX,
        y: safeY,
        rotation: safeRotation,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        index: (mcpShape.index ?? "a1") as IndexKey,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        parentId: (mcpShape.parentId ?? "page:page") as TLParentId,
        isLocked: mcpShape.isLocked,
        opacity: safeOpacity,
        props: sanitizedProps,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
      } as unknown as TLShape;

      return tldrawShape;
    } catch (error: unknown) {
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!shape || typeof shape !== "object") {
          console.error(`[Converter] Skipping invalid shape at index ${String(index)}`);
          errorCount++;
          return;
        }
        convertedShapes.push(this.toTldrawShape(shape));
      } catch (error: unknown) {
        console.error(`[Converter] Failed to convert shape ${String(index)}:`, error);
        errorCount++;
      }
    });

    if (errorCount > 0) {
      console.warn(
        `[Converter] Batch conversion: ${String(convertedShapes.length)} ok, ${String(errorCount)} failed`,
      );
    }

    return convertedShapes;
  }

  private createFallbackShape(): TLShape {
    return {
      id: `fallback-${Date.now()}` as TLShapeId,
      typeName: "shape" as const,
      type: "geo",
      x: 100,
      y: 100,
      rotation: 0,
      index: "a1" as IndexKey,
      parentId: "page:page" as TLParentId,
      isLocked: false,
      opacity: 1,
      props: getShapeDefaults("geo"),
      meta: {},
    } as unknown as TLShape;
  }

  fromTldrawShape(tldrawShape: TLShape): MCPShape {
    try {
      // Cast needed: TLShape uses branded/discriminated union props,
      // while MCPShape uses our simplified prop interfaces
      return {
        id: tldrawShape.id,
        type: tldrawShape.type,
        typeName: "shape",
        x: tldrawShape.x,
        y: tldrawShape.y,
        rotation: tldrawShape.rotation,
        index: tldrawShape.index,
        parentId: tldrawShape.parentId,
        isLocked: tldrawShape.isLocked,
        opacity: tldrawShape.opacity,
        props: tldrawShape.props as unknown as MCPShape["props"],
        meta: tldrawShape.meta,
        updatedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.error("[Converter] Error converting Tldraw shape:", error);
      throw error;
    }
  }

  fromTldrawShapes(tldrawShapes: TLShape[]): MCPShape[] {
    return tldrawShapes.map((shape, index) => {
      try {
        return this.fromTldrawShape(shape);
      } catch (error: unknown) {
        console.error(`[Converter] Failed to convert shape ${String(index)}:`, error);
        throw error;
      }
    });
  }

  validateAndRepair(mcpShape: MCPShape): MCPShape {
    try {
      const validType = validateShapeType(mcpShape.type);
      const repairedProps = sanitizeShapeProps(
        validType,
        mcpShape.props as Record<string, unknown>,
      );

      const repairedShape = {
        id: typeof mcpShape.id === "string" ? mcpShape.id : `shape:${Date.now()}`,
        type: validType,
        typeName: "shape" as const,
        x: validateNumber(mcpShape.x, -10000, 10000, 100),
        y: validateNumber(mcpShape.y, -10000, 10000, 100),
        rotation: validateNumber(mcpShape.rotation, 0, 2 * Math.PI, 0),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        index: mcpShape.index ?? "a1",
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        parentId: mcpShape.parentId ?? "page:page",
        isLocked: mcpShape.isLocked,
        opacity: validateNumber(mcpShape.opacity, 0, 1, 1),
        props: repairedProps,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
        createdAt: mcpShape.createdAt,
        updatedAt: mcpShape.updatedAt ?? new Date().toISOString(),
        version: mcpShape.version,
      } as MCPShape;

      return repairedShape;
    } catch (error: unknown) {
      console.error("[Converter] Error repairing shape:", error);

      return {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        id: mcpShape.id ?? `fallback-${Date.now()}`,
        type: "geo",
        typeName: "shape" as const,
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
      } as MCPShape;
    }
  }
}
