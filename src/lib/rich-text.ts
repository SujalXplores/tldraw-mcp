/** Creates a valid tldraw richText document from a plain text string */
export function createSafeRichText(text?: string) {
  const safeText = typeof text === "string" && text.trim() ? text.trim() : "\u200B";
  return {
    type: "doc" as const,
    content: [
      {
        type: "paragraph" as const,
        content: [{ type: "text" as const, text: safeText }],
      },
    ],
  };
}

/** Validates a richText object, returning a safe default if invalid */
export function sanitizeRichText(
  richText: unknown,
): ReturnType<typeof createSafeRichText> {
  try {
    if (
      richText &&
      typeof richText === "object" &&
      "content" in richText &&
      Array.isArray((richText as Record<string, unknown>).content)
    ) {
      const content = (richText as Record<string, unknown>).content as unknown[];
      const hasValidText = content.some((block: unknown) => {
        if (!block || typeof block !== "object") return false;
        const blockContent = (block as Record<string, unknown>).content;
        if (!Array.isArray(blockContent)) return false;
        return blockContent.some(
          (node: unknown) =>
            node &&
            typeof node === "object" &&
            typeof (node as Record<string, unknown>).text === "string" &&
            ((node as Record<string, unknown>).text as string).trim(),
        );
      });
      if (hasValidText) return richText as ReturnType<typeof createSafeRichText>;
    }
  } catch {
    // Fall through to default
  }
  return createSafeRichText();
}
