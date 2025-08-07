#!/usr/bin/env node

process.env.NODE_DISABLE_COLORS = "1";
process.env.NO_COLOR = "1";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import type { RequestInit as NodeFetchRequestInit } from "node-fetch";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { z } from "zod";
import { SHAPE_DEFAULTS } from "./types";

// Load environment variables
dotenv.config();

// Configuration
const NEXTJS_SERVER_URL =
  process.env.NEXTJS_SERVER_URL || "http://localhost:3000";

// Simple logger that won't interfere with JSON-RPC
const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[INFO]", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[WARN]", ...args);
    }
  },
  error: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ERROR]", ...args);
    }
  },
};

// --- Hardcoded tldraw types for validation ---
const TLDRAW_SHAPE_TYPES = [
  "geo",
  "text",
  "arrow",
  "draw",
  "highlight",
  "image",
  "video",
  "embed",
  "bookmark",
  "frame",
  "note",
  "line",
  "group",
] as const;

const TLDRAW_COLORS = [
  "black",
  "grey",
  "white",
  "blue",
  "light-blue",
  "green",
  "light-green",
  "red",
  "light-red",
  "orange",
  "yellow",
  "violet",
  "light-violet",
] as const;

const TLDRAW_GEO_TYPES = [
  "rectangle",
  "ellipse",
  "diamond",
  "triangle",
  "trapezoid",
  "rhombus",
  "hexagon",
  "octagon",
  "star",
  "oval",
  "x-box",
  "check-box",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "cloud",
  "heart",
] as const;

const TLDRAW_FILLS = ["none", "semi", "solid", "pattern"] as const;
const TLDRAW_DASHES = ["draw", "dashed", "dotted", "solid"] as const;
const TLDRAW_SIZES = ["s", "m", "l", "xl"] as const;
const TLDRAW_FONTS = ["draw", "sans", "serif", "mono"] as const;
const TLDRAW_ALIGNS = ["start", "middle", "end"] as const;

type TldrawShapeType = (typeof TLDRAW_SHAPE_TYPES)[number];
type TldrawColor = (typeof TLDRAW_COLORS)[number];

// --- Color mapping ---
const COLOR_MAPPING: Record<string, TldrawColor> = {
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
};

function normalizeColor(color: string): TldrawColor {
  const lowerColor = color.toLowerCase();
  if (TLDRAW_COLORS.includes(lowerColor as any))
    return lowerColor as TldrawColor;
  if (COLOR_MAPPING[lowerColor]) return COLOR_MAPPING[lowerColor];
  logger.warn(`Unknown color "${color}", using "black" as fallback`);
  return "black";
}

// --- Helper function to create proper richText structure ---
function createRichText(text: string) {
  if (!text || text.trim() === "") {
    // Return a minimal valid richText structure for empty text
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: " ", // Use a space instead of empty string
            },
          ],
        },
      ],
    };
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      },
    ],
  };
}

// --- Zod schemas with updated types ---

const RichTextSpanSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1), // Ensure text is not empty
  styles: z
    .array(z.enum(["bold", "italic", "underline", "strike", "code"]))
    .optional(),
});
const RichTextParagraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(RichTextSpanSchema),
});
const RichTextDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(RichTextParagraphSchema),
});

const GeoPropsSchema = z
  .object({
    w: z.number().optional(),
    h: z.number().optional(),
    geo: z.enum(TLDRAW_GEO_TYPES).optional(),
    color: z.string().optional(),
    labelColor: z.string().optional(),
    fill: z.enum(TLDRAW_FILLS).optional(),
    dash: z.enum(TLDRAW_DASHES).optional(),
    size: z.enum(TLDRAW_SIZES).optional(),
    font: z.enum(TLDRAW_FONTS).optional(),
    align: z.enum(TLDRAW_ALIGNS).optional(),
    verticalAlign: z.enum(TLDRAW_ALIGNS).optional(),
    text: z.string().optional(),
  })
  .catchall(z.any());

const TextPropsSchema = z
  .object({
    color: z.string().optional(),
    font: z.enum(TLDRAW_FONTS).optional(),
    size: z.enum(TLDRAW_SIZES).optional(),
    textAlign: z.enum(TLDRAW_ALIGNS).optional(),
    richText: RichTextDocSchema.optional(),
    text: z.string().optional(), // Allow text property for conversion
  })
  .catchall(z.any());

const GenericPropsSchema = z.record(z.any());

const TldrawShapeSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("geo"),
      props: GeoPropsSchema.optional().default({}),
    }),
    z.object({
      type: z.literal("text"),
      props: TextPropsSchema.optional().default({}),
    }),
    z.object({
      type: z.enum(["arrow", "draw", "highlight", "note", "line"]),
      props: GenericPropsSchema.optional().default({}),
    }),
    z.object({
      type: z.enum(["image", "video", "embed", "bookmark", "frame", "group"]),
      props: GenericPropsSchema.optional().default({}),
    }),
  ])
  .and(
    z.object({
      x: z.number(),
      y: z.number(),
      rotation: z.number().optional().default(0),
      opacity: z.number().min(0).max(1).optional().default(1),
      isLocked: z.boolean().optional().default(false),
      meta: z.record(z.any()).optional().default({}),
    })
  );

