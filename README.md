# 🧠 Prompt2Sketch: AI-Driven Diagram Playground with MCP & Tldraw

> An experimental sandbox integrating [Tldraw](https://tldraw.dev/) and the Model Context Protocol (MCP), enabling AI agents and developers to generate, update, and interact with visual diagrams programmatically — all from natural language or logic-based prompts.

---

![Banner Picture](https://i.postimg.cc/LXBV3FGs/image.png)

## ✨ Project Highlights

- 🤖 **Unrestricted AI Generation**: No API limits or quotas — generate infinite diagrams with local agents.
- ✍️ **Tldraw Canvas Integration**: Beautiful, intuitive canvas backed by a battle-tested open-source drawing library.
- ⚖️ **Protocol-Driven**: Built on a robust API/WebSocket interface compatible with any MCP-compliant client.
- 📈 **Offline-First Architecture**: Everything runs locally. Perfect for private setups using Ollama, local LLMs, or experiments.
- ⚖️ **Type-Safe from End to End**: Zod-based schemas and strict TypeScript tooling make development smooth.
- 🧰 **Built for Exploration**: Easily extend with new shapes, tools, and AI workflows. Ideal for R\&D, agent devs, and tinkerers.

---

## 📅 Table of Contents

- [🧠 Prompt2Sketch: AI-Driven Diagram Playground with MCP \& Tldraw](#-prompt2sketch-ai-driven-diagram-playground-with-mcp--tldraw)
  - [✨ Project Highlights](#-project-highlights)
  - [📅 Table of Contents](#-table-of-contents)
  - [📆 Overview](#-overview)
  - [🌟 Features](#-features)
  - [🧱 Architecture](#-architecture)
  - [⚙️ Getting Started](#️-getting-started)
    - [✅ Prerequisites](#-prerequisites)
    - [📦 Installation](#-installation)
    - [🔍 Sample .env](#-sample-env)
    - [📂 MCP Client Config.json](#-mcp-client-configjson)
    - [🚀 Running Locally](#-running-locally)
    - [🚪 Development Scripts](#-development-scripts)
  - [💻 Usage](#-usage)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [📬 Contact](#-contact)
    - [🧪 Disclaimer](#-disclaimer)

---

## 📆 Overview

**Prompt2Sketch** is a developer-first playground for experimenting with AI-enhanced diagramming. It combines the flexibility of **Tldraw** with the power of **MCP** to enable **real-time**, **programmable**, and **text-controlled** diagram generation.

Think of it as Excalidraw without limits — no paywalls, no request caps, and full control over how your diagrams are generated. Build flows from prompts, code, or AI agents. Ideal for tinkering, building dev tools, or LLM integrations.

> ⚠️ Real-time multi-user collaboration is not supported yet. Local-first only.

---

## 🧱 Architecture

![Architecture Diagram](https://i.postimg.cc/DZfGF3JR/image.png)


- **Frontend**: Next.js 15 with App Router and Tldraw canvas
- **Backend**: Node.js MCP server using WebSockets and HTTP
- **Typing**: End-to-end with Zod + TypeScript
- **Sync**: Real-time (local), single-user only

---

## ⚙️ Getting Started

### ✅ Prerequisites

- Node.js >= 18
- npm (or yarn/pnpm/bun)

### 📦 Installation

```bash
git clone https://github.com/Arsenic-01/mcp_tldraw.git
cd mcp_tldraw
npm install
```

### 🔍 Sample .env

```env
# Next.js Application Configuration
NEXTJS_SERVER_URL=http://localhost:3000
PORT=3000

# MCP Server Configuration
ENABLE_CANVAS_SYNC=true
MCP_TRANSPORT_MODE=stdio

# Development Configuration
NODE_ENV=development
DEBUG=false

NEXT_PUBLIC_WS_URL=ws://localhost:4000
WS_PORT=4000
WS_SERVER_URL=http://localhost:4000
```

### 📂 MCP Client Config.json

```json
{
  "mcpServers": {
    "tldraw-canvas": {
      "command": "tsx",
      "args": ["/absolute/path/to/mcp_tldraw/src/mcp-server.ts"],
      "env": {
        "NEXTJS_SERVER_URL": "http://localhost:3000",
        "ENABLE_CANVAS_SYNC": "true"
      }
    }
  }
}
```

### 🚀 Running Locally

```bash
npm run canvas
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- MCP Server: [ws://localhost:4000](ws://localhost:4000)

### 🚪 Development Scripts

| Script               | Description                |
| -------------------- | -------------------------- |
| `npm run dev`        | Start Next.js frontend     |
| `npm run dev:ws`     | Start MCP WebSocket server |
| `npm run mcp-server` | Run MCP server standalone  |

---

## 💻 Usage

- Launch the frontend and draw manually using Tldraw
- Connect an MCP client (e.g. LLM or CLI) to generate or edit shapes
- Hit broadcast/status endpoints to simulate interactions
- Extend to new workflows with custom shapes, commands, or drawing logic

---

## 🛠️ Tech Stack

- [Next.js 15](https://nextjs.org/)
- [Tldraw](https://tldraw.dev/)
- [TypeScript](https://typescriptlang.org/)
- [Zod](https://zod.dev/)
- [Node.js](https://nodejs.org/)
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Winston](https://github.com/winstonjs/winston)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🤝 Contributing

Contributions are welcome! Please open issues or submit PRs.

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Commit (`git commit -m 'Add feature'`)
4. Push (`git push origin feature/your-feature`)
5. Open a PR

---

## 📄 License

[MIT License](LICENSE)

---

## 📬 Contact

- **Name:** Vedant Bhor
- **Email:** [vedbhor25@gmail.com](mailto:vedbhor25@gmail.com)
- **GitHub:** [Arsenic-01](https://github.com/Arsenic-01)
- **LinkedIn:** [Vedant Bhor](https://www.linkedin.com/in/vedant-bhor-39287828b/)
- **Twitter (X):** [@arsenic_dev](https://x.com/arsenic_dev)
- **Discord:** [@itsmehomie](https://discordapp.com/users/862682607162359819)

---

### 🧪 Disclaimer

This is an experimental, local-first project. Multi-user collaboration and production readiness are not supported (yet).

> Let your AI draw. Let your code paint. Welcome to Prompt2Sketch.
