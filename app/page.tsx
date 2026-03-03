"use client";

import dynamic from "next/dynamic";

// Dynamically import TldrawCanvas to avoid SSR issues
const TldrawCanvas = dynamic(() => import("../components/TldrawCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Loading Tldraw Canvas
        </h2>
        <p className="text-gray-600">
          Setting up your collaborative drawing environment...
        </p>
      </div>
    </div>
  ),
});

/**
 * Home page with Tldraw canvas
 */
export default function HomePage() {
  return (
    <main className="w-full h-screen">
      <TldrawCanvas />
    </main>
  );
}
