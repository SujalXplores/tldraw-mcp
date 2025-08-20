// src/types.ts

// Base ID types (branded strings for type safety)
export type TLShapeId = string & { __type__: "TLShapeId" };
export type TLParentId = string & { __type__: "TLParentId" };
export type TLAssetId = string & { __type__: "TLAssetId" };
export type IndexKey = string & { __type__: "IndexKey" };
export type VecLike = { x: number; y: number; z?: number };
export type JsonObject = Record<string, any>;

export type TldrawShapeType =
  | "geo"
  | "text"
  | "arrow"
  | "draw"
  | "highlight"
  | "image"
  | "video"
  | "embed"
  | "bookmark"
  | "frame"
  | "note"
  | "line"
  | "group";

// ===== OFFICIAL TLDRAW STYLE TYPES =====

export type TldrawColor =
  | "black"
  | "blue"
  | "green"
  | "grey"
  | "light-blue"
  | "light-green"
  | "light-red"
  | "light-violet"
  | "orange"
  | "red"
  | "violet"
  | "white"
  | "yellow";

export type TldrawSize = "s" | "m" | "l" | "xl";

export type TldrawFill = "none" | "semi" | "solid" | "pattern";

export type TldrawDash = "draw" | "dashed" | "dotted" | "solid";

export type TldrawFont = "draw" | "sans" | "serif" | "mono";

export type TldrawAlign = "start" | "middle" | "end";
export type TldrawVerticalAlign = "start" | "middle" | "end";

export type TldrawGeoType =
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "trapezoid"
  | "rhombus"
  | "hexagon"
  | "octagon"
  | "star"
  | "oval"
  | "x-box"
  | "check-box"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "arrow-down"
  | "cloud"
  | "heart";

export type TldrawArrowheadType =
  | "none"
  | "arrow"
  | "triangle"
  | "square"
  | "dot"
  | "pipe"
  | "diamond"
  | "inverted"
  | "bar";

// Line spline style
export type TldrawLineSplineStyle = "line" | "cubic";

// ===== RICH TEXT TYPES - OFFICIAL STRUCTURE =====
export interface TLRichText {
  type: "doc";
  content: TLRichTextNode[];
}

export type TLRichTextNode = TLParagraph;

export interface TLParagraph {
  type: "paragraph";
  content: TLTextSpan[];
}

export interface TLTextSpan {
  type: "text";
  text: string;
  styles?: TLTextStyle[];
}

export type TLTextStyle = "bold" | "italic" | "underline" | "strike" | "code";

// ===== SHAPE CROP INTERFACE =====
export interface TLShapeCrop {
  topLeft: VecLike;
  bottomRight: VecLike;
}

// ===== LINE SHAPE POINT =====
export interface TldrawLinePoint {
  id: string;
  index: string;
  x: number;
  y: number;
}

// ===== SHAPE-SPECIFIC PROPS - FROM OFFICIAL DOCS =====

export interface TldrawGeoShapeProps {
  align: TldrawAlign;
  color: TldrawColor;
  dash: TldrawDash;
  fill: TldrawFill;
  font: TldrawFont;
  geo: TldrawGeoType;
  growY: number;
  h: number;
  labelColor: TldrawColor;
  richText?: TLRichText;
  scale: number;
  size: TldrawSize;
  url: string;
  verticalAlign: TldrawVerticalAlign;
  w: number;
}

export interface TldrawTextShapeProps {
  autoSize: boolean;
  color: TldrawColor;
  font: TldrawFont;
  richText: TLRichText;
  scale: number;
  size: TldrawSize;
  textAlign: TldrawAlign;
  w: number;
}

export interface TldrawArrowShapeProps {
  arrowheadEnd: TldrawArrowheadType;
  arrowheadStart: TldrawArrowheadType;
  bend: number;
  color: TldrawColor;
  dash: TldrawDash;
  elbowMidPoint: number;
  end: VecLike;
  fill: TldrawFill;
  font: TldrawFont;
  kind: "arc" | "elbow";
  labelColor: TldrawColor;
  labelPosition: number;
  scale: number;
  size: TldrawSize;
  start: VecLike;
  text: string;
}

export interface TldrawHighlightShapeProps {
  color: TldrawColor;
  isComplete: boolean;
  isPen: boolean;
  scale: number;
  segments: TldrawDrawShapeSegment[];
  size: TldrawSize;
}

// Draw shape segments
export interface TldrawDrawShapeSegment {
  type: "free" | "straight";
  points: VecLike[];
}

