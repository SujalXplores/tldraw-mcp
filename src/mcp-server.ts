#!/usr/bin/env node
process.env.NODE_DISABLE_COLORS = "1";
process.env.NO_COLOR = "1";
process.env.DOTENV_CONFIG_QUIET = "true";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import fetch, { type RequestInit } from "node-fetch";
import { fileURLToPath } from "url";
import { z } from "zod";

dotenv.config();

const NEXTJS_SERVER_URL = process.env.NEXTJS_SERVER_URL ?? "http://localhost:3000";

let mcpConnected = false;

const logger = {
  debug: (message: string, data?: unknown) => {
    if (process.env.DEBUG === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "debug",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message,
          ...(data != null && { data }),
        }),
      );
    }
  },
  info: (message: string, data?: unknown) => {
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "info",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message,
          ...(data != null && { data }),
        }),
      );
    }
  },
  warn: (message: string, data?: unknown) => {
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "warning",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message,
          ...(data != null && { data }),
        }),
      );
    }
  },
  error: (message: string, data?: unknown) => {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        logger: "mcp-tldraw-server",
        message,
        ...(data != null && { data }),
      }),
    );
  },
  startup: (...args: unknown[]) => {
    if (process.env.DEBUG === "true") {
      console.error(`[STARTUP] ${args.map(String).join(" ")}`);
    }
  },
};

import {
  TLDRAW_SHAPE_TYPES,
  type TldrawShapeType,
  preprocessAIShapeData,
  sanitizeShapeProps,
  getErrorMessage,
} from "./lib/index.js";

const StrictShapePropsSchema = z
  .object({})
  .catchall(z.unknown())
  .transform((props) => {
    return props;
  });

const StrictTldrawShapeSchema = z
  .object({
    type: z.enum(TLDRAW_SHAPE_TYPES),
    x: z.number().min(-10000).max(10000),
    y: z.number().min(-10000).max(10000),
    rotation: z
      .number()
      .min(0)
      .max(2 * Math.PI)
      .optional()
      .default(0),
    opacity: z.number().min(0).max(1).optional().default(1),
    isLocked: z.boolean().optional().default(false),
    props: StrictShapePropsSchema.optional().default({}),
    meta: z.record(z.string(), z.any()).optional().default({}),
  })
  .transform((data) => {
    const preprocessed = preprocessAIShapeData(data);
    const type = preprocessed.type as TldrawShapeType;
    const sanitizedProps = sanitizeShapeProps(type, preprocessed.props as Record<string, unknown>);

    return {
      ...preprocessed,
      type,
      props: sanitizedProps,
    };
  });

const ShapeIdSchema = z.object({
  id: z.string().min(1),
});

const BatchCreateSchema = z.object({
  shapes: z.array(StrictTldrawShapeSchema).min(1).max(50),
});

const UpdateShapeSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(TLDRAW_SHAPE_TYPES).optional(),
    x: z.number().min(-10000).max(10000).optional(),
    y: z.number().min(-10000).max(10000).optional(),
    rotation: z
      .number()
      .min(0)
      .max(2 * Math.PI)
      .optional(),
    opacity: z.number().min(0).max(1).optional(),
    isLocked: z.boolean().optional(),
    props: StrictShapePropsSchema.optional(),
    meta: z.record(z.string(), z.any()).optional(),
  })
  .transform((data) => {
    if (data.props && data.type) {
      const preprocessed = preprocessAIShapeData({
        type: data.type,
        props: data.props,
      });
      data.props = sanitizeShapeProps(data.type, preprocessed.props as Record<string, unknown>);
    }
    return data;
  });

const MCPShapesResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().optional(),
  shapes: z.array(z.record(z.string(), z.any())).optional(),
  error: z.string().optional(),
});

function normalizeShapeId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("shape:") ? trimmed : `shape:${trimmed}`;
}

interface ApiShapeData {
  id?: string;
  type?: string;
  [key: string]: unknown;
}

interface ApiShapeResponse {
  shape?: { id?: string };
  [key: string]: unknown;
}

