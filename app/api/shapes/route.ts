// src/app/api/shapes/route.ts - WORKING VERSION
import { NextRequest, NextResponse } from "next/server";
import type { MCPShapeResponse, MCPShapesResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

/**
 * Notify WebSocket server to broadcast to browsers via HTTP
 */
async function notifyWebSocketServer(message: any): Promise<boolean> {
  try {
    console.log("[API] 📡 Sending HTTP notification to WebSocket server...");

    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[API] ❌ WebSocket server error:", response.status, error);
      return false;
    }

    const result = await response.json();
    console.log(
      `[API] ✅ Successfully broadcasted to ${result.clientsCount} browsers`
    );
    return true;
  } catch (error: any) {
    console.error("[API] ❌ HTTP notification failed:", error.message);
    return false;
  }
}

/**
 * GET /api/shapes - Get all shapes
 */
export async function GET(): Promise<NextResponse<MCPShapesResponse>> {
  try {
    console.log("[API] 📥 GET /api/shapes");

    const shapes = await shapeStorage.getAllShapes();
    console.log(`[API] ✅ Found ${shapes.length} shapes`);

    return NextResponse.json({
      success: true,
      shapes,
      count: shapes.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API] ❌ Error fetching shapes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch shapes",
        shapes: [],
        count: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shapes - Create shape (MCP Server → Browser)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<MCPShapeResponse>> {
  try {
    console.log("[API] 📥 POST /api/shapes - 🤖 MCP Server creating shape");

    const body = await request.json();
    console.log("[API] 📋 Shape data:", JSON.stringify(body, null, 2));

    if (
      !body.type ||
      typeof body.x !== "number" ||
      typeof body.y !== "number"
    ) {
      console.error("[API] ❌ Invalid shape data");
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: type, x, y",
          shape: {} as any,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Create shape in storage
    console.log("[API] 🏪 Creating shape in storage...");
    const shape = await shapeStorage.createShape(body);
    console.log("[API] ✅ Shape created:", {
      id: shape.id,
      type: shape.type,
      position: `(${shape.x}, ${shape.y})`,
    });

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shape_created",
      timestamp: new Date().toISOString(),
      shape: shape,
    });

    console.log(
      `[API] ${
        notified
          ? "✅ Shape broadcasted to browsers"
          : "⚠️ Broadcast failed but shape created"
      }`
    );

    return NextResponse.json(
      {
        success: true,
        shape,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] ❌ Error creating shape:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create shape",
        shape: {} as any,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
