// API route for shape CRUD operations
import { type NextRequest, NextResponse } from "next/server";
import type {
  MCPShapeCreateInput,
  MCPShapeResponse,
  MCPShapesResponse,
} from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";
import {
  preprocessAIShapeData,
  preprocessAIBatchData,
  createSafeRichText,
  sanitizeRichText,
  getShapeDefaults,
  notifyWebSocketServer,
  getErrorMessage,
} from "@/src/lib";

/**
 * GET /api/shapes
 */
export async function GET(): Promise<NextResponse<MCPShapesResponse>> {
  try {
    const shapes = await shapeStorage.getAllShapes();

    return NextResponse.json({
      success: true,
      shapes,
      count: shapes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[API] Error fetching shapes:", error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
        shapes: [],
        count: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/shapes - Create shape
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<MCPShapeResponse>> {
  try {
    const rawBody: unknown = await request.json();
    const processedBody = preprocessAIShapeData(rawBody);

    if (
      !processedBody.type ||
      typeof processedBody.x !== "number" ||
      typeof processedBody.y !== "number"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type, x, y",
          shape: undefined as unknown as MCPShapeResponse["shape"],
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const shape = await shapeStorage.createShape(
      processedBody as unknown as MCPShapeCreateInput,
    );
    await notifyWebSocketServer({
      type: "shape_created",
      timestamp: new Date().toISOString(),
      shape,
    });

    return NextResponse.json(
      { success: true, shape, timestamp: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[API] Error creating shape:", error);

    // Create a safe fallback shape so AI doesn't break the canvas
    try {
      const fallbackShape = await shapeStorage.createShape({
        type: "geo",
        x: 100,
        y: 100,
        props: {
          ...getShapeDefaults("geo"),
          color: "red",
          richText: sanitizeRichText(createSafeRichText("Error - AI data was invalid")),
        },
      });

      await notifyWebSocketServer({
        type: "shape_created",
        timestamp: new Date().toISOString(),
        shape: fallbackShape,
      });

      return NextResponse.json(
        {
          success: true,
          shape: fallbackShape,
          timestamp: new Date().toISOString(),
          message: "Created fallback shape due to AI data error",
        },
        { status: 201 },
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: getErrorMessage(error),
          shape: undefined as unknown as MCPShapeResponse["shape"],
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  }
}

// Re-export for backward compatibility with batch route
export { preprocessAIBatchData, createSafeRichText };
