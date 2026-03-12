#!/usr/bin/env node

/**
 * Post-build script: ensures the compiled MCP server entry point
 * has a proper shebang line and is executable.
 */

import { readFileSync, writeFileSync, chmodSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entryPoint = resolve(__dirname, "..", "dist", "mcp-server.js");

const content = readFileSync(entryPoint, "utf-8");
const shebang = "#!/usr/bin/env node\n";

if (!content.startsWith("#!")) {
  writeFileSync(entryPoint, shebang + content, "utf-8");
}

try {
  chmodSync(entryPoint, 0o755);
} catch {
  // chmod may fail on Windows — that's fine, npm handles it
}

console.log("✓ Post-build: shebang added, entry point ready");

