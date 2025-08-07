// src/app/api/test-ws/route.ts - FIXED VERSION
import { MCPShapeCreateInput } from "@/src/types";
import { NextResponse } from "next/server";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

/**
 * Test API using HTTP notification to WebSocket server
 */
export async function POST(): Promise<NextResponse> {
  try {
    console.log("[TEST] 🧪 Creating test shape via HTTP notification...");

    // Import only shapeStorage (NOT webSocketService)
    const { shapeStorage } = await import("@/src/services/singleton");

    const testShapeData: MCPShapeCreateInput<"geo"> = {
      type: "geo" as const, // Use 'as const' to ensure literal type
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

    console.log("[TEST] 🏪 Creating test shape in storage...");
    const shape = await shapeStorage.createShape(testShapeData);

    console.log("[TEST] ✅ Test shape created:", {
      id: shape.id,
      type: shape.type,
      position: `(${shape.x}, ${shape.y})`,
    });

    console.log(
      `[TEST] 📡 Sending HTTP notification to ${WS_SERVER_URL}/broadcast`
    );

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

      console.log(`[TEST] 📡 HTTP response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log("[TEST] ✅ WebSocket server response:", result);
        console.log(
          `[TEST] 📊 Successfully sent to ${result.clientsCount} browser clients`
        );

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
        console.error(
          "[TEST] ❌ WebSocket server error:",
          response.status,
          errorText
        );

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
      console.error("[TEST] ❌ HTTP request failed:", fetchError.message);

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
    console.error("[TEST] ❌ Error in test:", error);
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