async function sendToAPI(operation: string, data: ApiShapeData | ApiShapeData[]): Promise<ApiShapeResponse | null> {
  logger.info(`API ${operation}`);

  try {
    let url: string;
    let options: RequestInit;

    // Normalize shape IDs for update/delete operations
    if (["update", "delete"].includes(operation) && !Array.isArray(data) && data.id) {
      data.id = normalizeShapeId(data.id);
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

      case "update": {
        const updateData = data as ApiShapeData;
        url = `${NEXTJS_SERVER_URL}/api/shapes/${updateData.id ?? ""}`;
        options = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        };
        break;
      }

      case "delete": {
        const deleteData = data as ApiShapeData;
        url = `${NEXTJS_SERVER_URL}/api/shapes/${deleteData.id ?? ""}`;
        options = { method: "DELETE" };
        break;
      }

      case "batch_create":
        url = `${NEXTJS_SERVER_URL}/api/shapes/batch`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shapes: data }),
        };
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API failed: ${response.status} ${response.statusText}\nBody: ${errorText}`,
      );
    }

    return (await response.json()) as ApiShapeResponse;
  } catch (error: unknown) {
    logger.error(`API ${operation} failed: ${getErrorMessage(error)}`);
    return null;
  }
}

// Server is deprecated in favor of McpServer, but we use the low-level API intentionally
// eslint-disable-next-line @typescript-eslint/no-deprecated
const server = new Server(
  {
    name: "mcp-tldraw-server",
    version: "2.3.0",
    description: "MCP server for Tldraw v4 canvas control",
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { name, arguments: args } = request.params;
    logger.info(`[${requestId}] ${name}`);

    switch (name) {
      case "create_shape": {
        const params = StrictTldrawShapeSchema.parse(args);
        const result = await sendToAPI("create", params);

        return {
          content: [
            {
              type: "text",
              text: result
                ? `Shape created. ID: ${result.shape?.id}, Type: ${params.type}`
                : "Failed to create shape.",
            },
          ],
        };
      }

      case "batch_create_shapes": {
        const params = BatchCreateSchema.parse(args);
        const result = await sendToAPI("batch_create", params.shapes);
        const types = params.shapes.map((s) => s.type).join(", ");

        return {
          content: [
            {
              type: "text",
              text: result
                ? `Created ${params.shapes.length} shapes. Types: ${types}`
                : `Failed to create ${params.shapes.length} shapes.`,
            },
          ],
        };
      }

      case "update_shape": {
        const params = UpdateShapeSchema.parse(args);
        const { id, ...updates } = params;
        const result = await sendToAPI("update", { id, ...updates });

        return {
          content: [
            {
              type: "text",
              text: result ? `Shape ${id} updated.` : `Failed to update shape ${id}.`,
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
        const rawJson: unknown = await response.json();
        const result = MCPShapesResponseSchema.parse(rawJson);

        if (result.success && result.shapes) {
          const summary = result.shapes.map((s) => `${s.type}(${String(s.x)},${String(s.y)})`).join(", ");
          return {
            content: [
              {
                type: "text",
                text: `Found ${String(result.shapes.length)} shapes:\n${summary}\n\n${JSON.stringify(result.shapes, null, 2)}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching shapes: ${result.error ?? "Unknown error"}`,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    logger.error(`[${requestId}] ${getErrorMessage(error)}`);

    if (error instanceof z.ZodError) {
      const errorDetails = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      return {
        content: [
          {
            type: "text",
            text: `Validation error: ${errorDetails}. Auto-fixes applied for text→richText, color mapping, coordinate clamping, and missing properties.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error: ${getErrorMessage(error)}`,
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: "create_shape",
        description: `Create a shape on the Tldraw v4 canvas.

Text/Note/Arrow shapes use richText for labels. Invalid inputs are auto-corrected (colors mapped, coords clamped, missing props filled).

Prefer geo shapes with richText labels over separate text shapes.

