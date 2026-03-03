import type { MCPShapeCreateInput } from "@/src/types";
import { NextResponse } from "next/server";
import { getErrorMessage } from "@/src/lib";

const WS_SERVER_URL = process.env.WS_SERVER_URL ?? "http://localhost:4000";

interface BroadcastResult {
  clientsCount: number;
}

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

      if (response.ok) {
        const result = (await response.json()) as BroadcastResult;

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
            error: `HTTP ${String(response.status)}: ${errorText}`,
            wsServerUrl: WS_SERVER_URL,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (fetchError: unknown) {
      return NextResponse.json({
        success: false,
        message: "Shape created but WebSocket server unreachable",
        shape: shape,
        wsNotification: {
          success: false,
          error: `Network error: ${getErrorMessage(fetchError)}`,
          wsServerUrl: WS_SERVER_URL,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: unknown) {
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
