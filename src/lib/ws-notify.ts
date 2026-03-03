const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:4000";

/** Sends a broadcast message to the WebSocket server via HTTP */
export async function notifyWebSocketServer(
  message: Record<string, unknown>,
): Promise<boolean> {
  try {
    const response = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch {
    return false;
  }
}
