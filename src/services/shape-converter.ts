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

const RANDOM_COLORS = [
  "blue",
  "green",
  "red",
  "orange",
  "yellow",
  "violet",
] as const;

/**
 * Sanitize any value against a list of valid values with fallback
 */
function sanitizeEnum<T extends readonly string[]>(
  value: any,
  validValues: T,
  fallback: T[number],
  fieldName: string
): T[number] {
  if (typeof value !== "string") {
    console.log(
      `[Converter] 🧹 ${fieldName}: non-string value, using fallback "${fallback}"`
    );
    return fallback;
  }

  const lowerValue = value.toLowerCase();
  const validValue = validValues.find((v) => v.toLowerCase() === lowerValue);

  if (validValue) {
    return validValue;
  }

  console.log(
    `[Converter] 🧹 ${fieldName}: invalid "${value}", using fallback "${fallback}"`
  );
  return fallback;
}

/**
 * Sanitize color with mapping and random fallback
 */
function sanitizeColor(color: any): string {
  if (typeof color !== "string") {
    const randomColor =
      RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    console.log(
      `[Converter] 🎨 Non-string color, using random: ${randomColor}`
    );
    return randomColor;
  }

  const lowerColor = color.toLowerCase(); // Direct match

  if (VALID_TLDRAW_COLORS.includes(lowerColor as any)) {
    return lowerColor;
  } // Color mapping

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
    indigo: "violet",
  };

  if (colorMap[lowerColor]) {
    console.log(
      `[Converter] 🎨 Mapped color: ${color} → ${colorMap[lowerColor]}`
    );
    return colorMap[lowerColor];
  } // Random fallback

  const randomColor =
    RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
  console.log(
    `[Converter] 🎨 Unknown color "${color}", using random: ${randomColor}`
  );
  return randomColor;
}

/**
 * Sanitize number within range
 */
function sanitizeNumber(
  value: any,
  min: number,
  max: number,
  fallback: number,
  fieldName: string
): number {
  if (typeof value !== "number" || isNaN(value)) {
    console.log(
      `[Converter] 🧹 ${fieldName}: invalid number, using ${fallback}`
    );
    return fallback;
  }

  const clamped = Math.max(min, Math.min(max, value));
  if (clamped !== value) {
    console.log(`[Converter] 🧹 ${fieldName}: clamped ${value} to ${clamped}`);
  }

  return clamped;
}

/**
 * Get default props for a shape type
 */
function getDefaultProps(shapeType: TldrawShapeType): any {
  const defaults: Record<TldrawShapeType, any> = {
    geo: {
      geo: "rectangle",
      w: 100,
      h: 100,
      color: "black",
      labelColor: "black",
      fill: "none",
      dash: "draw",
      size: "m",
      font: "draw",
      align: "middle",
      verticalAlign: "middle",
      growY: 0,
    },
    text: {
      color: "black",
      size: "m",
      font: "draw",
      textAlign: "start",
      w: 8,
      richText: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      },
      scale: 1,
      autoSize: true,
    },
    arrow: {
      color: "black",
      fill: "none",
      dash: "draw",
      size: "m",
      arrowheadStart: "none",
      arrowheadEnd: "arrow",
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
      bend: 0,
      text: "",
      labelColor: "black",
      font: "draw",
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
    },
    highlight: {
      color: "yellow",
      size: "m",
      segments: [],
      isComplete: false,
      isPen: false,
    },
    note: {
      color: "black",
      size: "m",
      font: "draw",
      align: "middle",
      verticalAlign: "middle",
      growY: 0,
      url: "",
      text: "",
    },
    frame: {
      w: 160,
      h: 90,
      name: "",
    },
    group: {},
    embed: {
      w: 300,
      h: 300,
      url: "",
      doesResize: true,
      overridePermissions: false,
      tmpOldUrl: "",
    },
    bookmark: {
      assetId: null,
      url: "",
    },
    image: {
      assetId: null,
      w: 100,
      h: 100,
      playing: true,
      url: "",
      crop: null,
    },
    video: {
      assetId: null,
      w: 100,
      h: 100,
      time: 0,
      playing: false,
      url: "",
    },
    line: {
      color: "black",
      dash: "draw",
      size: "m",
      spline: "line",
      points: {},
    },
  };

  return defaults[shapeType] || {};
}

