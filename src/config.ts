import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function packageVersion(): string {
  const envVersion = process.env.npm_package_version;
  if (envVersion) return envVersion;

  try {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version?: unknown };
    if (typeof packageJson.version === "string" && packageJson.version.length > 0) {
      return packageJson.version;
    }
  } catch {
    // Keep startup resilient when running from nonstandard package layouts.
  }

  return "unknown";
}

function integerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const version = packageVersion();

export const appConfig = {
  name: "apple-docs-mcp",
  version,
  appleSearchUrl: "https://devintserv.msc.sbz.apple.com/api/v1/search",
  appleDocsOrigin: "https://developer.apple.com",
  appleDocsDataBase: "https://developer.apple.com/tutorials/data",
  cacheDir:
    process.env.APPLE_DOCS_MCP_CACHE_DIR ??
    path.join(os.homedir(), ".cache", "apple-docs-mcp"),
  cacheTtlSeconds: Number(process.env.APPLE_DOCS_MCP_CACHE_TTL_SECONDS ?? 24 * 60 * 60),
  userAgent:
    process.env.APPLE_DOCS_MCP_USER_AGENT ??
    `apple-docs-mcp/${version} (+local MCP server)`,
  symbolSearchDefaultChildPages: integerEnv("APPLE_DOCS_MCP_SYMBOL_SEARCH_CHILD_PAGES", 40),
  symbolSearchDeepChildPages: integerEnv("APPLE_DOCS_MCP_SYMBOL_SEARCH_DEEP_CHILD_PAGES", 120),
} as const;

export const serverInstructions =
  "Use this server for Apple Developer Documentation before general web search. " +
  "For framework APIs and symbols, prefer list_apple_technologies, choose_apple_technology, " +
  "search_apple_symbols, then get_apple_symbol_documentation. " +
  "If a task spans multiple frameworks or users may share a server process, pass the technology " +
  "parameter explicitly instead of relying on current_apple_technology. Use deep symbol search only " +
  "when normal symbol search is missing known framework members. Use search_apple_docs for broad " +
  "Apple Developer search results. Use get_apple_doc_content " +
  "with a result URL to read official Markdown or JSON. Fetch pages on demand only; do not " +
  "bulk crawl Apple documentation.";
