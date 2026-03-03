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
import fetch, { type RequestInit } from "node-fetch";
import { fileURLToPath } from "url";
import { z } from "zod";

dotenv.config();

const NEXTJS_SERVER_URL = process.env.NEXTJS_SERVER_URL || "http://localhost:3000";

let mcpConnected = false;

const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.DEBUG === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "debug",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        }),
      );
    }
  },
  info: (message: string, data?: any) => {
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "info",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        }),
      );
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "warning",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        }),
      );
    }
  },
  error: (message: string, data?: any) => {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        logger: "mcp-tldraw-server",
        message: message,
        ...(data && { data }),
      }),
    );
  },
  startup: (...args: any[]) => {
    if (process.env.DEBUG === "true") {
      console.error(`[STARTUP] ${args.join(" ")}`);
    }
  },
};

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
const TLDRAW_ARROWHEADS = [
  "none",
  "arrow",
  "triangle",
  "square",
  "dot",
  "pipe",
  "diamond",
  "inverted",
  "bar",
] as const;

type TldrawShapeType = (typeof TLDRAW_SHAPE_TYPES)[number];
type TldrawColor = (typeof TLDRAW_COLORS)[number];

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
  indigo: "violet",
  turquoise: "light-blue",
  crimson: "red",
  emerald: "green",
  amber: "yellow",
  coral: "light-red",
  mint: "light-green",
  lavender: "light-violet",
  slate: "grey",
  tan: "orange",
};

function normalizeColor(color: any): TldrawColor {
  if (typeof color !== "string") {
    if (mcpConnected) {
      logger.warn(`Invalid color type "${typeof color}", using "black"`);
    }
    return "black";
  }

  const lowerColor = color.toLowerCase().trim();

  if (TLDRAW_COLORS.includes(lowerColor as any)) {
    return lowerColor as TldrawColor;
  }

  if (COLOR_MAPPING[lowerColor]) {
    if (mcpConnected) {
      logger.info(`Mapped color "${color}" → "${COLOR_MAPPING[lowerColor]}"`);
    }
    return COLOR_MAPPING[lowerColor];
  }

  if (mcpConnected) {
    logger.warn(`Unknown color "${color}", using "black" as fallback`);
  }
  return "black";
}

function validateNumber(
  value: any,
  min: number,
  max: number,
  fallback: number,
  field: string,
): number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    if (mcpConnected) {
      logger.warn(`Invalid ${field}: ${value}, using ${fallback}`);
    }
    return fallback;
  }

  const clamped = Math.max(min, Math.min(max, value));
  if (clamped !== value && mcpConnected) {
    logger.info(`Clamped ${field}: ${value} → ${clamped}`);
  }

  return clamped;
}

function validateEnum<T extends readonly string[]>(
  value: any,
  validValues: T,
  fallback: T[number],
  field: string,
): T[number] {
  if (typeof value !== "string") {
    if (mcpConnected) {
      logger.warn(`Invalid ${field} type: ${typeof value}, using "${fallback}"`);
    }
    return fallback;
  }

  const match = validValues.find((v) => v.toLowerCase() === value.toLowerCase());
  if (match) {
    return match;
  }

  if (mcpConnected) {
    logger.warn(`Invalid ${field}: "${value}", using "${fallback}"`);
  }
  return fallback;
}

function createSafeRichText(text?: string) {
  const safeText = typeof text === "string" && text.trim() ? text.trim() : "placeholder";
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

function preprocessAIShapeData(rawData: any): any {
  if (!rawData || typeof rawData !== "object") {
    if (mcpConnected) {
      logger.warn("[MCP] Invalid AI shape data, creating fallback");
    }
    return {
      type: "geo",
      x: 100,
      y: 100,
      props: SAFE_SHAPE_DEFAULTS.geo(),
    };
  }

  if (mcpConnected) {
    logger.debug("[MCP] Preprocessing AI shape data");
  }
  const processed = { ...rawData };

  // Ensure basic fields exist
  if (!processed.type) processed.type = "geo";
  if (typeof processed.x !== "number") processed.x = 100;
  if (typeof processed.y !== "number") processed.y = 100;
  if (!processed.props || typeof processed.props !== "object") processed.props = {};

  switch (processed.type) {
    case "text":
      // Text shapes MUST use richText, never text field
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        if (mcpConnected) {
          logger.info(`[MCP] Converted AI text "${textContent}" to richText`);
        }
      }
      break;

    case "geo":
      // Geo shapes can have richText for labels (optional)
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        if (mcpConnected) {
          logger.info(`[MCP] Converted geo label "${textContent}" to richText`);
        }
      }
      break;

    case "arrow":
      // Arrows use simple text string (not richText)
      if (processed.props.text && typeof processed.props.text !== "string") {
        processed.props.text = String(processed.props.text);
        if (mcpConnected) {
          logger.info("[MCP] Fixed arrow text to string");
        }
      }
      break;

    case "note":
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        if (mcpConnected) {
          logger.info(`[MCP] Converted note text "${textContent}" to richText`);
        }
      }
      break;
  }

  if (mcpConnected) {
    logger.debug("[MCP] AI shape data preprocessed");
  }
  return processed;
}