/**
 * Get shape-specific valid properties for sanitization
 */
function getValidPropsForShapeType(
  shapeType: TldrawShapeType
): Record<string, any> {
  const commonColorProps = ["color", "labelColor"];
  const commonSizeProps = ["w", "h"];
  const commonStyleProps = [
    "fill",
    "dash",
    "size",
    "font",
    "align",
    "verticalAlign",
  ];

  const validProps: Record<TldrawShapeType, string[]> = {
    geo: [
      ...commonColorProps,
      ...commonSizeProps,
      ...commonStyleProps,
      "geo",
      "growY",
    ],
    text: [
      "color",
      "size",
      "font",
      "w",
      "richText",
      "textAlign",
      "scale",
      "autoSize",
    ],
    arrow: [
      ...commonColorProps,
      "fill",
      "dash",
      "size",
      "arrowheadStart",
      "arrowheadEnd",
      "start",
      "end",
      "bend",
      "text",
      "font",
    ],
    draw: [
      "color",
      "fill",
      "dash",
      "size",
      "segments",
      "isComplete",
      "isClosed",
      "isPen",
    ],
    highlight: ["color", "size", "segments", "isComplete", "isPen"],
    note: [
      "color",
      "size",
      "font",
      "align",
      "verticalAlign",
      "growY",
      "url",
      "text",
    ],
    frame: ["w", "h", "name"],
    group: [], // Groups typically have no props
    embed: ["w", "h", "url", "doesResize", "overridePermissions", "tmpOldUrl"],
    bookmark: ["assetId", "url"],
    image: ["assetId", "w", "h", "playing", "url", "crop"],
    video: ["assetId", "w", "h", "time", "playing", "url"],
    line: ["color", "dash", "size", "spline", "points"],
  };

  return validProps[shapeType] || [];
}

/**
 * Check if a property is valid for a specific shape type
 */
function isValidPropForShapeType(
  shapeType: TldrawShapeType,
  propName: string
): boolean {
  const validProps = getValidPropsForShapeType(shapeType);
  return validProps.includes(propName);
}

/**
 * Comprehensively sanitize shape props based on shape type
 */
