// src/app/api/shapes/batch/route.ts - CORRECTED with AI preprocessing
import { NextRequest, NextResponse } from "next/server";
import type { MCPShapesResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";
import { preprocessAIBatchData, createSafeRichText } from "../route";

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

    const { shapes: rawShapesToCreate } = await request.json();
    console.log(
      "[API] 📋 Raw AI batch data:",
      JSON.stringify(rawShapesToCreate, null, 2)
    );

    if (!Array.isArray(rawShapesToCreate)) {
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

    // CRITICAL: Preprocess ALL AI shapes to fix text/richText issues
    const processedShapes = preprocessAIBatchData(rawShapesToCreate);
    console.log(
      "[API] 🔄 Processed AI batch data:",
      JSON.stringify(processedShapes, null, 2)
    );

    if (processedShapes.length === 0) {
      console.log("[API] ⚠️ No valid shapes after preprocessing");
      return NextResponse.json(
        {
          success: false,
          error: "No valid shapes provided",
          shapes: [],
          count: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(
      `[API] 🏭 Batch creating ${processedShapes.length} preprocessed shapes...`
    );
    const createdShapes = await shapeStorage.batchCreateShapes(processedShapes);

    // Log shape creation details
    const shapeDetails = createdShapes.map((s) => ({
      id: s.id,
      type: s.type,
      hasRichText: !!(s.props as any)?.richText,
      hasText: !!(s.props as any)?.text,
      color: (s.props as any)?.color,
    }));
    console.log("[API] 📊 Created shapes details:", shapeDetails);

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shapes_batch_created",
      timestamp: new Date().toISOString(),
      shapes: createdShapes,
    });

    console.log(`[API] ✅ Batch created ${createdShapes.length} shapes`);
    console.log(
      "[API] 🎯 Shape types created:",
      createdShapes.map((s) => s.type).join(", ")
    );

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

    // Create fallback shapes so AI doesn't break the canvas
    try {
      console.log("[API] 🛟 Creating fallback shapes...");
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
        { status: 201 }
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
        { status: 500 }
      );
    }
  }
}
