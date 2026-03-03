import type { TLShape } from "tldraw";
import type { MCPShape, TldrawShapeType } from "../types";

const VALID_TLDRAW_COLORS = [
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

const VALID_SHAPE_TYPES = [
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

const VALID_GEO_TYPES = [
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

const VALID_FILLS = ["none", "semi", "solid", "pattern"] as const;
const VALID_DASHES = ["draw", "dashed", "dotted", "solid"] as const;
const VALID_SIZES = ["s", "m", "l", "xl"] as const;
const VALID_FONTS = ["draw", "sans", "serif", "mono"] as const;
const VALID_ALIGNS = ["start", "middle", "end"] as const;
const VALID_ARROWHEADS = [
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

const COLOR_MAPPING: Record<string, string> = {
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

function validateShapeType(type: any): TldrawShapeType {
  if (typeof type !== "string") {
    console.warn(`[Converter] Invalid shape type: ${typeof type}, using "geo"`);
    return "geo";
  }

  const lowerType = type.toLowerCase().trim();

  if (VALID_SHAPE_TYPES.includes(lowerType as any)) {
    return lowerType as TldrawShapeType;
  }

  const typeMapping: Record<string, TldrawShapeType> = {
    rectangle: "geo",
    circle: "geo",
    box: "geo",
    triangle: "geo",
    square: "geo",
    ellipse: "geo",
    diamond: "geo",
    shape: "geo",
    polygon: "geo",
  };

  if (typeMapping[lowerType]) {
    return typeMapping[lowerType];
  }

  console.warn(`[Converter] Unknown shape type: "${type}", defaulting to "geo"`);
  return "geo";
}

function normalizeColor(color: any): string {
  if (typeof color !== "string") {
    return "black";
  }

  const lowerColor = color.toLowerCase().trim();

  if (VALID_TLDRAW_COLORS.includes(lowerColor as any)) {
    return lowerColor;
  }

  if (COLOR_MAPPING[lowerColor]) {
    return COLOR_MAPPING[lowerColor];
  }

  console.warn(`[Converter] Unknown color "${color}", using black`);
  return "black";
}

function validateNumber(
  value: any,
  min: number,
  max: number,
  fallback: number,
  _field: string,
): number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function validateEnum<T extends readonly string[]>(
  value: any,
  validValues: T,
  fallback: T[number],
  _field: string,
): T[number] {
  if (typeof value !== "string") {
    return fallback;
  }

  const match = validValues.find((v) => v.toLowerCase() === value.toLowerCase());
  return match ?? fallback;
}

function createSafeRichText(text?: string) {
  const safeText =
    typeof text === "string" && text.trim().length > 0 ? text.trim() : "\u200B";

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
    if (richText && typeof richText === "object" && Array.isArray(richText.content)) {
      const hasValidText = richText.content.some((block: any) =>
        block?.content?.some(
          (node: any) => typeof node.text === "string" && node.text.trim(),
        ),
      );
      return hasValidText ? richText : createSafeRichText();
    }
  } catch {
    // Fall through to default
  }
  return createSafeRichText();
}

function getShapeDefaults(shapeType: TldrawShapeType): any {
  const defaults: Record<TldrawShapeType, any> = {
    geo: {
      align: "middle",
      color: "black",
      dash: "draw",
      fill: "none",
      font: "draw",
      geo: "rectangle",
      growY: 0,
      h: 100,
      labelColor: "black",
      scale: 1,
      size: "m",
      url: "",
      verticalAlign: "middle",
      w: 100,
    },
    text: {
      autoSize: true,
      color: "black",
      font: "draw",
      richText: createSafeRichText("Text"),
      scale: 1,
      size: "m",
      textAlign: "start",
      w: 8,
    },
    arrow: {
      arrowheadEnd: "arrow",
      arrowheadStart: "none",
      bend: 0,
      color: "black",
      dash: "draw",
      elbowMidPoint: 0,
      end: { x: 100, y: 100 },
      fill: "none",
      font: "draw",
      kind: "arc",
      labelColor: "black",
      labelPosition: 0.5,
      scale: 1,
      size: "m",
      start: { x: 0, y: 0 },
      text: "",
    },
    draw: {
      color: "black",
      fill: "none",
      dash: "draw",
      size: "m",
      segments: [],
      isComplete: false,
      isClosed: false,
      isPen: false,
      scale: 1,
    },
    highlight: {
      color: "yellow",
      isComplete: false,
      isPen: false,
      scale: 1,
      segments: [],
      size: "m",
    },
    note: {
      align: "middle",
      color: "black",
      font: "draw",
      fontSizeAdjustment: 0,
      growY: 0,
      labelColor: "black",
      richText: createSafeRichText(""),
      scale: 1,
      size: "m",
      url: "",
      verticalAlign: "middle",
    },
    frame: {
      color: "black",
      h: 90,
      name: "",
      w: 160,
    },
    group: {},
    embed: {
      h: 300,
      url: "",
      w: 300,
    },
    bookmark: {
      assetId: null,
      h: 100,
      url: "",
      w: 200,
    },
    image: {
      altText: "",
      assetId: null,
      crop: null,
      flipX: false,
      flipY: false,
      h: 100,
      playing: true,
      url: "",
      w: 100,
    },
    video: {
      altText: "",
      assetId: null,
      autoplay: false,
      h: 100,
      playing: false,
      time: 0,
      url: "",
      w: 100,
    },
    line: {
      color: "black",
      dash: "draw",
      size: "m",
      spline: "line",
      points: {},
      scale: 1,
    },
  };

  return defaults[shapeType] || defaults.geo;
}

function sanitizeProps(shapeType: TldrawShapeType, props: any): any {
  if (!props || typeof props !== "object") {
    return getShapeDefaults(shapeType);
  }

  const defaults = getShapeDefaults(shapeType);
  const sanitized = { ...defaults };

  switch (shapeType) {
    case "geo":
      sanitized.align = validateEnum(props.align, VALID_ALIGNS, "middle", "align");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, VALID_DASHES, "draw", "dash");
      sanitized.fill = validateEnum(props.fill, VALID_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, VALID_FONTS, "draw", "font");
      sanitized.geo = validateEnum(props.geo, VALID_GEO_TYPES, "rectangle", "geo");
      sanitized.growY = validateNumber(props.growY, 0, 1000, 0, "growY");
      sanitized.h = validateNumber(props.h, 1, 2000, 100, "height");
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        VALID_ALIGNS,
        "middle",
        "verticalAlign",
      );
      sanitized.w = validateNumber(props.w, 1, 2000, 100, "width");

      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = props.richText;
      }
      break;

    case "text":
      sanitized.autoSize = typeof props.autoSize === "boolean" ? props.autoSize : true;
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, VALID_FONTS, "draw", "font");
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");
      sanitized.textAlign = validateEnum(
        props.textAlign,
        VALID_ALIGNS,
        "start",
        "textAlign",
      );
      sanitized.w = validateNumber(props.w, 1, 2000, 8, "width");

      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else if (typeof props.text === "string") {
        sanitized.richText = sanitizeRichText(createSafeRichText(props.text));
      }
      break;

    case "arrow":
      sanitized.arrowheadEnd = validateEnum(
        props.arrowheadEnd,
        VALID_ARROWHEADS,
        "arrow",
        "arrowheadEnd",
      );
      sanitized.arrowheadStart = validateEnum(
        props.arrowheadStart,
        VALID_ARROWHEADS,
        "none",
        "arrowheadStart",
      );
      sanitized.bend = validateNumber(props.bend, -2, 2, 0, "bend");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, VALID_DASHES, "draw", "dash");
      sanitized.elbowMidPoint = validateNumber(
        props.elbowMidPoint,
        0,
        1,
        0,
        "elbowMidPoint",
      );
      sanitized.fill = validateEnum(props.fill, VALID_FILLS, "none", "fill");
      sanitized.font = validateEnum(props.font, VALID_FONTS, "draw", "font");
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
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");

      if (props.start && typeof props.start === "object") {
        sanitized.start = {
          x: validateNumber(props.start.x, -5000, 5000, 0, "start.x"),
          y: validateNumber(props.start.y, -5000, 5000, 0, "start.y"),
        };
      }

      if (props.end && typeof props.end === "object") {
        sanitized.end = {
          x: validateNumber(props.end.x, -5000, 5000, 100, "end.x"),
          y: validateNumber(props.end.y, -5000, 5000, 100, "end.y"),
        };
      }

      if (typeof props.text === "string") sanitized.text = props.text;
      break;

    case "draw":
    case "highlight":
      sanitized.color = normalizeColor(props.color);
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");
      sanitized.segments = Array.isArray(props.segments) ? props.segments : [];
      sanitized.isComplete =
        typeof props.isComplete === "boolean" ? props.isComplete : false;
      sanitized.isPen = typeof props.isPen === "boolean" ? props.isPen : false;
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");

      if (shapeType === "draw") {
        sanitized.fill = validateEnum(props.fill, VALID_FILLS, "none", "fill");
        sanitized.dash = validateEnum(props.dash, VALID_DASHES, "draw", "dash");
        sanitized.isClosed = typeof props.isClosed === "boolean" ? props.isClosed : false;
      }
      break;

    case "note":
      sanitized.align = validateEnum(props.align, VALID_ALIGNS, "middle", "align");
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, VALID_FONTS, "draw", "font");
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
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        VALID_ALIGNS,
        "middle",
        "verticalAlign",
      );

      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
      }
      break;

    case "frame":
      sanitized.color = normalizeColor(props.color);
      sanitized.w = validateNumber(props.w, 10, 2000, 160, "width");
      sanitized.h = validateNumber(props.h, 10, 2000, 90, "height");
      sanitized.name = typeof props.name === "string" ? props.name : "";
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
      sanitized.dash = validateEnum(props.dash, VALID_DASHES, "draw", "dash");
      sanitized.size = validateEnum(props.size, VALID_SIZES, "m", "size");
      sanitized.spline = validateEnum(
        props.spline,
        ["line", "cubic"] as const,
        "line",
        "spline",
      );
      sanitized.points =
        props.points && typeof props.points === "object" ? props.points : {};
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1, "scale");
      break;

    case "group":
      break;
  }

  return sanitized;
}

