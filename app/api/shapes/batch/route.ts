import { NextRequest, NextResponse } from "next/server";
import type { MCPShapesResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";
import {
  preprocessAIBatchData,
  createSafeRichText,
  notifyWebSocketServer,
} from "@/src/lib";

/**
 * POST /api/shapes/batch - Batch create shapes
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<MCPShapesResponse>> {
  try {
    const { shapes: rawShapesToCreate } = await request.json();

    if (!Array.isArray(rawShapesToCreate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Expected an array of shapes",
          shapes: [],
          count: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const processedShapes = preprocessAIBatchData(rawShapesToCreate);

    if (processedShapes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid shapes provided",
          shapes: [],
          count: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const createdShapes = await shapeStorage.batchCreateShapes(processedShapes as any);
    await notifyWebSocketServer({
      type: "shapes_batch_created",
      timestamp: new Date().toISOString(),
      shapes: createdShapes,
    });

    return NextResponse.json(
      {
        success: true,
        shapes: createdShapes,
        count: createdShapes.length,
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[API] Error batch creating shapes:", error);

    // Fallback: create error indicator shapes
    try {
      const fallbackShapes = await shapeStorage.batchCreateShapes([
        {
          type: "geo",
          x: 100,
          y: 100,
          props: {
            geo: "rectangle",
            w: 200,
            h: 80,
            color: "red",
            labelColor: "black",
            fill: "none",
            dash: "draw",
            size: "m",
            font: "draw",
            align: "middle",
            verticalAlign: "middle",
            growY: 0,
            richText: createSafeRichText("AI Error - Data was invalid"),
          },
        },
        {
          type: "text",
          x: 100,
          y: 200,
          props: {
            autoSize: true,
            color: "red",
            font: "draw",
            richText: createSafeRichText("Error: AI sent invalid shape data"),
            scale: 1,
            size: "m",
            textAlign: "start",
            w: 8,
          },
        },
      ]);

      await notifyWebSocketServer({
        type: "shapes_batch_created",
        timestamp: new Date().toISOString(),
        shapes: fallbackShapes,
      });

      return NextResponse.json(
        {
          success: true,
          shapes: fallbackShapes,
          count: fallbackShapes.length,
          timestamp: new Date().toISOString(),
          message: "Created fallback shapes due to AI data error",
        },
        { status: 201 },
      );
    } catch (fallbackError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to create shapes",
          shapes: [],
          count: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  }
}
