#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAppleDocsServer } from "./server.js";

try {
  const server = createAppleDocsServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
