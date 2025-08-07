// src/services/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { MCPWebSocketMessage } from "../types";
import logger from "./logger";

/**
 * WebSocket service for broadcasting AI shapes to browser clients
 * SIMPLIFIED: Only handles browser connections, no API client connections
 */
export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private browserClients = new Set<WebSocket>();
  private httpServer: HttpServer | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): WebSocketServer {
    if (this.wss) {
      logger.info(
        "[WebSocket] Server already initialized, returning existing instance"
      );
      return this.wss;
    }

    logger.info(
      "[WebSocket] Initializing WebSocket server for browser clients..."
    );
    this.httpServer = httpServer;
    this.wss = new WebSocketServer({ server: httpServer });

    this.wss.on("connection", this.handleConnection.bind(this));

    this.wss.on("error", (error) => {
      logger.error("[WebSocket] Server error:", error);
    });

    logger.info(
      "[WebSocket] ✅ WebSocket server initialized for AI → Browser communication"
    );
    return this.wss;
  }

  /**
   * Handle new browser connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const userAgent = request.headers["user-agent"] || "";
    const isBrowser =
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari");

    if (!isBrowser) {
      logger.info("[WebSocket] ❌ Non-browser connection rejected");
      ws.close(1000, "Only browser connections accepted");
      return;
    }

    this.browserClients.add(ws);
    logger.info(
      `[WebSocket] ✅ Browser client connected. Total: ${this.browserClients.size}`
    );

    ws.on("close", (code, reason) => {
      this.browserClients.delete(ws);
      logger.info(
        `[WebSocket] ❌ Browser client disconnected (code: ${code}). Total: ${this.browserClients.size}`
      );
    });

    ws.on("error", (error) => {
      logger.error("[WebSocket] ⚠️ Browser client error:", error);
      this.browserClients.delete(ws);
    });

    // Browsers don't send messages in this architecture - they only receive
    ws.on("message", (data) => {
      logger.info(
        "[WebSocket] ℹ️ Received message from browser (ignoring - browsers are receive-only)"
      );
    });

    // Send initial shapes to new browser client
    logger.info("[WebSocket] 📨 Sending initial shapes message to new browser");
    this.sendToClient(ws, {
      type: "initial_shapes",
      timestamp: new Date().toISOString(),
      shapes: [], // Will be loaded via API call
    });
  }

  /**
   * Broadcast AI message to all browser clients
   * Called directly from API routes when AI creates/updates/deletes shapes
   */
  broadcast(message: MCPWebSocketMessage): void {
    logger.info(
      `[WebSocket] 📡 Broadcasting AI message: ${message.type} to ${this.browserClients.size} browsers`
    );

    if (this.browserClients.size === 0) {
      logger.info("[WebSocket] ⚠️ No browser clients connected");
      return;
    }

    const data = JSON.stringify(message);
    let sentCount = 0;
    const deadClients = new Set<WebSocket>();

    this.browserClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch (error) {
          logger.error("[WebSocket] ❌ Error sending to browser:", error);
          deadClients.add(client);
        }
      } else {
        logger.info(
          `[WebSocket] ⚠️ Browser not ready (state: ${client.readyState}), cleaning up`
        );
        if (
          client.readyState === WebSocket.CLOSED ||
          client.readyState === WebSocket.CLOSING
        ) {
          deadClients.add(client);
        }
      }
    });

    // Clean up dead connections
    deadClients.forEach((client) => {
      logger.info("[WebSocket] 🗑️ Removing dead browser client");
      this.browserClients.delete(client);
    });

    logger.info(
      `[WebSocket] 📊 AI broadcast complete: ${sentCount} browsers received message`
    );
  }

  /**
   * Send message to specific browser client
   */
  private sendToClient(client: WebSocket, message: MCPWebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        const data = JSON.stringify(message);
        client.send(data);
        logger.info(`[WebSocket] 📤 Sent ${message.type} to browser client`);
      } catch (error) {
        logger.error("[WebSocket] ❌ Error sending to browser client:", error);
        this.browserClients.delete(client);
      }
    } else {
      logger.info(
        `[WebSocket] ⚠️ Cannot send to browser client, state: ${client.readyState}`
      );
    }
  }

  /**
   * Get connected browser clients count
   */
  getClientsCount(): number {
    return this.browserClients.size;
  }

  /**
   * Get server status
   */
  getStatus(): {
    initialized: boolean;
    browserClientsCount: number;
    serverReady: boolean;
  } {
    return {
      initialized: !!this.wss,
      browserClientsCount: this.browserClients.size,
      serverReady: !!this.wss && !!this.httpServer?.listening,
    };
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    logger.info("[WebSocket] 🔄 Closing WebSocket server...");
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.browserClients.clear();
    logger.info("[WebSocket] ✅ WebSocket server closed");
  }
}
