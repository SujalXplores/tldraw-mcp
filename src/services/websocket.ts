import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import type { MCPWebSocketMessage } from "../types";
import logger from "./logger";

/**
 * Manages WebSocket connections for broadcasting shape mutations to browser clients.
 * Only browser connections are accepted; non-browser clients are rejected.
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private browserClients = new Set<WebSocket>();
  private httpServer: HttpServer | null = null;

  initialize(httpServer: HttpServer): WebSocketServer {
    if (this.wss) {
      return this.wss;
    }

    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => logger.error("[WS] Server error:", error));

    logger.info("[WS] Server initialized");
    return this.wss;
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const userAgent = request.headers["user-agent"] ?? "";
    const isBrowser =
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari");

    if (!isBrowser) {
      ws.close(1000, "Only browser connections accepted");
      return;
    }

    this.browserClients.add(ws);
    logger.info(`[WS] Browser connected (total: ${String(this.browserClients.size)})`);

    ws.on("close", () => {
      this.browserClients.delete(ws);
      logger.info(`[WS] Browser disconnected (total: ${String(this.browserClients.size)})`);
    });

    ws.on("error", (error) => {
      logger.error("[WS] Client error:", error);
      this.browserClients.delete(ws);
    });

    this.sendToClient(ws, {
      type: "initial_shapes",
      timestamp: new Date().toISOString(),
      shapes: [],
    });
  }

  broadcast(message: MCPWebSocketMessage): void {
    if (this.browserClients.size === 0) return;

    const data = JSON.stringify(message);
    const deadClients = new Set<WebSocket>();
    let sentCount = 0;

    this.browserClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch {
          deadClients.add(client);
        }
      } else if (
        client.readyState === WebSocket.CLOSED ||
        client.readyState === WebSocket.CLOSING
      ) {
        deadClients.add(client);
      }
    });

    deadClients.forEach((client) => this.browserClients.delete(client));
    logger.info(`[WS] Broadcast ${message.type} to ${String(sentCount)} client(s)`);
  }

  private sendToClient(client: WebSocket, message: MCPWebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch {
        this.browserClients.delete(client);
      }
    }
  }

  getClientsCount(): number {
    return this.browserClients.size;
  }

  getStatus(): { initialized: boolean; browserClientsCount: number; serverReady: boolean } {
    return {
      initialized: this.wss !== null,
      browserClientsCount: this.browserClients.size,
      serverReady: this.wss !== null && (this.httpServer?.listening === true),
    };
  }

  close(): void {
    this.wss?.close();
    this.wss = null;
    this.browserClients.clear();
    logger.info("[WS] Server closed");
  }
}
