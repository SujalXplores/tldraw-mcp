"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type TLShapeId, useEditor, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { ShapeConverterService } from "../src/services/shape-converter";
import type { MCPShape, MCPWebSocketMessage } from "../src/types";

interface TldrawControllerProps {
  onEditorReady?: (editor: Editor) => void;
  isConnected: boolean;
  clearCanvas: () => void | Promise<void>;
  isLoading?: boolean;
}

interface ShapesApiResponse {
  success: boolean;
  shapes?: MCPShape[];
}

function TldrawController({
  onEditorReady,
  isConnected,
  clearCanvas,
  isLoading = false,
}: TldrawControllerProps) {
  const editor = useEditor();

  useEffect(() => {
    if (onEditorReady) {
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
        onClick={() => void clearCanvas()}
        className="z-9999 w-full mt-3 px-3 py-2 bg-red-500 dark:bg-red-800 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
        disabled={isLoading}
      >
        Clear All
      </button>
    </div>
  );
}

export default function TldrawCanvas() {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [_isLoading, _setIsLoading] = useState(false);

  const converterService = useRef(new ShapeConverterService());
  const websocketRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(false);
  const connectWebSocketRef = useRef<() => void>(() => {});

  const router = useRouter();

  const handleWebSocketMessage = useCallback(
    (data: MCPWebSocketMessage): void => {
      if (!editor || !mountedRef.current) return;

      try {
        switch (data.type) {
          case "initial_shapes":
          case "shapes_batch_created":
            if (data.shapes?.length) {
              const tldrawShapes = converterService.current.toTldrawShapes(data.shapes);
              editor.createShapes(tldrawShapes);
            }
            break;
          case "shape_created":
            if (data.shape) {
              const tldrawShape = converterService.current.toTldrawShape(data.shape);
              editor.createShapes([tldrawShape]);
            }
            break;
          case "shape_updated":
            if (data.shape) {
              const tldrawShape = converterService.current.toTldrawShape(data.shape);
              editor.updateShapes([tldrawShape]);
            }
            break;
          case "shape_deleted":
            if (data.shapeId) {
              editor.deleteShapes([data.shapeId as TLShapeId]);
            }
            break;
        }
      } catch (error: unknown) {
        console.error("[Canvas] Error processing AI message:", error);
      }
    },
    [editor],
  );

  const connectWebSocket = useCallback((): void => {
    if (
      !mountedRef.current ||
      websocketRef.current?.readyState === WebSocket.OPEN ||
      websocketRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";
    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      if (!mountedRef.current) return;
      setIsConnected(true);
    };

    websocketRef.current.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string) as MCPWebSocketMessage;
        handleWebSocketMessage(data);
      } catch (error: unknown) {
        console.error("[Canvas] Error parsing AI message:", error);
      }
    };

    websocketRef.current.onclose = (event) => {
      if (!mountedRef.current) return;
      setIsConnected(false);

      if (event.code !== 1000) {
        setTimeout(() => {
          if (mountedRef.current) connectWebSocketRef.current();
        }, 3000);
      }
    };

    websocketRef.current.onerror = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);
    };
  }, [handleWebSocketMessage]);

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  // WebSocket connection setup
  useEffect(() => {
    mountedRef.current = true;

    if (editor && !websocketRef.current) {
      setTimeout(connectWebSocket, 500);
    }

    return () => {
      mountedRef.current = false;
      if (websocketRef.current) {
        websocketRef.current.close(1000);
        websocketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [editor, connectWebSocket]);

  const clearCanvas = useCallback(async (): Promise<void> => {
    if (!editor) return;

    try {
      // Clear both local canvas and AI-created shapes from backend
      const response = await fetch("/api/shapes");
      const result = (await response.json()) as ShapesApiResponse;

      if (result.success && result.shapes?.length) {
        const deletePromises = result.shapes.map((shape: MCPShape) =>
          fetch(`/api/shapes/${shape.id}`, { method: "DELETE" }),
        );
        await Promise.all(deletePromises);
      }

      const allShapeIds = editor.getCurrentPageShapeIds();
      editor.deleteShapes(Array.from(allShapeIds));
      router.refresh();
    } catch (error: unknown) {
      console.error("[Canvas] Error clearing canvas:", error);
      const allShapeIds = editor.getCurrentPageShapeIds();
      editor.deleteShapes(Array.from(allShapeIds));
    }
  }, [editor, router]);

  const handleMount = useCallback((editorInstance: Editor): void => {
    setEditor(editorInstance);
  }, []);

  return (
    <div className="w-full h-screen relative bg-gray-50">
      {_isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading AI shapes...</p>
          </div>
        </div>
      )}

      <Tldraw onMount={handleMount} persistenceKey="tldraw-standalone1">
        <TldrawController
          onEditorReady={setEditor}
          isConnected={isConnected}
          clearCanvas={clearCanvas}
          isLoading={_isLoading}
        />
      </Tldraw>
    </div>
  );
}