const ShapeIdSchema = z.object({ id: z.string() });
const BatchCreateSchema = z.object({ shapes: z.array(TldrawShapeSchema) });

const UpdateShapeSchema = z.object({
  id: z.string(),
  type: z.enum(TLDRAW_SHAPE_TYPES).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  rotation: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  isLocked: z.boolean().optional(),
  props: z.record(z.any()).optional(),
  meta: z.record(z.any()).optional(),
});

const MCPShapesResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().optional(),
  shapes: z.array(z.record(z.any())).optional(),
  error: z.string().optional(),
});

// --- Default shape properties (fallback if SHAPE_DEFAULTS is not available) ---
const DEFAULT_SHAPE_PROPS: Record<string, () => any> = {
  geo: () => ({
    w: 100,
    h: 100,
    geo: "rectangle",
    color: "black",
    fill: "none",
    dash: "draw",
    size: "m",
  }),
  text: () => ({
    color: "black",
    size: "m",
    font: "draw",
    textAlign: "start",
    richText: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text",
            },
          ],
        },
      ],
    },
  }),
};

// --- Rewritten Shape Sanitization ---
function sanitizeShapeProps(type: TldrawShapeType, props: any): any {
  if (!props || typeof props !== "object") props = {};

  // Use SHAPE_DEFAULTS if available, otherwise use fallback
  let getDefaultProps;
  try {
    getDefaultProps = SHAPE_DEFAULTS?.[type];
  } catch (e) {
    getDefaultProps = DEFAULT_SHAPE_PROPS[type];
  }

  const defaults = getDefaultProps ? getDefaultProps() : {};
  const sanitized = { ...defaults, ...props };

  if ("color" in sanitized && sanitized.color)
    sanitized.color = normalizeColor(sanitized.color);
  if ("labelColor" in sanitized && sanitized.labelColor)
    sanitized.labelColor = normalizeColor(sanitized.labelColor);
  if ("fill" in sanitized && !TLDRAW_FILLS.includes(sanitized.fill))
    sanitized.fill = "none";
  if ("dash" in sanitized && !TLDRAW_DASHES.includes(sanitized.dash))
    sanitized.dash = "draw";
  if ("size" in sanitized && !TLDRAW_SIZES.includes(sanitized.size))
    sanitized.size = "m";
  if ("font" in sanitized && !TLDRAW_FONTS.includes(sanitized.font))
    sanitized.font = "draw";

  if (type === "geo") {
    if (sanitized.geo && !TLDRAW_GEO_TYPES.includes(sanitized.geo)) {
      sanitized.geo = "rectangle";
    }
    // Ensure geo shapes don't have empty text
    if (sanitized.text === "") {
      delete sanitized.text;
    }
  }

  if (type === "text") {
    // Handle text conversion to richText format
    if (sanitized.text && !sanitized.richText) {
      sanitized.richText = createRichText(sanitized.text);
      delete sanitized.text; // Remove the old text property
    } else if (!sanitized.richText) {
      // If no richText and no text, create default
      const textDefaults = DEFAULT_SHAPE_PROPS.text();
      sanitized.richText = textDefaults.richText;
    }

    // Validate richText structure and ensure no empty text nodes
    if (sanitized.richText && sanitized.richText.content) {
      sanitized.richText.content = sanitized.richText.content.map(
        (paragraph: any) => {
          if (paragraph.content) {
            paragraph.content = paragraph.content.filter((span: any) => {
              return span.text && span.text.trim() !== "";
            });

            // If all spans were filtered out, add a space
            if (paragraph.content.length === 0) {
              paragraph.content = [
                {
                  type: "text",
                  text: " ",
                },
              ];
            }
          }
          return paragraph;
        }
      );
    }

    // Remove any remaining text property
    if (sanitized.text) delete sanitized.text;
  }

  return sanitized;
}

// --- Utility & API Communication ---
function normalizeShapeId(id: string): string {
  return id.startsWith("shape:") ? id : `shape:${id}`;
}

