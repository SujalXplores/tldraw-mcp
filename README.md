# tldraw-mcp

An MCP (Model Context Protocol) server that bridges AI language models and [Tldraw](https://tldraw.dev/), enabling programmatic creation, manipulation, and management of canvas shapes through natural language or structured tool calls.

---

![Banner Picture](https://i.postimg.cc/LXBV3FGs/image.png)

## Highlights

- **Unrestricted local generation** — no API limits, no quotas, fully offline-capable.
- **Tldraw v3 canvas** — backed by a production-grade open-source drawing library.
- **MCP-compliant** — works with any MCP client (Claude Desktop, custom agents, CLI tools).
- **End-to-end type safety** — Zod 4 schemas + strict TypeScript (`strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess`).
- **AI-safe validation** — automatic correction of malformed AI data (color mapping, text-to-richText conversion, coordinate clamping).
- **100% test coverage** — 217 tests across 10 suites covering all statements, branches, functions, and lines.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Testing](#testing)
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
| Validation | Zod 4 | Schema validation with automatic fallback/correction |

---

## Project Structure

```
tldraw-mcp/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── shapes/               # Shape CRUD endpoints
│   │   │   ├── route.ts          #   GET /api/shapes, POST /api/shapes
│   │   │   ├── [id]/route.ts     #   GET/PUT/DELETE /api/shapes/:id
│   │   │   └── batch/route.ts    #   POST /api/shapes/batch
│   │   └── test-ws/route.ts      # WebSocket test endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── TldrawCanvas.tsx          # Tldraw canvas with real-time sync
├── server/
│   └── ws-server.ts              # Standalone WebSocket server
├── src/
│   ├── mcp-server.ts             # MCP stdio server entry point
│   ├── types.ts                  # Shared type definitions & shape defaults
│   ├── frontend-types-bridge.ts  # Tldraw ↔ MCP type conversions
│   ├── lib/                      # Shared utility modules
│   │   ├── constants.ts          #   Shape types, colors, geo types, enums
│   │   ├── validation.ts         #   Color/number/enum/shape-type validators
│   │   ├── rich-text.ts          #   Rich text creation & sanitization
│   │   ├── shape-defaults.ts     #   Default props per shape type
│   │   ├── shape-sanitizer.ts    #   Type-specific prop sanitization
│   │   ├── shape-preprocessor.ts #   AI data normalization (single & batch)
│   │   ├── ws-notify.ts          #   WebSocket server notification
│   │   ├── errors.ts             #   Type-safe error message extraction
│   │   └── index.ts              #   Barrel re-export
│   ├── services/
│   │   ├── shape-storage.ts      #   In-memory shape CRUD + batch ops
│   │   ├── shape-converter.ts    #   MCP ↔ Tldraw shape conversion
│   │   ├── websocket.ts          #   WebSocket connection management
│   │   ├── logger.ts             #   Winston file + console logger
│   │   └── singleton.ts          #   Service singleton pattern
│   └── __tests__/                # Test suite (217 tests, 100% coverage)
├── jest.config.ts
├── tsconfig.json
├── tsconfig.test.json
└── eslint.config.mjs
```

---

## Getting Started

### Prerequisites

- Node.js >= 18 (recommended: 24+, see `.nvmrc`)
- pnpm

### Installation

```bash
git clone https://github.com/SujalXplores/tldraw-mcp.git
cd tldraw-mcp
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and adjust as needed:

```env
# Next.js
NEXTJS_SERVER_URL=http://localhost:3000
PORT=3000

# MCP Server
ENABLE_CANVAS_SYNC=true
MCP_TRANSPORT_MODE=stdio

# Development
NODE_ENV=development
DEBUG=false

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:4000
WS_PORT=4000
WS_SERVER_URL=http://localhost:4000
```

### MCP Client Configuration

Add this to your MCP client configuration (e.g., Claude Desktop, Cursor):

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

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js frontend (Turbopack) |
| `pnpm dev:ws` | Start WebSocket server (watch mode) |
| `pnpm dev:mcp` | Run MCP server standalone |
| `pnpm dev:all` | Start all services concurrently |
| `pnpm inspect` | Launch MCP Inspector with the server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint (strict type-checked rules) |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting (CI-friendly) |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm check` | Run lint + typecheck + test (all-in-one) |

---

## Usage

1. Start the frontend and draw manually using the Tldraw canvas.
2. Connect an MCP client to generate or edit shapes programmatically.
3. Use the `/broadcast` and `/status` HTTP endpoints on the WebSocket server for debugging.

### MCP Tools

The MCP server exposes the following tools to AI clients:

| Tool | Description |
|------|-------------|
| `create_shape` | Create a single shape on the canvas |
| `create_shapes_batch` | Create multiple shapes at once (up to 50) |
| `get_shape` | Retrieve a shape by ID |
| `get_all_shapes` | List all shapes on the canvas |
| `update_shape` | Update an existing shape's properties |
| `delete_shape` | Remove a shape from the canvas |
| `delete_all_shapes` | Clear the entire canvas |

### Supported Shape Types

`text` · `geo` · `draw` · `arrow` · `line` · `note` · `frame` · `image` · `bookmark` · `embed` · `video` · `highlight` · `group`

Each shape type supports type-specific props with automatic defaults and AI-safe sanitization (e.g., mapping `"red"` → `"light-red"`, converting plain text to rich text format).

---

## Testing

The project uses [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) for testing.

```bash
pnpm test              # Run all tests
pnpm test:watch        # Run in watch mode
pnpm test:coverage     # Run with coverage report
```

### Coverage

**217 tests** across **10 suites** with **100% coverage** on all metrics:

| Metric | Coverage |
|--------|----------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

### Test Suites

| Suite | Tests | What it covers |
|-------|-------|---------------|
| `constants` | 15 | Shape types, colors, geo types, enums, aliases |
| `validation` | 24 | Color normalization, number/enum/shape-type validation |
| `rich-text` | 22 | Rich text creation, sanitization, edge cases |
| `shape-defaults` | 15 | Default props for all 13 shape types |
| `shape-sanitizer` | 44 | Type-specific prop sanitization, URL handling |
| `shape-preprocessor` | 22 | AI data normalization, batch processing |
| `shape-storage` | 31 | CRUD lifecycle, batch operations, versioning |
| `shape-converter` | 35 | MCP ↔ Tldraw conversion, validate & repair |
| `ws-notify` | 8 | WebSocket notification, env configuration |
| `errors` | 4 | Type-safe error message extraction |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) |
| Canvas | [Tldraw v3](https://tldraw.dev/) |
| Language | [TypeScript 5.9](https://typescriptlang.org/) (strict mode) |
| Validation | [Zod 4](https://zod.dev/) |
| Real-time | [ws](https://github.com/websockets/ws) |
| Logging | [Winston](https://github.com/winstonjs/winston) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Testing | [Jest 30](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/) |
| Linting | [ESLint 9](https://eslint.org/) + [typescript-eslint](https://typescript-eslint.io/) (strict type-checked) |
| Formatting | [Prettier](https://prettier.io/) |
| AI Protocol | [MCP SDK](https://modelcontextprotocol.io/) |

---

## Contributing

Contributions are welcome. Please open issues or submit PRs.

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Run checks before committing:
   ```bash
   pnpm check   # lint + typecheck + test
   ```
4. Commit (`git commit -m 'Add feature'`)
5. Push (`git push origin feature/your-feature`)
6. Open a PR

---

## License

[MIT](LICENSE)

---

## Contact

- **Sujal Shah** — [GitHub](https://github.com/SujalXplores)

---

> **Disclaimer:** This is an experimental, local-first project. Multi-user collaboration and production deployments are not yet supported.
