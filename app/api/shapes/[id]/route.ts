import { type NextRequest, NextResponse } from "next/server";
import type { MCPApiResponse, MCPShapeResponse, MCPShapeUpdateInput } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";
import { notifyWebSocketServer, getErrorMessage } from "@/src/lib";

/**
 * GET /api/shapes/[id]
 */
export async function GET(
  _request: NextRequest,
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
          shape: undefined as unknown as MCPShapeResponse["shape"],
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
  } catch (error: unknown) {
    console.error(`[API] Error fetching shape ${id}:`, error);
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

/**
 * PUT /api/shapes/[id]
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<MCPShapeResponse>> {
  const { id } = await context.params;

  try {
    const body = (await request.json()) as MCPShapeUpdateInput;
    const shape = await shapeStorage.updateShape({ ...body, id });

    if (!shape) {
      return NextResponse.json(
        {
          success: false,
          error: `Shape ${id} not found`,
          shape: undefined as unknown as MCPShapeResponse["shape"],
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    await notifyWebSocketServer({
      type: "shape_updated",
      timestamp: new Date().toISOString(),
      shape,
    });

    return NextResponse.json({
      success: true,
      shape,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(`[API] Error updating shape ${id}:`, error);
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

/**
 * DELETE /api/shapes/[id]
 */
export async function DELETE(
  _request: NextRequest,
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

    await notifyWebSocketServer({
      type: "shape_deleted",
      timestamp: new Date().toISOString(),
      shapeId: id,
    });

    return NextResponse.json({
      success: true,
      message: `Shape ${id} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(`[API] Error deleting shape ${id}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
