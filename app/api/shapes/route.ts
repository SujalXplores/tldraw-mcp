// API route for shape CRUD operations
import { NextRequest, NextResponse } from "next/server";
import type { MCPShapeResponse, MCPShapesResponse } from "@/src/types";
import { shapeStorage } from "@/src/services/singleton";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

// Helper function to create tldraw-compatible richText
function createSafeRichText(text?: string) {
  const safeText =
    typeof text === "string" && text.trim().length > 0 ? text.trim() : "hello";

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: safeText,
          },
        ],
      },
    ],
  };
}

function sanitizeRichText(richText: any): any {
  try {
    if (
      richText &&
      typeof richText === "object" &&
      Array.isArray(richText.content)
    ) {
      const hasValidText = richText.content.some((block: any) =>
        block?.content?.some(
          (node: any) => typeof node.text === "string" && node.text.trim()
        )
      );
      return hasValidText ? richText : createSafeRichText();
    }
  } catch (e) {
    console.warn("[Converter] Invalid richText, falling back");
  }
  return createSafeRichText();
}

// Preprocess AI data to conform to official tldraw schema
function preprocessAIData(rawData: any): any {
  if (!rawData || typeof rawData !== "object") {
    console.warn("[API] Invalid AI data, creating fallback");
    return {
      type: "geo",
      x: 100,
      y: 100,
      props: {
        geo: "rectangle",
        w: 100,
        h: 60,
        color: "blue",
        labelColor: "black",
        fill: "none",
        dash: "draw",
        size: "m",
        font: "draw",
        align: "middle",
        verticalAlign: "middle",
        growY: 0,
        scale: 1,
        url: "",
      },
    };
  }

  console.log("[API] Preprocessing AI data");

  const processed = { ...rawData };

  // Ensure basic shape structure
  if (!processed.type) processed.type = "geo";
  if (typeof processed.x !== "number") processed.x = 100;
  if (typeof processed.y !== "number") processed.y = 100;
  if (!processed.props || typeof processed.props !== "object")
    processed.props = {};

  // Shape-specific preprocessing based on official tldraw schema
  switch (processed.type) {
    case "text":
      // Text shapes MUST have richText, never text field
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        console.log(`[API] Converted AI text "${textContent}" to richText`);
      } else if (!processed.props.richText) {
        processed.props.richText = createSafeRichText("Text");
        console.log("[API] Created default richText");
      }

      // Ensure required text shape props
      if (typeof processed.props.autoSize !== "boolean")
        processed.props.autoSize = true;
      if (typeof processed.props.w !== "number") processed.props.w = 8;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      if (!processed.props.textAlign) processed.props.textAlign = "start";
      if (!processed.props.font) processed.props.font = "draw";
      if (!processed.props.size) processed.props.size = "m";
      if (!processed.props.color) processed.props.color = "black";
      break;

    case "geo":
      // Geo shapes can have richText for labels (optional)
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        console.log(
          `[API] Converted geo label "${textContent}" to richText`
        );
      }

      // Ensure required geo props
      if (!processed.props.geo) processed.props.geo = "rectangle";
      if (typeof processed.props.w !== "number") processed.props.w = 100;
      if (typeof processed.props.h !== "number") processed.props.h = 100;
      if (!processed.props.color) processed.props.color = "black";
      if (!processed.props.labelColor) processed.props.labelColor = "black";
      if (!processed.props.fill) processed.props.fill = "none";
      if (!processed.props.dash) processed.props.dash = "draw";
      if (!processed.props.size) processed.props.size = "m";
      if (!processed.props.font) processed.props.font = "draw";
      if (!processed.props.align) processed.props.align = "middle";
      if (!processed.props.verticalAlign)
        processed.props.verticalAlign = "middle";
      if (typeof processed.props.growY !== "number") processed.props.growY = 0;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      if (!processed.props.url) processed.props.url = "";
      break;

    case "arrow":
      // Arrows use simple text string (not richText)
      if (processed.props.text && typeof processed.props.text !== "string") {
        processed.props.text = String(processed.props.text);
        console.log("[API] Fixed arrow text to string");
      }

      // Ensure arrow points
      if (
        !processed.props.start ||
        typeof processed.props.start.x !== "number"
      ) {
        processed.props.start = { x: 0, y: 0 };
      }
      if (!processed.props.end || typeof processed.props.end.x !== "number") {
        processed.props.end = { x: 100, y: 100 };
      }

      // Ensure other arrow props
      if (!processed.props.color) processed.props.color = "black";
      if (!processed.props.labelColor) processed.props.labelColor = "black";
      if (!processed.props.arrowheadStart)
        processed.props.arrowheadStart = "none";
      if (!processed.props.arrowheadEnd) processed.props.arrowheadEnd = "arrow";
      if (typeof processed.props.bend !== "number") processed.props.bend = 0;
      if (!processed.props.fill) processed.props.fill = "none";
      if (!processed.props.dash) processed.props.dash = "draw";
      if (!processed.props.size) processed.props.size = "m";
      if (!processed.props.font) processed.props.font = "draw";
      if (!processed.props.kind) processed.props.kind = "arc";
      if (typeof processed.props.elbowMidPoint !== "number")
        processed.props.elbowMidPoint = 0;
      if (typeof processed.props.labelPosition !== "number")
        processed.props.labelPosition = 0.5;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      if (!processed.props.text) processed.props.text = "";
      break;

    case "note":
      // Notes use richText, not simple text field
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        console.log(
          `[API] Converted note text "${textContent}" to richText`
        );
      } else if (!processed.props.richText) {
        processed.props.richText = createSafeRichText("");
        console.log("[API] Created default richText for note");
      }

      // Ensure note props
      if (!processed.props.color) processed.props.color = "black";
      if (!processed.props.labelColor) processed.props.labelColor = "black";
      if (!processed.props.size) processed.props.size = "m";
      if (!processed.props.font) processed.props.font = "draw";
      if (!processed.props.align) processed.props.align = "middle";
      if (!processed.props.verticalAlign)
        processed.props.verticalAlign = "middle";
      if (typeof processed.props.growY !== "number") processed.props.growY = 0;
      if (typeof processed.props.fontSizeAdjustment !== "number")
        processed.props.fontSizeAdjustment = 0;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      if (!processed.props.url) processed.props.url = "";
      break;

    case "frame":
      // Frame shapes include color
      if (!processed.props.color) processed.props.color = "black";
      if (typeof processed.props.w !== "number") processed.props.w = 160;
      if (typeof processed.props.h !== "number") processed.props.h = 90;
      if (!processed.props.name) processed.props.name = "";
      break;

    case "embed":
      // Embed shapes only have h, url, w
      if (typeof processed.props.h !== "number") processed.props.h = 300;
      if (!processed.props.url) processed.props.url = "";
      if (typeof processed.props.w !== "number") processed.props.w = 300;
      break;

    case "bookmark":
      // Bookmark shapes include h and w
      if (processed.props.assetId === undefined) processed.props.assetId = null;
      if (typeof processed.props.h !== "number") processed.props.h = 100;
      if (!processed.props.url) processed.props.url = "";
      if (typeof processed.props.w !== "number") processed.props.w = 200;
      break;

    case "image":
      if (!processed.props.altText) processed.props.altText = "";
      if (processed.props.assetId === undefined) processed.props.assetId = null;
      if (processed.props.crop === undefined) processed.props.crop = null;
      if (typeof processed.props.flipX !== "boolean")
        processed.props.flipX = false;
      if (typeof processed.props.flipY !== "boolean")
        processed.props.flipY = false;
      if (typeof processed.props.h !== "number") processed.props.h = 100;
      if (typeof processed.props.playing !== "boolean")
        processed.props.playing = true;
      if (!processed.props.url) processed.props.url = "";
      if (typeof processed.props.w !== "number") processed.props.w = 100;
      break;

    case "video":
      if (!processed.props.altText) processed.props.altText = "";
      if (processed.props.assetId === undefined) processed.props.assetId = null;
      if (typeof processed.props.autoplay !== "boolean")
        processed.props.autoplay = false;
      if (typeof processed.props.h !== "number") processed.props.h = 100;
      if (typeof processed.props.playing !== "boolean")
        processed.props.playing = false;
      if (typeof processed.props.time !== "number") processed.props.time = 0;
      if (!processed.props.url) processed.props.url = "";
      if (typeof processed.props.w !== "number") processed.props.w = 100;
      break;

    case "line":
      if (!processed.props.color) processed.props.color = "black";
      if (!processed.props.dash) processed.props.dash = "draw";
      if (!processed.props.size) processed.props.size = "m";
      if (!processed.props.spline) processed.props.spline = "line";
      if (!processed.props.points) processed.props.points = {};
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      break;

    case "draw":
      if (!processed.props.color) processed.props.color = "black";
      if (!processed.props.fill) processed.props.fill = "none";
      if (!processed.props.dash) processed.props.dash = "draw";
      if (!processed.props.size) processed.props.size = "m";
      if (!Array.isArray(processed.props.segments))
        processed.props.segments = [];
      if (typeof processed.props.isComplete !== "boolean")
        processed.props.isComplete = false;
      if (typeof processed.props.isClosed !== "boolean")
        processed.props.isClosed = false;
      if (typeof processed.props.isPen !== "boolean")
        processed.props.isPen = false;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      break;

    case "highlight":
      if (!processed.props.color) processed.props.color = "yellow";
      if (typeof processed.props.isComplete !== "boolean")
        processed.props.isComplete = false;
      if (typeof processed.props.isPen !== "boolean")
        processed.props.isPen = false;
      if (typeof processed.props.scale !== "number") processed.props.scale = 1;
      if (!Array.isArray(processed.props.segments))
        processed.props.segments = [];
      if (!processed.props.size) processed.props.size = "m";
      break;

    case "group":
      break;

    default:
      console.log(
        `[API] Unknown shape type: ${processed.type}, treating as geo`
      );
      processed.type = "geo";
      break;
  }

  // Fix color values using tldraw's official color palette
  const validColors = [
    "black",
    "blue",
    "green",
    "grey",
    "light-blue",
    "light-green",
    "light-red",
    "light-violet",
    "orange",
    "red",
    "violet",
    "white",
    "yellow",
  ];

  if (processed.props.color && !validColors.includes(processed.props.color)) {
    const colorMap: Record<string, string> = {
      purple: "violet",
      pink: "light-red",
      cyan: "light-blue",
      lime: "light-green",
      magenta: "light-violet",
      brown: "orange",
      navy: "blue",
      maroon: "red",
      teal: "green",
      silver: "grey",
      gold: "yellow",
      crimson: "red",
      emerald: "green",
      amber: "yellow",
      coral: "light-red",
      mint: "light-green",
      lavender: "light-violet",
      slate: "grey",
    };

    const mappedColor = colorMap[processed.props.color.toLowerCase()];
    if (mappedColor) {
      console.log(
        `[API] Mapped color: ${processed.props.color} → ${mappedColor}`
      );
      processed.props.color = mappedColor;
    } else {
      console.warn(
        `[API] Invalid color "${processed.props.color}", using black`
      );
      processed.props.color = "black";
    }
  }

  // Fix labelColor for shapes that have it
  if (
    processed.props.labelColor &&
    !validColors.includes(processed.props.labelColor)
  ) {
    processed.props.labelColor = "black";
  }

  console.log(`[API] Preprocessed: type=${processed.type}`);
  return processed;
}

