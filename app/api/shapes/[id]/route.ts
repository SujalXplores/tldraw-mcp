import { NextRequest, NextResponse } from "next/server";
import type { MCPApiResponse, MCPShapeResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

async function notifyWebSocketServer(message: any): Promise<boolean> {
  try {
    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      await response.json();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * GET /api/shapes/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<MCPShapeResponse>> {
  const { id } = await context.params;

  try {
    const shape = await shapeStorage.getShape(id);

    if (!shape) {
      return NextResponse.json(
        {
          success: false,
          error: `Shape ${id} not found`,
          shape: {} as any,
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      shape,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[API] Error fetching shape ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch shape",
        shape: {} as any,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/shapes/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<MCPShapeResponse>> {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const shape = await shapeStorage.updateShape({ id, ...body });

    if (!shape) {
      return NextResponse.json(
        {
          success: false,
          error: `Shape ${id} not found`,
          shape: {} as any,
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shape_updated",
      timestamp: new Date().toISOString(),
      shape: shape,
    });

    return NextResponse.json({
      success: true,
      shape,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[API] Error updating shape ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update shape",
        shape: {} as any,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/shapes/[id]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<MCPApiResponse>> {
  const { id } = await context.params;

  try {
    const deleted = await shapeStorage.deleteShape(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `Shape ${id} not found`,
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shape_deleted",
      timestamp: new Date().toISOString(),
      shapeId: id,
    });

    return NextResponse.json({
      success: true,
      message: `Shape ${id} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[API] Error deleting shape ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete shape",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
