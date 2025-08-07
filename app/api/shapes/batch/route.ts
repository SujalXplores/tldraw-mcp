// src/app/api/shapes/batch/route.ts - WORKING VERSION
import { NextRequest, NextResponse } from "next/server";
import type { MCPShapesResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

async function notifyWebSocketServer(message: any): Promise<boolean> {
  try {
    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) return false;

    const result = await response.json();
    console.log(
      `[API] ✅ Batch broadcasted to ${result.clientsCount} browsers`
    );
    return true;
  } catch (error: any) {
    console.error("[API] ❌ Batch notification failed:", error.message);
    return false;
  }
}

/**
 * POST /api/shapes/batch - Batch create shapes (MCP Server → Browser)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<MCPShapesResponse>> {
  try {
    console.log(
      "[API] 📥 POST /api/shapes/batch - 🤖 MCP Server batch creation"
    );

    const { shapes: shapesToCreate } = await request.json();

    if (!Array.isArray(shapesToCreate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Expected an array of shapes",
          shapes: [],
          count: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`[API] 🏭 Batch creating ${shapesToCreate.length} shapes...`);
    const createdShapes = await shapeStorage.batchCreateShapes(shapesToCreate);

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shapes_batch_created",
      timestamp: new Date().toISOString(),
      shapes: createdShapes,
    });

    console.log(`[API] ✅ Batch created ${createdShapes.length} shapes`);

    return NextResponse.json(
      {
        success: true,
        shapes: createdShapes,
        count: createdShapes.length,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] ❌ Error batch creating shapes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create shapes",
        shapes: [],
        count: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
