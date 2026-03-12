import type { TldrawShapeType } from "./constants";
import { createSafeRichText } from "./rich-text";
import { getShapeDefaults } from "./shape-defaults";
import { sanitizeShapeProps } from "./shape-sanitizer";
import { validateShapeType } from "./validation";

/**
 * Preprocesses raw AI shape data into a valid tldraw-compatible structure.
 * Handles text→richText conversion, missing props, and type normalization.
 */
export function preprocessAIShapeData(
  rawData: unknown,
): Record<string, unknown> {
  if (!rawData || typeof rawData !== "object") {
    return { type: "geo", x: 100, y: 100, props: getShapeDefaults("geo") };
  }

  const data = rawData as Record<string, unknown>;
  const processed: Record<string, unknown> = { ...data };

  processed.type = validateShapeType(data.type);
  if (typeof processed.x !== "number") processed.x = 100;
  if (typeof processed.y !== "number") processed.y = 100;

  if (!processed.props || typeof processed.props !== "object") {
    processed.props = {};
  }

  const props = processed.props as Record<string, unknown>;
  const type = processed.type as TldrawShapeType;

  // Convert text→richText for shapes that use richText
  if (["text", "geo", "note"].includes(type) && props.text && !props.richText) {
    props.richText = createSafeRichText(String(props.text as string | number));
    delete props.text;
  }

  // For text shapes, ensure richText always exists
  if (type === "text" && !props.richText) {
    props.richText = createSafeRichText("Text");
  }

  // For arrows, convert text→richText (tldraw v4 uses richText for arrow labels)
  if (type === "arrow" && props.text && !props.richText) {
    props.richText = createSafeRichText(String(props.text as string | number));
    delete props.text;
  } else if (type === "arrow" && props.text) {
    delete props.text;
  }

  processed.props = sanitizeShapeProps(type, props);
  return processed;
}

/** Preprocesses an array of raw AI shape data */
export function preprocessAIBatchData(
  rawShapes: unknown[],
): Record<string, unknown>[] {
  if (!Array.isArray(rawShapes)) return [];

  return rawShapes
    .filter(
      (shape): shape is Record<string, unknown> =>
        shape !== null && shape !== undefined,
    )
    .map((shape, index) => {
      try {
        return preprocessAIShapeData(shape);
      } catch {
        return {
          type: "geo",
          x: 100 + index * 120,
          y: 100,
          props: getShapeDefaults("geo"),
        };
      }
    });
}