const SAFE_SHAPE_DEFAULTS = {
  geo: () => ({
    align: "middle" as const,
    color: "black" as const,
    dash: "draw" as const,
    fill: "none" as const,
    font: "draw" as const,
    geo: "rectangle" as const,
    growY: 0,
    h: 100,
    labelColor: "black" as const,
    scale: 1,
    size: "m" as const,
    url: "",
    verticalAlign: "middle" as const,
    w: 100,
  }),

  text: () => ({
    autoSize: true,
    color: "black" as const,
    font: "draw" as const,
    richText: createSafeRichText("Text"),
    scale: 1,
    size: "m" as const,
    textAlign: "start" as const,
    w: 8,
  }),

  arrow: () => ({
    arrowheadEnd: "arrow" as const,
    arrowheadStart: "none" as const,
    bend: 0,
    color: "black" as const,
    dash: "draw" as const,
    elbowMidPoint: 0,
    end: { x: 100, y: 100 },
    fill: "none" as const,
    font: "draw" as const,
    kind: "arc" as const,
    labelColor: "black" as const,
    labelPosition: 0.5,
    scale: 1,
    size: "m" as const,
    start: { x: 0, y: 0 },
    text: "",
  }),

  draw: () => ({
    color: "black" as const,
    dash: "draw" as const,
    fill: "none" as const,
    isClosed: false,
    isComplete: false,
    isPen: false,
    scale: 1,
    segments: [],
    size: "m" as const,
  }),

  highlight: () => ({
    color: "yellow" as const,
    isComplete: false,
    isPen: false,
    scale: 1,
    segments: [],
    size: "m" as const,
  }),

  note: () => ({
    align: "middle" as const,
    color: "black" as const,
    font: "draw" as const,
    fontSizeAdjustment: 0,
    growY: 0,
    labelColor: "black" as const,
    richText: createSafeRichText(""),
    scale: 1,
    size: "m" as const,
    url: "",
    verticalAlign: "middle" as const,
  }),

  frame: () => ({
    color: "black" as const,
    h: 90,
    name: "",
    w: 160,
  }),

  group: () => ({}),

  embed: () => ({
    h: 300,
    url: "",
    w: 300,
  }),

  bookmark: () => ({
    assetId: null,
    h: 100,
    url: "",
    w: 200,
  }),

  image: () => ({
    altText: "",
    assetId: null,
    crop: null,
    flipX: false,
    flipY: false,
    h: 100,
    playing: true,
    url: "",
    w: 100,
  }),

  video: () => ({
    altText: "",
    assetId: null,
    autoplay: false,
    h: 100,
    playing: false,
    time: 0,
    url: "",
    w: 100,
  }),

  line: () => ({
    color: "black" as const,
    dash: "draw" as const,
    points: {},
    scale: 1,
    size: "m" as const,
    spline: "line" as const,
  }),
} as const;

