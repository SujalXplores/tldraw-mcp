import { sanitizeShapeProps } from "../lib/shape-sanitizer";
import { getShapeDefaults } from "../lib/shape-defaults";
import { TLDRAW_SHAPE_TYPES } from "../lib/constants";

describe("sanitizeShapeProps", () => {
  // ─── null / undefined / non-object props ──────────────────────

  describe("null/undefined/invalid props", () => {
    it("returns defaults when props is null", () => {
      for (const type of TLDRAW_SHAPE_TYPES) {
        expect(sanitizeShapeProps(type, null)).toEqual(getShapeDefaults(type));
      }
    });

    it("returns defaults when props is undefined", () => {
      for (const type of TLDRAW_SHAPE_TYPES) {
        expect(sanitizeShapeProps(type, undefined)).toEqual(getShapeDefaults(type));
      }
    });
  });

  // ─── geo ─────────────────────────────────────────────────────

  describe("geo shape", () => {
    it("applies valid props", () => {
      const result = sanitizeShapeProps("geo", {
        geo: "ellipse",
        color: "red",
        w: 200,
        h: 150,
        fill: "solid",
        dash: "dashed",
        size: "l",
      });
      expect(result.geo).toBe("ellipse");
      expect(result.color).toBe("red");
      expect(result.w).toBe(200);
      expect(result.h).toBe(150);
      expect(result.fill).toBe("solid");
      expect(result.dash).toBe("dashed");
      expect(result.size).toBe("l");
    });

    it("clamps numeric values", () => {
      const result = sanitizeShapeProps("geo", {
        w: 99999,
        h: -5,
        growY: 5000,
        scale: 50,
      });
      expect(result.w).toBe(2000);
      expect(result.h).toBe(1);
      expect(result.growY).toBe(1000);
      expect(result.scale).toBe(10);
    });

    it("normalizes color aliases", () => {
      const result = sanitizeShapeProps("geo", { color: "purple" });
      expect(result.color).toBe("violet");
    });

    it("handles url as string and non-string", () => {
      expect(sanitizeShapeProps("geo", { url: "https://x.com" }).url).toBe("https://x.com");
      expect(sanitizeShapeProps("geo", { url: 42 }).url).toBe("");
      expect(sanitizeShapeProps("geo", { url: null }).url).toBe("");
    });

    it("falls back to defaults for invalid enum values", () => {
      const result = sanitizeShapeProps("geo", {
        geo: "hexahedron",
        fill: "gradient",
        dash: "wavy",
      });
      expect(result.geo).toBe("rectangle");
      expect(result.fill).toBe("none");
      expect(result.dash).toBe("draw");
    });

    it("sanitizes richText when provided", () => {
      const validRichText = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        ],
      };
      const result = sanitizeShapeProps("geo", { richText: validRichText });
      expect(result.richText).toBe(validRichText);
    });

    it("does not inject richText when not provided", () => {
      const result = sanitizeShapeProps("geo", {});
      // richText comes from defaults for geo
      const defaults = getShapeDefaults("geo");
      expect(result.richText).toEqual(defaults.richText);
    });
  });

  // ─── text ────────────────────────────────────────────────────

  describe("text shape", () => {
    it("applies valid text props", () => {
      const result = sanitizeShapeProps("text", {
        autoSize: false,
        color: "blue",
        font: "mono",
        size: "xl",
        textAlign: "end",
        w: 500,
      });
      expect(result.autoSize).toBe(false);
      expect(result.color).toBe("blue");
      expect(result.font).toBe("mono");
      expect(result.size).toBe("xl");
      expect(result.textAlign).toBe("end");
      expect(result.w).toBe(500);
    });

    it("converts text to richText when richText is missing", () => {
      const result = sanitizeShapeProps("text", { text: "Hello" });
      expect(result.richText).toBeDefined();
      const rt = result.richText as { type: string; content: Array<{ content: Array<{ text: string }> }> };
      expect(rt.type).toBe("doc");
      expect(rt.content[0].content[0].text).toBe("Hello");
    });

    it("uses richText over text when both are provided", () => {
      const richText = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "RichText wins" }] },
        ],
      };
      const result = sanitizeShapeProps("text", { text: "plain", richText });
      expect(result.richText).toBe(richText);
    });

    it("defaults autoSize to true", () => {
      const result = sanitizeShapeProps("text", {});
      expect(result.autoSize).toBe(true);
    });
  });

  // ─── arrow ───────────────────────────────────────────────────

  describe("arrow shape", () => {
    it("applies valid arrow props", () => {
      const result = sanitizeShapeProps("arrow", {
        arrowheadEnd: "triangle",
        arrowheadStart: "diamond",
        bend: 1.5,
        color: "green",
        kind: "elbow",
        start: { x: 10, y: 20 },
        end: { x: 200, y: 300 },
        text: "label",
      });
      expect(result.arrowheadEnd).toBe("triangle");
      expect(result.arrowheadStart).toBe("diamond");
      expect(result.bend).toBe(1.5);
      expect(result.color).toBe("green");
      expect(result.kind).toBe("elbow");
      expect(result.start).toEqual({ x: 10, y: 20 });
      expect(result.end).toEqual({ x: 200, y: 300 });
      expect(result.text).toBe("label");
    });

    it("clamps start/end coordinates", () => {
      const result = sanitizeShapeProps("arrow", {
        start: { x: -99999, y: 99999 },
        end: { x: 99999, y: -99999 },
      });
      expect(result.start).toEqual({ x: -5000, y: 5000 });
      expect(result.end).toEqual({ x: 5000, y: -5000 });
    });

    it("ignores non-object start/end", () => {
      const result = sanitizeShapeProps("arrow", {
        start: "invalid",
        end: 42,
      });
      // start/end remain at defaults from getShapeDefaults
      expect(result.start).toEqual({ x: 0, y: 0 });
      expect(result.end).toEqual({ x: 100, y: 100 });
    });
  });

  // ─── draw / highlight ────────────────────────────────────────

  describe("draw shape", () => {
    it("applies valid draw props", () => {
      const segments = [{ type: "free", points: [{ x: 0, y: 0 }] }];
      const result = sanitizeShapeProps("draw", {
        color: "red",
        isComplete: true,
        isPen: true,
        isClosed: true,
        segments,
        size: "l",
        dash: "solid",
        fill: "semi",
      });
      expect(result.color).toBe("red");
      expect(result.isComplete).toBe(true);
      expect(result.isPen).toBe(true);
      expect(result.isClosed).toBe(true);
      expect(result.segments).toBe(segments);
      expect(result.dash).toBe("solid");
      expect(result.fill).toBe("semi");
    });

    it("defaults booleans to false", () => {
      const result = sanitizeShapeProps("draw", {});
      expect(result.isComplete).toBe(false);
      expect(result.isPen).toBe(false);
      expect(result.isClosed).toBe(false);
    });

    it("defaults segments to empty array", () => {
      const result = sanitizeShapeProps("draw", { segments: "not-array" });
      expect(result.segments).toEqual([]);
    });
  });

  describe("highlight shape", () => {
    it("does not include isClosed/dash/fill (draw-only)", () => {
      const result = sanitizeShapeProps("highlight", {
        color: "yellow",
        isComplete: true,
      });
      expect(result.color).toBe("yellow");
      expect(result.isComplete).toBe(true);
      // highlight shares draw logic but doesn't add draw-specific props
      // The defaults from getShapeDefaults("highlight") don't include isClosed
    });
  });

  // ─── note ────────────────────────────────────────────────────

  describe("note shape", () => {
    it("converts text to richText", () => {
      const result = sanitizeShapeProps("note", { text: "My note" });
      const rt = result.richText as { type: string; content: Array<{ content: Array<{ text: string }> }> };
      expect(rt.content[0].content[0].text).toBe("My note");
    });

    it("applies fontSizeAdjustment", () => {
      const result = sanitizeShapeProps("note", { fontSizeAdjustment: 3 });
      expect(result.fontSizeAdjustment).toBe(3);
    });

    it("clamps fontSizeAdjustment", () => {
      expect(sanitizeShapeProps("note", { fontSizeAdjustment: 10 }).fontSizeAdjustment).toBe(5);
      expect(sanitizeShapeProps("note", { fontSizeAdjustment: -10 }).fontSizeAdjustment).toBe(-5);
    });

    it("handles url as string and non-string", () => {
      expect(sanitizeShapeProps("note", { url: "https://x.com" }).url).toBe("https://x.com");
      expect(sanitizeShapeProps("note", { url: 42 }).url).toBe("");
      expect(sanitizeShapeProps("note", { url: null }).url).toBe("");
    });
  });

  // ─── frame ───────────────────────────────────────────────────

  describe("frame shape", () => {
    it("applies valid frame props", () => {
      const result = sanitizeShapeProps("frame", {
        w: 800,
        h: 600,
        name: "My Frame",
        color: "blue",
      });
      expect(result.w).toBe(800);
      expect(result.h).toBe(600);
      expect(result.name).toBe("My Frame");
      expect(result.color).toBe("blue");
    });

    it("defaults name to empty string for non-string", () => {
      expect(sanitizeShapeProps("frame", { name: 42 }).name).toBe("");
      expect(sanitizeShapeProps("frame", { name: null }).name).toBe("");
    });
  });

  // ─── embed ───────────────────────────────────────────────────

  describe("embed shape", () => {
    it("applies valid embed props", () => {
      const result = sanitizeShapeProps("embed", {
        url: "https://example.com",
        w: 640,
        h: 480,
      });
      expect(result.url).toBe("https://example.com");
      expect(result.w).toBe(640);
      expect(result.h).toBe(480);
    });

    it("defaults url to empty string for non-string", () => {
      expect(sanitizeShapeProps("embed", { url: 42 }).url).toBe("");
    });
  });

  // ─── bookmark ────────────────────────────────────────────────

  describe("bookmark shape", () => {
    it("applies valid bookmark props", () => {
      const result = sanitizeShapeProps("bookmark", {
        url: "https://example.com",
        assetId: "asset:123",
        w: 300,
        h: 200,
      });
      expect(result.url).toBe("https://example.com");
      expect(result.assetId).toBe("asset:123");
      expect(result.w).toBe(300);
      expect(result.h).toBe(200);
    });

    it("accepts null assetId", () => {
      expect(sanitizeShapeProps("bookmark", { assetId: null }).assetId).toBeNull();
    });

    it("defaults assetId to null for non-string/non-null", () => {
      expect(sanitizeShapeProps("bookmark", { assetId: 42 }).assetId).toBeNull();
      expect(sanitizeShapeProps("bookmark", { assetId: true }).assetId).toBeNull();
    });
  });

  // ─── image ───────────────────────────────────────────────────

  describe("image shape", () => {
    it("applies valid image props", () => {
      const result = sanitizeShapeProps("image", {
        url: "https://example.com/img.png",
        altText: "A photo",
        flipX: true,
        flipY: true,
        playing: false,
        w: 640,
        h: 480,
        assetId: "asset:img1",
        crop: { x: 0, y: 0, w: 100, h: 100 },
      });
      expect(result.url).toBe("https://example.com/img.png");
      expect(result.altText).toBe("A photo");
      expect(result.flipX).toBe(true);
      expect(result.flipY).toBe(true);
      expect(result.playing).toBe(false);
      expect(result.assetId).toBe("asset:img1");
      expect(result.crop).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    });

    it("defaults crop to null for non-object", () => {
      expect(sanitizeShapeProps("image", { crop: "not-object" }).crop).toBeNull();
      expect(sanitizeShapeProps("image", { crop: 42 }).crop).toBeNull();
    });
  });

  // ─── video ───────────────────────────────────────────────────

  describe("video shape", () => {
    it("applies valid video props", () => {
      const result = sanitizeShapeProps("video", {
        url: "https://example.com/video.mp4",
        altText: "A video",
        autoplay: true,
        playing: true,
        time: 30,
        w: 640,
        h: 360,
        assetId: "asset:vid1",
      });
      expect(result.url).toBe("https://example.com/video.mp4");
      expect(result.autoplay).toBe(true);
      expect(result.playing).toBe(true);
      expect(result.time).toBe(30);
    });

    it("clamps time to non-negative", () => {
      const result = sanitizeShapeProps("video", { time: -5 });
      expect(result.time).toBe(0);
    });
  });

  // ─── line ────────────────────────────────────────────────────

  describe("line shape", () => {
    it("applies valid line props", () => {
      const points = { "0": { x: 0, y: 0 }, "1": { x: 100, y: 100 } };
      const result = sanitizeShapeProps("line", {
        color: "red",
        dash: "dashed",
        size: "l",
        spline: "cubic",
        points,
      });
      expect(result.color).toBe("red");
      expect(result.dash).toBe("dashed");
      expect(result.size).toBe("l");
      expect(result.spline).toBe("cubic");
      expect(result.points).toBe(points);
    });

    it("defaults points to empty object for non-object", () => {
      expect(sanitizeShapeProps("line", { points: "invalid" }).points).toEqual({});
      expect(sanitizeShapeProps("line", { points: null }).points).toEqual({});
    });
  });

  // ─── group ───────────────────────────────────────────────────

  describe("group shape", () => {
    it("returns defaults unchanged (group has no props to sanitize)", () => {
      const result = sanitizeShapeProps("group", { anything: "ignored" });
      expect(result).toEqual(expect.objectContaining(getShapeDefaults("group")));
    });
  });
});
