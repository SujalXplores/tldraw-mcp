import { createSafeRichText, sanitizeRichText } from "../lib/rich-text";

// ─── createSafeRichText ──────────────────────────────────────────

describe("createSafeRichText", () => {
  it("wraps text in a valid tldraw richText document", () => {
    const result = createSafeRichText("Hello World");
    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello World" }],
        },
      ],
    });
  });

  it("trims leading/trailing whitespace from text", () => {
    const result = createSafeRichText("  spaced  ");
    expect(result.content[0].content[0].text).toBe("spaced");
  });

  it("uses zero-width space for empty string", () => {
    const result = createSafeRichText("");
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("uses zero-width space for whitespace-only string", () => {
    const result = createSafeRichText("   ");
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("uses zero-width space when no argument provided", () => {
    const result = createSafeRichText();
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("uses zero-width space for undefined", () => {
    const result = createSafeRichText(undefined);
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("always has type: doc at top level", () => {
    expect(createSafeRichText("x").type).toBe("doc");
    expect(createSafeRichText().type).toBe("doc");
  });

  it("always has exactly one paragraph with one text node", () => {
    const result = createSafeRichText("test");
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("paragraph");
    expect(result.content[0].content).toHaveLength(1);
    expect(result.content[0].content[0].type).toBe("text");
  });

  it("preserves special characters and unicode", () => {
    expect(createSafeRichText("café ☕").content[0].content[0].text).toBe("café ☕");
    expect(createSafeRichText("line1\nline2").content[0].content[0].text).toBe("line1\nline2");
  });
});

// ─── sanitizeRichText ────────────────────────────────────────────

describe("sanitizeRichText", () => {
  it("passes through valid richText objects with text content", () => {
    const valid = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };
    expect(sanitizeRichText(valid)).toBe(valid);
  });

  it("returns default for richText with empty text nodes", () => {
    const empty = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "" }],
        },
      ],
    };
    const result = sanitizeRichText(empty);
    // Returns a new default since "" trims to falsy
    expect(result.type).toBe("doc");
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for richText with whitespace-only text", () => {
    const ws = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "   " }],
        },
      ],
    };
    const result = sanitizeRichText(ws);
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for null/undefined/primitives", () => {
    for (const val of [null, undefined, 42, "string", true]) {
      const result = sanitizeRichText(val);
      expect(result.type).toBe("doc");
      expect(result.content[0].content[0].text).toBe("\u200B");
    }
  });

  it("returns default for objects without content", () => {
    expect(sanitizeRichText({}).content[0].content[0].text).toBe("\u200B");
    expect(sanitizeRichText({ type: "doc" }).content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for objects with non-array content", () => {
    expect(sanitizeRichText({ content: "not array" }).content[0].content[0].text).toBe("\u200B");
    expect(sanitizeRichText({ content: 42 }).content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for empty content array", () => {
    const result = sanitizeRichText({ content: [] });
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for content with no valid text nodes", () => {
    const noText = {
      content: [
        { type: "paragraph", content: [] },
      ],
    };
    const result = sanitizeRichText(noText);
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for content blocks that are not objects", () => {
    const result = sanitizeRichText({ content: [null, 42, "string"] });
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("returns default for blocks with non-array content", () => {
    const result = sanitizeRichText({
      content: [{ type: "paragraph", content: "not an array" }],
    });
    expect(result.content[0].content[0].text).toBe("\u200B");
  });

  it("passes valid multi-paragraph richText", () => {
    const multi = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] },
      ],
    };
    expect(sanitizeRichText(multi)).toBe(multi);
  });

  it("passes richText if at least one paragraph has valid text", () => {
    const mixed = {
      type: "doc",
      content: [
        { type: "paragraph", content: [] },
        { type: "paragraph", content: [{ type: "text", text: "Valid" }] },
      ],
    };
    expect(sanitizeRichText(mixed)).toBe(mixed);
  });

  it("returns default when content.some throws", () => {
    const trap = {
      content: new Proxy([], {
        get(target, prop) {
          if (prop === "some") throw new Error("trap");
          return Reflect.get(target, prop) as unknown;
        },
      }),
    };
    const result = sanitizeRichText(trap);
    expect(result.type).toBe("doc");
    expect(result.content[0].content[0].text).toBe("\u200B");
  });
});
