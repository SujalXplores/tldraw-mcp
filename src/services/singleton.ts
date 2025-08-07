// src/services/singleton.ts - CLEAN VERSION
import { ShapeStorageService } from "./shape-storage";
import { WebSocketService } from "./websocket";
import logger from "./logger";

logger.info("🏭 [Singleton] Creating singleton instances...");

// Singleton instances
export const shapeStorage = new ShapeStorageService();
export const webSocketService = new WebSocketService();

logger.info("✅ [Singleton] Instances created:");
logger.info(`📦 shapeStorage: ${!!shapeStorage}`);
logger.info(`🔌 webSocketService: ${!!webSocketService}`);