async function sendToAPI(operation: string, data: any): Promise<any> {
  logger.info(`AI operation: ${operation}`);

  try {
    let url: string;
    let options: NodeFetchRequestInit;

    if (["update", "delete"].includes(operation) && data?.id) {
      data.id = normalizeShapeId(data.id);
    }

    if (
      data.props &&
      data.type &&
      (operation === "create" || operation === "update")
    ) {
      data.props = sanitizeShapeProps(data.type, data.props);
    }

    if (operation === "batch_create" && Array.isArray(data)) {
      data = data.map((shape: any) => ({
        ...shape,
        props: sanitizeShapeProps(shape.type, shape.props),
      }));
    }

    switch (operation) {
      case "create":
        url = `${NEXTJS_SERVER_URL}/api/shapes`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        };
        break;
      case "update":
        url = `${NEXTJS_SERVER_URL}/api/shapes/${data.id}`;
        options = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        };
        break;
      case "delete":
        url = `${NEXTJS_SERVER_URL}/api/shapes/${data.id}`;
        options = { method: "DELETE" };
        break;
      case "batch_create":
        url = `${NEXTJS_SERVER_URL}/api/shapes/batch`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shapes: data }),
        };
        break;
      default:
        logger.warn(`Unknown operation: ${operation}`);
        return null;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API failed: ${response.status} ${response.statusText}\nBody: ${errorText}`
      );
    }
    return await response.json();
  } catch (error: any) {
    logger.error(`AI operation failed for ${operation}:`, error.message);
    return null;
  }
}

// --- MCP Server and Handlers ---
const server = new Server(
  {
    name: "mcp-tldraw-server",
    version: "1.0.0",
    description:
      "MCP server for Claude Desktop to control Tldraw canvas via API with proper validation",
  },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "create_shape": {
        const params = TldrawShapeSchema.parse(args);
        const result = await sendToAPI("create", params);
        return {
          content: [
            {
              type: "text",
              text: result
                ? `Shape created. ID: ${result.shape?.id}`
                : "Failed to create shape.",
            },
          ],
        };
      }
      case "batch_create_shapes": {
        const params = BatchCreateSchema.parse(args);
        const result = await sendToAPI("batch_create", params.shapes);
        return {
          content: [
            {
              type: "text",
              text: result
                ? `${params.shapes.length} shapes created.`
                : `Failed to create shapes.`,
            },
          ],
        };
      }
      case "update_shape": {
        // Use the new, correct schema for updates
        const params = UpdateShapeSchema.parse(args);
        const { id, ...updates } = params;
        const result = await sendToAPI("update", { id, ...updates });
        return {
          content: [
            {
              type: "text",
              text: result
                ? `Shape ${id} updated.`
                : `Failed to update shape ${id}.`,
            },
          ],
        };
      }
      case "delete_shape": {
        const params = ShapeIdSchema.parse(args);
        const result = await sendToAPI("delete", params);
        return {
          content: [
            {
              type: "text",
              text: result
                ? `Shape ${params.id} deleted.`
                : `Failed to delete shape ${params.id}.`,
            },
          ],
        };
      }
      case "get_shapes": {
        const response = await fetch(`${NEXTJS_SERVER_URL}/api/shapes`);
        const rawJson = await response.json();
        const result = MCPShapesResponseSchema.parse(rawJson);
        if (result.success && result.shapes) {
          return {
            content: [
              {
                type: "text",
                text: `Current shapes:\n\n${JSON.stringify(
                  result.shapes,
                  null,
                  2
                )}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching shapes: ${
                  result.error || "Unknown error"
                }`,
              },
            ],
          };
        }
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    logger.error(`Error handling Claude Desktop request:`, error);
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: `Validation Error: ${error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// -----------------
// Tool List
// -----------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info("Claude Desktop requesting available tools");

  return {
    tools: [
      {
        name: "create_shape",
        description:
          "Create a new shape on the Tldraw canvas (visible to browser users). Valid colors: black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: TLDRAW_SHAPE_TYPES },
            x: { type: "number", description: "X coordinate" },
            y: { type: "number", description: "Y coordinate" },
            rotation: { type: "number", minimum: 0, maximum: 360 },
            opacity: { type: "number", minimum: 0, maximum: 1 },
            isLocked: { type: "boolean" },
            props: {
              type: "object",
              description:
                "Shape-specific properties like color, size, etc. Colors will be automatically validated.",
            },
            meta: { type: "object" },
          },
          required: ["type", "x", "y"],
        },
      },
      {
        name: "batch_create_shapes",
        description: "Create multiple shapes at once on the canvas",
        inputSchema: {
          type: "object",
          properties: {
            shapes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: TLDRAW_SHAPE_TYPES },
                  x: { type: "number" },
                  y: { type: "number" },
                  rotation: { type: "number" },
                  opacity: { type: "number" },
                  isLocked: { type: "boolean" },
                  props: { type: "object" },
                  meta: { type: "object" },
                },
                required: ["type", "x", "y"],
              },
            },
          },
          required: ["shapes"],
        },
      },
      {
        name: "update_shape",
        description: "Update an existing shape on the canvas",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: TLDRAW_SHAPE_TYPES },
            x: { type: "number" },
            y: { type: "number" },
            rotation: { type: "number" },
            opacity: { type: "number" },
            isLocked: { type: "boolean" },
            props: { type: "object" },
            meta: { type: "object" },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_shape",
        description: "Delete a shape from the canvas",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      },
      {
        name: "get_shapes",
        description: "Get all shapes currently on the canvas",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

// -----------------
// Start MCP Server
// -----------------
async function runServer(): Promise<void> {
  try {
    logger.info("Starting Claude Desktop MCP server with validation...");
    logger.info(`Target Next.js server: ${NEXTJS_SERVER_URL}`);

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.NEXTJS_SERVER_URL
    ) {
      logger.warn("WARNING: NEXTJS_SERVER_URL is not set in production mode.");
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("MCP Server ready - Claude Desktop can now control the canvas");

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

// Global error handlers
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

// Start the server if run directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runServer().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}

export default runServer;
