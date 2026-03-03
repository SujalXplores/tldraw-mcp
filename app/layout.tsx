import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tldraw MCP Canvas",
  description:
    "Production-ready Tldraw canvas with MCP server integration for Next.js",
  keywords: ["tldraw", "canvas", "drawing", "collaboration", "MCP", "next.js"],
  authors: [{ name: "Sujal Shah" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