export interface TldrawDrawShapeProps {
  color: TldrawColor;
  fill: TldrawFill;
  dash: TldrawDash;
  size: TldrawSize;
  segments: TldrawDrawShapeSegment[];
  isComplete: boolean;
  isClosed: boolean;
  isPen: boolean;
  scale: number;
}

export interface TldrawNoteShapeProps {
  align: TldrawAlign;
  color: TldrawColor;
  font: TldrawFont;
  fontSizeAdjustment: number;
  growY: number;
  labelColor: TldrawColor;
  richText: TLRichText; // NOTE: Uses richText, NOT simple text!
  scale: number;
  size: TldrawSize;
  url: string;
  verticalAlign: TldrawVerticalAlign;
}

export interface TldrawFrameShapeProps {
  color: TldrawColor;
  h: number;
  name: string;
  w: number;
}

export interface TldrawGroupShapeProps {}

export interface TldrawEmbedShapeProps {
  h: number;
  url: string;
  w: number;
}

export interface TldrawBookmarkShapeProps {
  assetId: TLAssetId | null;
  h: number;
  url: string;
  w: number;
}

export interface TldrawImageShapeProps {
  altText: string;
  assetId: TLAssetId | null;
  crop: TLShapeCrop | null;
  flipX: boolean;
  flipY: boolean;
  h: number;
  playing: boolean;
  url: string;
  w: number;
}

export interface TldrawVideoShapeProps {
  altText: string;
  assetId: TLAssetId | null;
  autoplay: boolean;
  h: number;
  playing: boolean;
  time: number;
  url: string;
  w: number;
}

export interface TldrawLineShapeProps {
  color: TldrawColor;
  dash: TldrawDash;
  points: Record<string, TldrawLinePoint>;
  scale: number;
  size: TldrawSize;
  spline: TldrawLineSplineStyle;
}

// Generic shape props type
export type TldrawShapeProps<T extends TldrawShapeType = TldrawShapeType> =
  T extends "geo"
    ? TldrawGeoShapeProps
    : T extends "text"
    ? TldrawTextShapeProps
    : T extends "arrow"
    ? TldrawArrowShapeProps
    : T extends "draw"
    ? TldrawDrawShapeProps
    : T extends "highlight"
    ? TldrawHighlightShapeProps
    : T extends "note"
    ? TldrawNoteShapeProps
    : T extends "frame"
    ? TldrawFrameShapeProps
    : T extends "group"
    ? TldrawGroupShapeProps
    : T extends "embed"
    ? TldrawEmbedShapeProps
    : T extends "bookmark"
    ? TldrawBookmarkShapeProps
    : T extends "image"
    ? TldrawImageShapeProps
    : T extends "video"
    ? TldrawVideoShapeProps
    : T extends "line"
    ? TldrawLineShapeProps
    : Record<string, unknown>;

// Base shape interface (equivalent to TLBaseShape)
export interface TLBaseShape<Type extends string, Props extends object> {
  readonly id: TLShapeId;
  readonly typeName: "shape";
  type: Type;
  x: number;
  y: number;
  rotation: number;
  index: IndexKey;
  parentId: TLParentId;
  isLocked: boolean;
  opacity: number;
  props: Props;
  meta: JsonObject;
}

// Specific shape types
export type TLGeoShape = TLBaseShape<"geo", TldrawGeoShapeProps>;
export type TLTextShape = TLBaseShape<"text", TldrawTextShapeProps>;
export type TLArrowShape = TLBaseShape<"arrow", TldrawArrowShapeProps>;
export type TLDrawShape = TLBaseShape<"draw", TldrawDrawShapeProps>;
export type TLHighlightShape = TLBaseShape<
  "highlight",
  TldrawHighlightShapeProps
>;
export type TLNoteShape = TLBaseShape<"note", TldrawNoteShapeProps>;
export type TLFrameShape = TLBaseShape<"frame", TldrawFrameShapeProps>;
export type TLGroupShape = TLBaseShape<"group", TldrawGroupShapeProps>;
export type TLEmbedShape = TLBaseShape<"embed", TldrawEmbedShapeProps>;
export type TLBookmarkShape = TLBaseShape<"bookmark", TldrawBookmarkShapeProps>;
export type TLImageShape = TLBaseShape<"image", TldrawImageShapeProps>;
export type TLVideoShape = TLBaseShape<"video", TldrawVideoShapeProps>;
export type TLLineShape = TLBaseShape<"line", TldrawLineShapeProps>;

