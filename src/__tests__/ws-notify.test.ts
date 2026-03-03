import { notifyWebSocketServer } from "../lib/ws-notify";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("notifyWebSocketServer", () => {
  it("returns true on successful broadcast", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await notifyWebSocketServer({ type: "update", shapeId: "123" });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/broadcast"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "update", shapeId: "123" }),
      }),
    );
  });

  it("returns false when server returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await notifyWebSocketServer({ type: "update" });

    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await notifyWebSocketServer({ type: "update" });

    expect(result).toBe(false);
  });

  it("returns false on timeout error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("AbortError: The operation was aborted"));

    const result = await notifyWebSocketServer({ type: "update" });

    expect(result).toBe(false);
  });

  it("sends correct JSON body", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const message = { type: "batch_update", shapes: [{ id: "a" }, { id: "b" }] };
    await notifyWebSocketServer(message);

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(call[1].body as string)).toEqual(message);
  });

  it("uses correct WS_SERVER_URL with /broadcast path", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await notifyWebSocketServer({ type: "test" });

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toMatch(/\/broadcast$/);
  });

  it("handles empty message objects", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await notifyWebSocketServer({});

    expect(result).toBe(true);
  });

  it("uses WS_SERVER_URL env variable when set", async () => {
    const origUrl = process.env.WS_SERVER_URL;
    process.env.WS_SERVER_URL = "http://custom:9999";

    // Re-import to pick up new env value
    jest.resetModules();
    const { notifyWebSocketServer: freshNotify } = await import("../lib/ws-notify") as typeof import("../lib/ws-notify");
    mockFetch.mockResolvedValueOnce({ ok: true });

    await freshNotify({ type: "test" });

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("http://custom:9999/broadcast");

    // Restore
    if (origUrl !== undefined) {
      process.env.WS_SERVER_URL = origUrl;
    } else {
      delete process.env.WS_SERVER_URL;
    }
  });
});
