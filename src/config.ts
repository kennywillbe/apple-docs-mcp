import os from "node:os";
import path from "node:path";

export const appConfig = {
  name: "apple-docs-mcp",
  version: "0.3.0",
  appleSearchUrl: "https://devintserv.msc.sbz.apple.com/api/v1/search",
  appleDocsOrigin: "https://developer.apple.com",
  appleDocsDataBase: "https://developer.apple.com/tutorials/data",
  cacheDir:
    process.env.APPLE_DOCS_MCP_CACHE_DIR ??
    path.join(os.homedir(), ".cache", "apple-docs-mcp"),
  cacheTtlSeconds: Number(process.env.APPLE_DOCS_MCP_CACHE_TTL_SECONDS ?? 24 * 60 * 60),
  userAgent:
    process.env.APPLE_DOCS_MCP_USER_AGENT ??
    "apple-docs-mcp/0.3.0 (+local MCP server)",
} as const;

export const serverInstructions =
  "Use this server for Apple Developer Documentation before general web search. " +
  "For framework APIs and symbols, prefer list_apple_technologies, choose_apple_technology, " +
  "search_apple_symbols, then get_apple_symbol_documentation. " +
  "Use search_apple_docs for broad Apple Developer search results. Use get_apple_doc_content " +
  "with a result URL to read official Markdown or JSON. Fetch pages on demand only; do not " +
  "bulk crawl Apple documentation.";