export class ShapeConverterService {
  toTldrawShape(mcpShape: MCPShape): TLShape {
    try {
      if (!mcpShape || typeof mcpShape !== "object") {
        console.error("[Converter] Cannot convert null/undefined shape");
        return this.createFallbackShape();
      }

      const safeId =
        typeof mcpShape.id === "string" && mcpShape.id.trim()
          ? mcpShape.id.trim()
          : `shape:${Date.now()}`;

      const safeType = validateShapeType(mcpShape.type);
      const safeX = validateNumber(mcpShape.x, -10000, 10000, 100, "x");
      const safeY = validateNumber(mcpShape.y, -10000, 10000, 100, "y");
      const safeRotation = validateNumber(
        mcpShape.rotation,
        0,
        2 * Math.PI,
        0,
        "rotation",
      );
      const safeOpacity = validateNumber(mcpShape.opacity, 0, 1, 1, "opacity");
      const sanitizedProps = sanitizeProps(safeType, mcpShape.props);

      const tldrawShape: TLShape = {
        id: safeId as any,
        typeName: "shape",
        type: safeType,
        x: safeX,
        y: safeY,
        rotation: safeRotation,
        index: (mcpShape.index || "a1") as any,
        parentId: (mcpShape.parentId || "page:page") as any,
        isLocked: Boolean(mcpShape.isLocked),
        opacity: safeOpacity,
        props: sanitizedProps as any,
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
      };

      return tldrawShape;
    } catch (error) {
      console.error("[Converter] Error converting MCP shape:", error);
      return this.createFallbackShape();
    }
  }

