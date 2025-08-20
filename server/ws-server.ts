// server/ws-server.ts - WebSocket server with HTTP endpoints
import { createServer } from "http";
import { webSocketService } from "../src/services/singleton";
import logger from "../src/services/logger";

const port = parseInt(process.env.WS_PORT || "4000", 10);

const server = createServer((req, res) => {
  // Add CORS headers
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
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        logger.info(`[WebSocket] 📨 HTTP broadcast request: ${data.type}`);

        // Broadcast to all browser clients
        webSocketService.broadcast(data);

        const status = webSocketService.getStatus();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: `Broadcasted ${data.type}`,
            clientsCount: status.browserClientsCount,
            timestamp: new Date().toISOString(),
          })
        );

        logger.info(
          `[WebSocket] ✅ HTTP broadcast sent to ${status.browserClientsCount} browsers`
        );
      } catch (error: any) {
        logger.error("[WebSocket] ❌ Error processing broadcast:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            error: error.message,
          })
        );
      }
    });

    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    const status = webSocketService.getStatus();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        status: status,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Default response
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

// Initialize WebSocket service
logger.info("🚀 Initializing WebSocket server...");
webSocketService.initialize(server);

server.listen(port, () => {
  logger.info(`📡 WebSocket server running on ws://localhost:${port}`);
  logger.info(`🌐 HTTP broadcast: POST http://localhost:${port}/broadcast`);
  logger.info(`📊 HTTP status: GET http://localhost:${port}/status`);
  logger.info(`🔌 Initial status:`, webSocketService.getStatus());
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("🔄 Shutting down WebSocket server...");
  webSocketService.close();
  server.close(() => {
    logger.info("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("\n🔄 Received SIGINT, shutting down gracefully...");
  webSocketService.close();
  server.close(() => {
    logger.info("✅ Server closed");
    process.exit(0);
  });
});