function sanitizeShapeProps(shapeType: TldrawShapeType, props: any): any {
  if (!props || typeof props !== "object") {
    console.log(
      `[Converter] 🧹 No props provided, using defaults for ${shapeType}`
    );
    return getDefaultProps(shapeType);
  }

  console.log(
    `[Converter] 🧹 Sanitizing ${shapeType} props:`,
    Object.keys(props)
  ); // Start with defaults

  const defaultProps = getDefaultProps(shapeType);
  const sanitized: any = { ...defaultProps };
  const validProps = getValidPropsForShapeType(shapeType);

  Object.keys(props).forEach((key) => {
    const value = props[key]; // First check if this property is valid for this shape type

    if (!isValidPropForShapeType(shapeType, key)) {
      console.log(
        `[Converter] 🗑️ Removing invalid prop "${key}" for ${shapeType} shape`
      );
      return; // Skip this property
    } // Sanitize based on property type

    switch (
      key // Colors (only for shapes that support colors)
    ) {
      case "color":
      case "labelColor":
        if (
          [
            "geo",
            "text",
            "arrow",
            "draw",
            "highlight",
            "note",
            "line",
          ].includes(shapeType)
        ) {
          sanitized[key] = sanitizeColor(value);
        }
        break; // Geometry-specific props

      case "geo":
        if (shapeType === "geo") {
          sanitized[key] = sanitizeEnum(
            value,
            VALID_GEO_TYPES,
            "rectangle",
            "geo"
          );
        }
        break; // Common style props

      case "fill":
        if (["geo", "arrow", "draw"].includes(shapeType)) {
          sanitized[key] = sanitizeEnum(value, VALID_FILLS, "none", "fill");
        }
        break;
      case "dash":
        if (["geo", "arrow", "draw", "highlight", "line"].includes(shapeType)) {
          sanitized[key] = sanitizeEnum(value, VALID_DASHES, "draw", "dash");
        }
        break;
      case "size":
        sanitized[key] = sanitizeEnum(value, VALID_SIZES, "m", "size");
        break;
      case "font":
        if (["geo", "text", "arrow", "note"].includes(shapeType)) {
          sanitized[key] = sanitizeEnum(value, VALID_FONTS, "draw", "font");
        }
        break;
      case "align":
      case "textAlign": // textAlign is for text shapes, align is for geo/note
        if (key === "textAlign" && shapeType === "text") {
          sanitized.textAlign = sanitizeEnum(
            value,
            VALID_ALIGNS,
            "start",
            "textAlign"
          );
        } else if (key === "align" && shapeType === "geo") {
          sanitized.align = sanitizeEnum(
            value,
            VALID_ALIGNS,
            "middle",
            "align"
          );
        }
        break;
      case "verticalAlign":
        if (["geo", "note"].includes(shapeType)) {
          sanitized[key] = sanitizeEnum(
            value,
            VALID_ALIGNS,
            "middle",
            "verticalAlign"
          );
        }
        break; // Arrowhead props (arrow only)

      case "arrowheadStart":
      case "arrowheadEnd":
        if (shapeType === "arrow") {
          sanitized[key] = sanitizeEnum(value, VALID_ARROWHEADS, "none", key);
        }
        break; // Dimension props

      case "w":
      case "h":
        sanitized[key] = sanitizeNumber(
          value,
          1,
          4000,
          key === "w" ? 100 : 80,
          key
        );
        break; // Scale (text only)

      case "scale":
        if (shapeType === "text") {
          sanitized[key] = sanitizeNumber(value, 0.1, 10, 1, "scale");
        }
        break; // Bend (arrow only)

      case "bend":
        if (shapeType === "arrow") {
          sanitized[key] = sanitizeNumber(value, -2, 2, 0, "bend");
        }
        break; // Time (video only)

      case "time":
        if (shapeType === "video") {
          sanitized[key] = sanitizeNumber(value, 0, Infinity, 0, "time");
        }
        break; // GrowY (geo, note)

      case "growY":
        if (["geo", "note"].includes(shapeType)) {
          sanitized[key] = sanitizeNumber(value, 0, 1000, 0, "growY");
        }
        break; // Boolean props

      case "autoSize":
        if (shapeType === "text") {
          sanitized[key] = Boolean(value);
        }
        break;
      case "isComplete":
        if (["draw", "highlight"].includes(shapeType)) {
          sanitized[key] = Boolean(value);
        }
        break;
      case "isClosed":
      case "isPen":
        if (["draw", "highlight"].includes(shapeType)) {
          sanitized[key] = Boolean(value);
        }
        break;
      case "playing":
        if (["image", "video"].includes(shapeType)) {
          sanitized[key] = Boolean(value);
        }
        break;
      case "doesResize":
      case "overridePermissions":
        if (shapeType === "embed") {
          sanitized[key] = Boolean(value);
        }
        break; // String props

      case "text": // Note: "text" shapes now use richText. This is for other shapes like arrow/note.
        if (["arrow", "note"].includes(shapeType)) {
          sanitized[key] = typeof value === "string" ? value : "";
        }
        break;
      case "url":
        if (
          ["note", "embed", "bookmark", "image", "video"].includes(shapeType)
        ) {
          sanitized[key] = typeof value === "string" ? value : "";
        }
        break;
      case "name":
        if (shapeType === "frame") {
          sanitized[key] = typeof value === "string" ? value : "";
        }
        break;
      case "tmpOldUrl":
        if (shapeType === "embed") {
          sanitized[key] = typeof value === "string" ? value : "";
        }
        break;
      case "spline":
        if (shapeType === "line") {
          sanitized[key] = sanitizeEnum(
            value,
            ["line", "cubic"] as const,
            "line",
            "spline"
          );
        }
        break; // Object/Array props

      case "richText":
        if (shapeType === "text") {
          if (
            value &&
            typeof value === "object" &&
            Array.isArray(value.content)
          ) {
            sanitized[key] = value;
          } else {
            sanitized[key] = defaultProps.richText;
          }
        }
        break;

      case "segments":
        if (["draw", "highlight"].includes(shapeType)) {
          sanitized[key] = Array.isArray(value) ? value : [];
        }
        break;
      case "points":
        if (shapeType === "line") {
          sanitized[key] = value && typeof value === "object" ? value : {};
        }
        break;
      case "start":
      case "end":
        if (shapeType === "arrow") {
          if (
            value &&
            typeof value === "object" &&
            typeof value.x === "number" &&
            typeof value.y === "number"
          ) {
            sanitized[key] = value;
          } else {
            sanitized[key] = defaultProps[key] || { x: 0, y: 0 };
          }
        }
        break;
      case "crop":
        if (["image"].includes(shapeType)) {
          if (value && typeof value === "object") {
            sanitized[key] = value;
          } else {
            sanitized[key] = null;
          }
        }
        break; // Asset IDs

      case "assetId":
        if (["bookmark", "image", "video"].includes(shapeType)) {
          sanitized[key] =
            typeof value === "string" || value === null ? value : null;
        }
        break;

      default: // Unknown prop for this shape type
      // This will be hit if an old "text" property is passed for a "text" shape.
      // It will be correctly logged and removed.
        console.log(
          `[Converter] 🗑️ Removing unknown or deprecated prop "${key}" for ${shapeType}`
        );
        break;
    }
  });

  const removedCount =
    Object.keys(props).length -
    Object.keys(sanitized).length +
    Object.keys(defaultProps).length;
  console.log(`[Converter] ✅ ${shapeType} props sanitized:`, {
    original: Object.keys(props).length,
    final: Object.keys(sanitized).length,
    removed: Math.max(
      0,
      Object.keys(props).length -
        Object.keys(sanitized).filter((k) => props.hasOwnProperty(k)).length
    ),
  });

  return sanitized;
}

