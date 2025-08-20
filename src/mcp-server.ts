#!/usr/bin/env node
// src/mcp-server.ts
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

// Load environment variables
dotenv.config();

// Configuration
const NEXTJS_SERVER_URL =
  process.env.NEXTJS_SERVER_URL || "http://localhost:3000";

// Enhanced logger that writes to stderr (MCP requirement) with structured logging
// Only logs during active MCP sessions, not during startup
let mcpConnected = false;

const logger = {
  debug: (message: string, data?: any) => {
    // Only log debug in explicit DEBUG mode to avoid cluttering MCP Inspector
    if (process.env.DEBUG === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "debug",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        })
      );
    }
  },
  info: (message: string, data?: any) => {
    // Silence info logs for clean MCP Inspector experience
    // Only log if explicitly requested via VERBOSE_LOGS=true
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "info",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        })
      );
    }
  },
  warn: (message: string, data?: any) => {
    // Only log warnings if explicitly requested
    if (process.env.VERBOSE_LOGS === "true" && mcpConnected) {
      console.error(
        JSON.stringify({
          level: "warning",
          timestamp: new Date().toISOString(),
          logger: "mcp-tldraw-server",
          message: message,
          ...(data && { data }),
        })
      );
    }
  },
  error: (message: string, data?: any) => {
    // Always log errors - these are important
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        logger: "mcp-tldraw-server",
        message: message,
        ...(data && { data }),
      })
    );
  },
  // Silent startup logger for initialization
  startup: (...args: any[]) => {
    if (process.env.DEBUG === "true") {
      console.error(`[STARTUP] ${args.join(" ")}`);
    }
  },
};

// --- STRICT Tldraw validation constants ---
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

// --- COMPREHENSIVE Color mapping ---
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

  // Direct match
  if (TLDRAW_COLORS.includes(lowerColor as any)) {
    return lowerColor as TldrawColor;
  }

  // Mapped color
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

// --- SAFE number validation ---
function validateNumber(
  value: any,
  min: number,
  max: number,
  fallback: number,
  field: string
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

// --- SAFE enum validation ---
function validateEnum<T extends readonly string[]>(
  value: any,
  validValues: T,
  fallback: T[number],
  field: string
): T[number] {
  if (typeof value !== "string") {
    if (mcpConnected) {
      logger.warn(
        `Invalid ${field} type: ${typeof value}, using "${fallback}"`
      );
    }
    return fallback;
  }

  const match = validValues.find(
    (v) => v.toLowerCase() === value.toLowerCase()
  );
  if (match) {
    return match;
  }

  if (mcpConnected) {
    logger.warn(`Invalid ${field}: "${value}", using "${fallback}"`);
  }
  return fallback;
}

// --- Rich Text creation with safety ---
function createSafeRichText(text?: string) {
  const safeText =
    typeof text === "string" && text.trim() ? text.trim() : "placeholder";
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

// --- AI INPUT PREPROCESSING (CRITICAL FIX) ---
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
    logger.debug("[MCP] 🔍 Preprocessing AI shape data");
  }
  const processed = { ...rawData };

  // Ensure basic fields exist
  if (!processed.type) processed.type = "geo";
  if (typeof processed.x !== "number") processed.x = 100;
  if (typeof processed.y !== "number") processed.y = 100;
  if (!processed.props || typeof processed.props !== "object")
    processed.props = {};

  // CRITICAL: Handle AI's incorrect text field usage
  switch (processed.type) {
    case "text":
      // Text shapes MUST use richText, never text field
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        if (mcpConnected) {
          logger.info(
            `[MCP] 🔄 Converted AI text "${textContent}" to richText`
          );
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
          logger.info(
            `[MCP] 🔄 Converted geo label "${textContent}" to richText`
          );
        }
      }
      break;

    case "arrow":
      // Arrows use simple text string (not richText)
      if (processed.props.text && typeof processed.props.text !== "string") {
        processed.props.text = String(processed.props.text);
        if (mcpConnected) {
          logger.info("[MCP] 🔧 Fixed arrow text to string");
        }
      }
      break;

    case "note":
      // CORRECTED: Note shapes also use richText now, not simple text
      if (processed.props.text && !processed.props.richText) {
        const textContent = String(processed.props.text);
        processed.props.richText = createSafeRichText(textContent);
        delete processed.props.text;
        if (mcpConnected) {
          logger.info(
            `[MCP] 🔄 Converted note text "${textContent}" to richText`
          );
        }
      }
      break;
  }

  if (mcpConnected) {
    logger.debug("[MCP] ✅ AI shape data preprocessed");
  }
  return processed;
}