Example: {"type": "geo", "x": 100, "y": 100, "props": {"geo": "rectangle", "w": 150, "h": 100, "color": "blue", "fill": "solid", "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]}}}`,
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: TLDRAW_SHAPE_TYPES,
              description:
                "Shape type - must be one of: geo, text, arrow, draw, highlight, image, video, embed, bookmark, frame, note, line, group",
            },
            x: {
              type: "number",
              description: "X coordinate (must be between -10000 and 10000)",
              minimum: -10000,
              maximum: 10000,
            },
            y: {
              type: "number",
              description: "Y coordinate (must be between -10000 and 10000)",
              minimum: -10000,
              maximum: 10000,
            },
            rotation: {
              type: "number",
              minimum: 0,
              maximum: 6.28318530718,
              description: "Rotation in radians (0 to 2π)",
              default: 0,
            },
            opacity: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Shape opacity (0 to 1)",
              default: 1,
            },
            isLocked: {
              type: "boolean",
              description: "Whether the shape is locked",
              default: false,
            },
            props: {
              type: "object",
              description: `Shape-specific properties. Geo: geo, w, h, color, fill, dash, richText (for labels). Text: richText (required), color, font. Arrow: start/end {x,y}, richText (for labels), color, dash. Note: richText, color. All props auto-validated.`,
              additionalProperties: true,
            },
            meta: {
              type: "object",
              description: "Metadata for the shape",
              default: {},
            },
          },
          required: ["type", "x", "y"],
          additionalProperties: false,
        },
      },
      {
        name: "batch_create_shapes",
        description: `Create multiple shapes at once (max 50). Same rules as create_shape. Invalid inputs auto-corrected.`,
        inputSchema: {
          type: "object",
          properties: {
            shapes: {
              type: "array",
              description: "Array of shapes to create (max 50 shapes)",
              minItems: 1,
              maxItems: 50,
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: TLDRAW_SHAPE_TYPES,
                    description:
                      "Shape type - must be one of: geo, text, arrow, draw, highlight, image, video, embed, bookmark, frame, note, line, group",
                  },
                  x: {
                    type: "number",
                    description: "X coordinate",
                    minimum: -10000,
                    maximum: 10000,
                  },
                  y: {
                    type: "number",
                    description: "Y coordinate",
                    minimum: -10000,
                    maximum: 10000,
                  },
                  rotation: {
                    type: "number",
                    minimum: 0,
                    maximum: 6.28318530718,
                    description: "Rotation in radians",
                  },
                  opacity: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Shape opacity",
                  },
                  isLocked: {
                    type: "boolean",
                    description: "Whether the shape is locked",
                  },
                  props: {
                    type: "object",
                    description: "Shape-specific properties (auto-validated)",
                  },
                  meta: {
                    type: "object",
                    description: "Metadata for the shape",
                  },
                },
                required: ["type", "x", "y"],
                additionalProperties: false,
              },
            },
          },
          required: ["shapes"],
          additionalProperties: false,
        },
      },
      {
        name: "update_shape",
        description: `Update an existing shape. Provide the shape ID and any fields to change. Same validation rules as create_shape.`,
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Shape ID to update (format: shape:xxxxx)",
              minLength: 1,
            },
            type: {
              type: "string",
              enum: TLDRAW_SHAPE_TYPES,
              description:
                "New shape type (optional) - must be one of: geo, text, arrow, draw, highlight, image, video, embed, bookmark, frame, note, line, group",
            },
            x: {
              type: "number",
              minimum: -10000,
              maximum: 10000,
              description: "New X coordinate",
            },
            y: {
              type: "number",
              minimum: -10000,
              maximum: 10000,
              description: "New Y coordinate",
            },
            rotation: {
              type: "number",
              minimum: 0,
              maximum: 6.28318530718,
              description: "New rotation in radians",
            },
            opacity: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "New opacity",
            },
            isLocked: {
              type: "boolean",
              description: "New locked state",
            },
            props: {
              type: "object",
              description:
                "Updated shape properties (same validation rules as create_shape)",
              additionalProperties: true,
            },
            meta: {
              type: "object",
              description: "Updated metadata",
            },
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
      {
        name: "delete_shape",
        description: `Delete a shape by ID. Format: shape:xxxxx. Cannot be undone.`,
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "ID of shape to delete (format: shape:xxxxx)",
              minLength: 1,
            },
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
      {
        name: "get_shapes",
        description: `Get all shapes on the canvas with their full properties.`,
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ],
  };
});

async function runServer(): Promise<void> {
  try {
    logger.startup(`MCP Tldraw server starting → ${NEXTJS_SERVER_URL}`);

    if (process.env.NODE_ENV === "production" && !process.env.NEXTJS_SERVER_URL) {
      logger.startup("WARNING: NEXTJS_SERVER_URL not set in production");
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    mcpConnected = true;

    logger.startup("MCP server ready");
    process.stdin.resume();
  } catch (error: unknown) {
    logger.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception:", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled rejection:", { reason: String(reason) });
  process.exit(1);
});

// Auto-start: works both as direct execution and via npx/bin
const isDirectRun =
  process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] ||
    process.argv[1].endsWith("tldraw-mcp") ||
    process.argv[1].endsWith("mcp-server.js"));

if (isDirectRun) {
  runServer().catch((error: unknown) => {
    logger.error("Server startup failed:", { error: getErrorMessage(error) });
    process.exit(1);
  });
}

export default runServer;
