import type { TldrawShapeType } from "./constants";
import { createSafeRichText } from "./rich-text";

/** Returns the default props for a given tldraw shape type */
export function getShapeDefaults(
  type: TldrawShapeType,
): Record<string, unknown> {
  switch (type) {
    case "geo":
      return {
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
      };
    case "text":
      return {
        autoSize: true,
        color: "black",
        font: "draw",
        richText: createSafeRichText("Text"),
        scale: 1,
        size: "m",
        textAlign: "start",
        w: 8,
      };
    case "arrow":
      return {
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
      };
    case "draw":
      return {
        color: "black",
        dash: "draw",
        fill: "none",
        isClosed: false,
        isComplete: false,
        isPen: false,
        scale: 1,
        segments: [],
        size: "m",
      };
    case "highlight":
      return {
        color: "yellow",
        isComplete: false,
        isPen: false,
        scale: 1,
        segments: [],
        size: "m",
      };
    case "note":
      return {
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
      };
    case "frame":
      return { color: "black", h: 90, name: "", w: 160 };
    case "group":
      return {};
    case "embed":
      return { h: 300, url: "", w: 300 };
    case "bookmark":
      return { assetId: null, h: 100, url: "", w: 200 };
    case "image":
      return {
        altText: "",
        assetId: null,
        crop: null,
        flipX: false,
        flipY: false,
        h: 100,
        playing: true,
        url: "",
        w: 100,
      };
    case "video":
      return {
        altText: "",
        assetId: null,
        autoplay: false,
        h: 100,
        playing: false,
        time: 0,
        url: "",
        w: 100,
      };
    case "line":
      return {
        color: "black",
        dash: "draw",
        points: {},
        scale: 1,
        size: "m",
        spline: "line",
      };
    default:
      return {};
  }
}
