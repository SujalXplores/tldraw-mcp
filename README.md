# tldraw-mcp

MCP server for AI-powered [Tldraw](https://tldraw.com) v4 canvas control. Create, update, and delete shapes on a real-time whiteboard through any MCP-compatible client.

## Features

- 13 shape types: geo, text, arrow, draw, highlight, image, video, embed, bookmark, frame, note, line, group
- AI hallucination correction — auto-fixes invalid colors, coordinates, missing props, text→richText conversion
- 150+ color mappings (CSS names, hex, RGB all normalized to Tldraw palette)
- Batch operations (up to 50 shapes at once)
- Real-time WebSocket sync to the browser canvas
- Strict Zod validation with helpful error messages
- 216 tests, 100% coverage

## Tools

| Tool | Description |
|------|-------------|
| `create_shape` | Create a shape on the canvas |
| `batch_create_shapes` | Create up to 50 shapes at once |
| `update_shape` | Update an existing shape by ID |
| `delete_shape` | Delete a shape by ID |
| `get_shapes` | Get all shapes on the canvas |

## Prerequisites

The MCP server communicates with a Next.js frontend that renders the Tldraw canvas. You need both running:

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/tldraw-mcp.git
cd tldraw-mcp
pnpm install
cp .env.example .env
pnpm dev:all    # starts Next.js + WebSocket server + MCP server
```

Then configure your MCP client to connect to the server (see below).

## Client Setup

### Claude Code

```bash
claude mcp add tldraw-mcp -- npx tldraw-mcp
```

Or add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "tldraw-mcp": {
      "command": "npx",
      "args": ["-y", "tldraw-mcp"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "tldraw-mcp": {
      "command": "npx",
      "args": ["-y", "tldraw-mcp"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or open the Command Palette → `MCP: Add Server` and enter the details.

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "tldraw-mcp": {
      "command": "npx",
      "args": ["-y", "tldraw-mcp"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Kiro

Add to `.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (global):

```json
{
  "mcpServers": {
    "tldraw-mcp": {
      "command": "npx",
      "args": ["-y", "tldraw-mcp"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Local Development (without npm)

If you're running from source instead of the published package:

```json
{
  "mcpServers": {
    "tldraw-mcp": {
      "command": "npx",
      "args": ["tsx", "src/mcp-server.ts"],
      "cwd": "/path/to/tldraw-mcp",
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXTJS_SERVER_URL` | `http://localhost:3000` | URL of the Next.js frontend |
| `DEBUG` | `false` | Enable debug logging to stderr |
| `VERBOSE_LOGS` | `false` | Enable info/warn logging |
| `WS_PORT` | `4000` | WebSocket server port |

## Example Usage

Once connected, ask your AI assistant:

> "Draw a blue rectangle at position 200, 100 with the label 'Hello World'"

> "Create a flowchart with 3 boxes connected by arrows"

> "Add a sticky note that says 'TODO: review this'"

The AI will use the MCP tools to create shapes on the canvas in real time.

## Development

```bash
pnpm dev:all          # Run everything (Next.js + WS + MCP)
pnpm test             # Run tests
pnpm test:coverage    # Run tests with coverage
pnpm check            # Lint + typecheck + test
pnpm build:mcp        # Build MCP server for publishing
pnpm inspect          # Open MCP Inspector for testing tools
```

## Publishing

1. Update version in `package.json` and `server.json`
2. Run `pnpm check` to verify everything passes
3. Tag and push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. GitHub Actions will publish to npm automatically (requires `NPM_TOKEN` secret)

To publish to the MCP Registry:
```bash
brew install mcp-publisher   # or build from source
mcp-publisher login github
mcp-publisher publish
```

## License

MIT
