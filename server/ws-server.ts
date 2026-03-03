import { createServer } from "http";
import { webSocketService } from "../src/services/singleton";
import logger from "../src/services/logger";
import type { MCPWebSocketMessage } from "../src/types";
import { getErrorMessage } from "../src/lib";

const port = parseInt(process.env.WS_PORT ?? "4000", 10);

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/broadcast") {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        const data = JSON.parse(body) as MCPWebSocketMessage;
        webSocketService.broadcast(data);
        const status = webSocketService.getStatus();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: `Broadcasted ${data.type}`,
            clientsCount: status.browserClientsCount,
            timestamp: new Date().toISOString(),
          }),
        );
      } catch (error: unknown) {
        logger.error("[WS] Broadcast error:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: getErrorMessage(error) }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        status: webSocketService.getStatus(),
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

webSocketService.initialize(server);

server.listen(port, () => {
  logger.info(`WebSocket server running on ws://localhost:${String(port)}`);
  logger.info(`  POST http://localhost:${String(port)}/broadcast`);
  logger.info(`  GET  http://localhost:${String(port)}/status`);
});

function shutdown() {
  logger.info("Shutting down WebSocket server...");
  webSocketService.close();
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