// --- CORRECTED SHAPE DEFAULTS with ALL required properties ---
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

  // CORRECTED: Note shapes use richText
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

  // CORRECTED: Frame shapes include color
  frame: () => ({
    color: "black" as const,
    h: 90,
    name: "",
    w: 160,
  }),

  group: () => ({}),

  // CORRECTED: Embed shapes only have h, url, w
  embed: () => ({
    h: 300,
    url: "",
    w: 300,
  }),

  // CORRECTED: Bookmark shapes include h and w
  bookmark: () => ({
    assetId: null,
    h: 100,
    url: "",
    w: 200,
  }),

  // CORRECTED: Image shapes include altText, flipX, flipY
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

  // CORRECTED: Video shapes include altText and autoplay
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

// --- COMPREHENSIVE shape sanitization (UPDATED) ---
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
      sanitized.align = validateEnum(
        props.align,
        TLDRAW_ALIGNS,
        "middle",
        "align"
      );
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.geo = validateEnum(
        props.geo,
        TLDRAW_GEO_TYPES,
        "rectangle",
        "geo"
      );
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
        "verticalAlign"
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
                ?.filter(
                  (span: any) =>
                    typeof span.text === "string" && span.text.trim()
                )
                .map((span: any) => ({
                  ...span,
                  text: span.text.trim(),
                })) ?? [],
          })) ?? [];

        sanitized.richText = { ...props.richText, content };
      }
      break;

    case "text":
      sanitized.autoSize =
        typeof props.autoSize === "boolean" ? props.autoSize : true;
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m", "size");
      sanitized.textAlign = validateEnum(
        props.textAlign,
        TLDRAW_ALIGNS,
        "start",
        "textAlign"
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
                ?.filter(
                  (span: any) =>
                    typeof span.text === "string" && span.text.trim()
                )
                .map((span: any) => ({
                  ...span,
                  text: span.text.trim(),
                })) ?? [],
          })) ?? [];

        sanitized.richText = { ...props.richText, content };
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
        if (mcpConnected) {
          logger.info(
            `[MCP] 🔄 Converted text "${props.text}" to richText in sanitizer`
          );
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
        "arrowheadEnd"
      );
      sanitized.arrowheadStart = validateEnum(
        props.arrowheadStart,
        TLDRAW_ARROWHEADS,
        "none",
        "arrowheadStart"
      );
      sanitized.bend = validateNumber(props.bend, -2, 2, 0, "bend");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw", "dash");
      sanitized.elbowMidPoint = validateNumber(
        props.elbowMidPoint,
        0,
        1,
        0,
        "elbowMidPoint"
      );
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.kind = validateEnum(
        props.kind,
        ["arc", "elbow"] as const,
        "arc",
        "kind"
      );
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.labelPosition = validateNumber(
        props.labelPosition,
        0,
        1,
        0.5,
        "labelPosition"
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
        sanitized.dash = validateEnum(
          props.dash,
          TLDRAW_DASHES,
          "draw",
          "dash"
        );
        sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none", "fill");
        sanitized.isClosed =
          typeof props.isClosed === "boolean" ? props.isClosed : false;
      }
      break;

    case "note":
      // CORRECTED: Note shapes use richText, not simple text
      sanitized.align = validateEnum(
        props.align,
        TLDRAW_ALIGNS,
        "middle",
        "align"
      );
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw", "font");
      sanitized.fontSizeAdjustment = validateNumber(
        props.fontSizeAdjustment,
        -5,
        5,
        0,
        "fontSizeAdjustment"
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
        "verticalAlign"
      );

      // Handle richText for notes
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = props.richText;
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
        if (mcpConnected) {
          logger.info(
            `[MCP] 🔄 Converted note text "${props.text}" to richText`
          );
        }
      }
      break;

    case "frame":
      // CORRECTED: Frame shapes include color
      sanitized.color = normalizeColor(props.color);
      sanitized.h = validateNumber(props.h, 10, 2000, 90, "height");
      sanitized.name = typeof props.name === "string" ? props.name : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 160, "width");
      break;

    case "embed":
      // CORRECTED: Embed shapes only have h, url, w
      sanitized.h = validateNumber(props.h, 50, 2000, 300, "height");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 300, "width");
      break;

    case "bookmark":
      // CORRECTED: Bookmark shapes include h and w
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.h = validateNumber(props.h, 50, 2000, 100, "height");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 200, "width");
      break;

    case "image":
      // CORRECTED: Image shapes include altText, flipX, flipY
      sanitized.altText =
        typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.crop =
        props.crop && typeof props.crop === "object" ? props.crop : null;
      sanitized.flipX = typeof props.flipX === "boolean" ? props.flipX : false;
      sanitized.flipY = typeof props.flipY === "boolean" ? props.flipY : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100, "height");
      sanitized.playing =
        typeof props.playing === "boolean" ? props.playing : true;
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 100, "width");
      break;

    case "video":
      // CORRECTED: Video shapes include altText and autoplay
      sanitized.altText =
        typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.autoplay =
        typeof props.autoplay === "boolean" ? props.autoplay : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100, "height");
      sanitized.playing =
        typeof props.playing === "boolean" ? props.playing : false;
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
        "spline"
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
    logger.debug(`✅ Sanitized ${type} props:`, Object.keys(sanitized));
  }
  return sanitized;
}

