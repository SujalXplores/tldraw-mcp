import {
  TLDRAW_COLORS,
  TLDRAW_SHAPE_TYPES,
  COLOR_MAPPING,
  SHAPE_TYPE_ALIASES,
  type TldrawColor,
  type TldrawShapeType,
} from "./constants";

/** Normalizes a color value to a valid tldraw color, with alias mapping */
export function normalizeColor(color: unknown): TldrawColor {
  if (typeof color !== "string") return "black";
  const lower = color.toLowerCase().trim();
  if (TLDRAW_COLORS.includes(lower as TldrawColor)) return lower as TldrawColor;
  if (COLOR_MAPPING[lower]) return COLOR_MAPPING[lower];
  return "black";
}

/** Validates a number within bounds, returning fallback if invalid */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/** Validates a string against an enum of allowed values (case-insensitive) */
export function validateEnum<T extends readonly string[]>(
  value: unknown,
  validValues: T,
  fallback: T[number],
): T[number] {
  if (typeof value !== "string") return fallback;
  return validValues.find((v) => v.toLowerCase() === value.toLowerCase()) ?? fallback;
}

/** Validates and normalizes a shape type string, mapping aliases to canonical types */
export function validateShapeType(type: unknown): TldrawShapeType {
  if (typeof type !== "string") return "geo";
  const lower = type.toLowerCase().trim();
  if (TLDRAW_SHAPE_TYPES.includes(lower as TldrawShapeType))
    return lower as TldrawShapeType;
  if (SHAPE_TYPE_ALIASES[lower]) return SHAPE_TYPE_ALIASES[lower];
  return "geo";
}