// Batch preprocessing
function preprocessAIBatchData(rawShapes: any[]): any[] {
  if (!Array.isArray(rawShapes)) {
    console.error("[API] Expected array of shapes");
    return [];
  }

  console.log(`[API] Preprocessing batch of ${rawShapes.length} shapes`);

  const processed = rawShapes
    .filter((shape) => shape !== null && shape !== undefined)
    .map((shape, index) => {
      try {
        return preprocessAIData(shape);
      } catch (error) {
        console.error(`[API] Error preprocessing shape ${index}:`, error);
        return {
          type: "geo",
          x: 100 + index * 120, // Spread them out
          y: 100,
          props: {
            geo: "rectangle",
            w: 80,
            h: 60,
            color: "red",
            labelColor: "black",
            fill: "none",
            dash: "draw",
            size: "m",
            font: "draw",
            align: "middle",
            verticalAlign: "middle",
            growY: 0,
            scale: 1,
            url: "",
          },
        };
      }
    });

  console.log(`[API] Batch preprocessed: ${processed.length} shapes`);
  return processed;
}

/**
 * Notify WebSocket server to broadcast to browsers via HTTP
 */
async function notifyWebSocketServer(message: any): Promise<boolean> {
  try {
    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("[API] WS broadcast failed:", response.status);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("[API] WS notification failed:", error.message);
    return false;
  }
}

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
  } catch (error: any) {
    console.error("[API] Error fetching shapes:", error);
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
 * POST /api/shapes - Create shape
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<MCPShapeResponse>> {
  try {
    const rawBody = await request.json();
    const processedBody = preprocessAIData(rawBody);

    if (
      !processedBody.type ||
      typeof processedBody.x !== "number" ||
      typeof processedBody.y !== "number"
    ) {
      console.error("[API] Invalid shape data after preprocessing");
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
    const shape = await shapeStorage.createShape(processedBody);
    console.log(`[API] Shape created: ${shape.id} (${shape.type})`);

    // Notify browsers via HTTP
    const notified = await notifyWebSocketServer({
      type: "shape_created",
      timestamp: new Date().toISOString(),
      shape: shape,
    });

    return NextResponse.json(
      {
        success: true,
        shape,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API] Error creating shape:", error);

    // Create a safe fallback shape so AI doesn't break the canvas
    try {
      const fallbackShape = await shapeStorage.createShape({
        type: "geo",
        x: 100,
        y: 100,
        props: {
          geo: "rectangle",
          w: 100,
          h: 60,
          color: "red",
          labelColor: "black",
          fill: "none",
          dash: "draw",
          size: "m",
          font: "draw",
          align: "middle",
          verticalAlign: "middle",
          growY: 0,
          scale: 1,
          url: "",
          richText: sanitizeRichText(
            createSafeRichText("Error - AI data was invalid")
          ),
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
        { status: 201 }
      );
    } catch (fallbackError) {
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
}

// Export the preprocessing functions for use in batch route
export { preprocessAIData, preprocessAIBatchData, createSafeRichText };