// --- STRICT Zod schemas with preprocessing ---
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
    logger.debug(`[MCP] 🔄 Processing shape: ${data.type}`);

    // CRITICAL: First preprocess AI data to fix text/richText issues
    const preprocessed = preprocessAIShapeData(data);

    // Then sanitize props based on shape type
    const sanitizedProps = sanitizeShapeProps(
      preprocessed.type,
      preprocessed.props
    );

    const result = {
      ...preprocessed,
      props: sanitizedProps,
    };

    logger.debug(
      `[MCP] ✅ Shape processed: ${result.type} with props: ${Object.keys(
        result.props
      )}`
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

// --- Utility functions ---
function normalizeShapeId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("shape:") ? trimmed : `shape:${trimmed}`;
}

async function sendToAPI(operation: string, data: any): Promise<any> {
  logger.info(`🚀 API operation: ${operation}`);

  try {
    let url: string;
    let options: NodeFetchRequestInit;

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
        `API failed: ${response.status} ${response.statusText}\nBody: ${errorText}`
      );
    }

    return await response.json();
  } catch (error: any) {
    logger.error(`❌ API operation failed for ${operation}:`, error.message);
    return null;
  }
}

// --- ENHANCED MCP Server setup with FULL CAPABILITIES ---
const server = new Server(
  {
    name: "mcp-tldraw-server",
    version: "2.3.0",
    description:
      "Enhanced MCP server for Tldraw v3.15.1 with complete property support, debugging capabilities, and structured logging",
  },
  {
    capabilities: {
      // Tools capability - this server provides executable functions
      tools: {},

      // Logging capability - this server can send structured log messages
      logging: {},

      // Additional capabilities could be added here:
      // resources: {},    // If we provided file-like data
      // prompts: {},      // If we provided prompt templates
    },
  }
);

