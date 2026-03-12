import {
  TLDRAW_ALIGNS,
  TLDRAW_ARROWHEADS,
  TLDRAW_DASHES,
  TLDRAW_FILLS,
  TLDRAW_FONTS,
  TLDRAW_GEO_TYPES,
  TLDRAW_SIZES,
  type TldrawShapeType,
} from "./constants.js";
import { normalizeColor, validateEnum, validateNumber } from "./validation.js";
import { createSafeRichText, sanitizeRichText } from "./rich-text.js";
import { getShapeDefaults } from "./shape-defaults.js";

/** Sanitizes shape props for a given type, applying defaults and validation */
export function sanitizeShapeProps(
  type: TldrawShapeType,
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!props || typeof props !== "object") return getShapeDefaults(type);

  const sanitized: Record<string, unknown> = { ...getShapeDefaults(type) };

  switch (type) {
    case "geo":
      sanitized.align = validateEnum(props.align, TLDRAW_ALIGNS, "middle");
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw");
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw");
      sanitized.geo = validateEnum(props.geo, TLDRAW_GEO_TYPES, "rectangle");
      sanitized.growY = validateNumber(props.growY, 0, 1000, 0);
      sanitized.h = validateNumber(props.h, 1, 2000, 100);
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        TLDRAW_ALIGNS,
        "middle",
      );
      sanitized.w = validateNumber(props.w, 1, 2000, 100);
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else {
        sanitized.richText = createSafeRichText("");
      }
      break;

    case "text":
      sanitized.autoSize =
        typeof props.autoSize === "boolean" ? props.autoSize : true;
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw");
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      sanitized.textAlign = validateEnum(props.textAlign, TLDRAW_ALIGNS, "start");
      sanitized.w = validateNumber(props.w, 1, 2000, 8);
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
      }
      break;

    case "arrow":
      sanitized.arrowheadEnd = validateEnum(
        props.arrowheadEnd,
        TLDRAW_ARROWHEADS,
        "arrow",
      );
      sanitized.arrowheadStart = validateEnum(
        props.arrowheadStart,
        TLDRAW_ARROWHEADS,
        "none",
      );
      sanitized.bend = validateNumber(props.bend, -2, 2, 0);
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw");
      sanitized.elbowMidPoint = validateNumber(props.elbowMidPoint, 0, 1, 0);
      sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none");
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw");
      sanitized.kind = validateEnum(
        props.kind,
        ["arc", "elbow"] as const,
        "arc",
      );
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.labelPosition = validateNumber(props.labelPosition, 0, 1, 0.5);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      if (props.start && typeof props.start === "object") {
        const s = props.start as Record<string, unknown>;
        sanitized.start = {
          x: validateNumber(s.x, -5000, 5000, 0),
          y: validateNumber(s.y, -5000, 5000, 0),
        };
      }
      if (props.end && typeof props.end === "object") {
        const e = props.end as Record<string, unknown>;
        sanitized.end = {
          x: validateNumber(e.x, -5000, 5000, 100),
          y: validateNumber(e.y, -5000, 5000, 100),
        };
      }
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else {
        sanitized.richText = createSafeRichText("");
      }
      break;

    case "draw":
    case "highlight":
      sanitized.color = normalizeColor(props.color);
      sanitized.isComplete =
        typeof props.isComplete === "boolean" ? props.isComplete : false;
      sanitized.isPen =
        typeof props.isPen === "boolean" ? props.isPen : false;
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.scaleX = validateNumber(props.scaleX, -10, 10, 1);
      sanitized.scaleY = validateNumber(props.scaleY, -10, 10, 1);
      sanitized.segments = Array.isArray(props.segments) ? props.segments : [];
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      if (type === "draw") {
        sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw");
        sanitized.fill = validateEnum(props.fill, TLDRAW_FILLS, "none");
        sanitized.isClosed =
          typeof props.isClosed === "boolean" ? props.isClosed : false;
      }
      break;

    case "note":
      sanitized.align = validateEnum(props.align, TLDRAW_ALIGNS, "middle");
      sanitized.color = normalizeColor(props.color);
      sanitized.font = validateEnum(props.font, TLDRAW_FONTS, "draw");
      sanitized.fontSizeAdjustment = validateNumber(
        props.fontSizeAdjustment,
        -5,
        5,
        0,
      );
      sanitized.growY = validateNumber(props.growY, 0, 1000, 0);
      sanitized.labelColor = normalizeColor(props.labelColor);
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.verticalAlign = validateEnum(
        props.verticalAlign,
        TLDRAW_ALIGNS,
        "middle",
      );
      if (props.richText && typeof props.richText === "object") {
        sanitized.richText = sanitizeRichText(props.richText);
      } else if (typeof props.text === "string") {
        sanitized.richText = createSafeRichText(props.text);
      }
      break;

    case "frame":
      sanitized.color = normalizeColor(props.color);
      sanitized.h = validateNumber(props.h, 10, 2000, 90);
      sanitized.name = typeof props.name === "string" ? props.name : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 160);
      break;

    case "embed":
      sanitized.h = validateNumber(props.h, 50, 2000, 300);
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 300);
      break;

    case "bookmark":
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.h = validateNumber(props.h, 50, 2000, 100);
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 50, 2000, 200);
      break;

    case "image":
      sanitized.altText =
        typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.crop =
        props.crop && typeof props.crop === "object" ? props.crop : null;
      sanitized.flipX =
        typeof props.flipX === "boolean" ? props.flipX : false;
      sanitized.flipY =
        typeof props.flipY === "boolean" ? props.flipY : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100);
      sanitized.playing =
        typeof props.playing === "boolean" ? props.playing : true;
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 100);
      break;

    case "video":
      sanitized.altText =
        typeof props.altText === "string" ? props.altText : "";
      sanitized.assetId =
        typeof props.assetId === "string" || props.assetId === null
          ? props.assetId
          : null;
      sanitized.autoplay =
        typeof props.autoplay === "boolean" ? props.autoplay : false;
      sanitized.h = validateNumber(props.h, 10, 2000, 100);
      sanitized.playing =
        typeof props.playing === "boolean" ? props.playing : false;
      sanitized.time = validateNumber(props.time, 0, Infinity, 0);
      sanitized.url = typeof props.url === "string" ? props.url : "";
      sanitized.w = validateNumber(props.w, 10, 2000, 100);
      break;

    case "line":
      sanitized.color = normalizeColor(props.color);
      sanitized.dash = validateEnum(props.dash, TLDRAW_DASHES, "draw");
      sanitized.points =
        props.points && typeof props.points === "object" ? props.points : {};
      sanitized.scale = validateNumber(props.scale, 0.1, 10, 1);
      sanitized.size = validateEnum(props.size, TLDRAW_SIZES, "m");
      sanitized.spline = validateEnum(
        props.spline,
        ["line", "cubic"] as const,
        "line",
      );
      break;

    case "group":
      break;
  }

  return sanitized;
}