  toTldrawShapes(mcpShapes: MCPShape[]): TLShape[] {
    if (!Array.isArray(mcpShapes)) {
      console.error("[Converter] Invalid shapes array:", typeof mcpShapes);
      return [];
    }

    const convertedShapes: TLShape[] = [];
    let errorCount = 0;

    mcpShapes.forEach((shape, index) => {
      try {
        if (!shape || typeof shape !== "object") {
          console.error(`[Converter] Skipping invalid shape at index ${index}`);
          errorCount++;
          return;
        }
        convertedShapes.push(this.toTldrawShape(shape));
      } catch (error) {
        console.error(`[Converter] Failed to convert shape ${index}:`, error);
        errorCount++;
      }
    });

    if (errorCount > 0) {
      console.warn(
        `[Converter] Batch conversion: ${convertedShapes.length} ok, ${errorCount} failed`,
      );
    }

    return convertedShapes;
  }

  private createFallbackShape(): TLShape {
    return {
      id: `fallback-${Date.now()}` as any,
      typeName: "shape",
      type: "geo",
      x: 100,
      y: 100,
      rotation: 0,
      index: "a1" as any,
      parentId: "page:page" as any,
      isLocked: false,
      opacity: 1,
      props: getShapeDefaults("geo") as any,
      meta: {},
    };
  }