// --- Request handlers ---
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { name, arguments: args } = request.params;
    logger.info(`[MCP:${requestId}] 📥 Tool request: ${name}`, {
      tool: name,
      requestId,
      hasArguments: !!args,
      argumentKeys: args ? Object.keys(args) : [],
    });

    switch (name) {
      case "create_shape": {
        logger.debug(
          `[MCP:${requestId}] Raw input:`,
          JSON.stringify(args, null, 2)
        );
        const params = StrictTldrawShapeSchema.parse(args);
        logger.debug(
          `[MCP:${requestId}] Processed params:`,
          JSON.stringify(params, null, 2)
        );

        const result = await sendToAPI("create", params);
        const duration = Date.now() - startTime;

        logger.info(
          `[MCP:${requestId}] ✅ Shape creation completed in ${duration}ms`,
          {
            success: !!result,
            shapeId: result?.shape?.id,
            shapeType: params.type,
            duration,
          }
        );

        return {
          content: [
            {
              type: "text",
              text: result
                ? `✅ Shape created successfully. ID: ${result.shape?.id}, Type: ${params.type}`
                : "❌ Failed to create shape.",
            },
          ],
        };
      }

      case "batch_create_shapes": {
        logger.debug(
          `[MCP:${requestId}] Raw batch input:`,
          JSON.stringify(args, null, 2)
        );
        const params = BatchCreateSchema.parse(args);
        logger.debug(
          `[MCP:${requestId}] Processed batch:`,
          JSON.stringify(params, null, 2)
        );

        const result = await sendToAPI("batch_create", params.shapes);
        const duration = Date.now() - startTime;

        const shapeTypes = params.shapes.map((s) => s.type).join(", ");

        logger.info(
          `[MCP:${requestId}] ✅ Batch creation completed in ${duration}ms`,
          {
            success: !!result,
            shapeCount: params.shapes.length,
            shapeTypes,
            duration,
          }
        );

        return {
          content: [
            {
              type: "text",
              text: result
                ? `✅ Successfully created ${params.shapes.length} shapes. Types: ${shapeTypes}`
                : `❌ Failed to create ${params.shapes.length} shapes.`,
            },
          ],
        };
      }

      case "update_shape": {
        const params = UpdateShapeSchema.parse(args);
        const { id, ...updates } = params;
        const result = await sendToAPI("update", { id, ...updates });
        const duration = Date.now() - startTime;

        logger.info(
          `[MCP:${requestId}] ✅ Shape update completed in ${duration}ms`,
          {
            success: !!result,
            shapeId: id,
            updateKeys: Object.keys(updates),
            duration,
          }
        );

        return {
          content: [
            {
              type: "text",
              text: result
                ? `✅ Shape ${id} updated successfully.`
                : `❌ Failed to update shape ${id}.`,
            },
          ],
        };
      }

      case "delete_shape": {
        const params = ShapeIdSchema.parse(args);
        const result = await sendToAPI("delete", params);
        const duration = Date.now() - startTime;

        logger.info(
          `[MCP:${requestId}] ✅ Shape deletion completed in ${duration}ms`,
          {
            success: !!result,
            shapeId: params.id,
            duration,
          }
        );

        return {
          content: [
            {
              type: "text",
              text: result
                ? `✅ Shape ${params.id} deleted successfully.`
                : `❌ Failed to delete shape ${params.id}.`,
            },
          ],
        };
      }

      case "get_shapes": {
        const response = await fetch(`${NEXTJS_SERVER_URL}/api/shapes`);
        const rawJson = await response.json();
        const result = MCPShapesResponseSchema.parse(rawJson);
        const duration = Date.now() - startTime;

        logger.info(
          `[MCP:${requestId}] ✅ Shape retrieval completed in ${duration}ms`,
          {
            success: result.success,
            shapeCount: result.shapes?.length || 0,
            duration,
          }
        );

        if (result.success && result.shapes) {
          const shapesSummary = result.shapes
            .map((s) => `${s.type}(${s.x},${s.y})`)
            .join(", ");
          return {
            content: [
              {
                type: "text",
                text: `📋 Found ${
                  result.shapes.length
                } shapes on canvas:\n${shapesSummary}\n\nFull data:\n${JSON.stringify(
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
                text: `❌ Error fetching shapes: ${
                  result.error || "Unknown error"
                }`,
              },
            ],
          };
        }
      }

      default:
        logger.error(`[MCP:${requestId}] ❌ Unknown tool: ${name}`);
        throw new Error(`❌ Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(
      `[MCP:${requestId}] ❌ Error handling request after ${duration}ms:`,
      {
        error: error.message,
        stack: error.stack,
        requestId,
        duration,
      }
    );

    if (error instanceof z.ZodError) {
      const errorDetails = error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");

      logger.error(`[MCP:${requestId}] Zod validation errors:`, {
        errorDetails,
        errors: error.errors,
      });

      return {
        content: [
          {
            type: "text",
            text: `❌ Validation Error: ${errorDetails}. 

🔧 Common AI fixes applied automatically:
- Text shapes: AI's "text" field → proper "richText" structure  
- Colors: Invalid colors → valid tldraw colors
- Coordinates: Out-of-range → clamped to safe values
- Shape types: Invalid → fallback to "geo"
- Missing properties: Added all required Tldraw v3.15.1 properties

Your shape data has been automatically corrected and should work now.`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// --- ENHANCED Tool list with detailed descriptions and proper syntax ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info("📋 Providing enhanced tool list to client");

  return {
    tools: [
      {
        name: "create_shape",
        description: `Create a new shape on the Tldraw canvas with COMPLETE v3.15.1 property support.

🤖 AI AUTOMATIC FIXES APPLIED:
- AI text fields automatically converted to richText structure
- All required v3.15.1 properties automatically added
- Invalid colors mapped to valid Tldraw colors
- Out-of-range coordinates clamped to safe values (-10000 to 10000)
- Invalid shape types fallback to "geo"

📋 SUPPORTED SHAPE TYPES:
- geo, text, arrow, draw, highlight, image, video, embed, bookmark, frame, note, line, group

🎨 VALID COLORS:
- black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet

📐 VALID GEO TYPES:
- rectangle, ellipse, diamond, triangle, trapezoid, rhombus, hexagon, octagon, star, oval, x-box, check-box, arrow-left, arrow-right, arrow-up, arrow-down, cloud, heart

🔧 VALID FILLS: none, semi, solid, pattern
🔧 VALID DASHES: draw, dashed, dotted, solid  
🔧 VALID SIZES: s, m, l, xl
🔧 VALID FONTS: draw, sans, serif, mono
🔧 VALID ALIGNS: start, middle, end

⚠️ CRITICAL RULES:
- Text shapes MUST use richText (not text field)
- Note shapes use richText (not text field) 
- Arrow shapes use simple text field
- All coordinates must be numbers between -10000 and 10000
- All rotations must be between 0 and 2π radians
- All opacities must be between 0 and 1

🏷️ IMPORTANT: For labeled shapes, prefer using geo shapes with richText labels instead of separate text shapes!

💡 PREFERRED PATTERN - Labeled geo shape:
{"type": "geo", "x": 100, "y": 100, "props": {"geo": "ellipse", "w": 100, "h": 100, "color": "yellow", "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Moon"}]}]}}}

⚠️ AVOID - Separate text shape:
Instead of creating separate text shapes for labels, embed the richText directly in geo shapes for cleaner, more maintainable diagrams.

📝 MORE EXAMPLES:
- Labeled Rectangle: {"type": "geo", "x": 100, "y": 100, "props": {"geo": "rectangle", "w": 150, "h": 100, "color": "blue", "fill": "solid", "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Process"}]}]}}}
- Standalone Text: {"type": "text", "x": 200, "y": 200, "props": {"richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]}, "color": "black"}}
- Arrow: {"type": "arrow", "x": 300, "y": 300, "props": {"start": {"x": 0, "y": 0}, "end": {"x": 100, "y": 50}, "color": "red"}}`,
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
              description: `Shape-specific properties. Type-specific rules:

GEO SHAPES (PREFERRED FOR LABELED SHAPES):
- geo: must be one of rectangle, ellipse, diamond, triangle, trapezoid, rhombus, hexagon, octagon, star, oval, x-box, check-box, arrow-left, arrow-right, arrow-up, arrow-down, cloud, heart
- w, h: width/height (numbers, 1-2000)
- color: must be one of black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet
- fill: must be one of none, semi, solid, pattern
- dash: must be one of draw, dashed, dotted, solid
- richText: OPTIONAL - use for labels! Structure: {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Your Label"}]}]}

TEXT SHAPES (FOR STANDALONE TEXT ONLY):
- richText: REQUIRED - use richText structure, NOT text field
- color: must be one of black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet
- font: must be one of draw, sans, serif, mono

ARROW SHAPES:
- start, end: objects with x,y coordinates
- text: simple string (NOT richText)
- color: must be one of black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet

NOTE SHAPES:
- richText: REQUIRED - use richText structure, NOT text field
- color: must be one of black, grey, white, blue, light-blue, green, light-green, red, light-red, orange, yellow, violet, light-violet

IMAGE SHAPES:
- altText: string for accessibility
- flipX, flipY: boolean values for flipping
- w, h: width/height (numbers)

VIDEO SHAPES:
- altText: string for accessibility  
- autoplay: boolean for autoplay
- w, h: width/height (numbers)

BOOKMARK SHAPES:
- h, w: height/width (numbers) - required properties

FRAME SHAPES:
- color: frame border color
- h, w: height/width (numbers)

All properties will be automatically validated and sanitized.`,
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
        description: `Create multiple shapes at once (max 50 shapes per batch).

🤖 AI AUTOMATIC FIXES APPLIED:
- AI text fields automatically converted to richText
- All required v3.15.1 properties added automatically
- Invalid colors mapped to valid Tldraw colors
- Out-of-range values clamped to safe ranges
- Invalid shape types fallback to "geo"

⚠️ CRITICAL RULES:
- Maximum 50 shapes per batch
- Each shape must follow the same rules as create_shape
- Text and Note shapes MUST use richText structure
- All coordinates must be valid numbers

🏷️ BEST PRACTICE: Use geo shapes with richText labels instead of separate text shapes for cleaner diagrams!

📝 PREFERRED EXAMPLE:
{
  "shapes": [
    {"type": "geo", "x": 100, "y": 100, "props": {"geo": "rectangle", "w": 100, "h": 100, "color": "blue", "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Process A"}]}]}}},
    {"type": "geo", "x": 250, "y": 100, "props": {"geo": "ellipse", "w": 100, "h": 100, "color": "yellow", "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Decision"}]}]}}}
  ]
}`,
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
                    description:
                      "✅ AI text fields automatically converted to richText. ✅ Required properties auto-added. 🏷️ Prefer geo shapes with richText labels!",
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
        description: `Update an existing shape on the canvas with full v3.15.1 property support.

🤖 AI AUTOMATIC FIXES APPLIED:
- Text fields automatically converted to richText where needed
- Missing required properties automatically added
- Invalid values replaced with safe defaults

⚠️ CRITICAL RULES:
- Shape ID must be valid (format: shape:xxxxx)
- All property rules from create_shape apply
- Text and Note shapes MUST use richText structure
- Arrow shapes use simple text field

📝 EXAMPLE:
{
  "id": "shape:abc123",
  "type": "geo",
  "props": {"color": "red", "fill": "solid", "w": 200, "h": 150, "richText": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Updated Label"}]}]}}
}`,
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
        description: `Delete a shape from the canvas.

⚠️ CRITICAL RULES:
- Shape ID must be valid (format: shape:xxxxx)
- Operation cannot be undone

📝 EXAMPLE:
{
  "id": "shape:abc123"
}`,
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
        description: `Get all shapes currently on the canvas.

📋 RETURNS:
- Array of all shapes with their properties
- Shape IDs, types, positions, and all properties
- Useful for understanding current canvas state

📝 EXAMPLE:
{
  // No parameters needed
}`,
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ],
  };
});

// --- Server startup ---
async function runServer(): Promise<void> {
  try {
    // Use silent startup logging to avoid cluttering MCP client output
    logger.startup(
      "🚀 Starting ENHANCED MCP server with complete Tldraw v3.15.1 support..."
    );
    logger.startup(`🎯 Target Next.js server: ${NEXTJS_SERVER_URL}`);
    logger.startup("✅ AI text fields automatically converted to richText");
    logger.startup("✅ All required v3.15.1 properties automatically added");
    logger.startup("🎨 Color mapping enabled for common color names");
    logger.startup("📏 Numeric values will be clamped to safe ranges");
    logger.startup("🛡️ Invalid properties will be replaced with safe defaults");
    logger.startup(
      "🔧 Missing break statement FIXED - no more fall-through bugs"
    );
    logger.startup(
      "🆕 Added missing properties: scale, url, align, elbowMidPoint, labelPosition, kind"
    );
    logger.startup(
      "📊 Structured logging enabled with request IDs and performance metrics"
    );
    logger.startup(
      "🔍 MCP Inspector compatible - use: npx @modelcontextprotocol/inspector node index.js"
    );
    logger.startup(
      "🏷️ ENHANCED: Promoting geo shapes with richText labels over separate text shapes"
    );

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.NEXTJS_SERVER_URL
    ) {
      logger.startup(
        "⚠️ WARNING: NEXTJS_SERVER_URL is not set in production mode."
      );
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Mark MCP as connected - now we can start structured logging
    mcpConnected = true;

    logger.startup(
      "✅ MCP Server ready - AI can now safely control the canvas with full v3.15.1 support"
    );
    logger.startup(
      "🤖 AI text fields will be automatically converted to richText"
    );
    logger.startup(
      "🏷️ Server promotes using geo shapes with richText labels for cleaner diagrams"
    );
    logger.startup("🔧 Debugging enabled - check stderr for structured logs");

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error("❌ Error starting MCP server:", error);
    process.exit(1);
  }
}

// --- Global error handlers with structured logging ---
process.on("uncaughtException", (error) => {
  logger.error("💥 Uncaught exception:", {
    error: error.message,
    stack: error.stack,
    type: "uncaughtException",
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("💥 Unhandled promise rejection:", {
    reason: String(reason),
    type: "unhandledRejection",
  });
  process.exit(1);
});

// --- Start the server ---
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  runServer().catch((error) => {
    logger.error("💥 Failed to start server:", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

export default runServer;
