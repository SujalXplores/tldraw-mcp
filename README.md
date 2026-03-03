# tldraw-mcp

An MCP (Model Context Protocol) server that bridges AI language models and [Tldraw](https://tldraw.dev/), enabling programmatic creation, manipulation, and management of canvas shapes through natural language or structured tool calls.

---

![Banner Picture](https://i.postimg.cc/LXBV3FGs/image.png)

## Highlights

- **Unrestricted local generation** — no API limits, no quotas, fully offline-capable.
- **Tldraw v3 canvas** — backed by a production-grade open-source drawing library.
- **MCP-compliant** — works with any MCP client (Claude Desktop, custom agents, CLI tools).
- **End-to-end type safety** — Zod schemas + strict TypeScript from server to canvas.
- **AI-safe validation** — automatic correction of malformed AI data (color mapping, text-to-richText conversion, coordinate clamping).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

tldraw-mcp is a developer-first tool for AI-enhanced diagramming. It combines Tldraw's flexible canvas with an MCP server to enable real-time, programmable shape generation from AI agents or code.

> **Note:** Multi-user collaboration is not supported. This is a local-first, single-user tool.

---

## Architecture

![Architecture Diagram](https://i.postimg.cc/DZfGF3JR/image.png)

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (App Router) | Tldraw canvas + WebSocket client |
| API | Next.js Route Handlers | Shape CRUD with AI data preprocessing |
| MCP Server | Node.js + stdio transport | AI tool interface (create, update, delete, get shapes) |
| Real-time | WebSocket (ws) | Broadcasts shape mutations to browser clients |
| Validation | Zod | Schema validation with automatic fallback/correction |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm (or npm/yarn)

### Installation

```bash
git clone https://github.com/SujalXplores/tldraw-mcp.git
cd tldraw-mcp
pnpm install
```

### Environment Variables

```env
NEXTJS_SERVER_URL=http://localhost:3000
PORT=3000
ENABLE_CANVAS_SYNC=true
MCP_TRANSPORT_MODE=stdio
NODE_ENV=development
DEBUG=false
NEXT_PUBLIC_WS_URL=ws://localhost:4000
WS_PORT=4000
WS_SERVER_URL=http://localhost:4000
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "tldraw-canvas": {
      "command": "tsx",
      "args": ["/absolute/path/to/tldraw-mcp/src/mcp-server.ts"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000",
        "ENABLE_CANVAS_SYNC": "true"
      }
    }
  }
}
```

### Running Locally

```bash
pnpm dev:all
```

This starts all three processes concurrently:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| WebSocket Server | ws://localhost:4000 |
| MCP Server | stdio (attach via MCP client) |

### Development Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js frontend |
| `pnpm dev:ws` | Start WebSocket server (watch mode) |
| `pnpm dev:mcp` | Run MCP server standalone |
| `pnpm dev:all` | Start all services concurrently |
| `pnpm inspect` | Launch MCP Inspector with the server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting (CI-friendly) |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm check` | Run lint + typecheck + test |

---

## Usage

1. Start the frontend and draw manually using the Tldraw canvas.
2. Connect an MCP client to generate or edit shapes programmatically.
3. Use the `/broadcast` and `/status` HTTP endpoints on the WebSocket server for debugging.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) |
| Canvas | [Tldraw v3](https://tldraw.dev/) |
| Language | [TypeScript](https://typescriptlang.org/) |
| Validation | [Zod](https://zod.dev/) |
| Real-time | [ws](https://github.com/websockets/ws) |
| Logging | [Winston](https://github.com/winstonjs/winston) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |

---

## Contributing

Contributions are welcome. Please open issues or submit PRs.

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit (`git commit -m 'Add feature'`)
4. Push (`git push origin feature/your-feature`)
5. Open a PR

---

## License

[MIT](LICENSE)

---

## Contact

- **Sujal Shah** — [GitHub](https://github.com/SujalXplores)

---

> **Disclaimer:** This is an experimental, local-first project. Multi-user collaboration and production deployments are not yet supported.