  fromTldrawShape(tldrawShape: TLShape): MCPShape {
    try {
      const mcpShape: MCPShape = {
        id: tldrawShape.id,
        type: tldrawShape.type as TldrawShapeType,
        typeName: "shape",
        x: tldrawShape.x,
        y: tldrawShape.y,
        rotation: tldrawShape.rotation,
        index: tldrawShape.index,
        parentId: tldrawShape.parentId,
        isLocked: tldrawShape.isLocked,
        opacity: tldrawShape.opacity,
        props: tldrawShape.props,
        meta: tldrawShape.meta,
        updatedAt: new Date().toISOString(),
      };

      return mcpShape;
    } catch (error) {
      console.error("[Converter] Error converting Tldraw shape:", error);
      throw error;
    }
  }

  fromTldrawShapes(tldrawShapes: TLShape[]): MCPShape[] {
    return tldrawShapes.map((shape, index) => {
      try {
        return this.fromTldrawShape(shape);
      } catch (error) {
        console.error(`[Converter] Failed to convert shape ${index}:`, error);
        throw error;
      }
    });
  }

  validateAndRepair(mcpShape: MCPShape): MCPShape {
    try {
      const validType = validateShapeType(mcpShape.type);
      const repairedProps = sanitizeProps(validType, mcpShape.props);

      const repairedShape: MCPShape = {
        id: typeof mcpShape.id === "string" ? mcpShape.id : `shape:${Date.now()}`,
        type: validType,
        typeName: "shape",
        x: validateNumber(mcpShape.x, -10000, 10000, 100, "x"),
        y: validateNumber(mcpShape.y, -10000, 10000, 100, "y"),
        rotation: validateNumber(mcpShape.rotation, 0, 2 * Math.PI, 0, "rotation"),
        index: mcpShape.index || "a1",
        parentId: mcpShape.parentId || "page:page",
        isLocked: Boolean(mcpShape.isLocked),
        opacity: validateNumber(mcpShape.opacity, 0, 1, 1, "opacity"),
        props: repairedProps,
        meta: mcpShape.meta && typeof mcpShape.meta === "object" ? mcpShape.meta : {},
        createdAt: mcpShape.createdAt,
        updatedAt: mcpShape.updatedAt || new Date().toISOString(),
        version: mcpShape.version,
      };

      return repairedShape;
    } catch (error) {
      console.error("[Converter] Error repairing shape:", error);

      return {
        id: mcpShape.id || `fallback-${Date.now()}`,
        type: "geo",
        typeName: "shape",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1",
        parentId: "page:page",
        isLocked: false,
        opacity: 1,
        props: getShapeDefaults("geo"),
        meta: {},
        updatedAt: new Date().toISOString(),
      };
    }
  }
}