// Union of all shape types
export type TLShape =
  | TLGeoShape
  | TLTextShape
  | TLArrowShape
  | TLDrawShape
  | TLHighlightShape
  | TLNoteShape
  | TLFrameShape
  | TLGroupShape
  | TLEmbedShape
  | TLBookmarkShape
  | TLImageShape
  | TLVideoShape
  | TLLineShape;

// MCP Shape interface
export interface MCPShape<T extends TldrawShapeType = TldrawShapeType> {
  id: string;
  type: T;
  typeName: "shape";
  x: number;
  y: number;
  rotation: number;
  index: string;
  parentId: string;
  isLocked: boolean;
  opacity: number;
  props: TldrawShapeProps<T>;
  meta: JsonObject;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

// Input/Output types
export interface MCPShapeCreateInput<
  T extends TldrawShapeType = TldrawShapeType
> {
  type: T;
  x: number;
  y: number;
  props?: Partial<TldrawShapeProps<T>>;
  rotation?: number;
  opacity?: number;
  isLocked?: boolean;
  meta?: JsonObject;
  parentId?: string;
}

export interface MCPShapeUpdateInput<
  T extends TldrawShapeType = TldrawShapeType
> {
  id: string;
  type?: T;
  x?: number;
  y?: number;
  props?: Partial<TldrawShapeProps<T>>;
  rotation?: number;
  opacity?: number;
  isLocked?: boolean;
  meta?: JsonObject;
}

// API Response types
export interface MCPApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface MCPShapeResponse extends MCPApiResponse<MCPShape> {
  shape: MCPShape;
}

export interface MCPShapesResponse extends MCPApiResponse<MCPShape[]> {
  shapes: MCPShape[];
  count: number;
}

// WebSocket message types
export type MCPWebSocketMessageType =
  | "shape_created"
  | "shape_updated"
  | "shape_deleted"
  | "shapes_batch_created"
  | "initial_shapes";

export interface MCPWebSocketMessage<T = unknown> {
  type: MCPWebSocketMessageType;
  timestamp: string;
  shape?: MCPShape;
  shapes?: MCPShape[];
  shapeId?: string;
  data?: T;
}

// Storage interface
export interface MCPShapeStorage {
  shapes: Map<string, MCPShape>;
}

// Constants
export const TLDRAW_SHAPE_TYPES: readonly TldrawShapeType[] = [
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

export const SHAPE_DEFAULTS = {
  geo: (): TldrawGeoShapeProps => ({
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
  }),

  text: (): TldrawTextShapeProps => ({
    autoSize: true,
    color: "black",
    font: "draw",
    richText: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "", styles: [] }],
        },
      ],
    },
    scale: 1,
    size: "m",
    textAlign: "start",
    w: 8,
  }),

  arrow: (): TldrawArrowShapeProps => ({
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
  }),

  draw: (): TldrawDrawShapeProps => ({
    color: "black",
    fill: "none",
    dash: "draw",
    size: "m",
    segments: [],
    isComplete: false,
    isClosed: false,
    isPen: false,
    scale: 1,
  }),

  highlight: (): TldrawHighlightShapeProps => ({
    color: "yellow",
    isComplete: false,
    isPen: false,
    scale: 1,
    segments: [],
    size: "m",
  }),

  note: (): TldrawNoteShapeProps => ({
    align: "middle",
    color: "black",
    font: "draw",
    fontSizeAdjustment: 0,
    growY: 0,
    labelColor: "black",
    richText: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "", styles: [] }],
        },
      ],
    },
    scale: 1,
    size: "m",
    url: "",
    verticalAlign: "middle",
  }),

  frame: (): TldrawFrameShapeProps => ({
    color: "black",
    h: 90,
    name: "",
    w: 160,
  }),

  group: (): TldrawGroupShapeProps => ({}),

  embed: (): TldrawEmbedShapeProps => ({
    h: 300,
    url: "",
    w: 300,
  }),

  // CORRECTED: Bookmark shapes include h and w
  bookmark: (): TldrawBookmarkShapeProps => ({
    assetId: null,
    h: 100,
    url: "",
    w: 200,
  }),

  image: (): TldrawImageShapeProps => ({
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

  video: (): TldrawVideoShapeProps => ({
    altText: "",
    assetId: null,
    autoplay: false,
    h: 100,
    playing: false,
    time: 0,
    url: "",
    w: 100,
  }),

  line: (): TldrawLineShapeProps => ({
    color: "black",
    dash: "draw",
    points: {},
    scale: 1,
    size: "m",
    spline: "line",
  }),
} as const;
