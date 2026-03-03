import { MCPShapeCreateInput } from "@/src/types";
import { NextResponse } from "next/server";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

/**
 * Test endpoint for WebSocket broadcasting
 */
export async function POST(): Promise<NextResponse> {
  try {
    const { shapeStorage } = await import("@/src/services/singleton");

    const testShapeData: MCPShapeCreateInput<"geo"> = {
      type: "geo" as const,
      x: 300,
      y: 300,
      rotation: 0,
      opacity: 1,
      isLocked: false,
      props: {
        w: 100,
        h: 100,
        geo: "ellipse",
        color: "blue",
        fill: "solid",
      },
      meta: {},
    };

    const shape = await shapeStorage.createShape(testShapeData);
    console.log(`[TEST] Shape created: ${shape.id}`);

    // Send HTTP request to WebSocket server
    try {
      const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "shape_created",
          timestamp: new Date().toISOString(),
          shape: shape,
        }),
      });

      console.log(`[TEST] WS response: ${response.status}`);

      if (response.ok) {
        const result = await response.json();

        return NextResponse.json({
          success: true,
          message: "Test shape created and HTTP notification sent successfully",
          shape: shape,
          wsNotification: {
            success: true,
            clientsCount: result.clientsCount,
            wsServerUrl: WS_SERVER_URL,
          },
          timestamp: new Date().toISOString(),
        });
      } else {
        const errorText = await response.text();

        return NextResponse.json({
          success: false,
          message: "Shape created but WebSocket notification failed",
          shape: shape,
          wsNotification: {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            wsServerUrl: WS_SERVER_URL,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (fetchError: any) {
      return NextResponse.json({
        success: false,
        message: "Shape created but WebSocket server unreachable",
        shape: shape,
        wsNotification: {
          success: false,
          error: `Network error: ${fetchError.message}`,
          wsServerUrl: WS_SERVER_URL,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
