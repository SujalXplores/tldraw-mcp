// Single source of truth for all tldraw shape type and style constants

export const TLDRAW_SHAPE_TYPES = [
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

export const TLDRAW_COLORS = [
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

export const TLDRAW_GEO_TYPES = [
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

export const TLDRAW_FILLS = ["none", "semi", "solid", "pattern"] as const;
export const TLDRAW_DASHES = ["draw", "dashed", "dotted", "solid"] as const;
export const TLDRAW_SIZES = ["s", "m", "l", "xl"] as const;
export const TLDRAW_FONTS = ["draw", "sans", "serif", "mono"] as const;
export const TLDRAW_ALIGNS = ["start", "middle", "end"] as const;
export const TLDRAW_ARROWHEADS = [
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

export type TldrawShapeType = (typeof TLDRAW_SHAPE_TYPES)[number];
export type TldrawColor = (typeof TLDRAW_COLORS)[number];

/** Maps common color names to valid tldraw colors */
export const COLOR_MAPPING: Record<string, TldrawColor> = {
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

/** Maps common shape name aliases to valid tldraw shape types */
export const SHAPE_TYPE_ALIASES: Record<string, TldrawShapeType> = {
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