function sanitizeShapeProps(type: TldrawShapeType, props: any): any {
  if (mcpConnected) {
    logger.debug(`Sanitizing ${type} shape props`);
  }

  if (!props || typeof props !== "object") {
    if (mcpConnected) {
      logger.warn(`Invalid props for ${type}, using defaults`);
    }
    return SAFE_SHAPE_DEFAULTS[type]();
  }

  const defaults = SAFE_SHAPE_DEFAULTS[type]();
  const sanitized = { ...defaults } as any;

  // Type-specific sanitization
  switch (type) {
    case "geo":
      sanitized.align = validateEnum(props.align, TLDRAW_ALIGNS, "middle", "align");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.geo = validateEnum(props.geo, TLDRAW_GEO_TYPES, "rectangle", "geo");
      sanitized.growY = validateNumber(props.growY, 0, 1000, 0, "growY");
      sanitized.h = validateNumber(props.h, 1, 2000, 100, "height");
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        TLDRAW_ALIGNS,
        "middle",
        "verticalAlign",
      );
      sanitized.w = validateNumber(props.w, 1, 2000, 100, "width");

      // Handle richText for geo labels
      if (props.richText && typeof props.richText === "object") {
        // Defensive: fix empty text nodes
        const content =
          props.richText.content?.map((para: any) => ({
            ...para,
            content:
              para.content
                ?.filter((span: any) => typeof span.text === "string" && span.text.trim())
                .map((span: any) => ({
                  ...span,
                  text: span.text.trim(),
                })) ?? [],
          })) ?? [];

        sanitized.richText = { ...props.richText, content };
      }
      break;

    case "text":
      sanitized.autoSize = typeof props.autoSize === "boolean" ? props.autoSize : true;
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");
      sanitized.textAlign = validateEnum(
        props.textAlign,
        TLDRAW_ALIGNS,
        "start",
        "textAlign",
      );
      sanitized.w = validateNumber(props.w, 1, 2000, 8, "width");

      // Handle richText vs text conversion
      if (props.richText && typeof props.richText === "object") {
        // Defensive: fix empty text nodes
        const content =
          props.richText.content?.map((para: any) => ({
            ...para,
            content:
              para.content
                ?.filter((span: any) => typeof span.text === "string" && span.text.trim())
                .map((span: any) => ({
                  ...span,
                  text: span.text.trim(),
                })) ?? [],
          })) ?? [];

        sanitized.richText = { ...props.richText, content };
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
        if (mcpConnected) {
          logger.info(`[MCP] Converted text "${props.text}" to richText in sanitizer`);
        }
      } else {
        sanitized.richText = createSafeRichText("Text");
      }
      break;

    case "arrow":
      sanitized.arrowheadEnd = validateEnum(
        props.arrowheadEnd,
        TLDRAW_ARROWHEADS,
        "arrow",
        "arrowheadEnd",
      );
      sanitized.arrowheadStart = validateEnum(
        props.arrowheadStart,
        TLDRAW_ARROWHEADS,
        "none",
        "arrowheadStart",
      );
      sanitized.bend = validateNumber(props.bend, -2, 2, 0, "bend");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
      sanitized.elbowMidPoint = validateNumber(
        props.elbowMidPoint,
        0,
        1,
        0,
        "elbowMidPoint",
      );
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.kind = validateEnum(props.kind, ["arc", "elbow"] as const, "arc", "kind");
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.labelPosition = validateNumber(
        props.labelPosition,
        0,
        1,
        0.5,
        "labelPosition",
      );
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");

      // Handle arrow points
      if (
        props.start &&
        typeof props.start === "object" &&
        typeof props.start.x === "number" &&
        typeof props.start.y === "number"
      ) {
        sanitized.start = {
          x: validateNumber(props.start.x, -5000, 5000, 0, "start.x"),
          y: validateNumber(props.start.y, -5000, 5000, 0, "start.y"),
        };
      }

      if (
        props.end &&
        typeof props.end === "object" &&
        typeof props.end.x === "number" &&
        typeof props.end.y === "number"
      ) {
        sanitized.end = {
          x: validateNumber(props.end.x, -5000, 5000, 100, "end.x"),
          y: validateNumber(props.end.y, -5000, 5000, 100, "end.y"),
        };
      }

      if (typeof props.text === "string") {
        sanitized.text = props.text;
      }
      break;

    case "draw":
    case "highlight":
      sanitized.color = normalizeColor(props.color);
      sanitized.isComplete =
        typeof props.isComplete === "boolean" ? props.isComplete : false;
      sanitized.isPen = typeof props.isPen === "boolean" ? props.isPen : false;
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.segments = Array.isArray(props.segments) ? props.segments : [];
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");

      if (type === "draw") {
        sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
        sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
        sanitized.isClosed = typeof props.isClosed === "boolean" ? props.isClosed : false;
      }
      break;

    case "note":
      sanitized.align = validateEnum(props.align, TLDRAW_ALIGNS, "middle", "align");
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.fontSizeAdjustment = validateNumber(
        props.fontSizeAdjustment,
        -5,
        5,
        0,
        "fontSizeAdjustment",
      );
      sanitized.growY = validateNumber(props.growY, 0, 1000, 0, "growY");
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        TLDRAW_ALIGNS,
        "middle",
        "verticalAlign",
      );

      // Handle richText for notes
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = props.richText;
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
        if (mcpConnected) {
          logger.info(`[MCP] Converted note text "${props.text}" to richText`);
        }
      }
      break;

    case "frame":
      sanitized.color = normalizeColor(props.color);
      sanitized.h = validateNumber(props.h, 10, 2000, 90, "height");
      sanitized.name = typeof props.name === "string" ? props.name : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 160, "width");
      break;

    case "embed":
      sanitized.h = validateNumber(props.h, 50, 2000, 300, "height");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 300, "width");
      break;

    case "bookmark":
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.h = validateNumber(props.h, 50, 2000, 100, "height");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 200, "width");
      break;

    case "image":
      sanitized.altText = typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.crop = props.crop && typeof props.crop === "object" ? props.crop : null;
      sanitized.flipX = typeof props.flipX === "boolean" ? props.flipX : false;
      sanitized.flipY = typeof props.flipY === "boolean" ? props.flipY : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100, "height");
      sanitized.playing = typeof props.playing === "boolean" ? props.playing : true;
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 100, "width");
      break;

    case "video":
      sanitized.altText = typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.autoplay = typeof props.autoplay === "boolean" ? props.autoplay : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100, "height");
      sanitized.playing = typeof props.playing === "boolean" ? props.playing : false;
      sanitized.time = validateNumber(props.time, 0, Infinity, 0, "time");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 100, "width");
      break;

    case "line":
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
      sanitized.points =
        props.points && typeof props.points === "object" ? props.points : {};
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");
      sanitized.spline = validateEnum(
        props.spline,
        ["line", "cubic"] as const,
        "line",
        "spline",
      );
      break;

    case "group":
      // Groups typically have no props
      break;

    default:
      if (mcpConnected) {
        logger.warn(`Unknown shape type: ${type}, using minimal props`);
      }
      break;
  }

  if (mcpConnected) {
    logger.debug(`Sanitized ${type} props:`, Object.keys(sanitized));
  }
  return sanitized;
}

