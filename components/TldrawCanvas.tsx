// src/components/TldrawCanvas.tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, TLShapeId, useEditor, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { ShapeConverterService } from "../src/services/shape-converter";
import type { MCPShape, MCPWebSocketMessage } from "../src/types";

interface TldrawControllerProps {
  onEditorReady?: (editor: Editor) => void;
  isConnected: boolean;
  clearCanvas: () => void;
  isLoading?: boolean;
}

function TldrawController({
  onEditorReady,
  isConnected,
  clearCanvas,
  isLoading = false,
}: TldrawControllerProps) {
  const editor = useEditor();

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  return (
    <div className="absolute bottom-12 right-2 z-10 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-3 border dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-xs font-medium text-gray-700 dark:text-white">
          {isConnected ? "AI Connected" : "AI Disconnected"}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
        {isConnected ? "Ready for AI assistance" : "AI unavailable"}
      </div>

      <button
        onClick={clearCanvas}
        className="z-10 w-full mt-3 px-3 py-2 bg-red-500 dark:bg-red-800 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
        disabled={!editor || isLoading}
      >
        Clear All
      </button>
    </div>
  );
}

export default function TldrawCanvas() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const converterService = useRef(new ShapeConverterService());
  const websocketRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const router = useRouter();

  console.log(
    "[Canvas] Browser whiteboard - standalone mode, mounted:",
    mountedRef.current,
    "hasLoaded:",
    hasLoadedRef.current
  );

  const handleWebSocketMessage = useCallback(
    (data: MCPWebSocketMessage): void => {
      if (!editor || !mountedRef.current) return;

      console.log("[Canvas] Processing AI message:", data.type);

      if (data.shape) {
        console.log(
          "[Canvas] Shape from AI:",
          JSON.stringify(data.shape, null, 2)
        );
      }

      try {
        switch (data.type) {
          case "initial_shapes":
          case "shapes_batch_created":
            if (data.shapes?.length) {
              const tldrawShapes = converterService.current.toTldrawShapes(
                data.shapes
              );
              editor.createShapes(tldrawShapes);
              console.log(
                `[Canvas] 🤖 AI created ${tldrawShapes.length} shapes`
              );
            }
            break;
          case "shape_created":
            if (data.shape) {
              console.log("[Canvas] 🤖 AI creating shape...");
              const tldrawShape = converterService.current.toTldrawShape(
                data.shape
              );
              console.log(
                "[Canvas] Converted AI shape:",
                JSON.stringify(tldrawShape, null, 2)
              );

              editor.createShapes([tldrawShape]);
              console.log("[Canvas] ✅ AI shape added to canvas");
            }
            break;
          case "shape_updated":
            if (data.shape) {
              const tldrawShape = converterService.current.toTldrawShape(
                data.shape
              );
              editor.updateShapes([tldrawShape]);
              console.log("[Canvas] ✅ AI updated shape");
            }
            break;
          case "shape_deleted":
            if (data.shapeId) {
              editor.deleteShapes([data.shapeId as TLShapeId]);
              console.log("[Canvas] ✅ AI deleted shape");
            }
            break;
          default:
            console.log("[Canvas] Unknown AI message type:", data.type);
        }
      } catch (error) {
        console.error("[Canvas] Error processing AI message:", error);
      }
    },
    [editor]
  );

  const connectWebSocket = useCallback((): void => {
    if (
      !mountedRef.current ||
      websocketRef.current?.readyState === WebSocket.OPEN ||
      websocketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      console.log(
        "[Canvas] Skipping WebSocket connection - already connected or not mounted"
      );
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
    console.log("[Canvas] 🔌 Connecting to AI WebSocket:", wsUrl);

    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
      console.log(
        "[Canvas] ✅ AI WebSocket connected - ready to receive shapes"
      );
    };

    websocketRef.current.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data: MCPWebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("[Canvas] Error parsing AI message:", error);
      }
    };

    websocketRef.current.onclose = (event) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      console.log("[Canvas] ❌ AI WebSocket disconnected, code:", event.code);

      // Reconnect on unexpected closures
      if (event.code !== 1000 && mountedRef.current) {
        console.log("[Canvas] 🔄 Reconnecting to AI in 3 seconds...");
        setTimeout(() => {
          if (mountedRef.current) connectWebSocket();
        }, 3000);
      }
    };

    websocketRef.current.onerror = (error) => {
      if (!mountedRef.current) return;
      console.error("[Canvas] ❌ AI WebSocket error:", error);
      setIsConnected(false);
    };
  }, [handleWebSocketMessage]);

  const loadExistingShapes = useCallback(async (): Promise<void> => {
    if (
      !editor ||
      !mountedRef.current ||
      hasLoadedRef.current ||
      isLoadingRef.current
    ) {
      console.log("[Canvas] Skipping loadExistingShapes:", {
        hasEditor: !!editor,
        mounted: mountedRef.current,
        hasLoaded: hasLoadedRef.current,
        isLoading: isLoadingRef.current,
      });
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      console.log("[Canvas] ⏳ Loading AI-created shapes...");

      const response = await fetch("/api/shapes");

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!mountedRef.current) {
        console.log("[Canvas] Component unmounted during API call, aborting");
        return;
      }

      if (result.success && result.shapes?.length > 0) {
        const tldrawShapes = converterService.current.toTldrawShapes(
          result.shapes
        );
        editor.createShapes(tldrawShapes);
        console.log(
          `[Canvas] ✅ Loaded ${result.shapes.length} AI-created shapes`
        );
      } else {
        console.log("[Canvas] ℹ️ No AI shapes to load");
      }

      hasLoadedRef.current = true;
    } catch (error) {
      console.error("[Canvas] ❌ Error loading AI shapes:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [editor]);

  // WebSocket connection setup
  useEffect(() => {
    mountedRef.current = true;

    // Always try to connect to receive AI updates
    if (editor && !websocketRef.current) {
      console.log("[Canvas] 🚀 Setting up AI connection...");
      setTimeout(connectWebSocket, 500);
    }

    return () => {
      console.log("[Canvas] 🧹 Cleaning up AI connection...");
      mountedRef.current = false;
      if (websocketRef.current) {
        websocketRef.current.close(1000);
        websocketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [editor, connectWebSocket]);

  // Load AI shapes on mount - ONLY when editor becomes available
  useEffect(() => {
    if (
      editor &&
      mountedRef.current &&
      !hasLoadedRef.current &&
      !isLoadingRef.current
    ) {
      console.log("[Canvas] 🎯 Loading existing AI shapes...");
      loadExistingShapes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]); // Only depend on editor - loadExistingShapes intentionally excluded

  const clearCanvas = useCallback(async (): Promise<void> => {
    if (!editor) return;

    try {
      // Clear both local canvas and AI-created shapes from backend
      const response = await fetch("/api/shapes");
      const result = await response.json();

      if (result.success && result.shapes?.length) {
        console.log(
          `[Canvas] 🗑️ Clearing ${result.shapes.length} AI shapes from backend...`
        );
        const deletePromises = result.shapes.map((shape: MCPShape) =>
          fetch(`/api/shapes/${shape.id}`, { method: "DELETE" })
        );
        await Promise.all(deletePromises);
      }

      const allShapeIds = editor.getCurrentPageShapeIds();
      editor.deleteShapes(Array.from(allShapeIds));
      console.log("[Canvas] ✅ Canvas cleared (local + AI shapes)");
      router.refresh();
    } catch (error) {
      console.error("[Canvas] Error clearing canvas:", error);
      // Still clear locally even if backend fails
      const allShapeIds = editor.getCurrentPageShapeIds();
      editor.deleteShapes(Array.from(allShapeIds));
      console.log("[Canvas] ✅ Canvas cleared locally");
    }
  }, [editor]);

  const handleMount = useCallback((editorInstance: Editor): void => {
    console.log("[Canvas] 🎬 Browser whiteboard mounting (standalone mode)...");
    setEditor(editorInstance);

    // CRITICAL: NO side effects for user actions
    // The browser is completely standalone - user actions never trigger API calls
    // Only AI actions via WebSocket will modify the canvas

    console.log("[Canvas] ✅ Standalone browser whiteboard ready");
    console.log("[Canvas] 🚫 User actions will NOT sync to API");
    console.log("[Canvas] 🤖 AI actions will be received via WebSocket");
  }, []);

  return (
    <div className="w-full h-screen relative bg-gray-50">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading AI shapes...</p>
          </div>
        </div>
      )}

      <Tldraw onMount={handleMount} persistenceKey="tldraw-standalone">
        <TldrawController
          onEditorReady={setEditor}
          isConnected={isConnected}
          clearCanvas={clearCanvas}
          isLoading={isLoading}
        />
      </Tldraw>
    </div>
  );
}

// Utility functions for AI integration (not user-triggered)
export function createShapeFromAI(
  editor: Editor,
  mcpShape: MCPShape,
  converterService: ShapeConverterService
): void {
  try {
    const tldrawShape = converterService.toTldrawShape(mcpShape);
    editor.createShapes([tldrawShape]);
    console.log("[Canvas] ✅ AI shape created");
  } catch (error) {
    console.error("[Canvas] Error creating AI shape:", error);
  }
}

export function createShapesFromAI(
  editor: Editor,
  mcpShapes: MCPShape[],
  converterService: ShapeConverterService
): void {
  try {
    const tldrawShapes = converterService.toTldrawShapes(mcpShapes);
    editor.createShapes(tldrawShapes);
    console.log(`[Canvas] ✅ ${mcpShapes.length} AI shapes created`);
  } catch (error) {
    console.error("[Canvas] Error creating AI shapes:", error);
  }
}

export function getAllCanvasShapes(
  editor: Editor,
  converterService: ShapeConverterService
): MCPShape[] {
  try {
    const tldrawShapes = editor.getCurrentPageShapes();
    return tldrawShapes.map((shape) => converterService.fromTldrawShape(shape));
  } catch (error) {
    console.error("[Canvas] Error reading canvas shapes:", error);
    return [];
  }
}
