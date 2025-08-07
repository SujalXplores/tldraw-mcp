// types.ts - Self-contained types independent of Tldraw package

// Base ID types (branded strings for type safety)
export type TLShapeId = string & { __type__: "TLShapeId" };
export type TLParentId = string & { __type__: "TLParentId" };
export type IndexKey = string & { __type__: "IndexKey" };
export type VecLike = { x: number; y: number; z?: number };
export type JsonObject = Record<string, any>;

// Core Tldraw shape types
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

// Tldraw style types
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

export type TldrawColor =
  | "black"
  | "grey"
  | "white"
  | "blue"
  | "light-blue"
  | "green"
  | "light-green"
  | "red"
  | "light-red"
  | "orange"
  | "yellow"
  | "violet"
  | "light-violet";

export type TldrawFill = "none" | "semi" | "solid" | "pattern";
export type TldrawDash = "draw" | "dashed" | "dotted" | "solid";
export type TldrawSize = "s" | "m" | "l" | "xl";
export type TldrawFont = "draw" | "sans" | "serif" | "mono";
export type TldrawAlign = "start" | "middle" | "end";
export type TldrawVerticalAlign = "start" | "middle" | "end";
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

// Rich text types (for Text shapes)
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

// Shape-specific prop interfaces
export interface TldrawGeoShapeProps {
  geo: TldrawGeoType;
  w: number;
  h: number;
  color: TldrawColor;
  labelColor: TldrawColor;
  fill: TldrawFill;
  dash: TldrawDash;
  size: TldrawSize;
  font: TldrawFont;
  text: string;
  align: TldrawAlign;
  verticalAlign: TldrawVerticalAlign;
  growY: number;
}

export interface TldrawTextShapeProps {
  autoSize: boolean;
  color: TldrawColor;
  font: TldrawFont;
  size: TldrawSize;
  scale: number;
  textAlign: TldrawAlign;
  w: number;
  richText: TLRichText;
}

export interface TldrawArrowShapeProps {
  color: TldrawColor;
  fill: TldrawFill;
  dash: TldrawDash;
  size: TldrawSize;
  arrowheadStart: TldrawArrowheadType;
  arrowheadEnd: TldrawArrowheadType;
  start: VecLike;
  end: VecLike;
  bend: number;
  text: string;
  labelColor: TldrawColor;
  font: TldrawFont;
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
}

export interface TldrawDrawShapeSegment {
  type: "free" | "straight";
  points: VecLike[];
}

export interface TldrawHighlightShapeProps {
  color: TldrawColor;
  size: TldrawSize;
  segments: TldrawDrawShapeSegment[];
  isComplete: boolean;
  isPen: boolean;
}

export interface TldrawNoteShapeProps {
  color: TldrawColor;
  size: TldrawSize;
  font: TldrawFont;
  align: TldrawAlign;
  verticalAlign: TldrawVerticalAlign;
  growY: number;
  url: string;
  text: string;
}

export interface TldrawFrameShapeProps {
  w: number;
  h: number;
  name: string;
}

export interface TldrawGroupShapeProps {
  // Group shapes typically don't have additional props
}

export interface TldrawEmbedShapeProps {
  w: number;
  h: number;
  url: string;
  doesResize: boolean;
  overridePermissions: boolean;
  tmpOldUrl: string;
}

export interface TldrawBookmarkShapeProps {
  assetId: string | null;
  url: string;
}

export interface TldrawImageShapeProps {
  assetId: string | null;
  w: number;
  h: number;
  playing: boolean;
  url: string;
  crop: TldrawImageCrop | null;
}

export interface TldrawImageCrop {
  topLeft: VecLike;
  bottomRight: VecLike;
}

export interface TldrawVideoShapeProps {
  assetId: string | null;
  w: number;
  h: number;
  time: number;
  playing: boolean;
  url: string;
}

export interface TldrawLineShapeProps {
  color: TldrawColor;
  dash: TldrawDash;
  size: TldrawSize;
  spline: "line" | "cubic";
  points: Record<string, TldrawLinePoint>;
}

export interface TldrawLinePoint {
  id: string;
  index: string;
  x: number;
  y: number;
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

// Shape partial type for updates
export type TLShapePartial<T extends TLShape = TLShape> = T extends T
  ? {
      id: TLShapeId;
      type: T["type"];
      props?: Partial<T["props"]>;
      meta?: Partial<T["meta"]>;
    } & Partial<Omit<T, "type" | "id" | "props" | "meta">>
  : never;

// MCP Shape interface - using local types
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
    geo: "rectangle",
    w: 100,
    h: 100,
    color: "black",
    labelColor: "black",
    fill: "none",
    dash: "draw",
    text: "",
    size: "m",
    font: "draw",
    align: "middle",
    verticalAlign: "middle",
    growY: 0,
  }),
  text: (): TldrawTextShapeProps => ({
    color: "black",
    size: "m",
    font: "draw",
    w: 8,
    textAlign: "start",
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
    autoSize: true,
  }),
  arrow: (): TldrawArrowShapeProps => ({
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
  }),
  highlight: (): TldrawHighlightShapeProps => ({
    color: "yellow",
    size: "m",
    segments: [],
    isComplete: false,
    isPen: false,
  }),
  note: (): TldrawNoteShapeProps => ({
    color: "black",
    size: "m",
    font: "draw",
    align: "middle",
    verticalAlign: "middle",
    growY: 0,
    url: "",
    text: "",
  }),
  frame: (): TldrawFrameShapeProps => ({
    w: 160,
    h: 90,
    name: "",
  }),
  group: (): TldrawGroupShapeProps => ({}),
  embed: (): TldrawEmbedShapeProps => ({
    w: 300,
    h: 300,
    url: "",
    doesResize: true,
    overridePermissions: false,
    tmpOldUrl: "",
  }),
  bookmark: (): TldrawBookmarkShapeProps => ({
    assetId: null,
    url: "",
  }),
  image: (): TldrawImageShapeProps => ({
    assetId: null,
    w: 100,
    h: 100,
    playing: true,
    url: "",
    crop: null,
  }),
  video: (): TldrawVideoShapeProps => ({
    assetId: null,
    w: 100,
    h: 100,
    time: 0,
    playing: false,
    url: "",
  }),
  line: (): TldrawLineShapeProps => ({
    color: "black",
    dash: "draw",
    size: "m",
    spline: "line",
    points: {},
  }),
} as const;
