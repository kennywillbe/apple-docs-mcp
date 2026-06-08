import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AppleDocsService } from "../services/AppleDocsService.js";
import type { AppleSearchService } from "../services/AppleSearchService.js";
import type { FileCache } from "../services/FileCache.js";
import {
  formatCacheStatus,
  formatCurrentTechnology,
  formatHeadings,
  formatRelatedLinks,
  formatResolvedUrls,
  formatSearchResults,
  formatSymbolContent,
  formatSymbolSearch,
  formatTechnologySelection,
  formatTechnologies,
  mcpText,
} from "./formatters.js";

export interface RegisterToolServices {
  cache: FileCache;
  docsService: AppleDocsService;
  searchService: AppleSearchService;
}

export function registerAppleDocsTools(server: McpServer, services: RegisterToolServices): void {
  server.tool(
    "search_apple_docs",
    "Search Apple Developer Documentation and related Apple developer content using Apple's official search API.",
    {
      query: z.string().min(1).describe("Search query, for example 'SwiftUI View'"),
      filter: z
        .enum(["all", "documentation", "video", "sample_code", "wwdc26"])
        .optional()
        .describe("Result filter. Use documentation for API docs."),
      locale: z
        .string()
        .optional()
        .describe("Target result locale, for example en, ja-JP, zh-CN."),
      limit: z.number().int().min(1).max(25).optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({
      query,
      filter = "documentation",
      locale = "en",
      limit = 8,
      cache_ttl_seconds,
    }) => {
      const result = await services.searchService.search({
        query,
        filter,
        locale,
        limit,
        cacheTtlSeconds: cache_ttl_seconds,
      });

      return mcpText(formatSearchResults(result));
    },
  );

  server.tool(
    "list_apple_technologies",
    "List Apple documentation technologies/framework collections. Use this to find the technology for choose_apple_technology or search_apple_symbols.",
    {
      query: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ query, limit = 30, cache_ttl_seconds }) => {
      const result = await services.docsService.listTechnologies({
        query,
        limit,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatTechnologies(result));
    },
  );

  server.tool(
    "choose_apple_technology",
    "Select an Apple documentation technology/framework for follow-up symbol searches and symbol documentation fetches.",
    {
      technology: z
        .string()
        .min(1)
        .describe("Technology name, identifier, URL, or path. Examples: 'App Intents', 'SwiftUI', '/documentation/widgetkit'."),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ technology, cache_ttl_seconds }) => {
      const result = await services.docsService.chooseTechnology({
        technology,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatTechnologySelection(result));
    },
  );

  server.tool(
    "current_apple_technology",
    "Show the currently selected Apple documentation technology/framework.",
    {},
    async () => mcpText(formatCurrentTechnology(services.docsService.currentTechnology())),
  );

  server.tool(
    "search_apple_symbols",
    "Search symbols/articles inside a selected Apple documentation technology using framework references, not global Apple search.",
    {
      technology: z
        .string()
        .min(1)
        .optional()
        .describe("Optional technology/framework name or path. If omitted, the selected technology is used."),
      query: z.string().min(1).describe("Symbol or keyword query, for example 'AppIntent' or 'parameterSummary'."),
      kind: z.string().optional().describe("Optional reference kind filter, for example 'symbol' or 'article'."),
      limit: z.number().int().min(1).max(100).optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ technology, query, kind, limit = 20, cache_ttl_seconds }) => {
      const result = await services.docsService.searchSymbols({
        technology,
        query,
        kind,
        limit,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatSymbolSearch(result));
    },
  );

  server.tool(
    "get_apple_symbol_documentation",
    "Resolve a symbol within a selected Apple documentation technology and fetch its official Markdown or JSON documentation.",
    {
      technology: z
        .string()
        .min(1)
        .optional()
        .describe("Optional technology/framework name or path. If omitted, the selected technology is used."),
      symbol_or_path: z
        .string()
        .min(1)
        .describe("Symbol name or path, for example 'AppIntent', 'AppIntent/perform()', or '/documentation/appintents/appintent'."),
      format: z.enum(["markdown", "json"]).optional(),
      max_chars: z.number().int().min(1000).max(100000).optional(),
      include_metadata: z.boolean().optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({
      technology,
      symbol_or_path,
      format = "markdown",
      max_chars = 30000,
      include_metadata = true,
      cache_ttl_seconds,
    }) => {
      const result = await services.docsService.getSymbolContent({
        technology,
        symbolOrPath: symbol_or_path,
        format,
        maxChars: max_chars,
        includeMetadata: include_metadata,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatSymbolContent(result));
    },
  );

  server.tool(
    "get_apple_doc_content",
    "Fetch official Apple Developer Documentation content as Markdown or JSON from a documentation URL/path.",
    {
      url_or_path: z
        .string()
        .min(1)
        .describe(
          "Apple documentation URL or path, for example https://developer.apple.com/documentation/swiftui/view or /documentation/swiftui/view",
        ),
      format: z.enum(["markdown", "json"]).optional(),
      max_chars: z.number().int().min(1000).max(100000).optional(),
      include_metadata: z.boolean().optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({
      url_or_path,
      format = "markdown",
      max_chars = 30000,
      include_metadata = true,
      cache_ttl_seconds,
    }) => {
      const result = await services.docsService.getContent({
        urlOrPath: url_or_path,
        format,
        maxChars: max_chars,
        includeMetadata: include_metadata,
        cacheTtlSeconds: cache_ttl_seconds,
      });

      return mcpText(result.text);
    },
  );

  server.tool(
    "get_apple_doc_metadata",
    "Fetch parsed metadata, abstract, and section counts for an Apple documentation page.",
    {
      url_or_path: z.string().min(1),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ url_or_path, cache_ttl_seconds }) => {
      const metadata = await services.docsService.getMetadata(url_or_path, cache_ttl_seconds);
      return mcpText(JSON.stringify(metadata, null, 2));
    },
  );

  server.tool(
    "list_apple_doc_related",
    "List related Apple documentation links from topics, see-also, or relationship sections.",
    {
      url_or_path: z.string().min(1),
      section: z.enum(["all", "topics", "see_also", "relationships"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ url_or_path, section = "all", limit = 30, cache_ttl_seconds }) => {
      const result = await services.docsService.getRelatedLinks({
        urlOrPath: url_or_path,
        section,
        limit,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatRelatedLinks(result));
    },
  );

  server.tool(
    "list_apple_doc_headings",
    "List Markdown headings for an Apple documentation page.",
    {
      url_or_path: z.string().min(1),
      max_headings: z.number().int().min(1).max(100).optional(),
      cache_ttl_seconds: z.number().int().min(0).optional(),
    },
    async ({ url_or_path, max_headings = 50, cache_ttl_seconds }) => {
      const result = await services.docsService.getHeadings({
        urlOrPath: url_or_path,
        maxHeadings: max_headings,
        cacheTtlSeconds: cache_ttl_seconds,
      });
      return mcpText(formatHeadings(result));
    },
  );

  server.tool(
    "resolve_apple_doc_url",
    "Resolve an Apple documentation URL/path into canonical, Markdown data, and JSON data URLs.",
    {
      url_or_path: z.string().min(1),
    },
    async ({ url_or_path }) => {
      return mcpText(formatResolvedUrls(services.docsService.resolve(url_or_path)));
    },
  );

  server.tool("apple_docs_cache_status", "Show local Apple Docs MCP cache status.", {}, async () => {
    return mcpText(formatCacheStatus(await services.cache.status()));
  });

  server.tool(
    "clear_apple_docs_cache",
    "Clear local Apple Docs MCP cached responses.",
    {},
    async () => {
      const count = await services.cache.clear();
      return mcpText(`Cleared ${count} cache files.`);
    },
  );
}