const StrictShapePropsSchema = z
  .object({})
  .catchall(z.any())
  .transform((props, ctx) => {
    // Props will be sanitized by sanitizeShapeProps
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
    meta: z.record(z.any()).optional().default({}),
  })
  .transform((data, ctx) => {
    logger.debug(`[MCP] Processing shape: ${data.type}`);

    const preprocessed = preprocessAIShapeData(data);

    // Then sanitize props based on shape type
    const sanitizedProps = sanitizeShapeProps(preprocessed.type, preprocessed.props);

    const result = {
      ...preprocessed,
      props: sanitizedProps,
    };

    logger.debug(
      `[MCP] Shape processed: ${result.type} with props: ${Object.keys(result.props)}`,
    );
    return result;
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
    meta: z.record(z.any()).optional(),
  })
  .transform((data, ctx) => {
    // Preprocess and sanitize props if provided
    if (data.props && data.type) {
      const preprocessed = preprocessAIShapeData({
        type: data.type,
        props: data.props,
      });
      data.props = sanitizeShapeProps(data.type, preprocessed.props);
    }
    return data;
  });

const MCPShapesResponseSchema = z.object({
  success: z.boolean(),
  count: z.number().optional(),
  shapes: z.array(z.record(z.any())).optional(),
  error: z.string().optional(),
});

function normalizeShapeId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("shape:") ? trimmed : `shape:${trimmed}`;
}

async function sendToAPI(operation: string, data: any): Promise<any> {
  logger.info(`API ${operation}`);

  try {
    let url: string;
    let options: RequestInit;

    // Normalize shape IDs for update/delete operations
    if (["update", "delete"].includes(operation) && data?.id) {
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
        throw new Error(`Unknown operation: ${operation}`);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API failed: ${response.status} ${response.statusText}\nBody: ${errorText}`,
      );
    }

    return await response.json();
  } catch (error: any) {
    logger.error(`API ${operation} failed: ${error.message}`);
    return null;
  }
}

const server = new Server(
  {
    name: "mcp-tldraw-server",
    version: "2.3.0",
    description: "MCP server for Tldraw v3.15.1 canvas control",
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  },
);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
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
        const rawJson = await response.json();
        const result = MCPShapesResponseSchema.parse(rawJson);

        if (result.success && result.shapes) {
          const summary = result.shapes.map((s) => `${s.type}(${s.x},${s.y})`).join(", ");
          return {
            content: [
              {
                type: "text",
                text: `Found ${result.shapes.length} shapes:\n${summary}\n\n${JSON.stringify(result.shapes, null, 2)}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Error fetching shapes: ${result.error || "Unknown error"}`,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    logger.error(`[${requestId}] ${error.message}`);

    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
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
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_shape",
        description: `Create a shape on the Tldraw v3.15.1 canvas.

Text/Note shapes use richText; arrows use plain text. Invalid inputs are auto-corrected (colors mapped, coords clamped, missing props filled).

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
              description: `Shape-specific properties. Geo: geo, w, h, color, fill, dash, richText (for labels). Text: richText (required), color, font. Arrow: start/end {x,y}, text (string). Note: richText, color. All props auto-validated.`,
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
  } catch (error) {
    logger.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection:", { reason: String(reason) });
  process.exit(1);
});

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runServer().catch((error) => {
    logger.error("Server startup failed:", { error: error.message });
    process.exit(1);
  });
}

export default runServer;