/**
 * Shape converter service with automatic color sanitization
 */
export class ShapeConverterService {
  /**
   * Convert MCPShape to Tldraw shape format with comprehensive sanitization
   */
  toTldrawShape(mcpShape: MCPShape): TLShape {
    try {
      console.log(
        "[Converter] 🔄 Converting MCP shape to Tldraw:",
        mcpShape.id,
        mcpShape.type
      );
      console.log(
        "[Converter] 📝 Original props:",
        JSON.stringify(mcpShape.props, null, 2)
      ); // Sanitize props comprehensively based on shape type

      const sanitizedProps = sanitizeShapeProps(mcpShape.type, mcpShape.props);
      console.log(
        "[Converter] 🧹 Sanitized props:",
        JSON.stringify(sanitizedProps, null, 2)
      ); // Sanitize core shape properties

      const sanitizedShape: TLShape = {
        id: mcpShape.id as any,
        typeName: "shape",
        type: mcpShape.type,
        x: sanitizeNumber(mcpShape.x, -10000, 10000, 0, "x"),
        y: sanitizeNumber(mcpShape.y, -10000, 10000, 0, "y"),
        rotation: sanitizeNumber(
          mcpShape.rotation,
          0,
          2 * Math.PI,
          0,
          "rotation"
        ),
        index: (mcpShape.index || "a1") as any,
        parentId: (mcpShape.parentId || "page:page") as any,
        isLocked: Boolean(mcpShape.isLocked),
        opacity: sanitizeNumber(mcpShape.opacity, 0, 1, 1, "opacity"),
        props: sanitizedProps as any, // Type assertion needed due to union complexity
        meta:
          mcpShape.meta && typeof mcpShape.meta === "object"
            ? mcpShape.meta
            : {},
      };

      console.log("[Converter] ✅ Converted to Tldraw shape:", {
        id: sanitizedShape.id,
        type: sanitizedShape.type,
        position: `(${sanitizedShape.x}, ${sanitizedShape.y})`,
        color: (sanitizedShape.props as any)?.color || "no-color",
        propsCount: Object.keys(sanitizedShape.props).length,
      });

      return sanitizedShape;
    } catch (error) {
      console.error("[Converter] ❌ Error converting MCP shape:", error); // Return a safe fallback shape instead of crashing

      console.log("[Converter] 🛟 Creating fallback rectangle shape");
      return {
        id: (mcpShape.id || "fallback-shape") as any,
        typeName: "shape",
        type: "geo",
        x: 100,
        y: 100,
        rotation: 0,
        index: "a1" as any,
        parentId: "page:page" as any,
        isLocked: false,
        opacity: 1,
        props: getDefaultProps("geo") as any,
        meta: {},
      };
    }
  }
  /**
   * Convert multiple MCPShapes to Tldraw shapes with error recovery
   */
  toTldrawShapes(mcpShapes: MCPShape[]): TLShape[] {
    console.log(
      `[Converter] 🔄 Converting ${mcpShapes.length} MCP shapes to Tldraw`
    );

    const convertedShapes: TLShape[] = [];

    mcpShapes.forEach((shape, index) => {
      try {
        const tldrawShape = this.toTldrawShape(shape);
        convertedShapes.push(tldrawShape);
      } catch (error) {
        console.error(
          `[Converter] ❌ Failed to convert shape ${index} (${shape?.id}):`,
          error
        );
        console.log(`[Converter] 🛟 Skipping invalid shape and continuing...`); // Continue with other shapes instead of failing completely
      }
    });

    console.log(
      `[Converter] ✅ Successfully converted ${convertedShapes.length}/${mcpShapes.length} shapes`
    );
    return convertedShapes;
  }
  /**
   * Convert Tldraw shape to MCPShape format
   */
  fromTldrawShape(tldrawShape: TLShape): MCPShape {
    try {
      console.log(
        "[Converter] 🔄 Converting Tldraw shape to MCP:",
        tldrawShape.id
      );

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

      console.log("[Converter] ✅ Converted to MCP shape:", mcpShape.id);
      return mcpShape;
    } catch (error) {
      console.error("[Converter] ❌ Error converting Tldraw shape:", error);
      throw error;
    }
  }
  /**
   * Convert multiple Tldraw shapes to MCP format
   */
  fromTldrawShapes(tldrawShapes: TLShape[]): MCPShape[] {
    console.log(
      `[Converter] 🔄 Converting ${tldrawShapes.length} Tldraw shapes to MCP`
    );

    return tldrawShapes.map((shape) => {
      try {
        return this.fromTldrawShape(shape);
      } catch (error) {
        console.error(
          `[Converter] ❌ Failed to convert shape ${shape.id}:`,
          error
        );
        throw error;
      }
    });
  }
  /**
   * Validate and sanitize shape with comprehensive checks
   */
  validateAndSanitize(mcpShape: MCPShape): MCPShape {
    console.log(
      "[Converter] 🧹 Validating and sanitizing shape:",
      mcpShape.id,
      mcpShape.type
    );

    try {
      // Sanitize core properties
      const sanitized: MCPShape = {
        id: mcpShape.id || `shape:${Date.now()}`,
        type: mcpShape.type || "geo",
        typeName: "shape",
        x: sanitizeNumber(mcpShape.x, -10000, 10000, 0, "x"),
        y: sanitizeNumber(mcpShape.y, -10000, 10000, 0, "y"),
        rotation: sanitizeNumber(
          mcpShape.rotation,
          0,
          2 * Math.PI,
          0,
          "rotation"
        ),
        index: mcpShape.index || "a1",
        parentId: mcpShape.parentId || "page:page",
        isLocked: Boolean(mcpShape.isLocked),
        opacity: sanitizeNumber(mcpShape.opacity, 0, 1, 1, "opacity"),
        props: sanitizeShapeProps(mcpShape.type, mcpShape.props),
        meta:
          mcpShape.meta && typeof mcpShape.meta === "object"
            ? mcpShape.meta
            : {},
        createdAt: mcpShape.createdAt,
        updatedAt: mcpShape.updatedAt,
        version: mcpShape.version,
      };

      console.log("[Converter] ✅ Shape sanitized successfully:", {
        id: sanitized.id,
        type: sanitized.type,
        color: (sanitized.props as any)?.color || "no-color",
      });

      return sanitized;
    } catch (error) {
      console.error("[Converter] ❌ Error sanitizing shape:", error); // Return safe fallback

      console.log("[Converter] 🛟 Creating safe fallback shape");
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
        props: getDefaultProps("geo"),
        meta: {},
      };
    }
  }
}
