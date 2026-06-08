import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { appConfig, serverInstructions } from "./config.js";
import { AppleDocsService } from "./services/AppleDocsService.js";
import { AppleSearchService } from "./services/AppleSearchService.js";
import { FileCache } from "./services/FileCache.js";
import { HttpClient } from "./services/HttpClient.js";
import { registerAppleDocsTools } from "./tools/registerAppleDocsTools.js";

export function createAppleDocsServer(): McpServer {
  const cache = new FileCache({
    cacheDir: appConfig.cacheDir,
    defaultTtlSeconds: appConfig.cacheTtlSeconds,
  });
  const http = new HttpClient({
    cache,
    userAgent: appConfig.userAgent,
    defaultTtlSeconds: appConfig.cacheTtlSeconds,
  });

  const searchService = new AppleSearchService({
    http,
    searchUrl: appConfig.appleSearchUrl,
  });
  const docsService = new AppleDocsService({
    http,
    appleDocsOrigin: appConfig.appleDocsOrigin,
    appleDocsDataBase: appConfig.appleDocsDataBase,
  });

  const server = new McpServer(
    {
      name: appConfig.name,
      version: appConfig.version,
    },
    {
      instructions: serverInstructions,
    },
  );

  registerAppleDocsTools(server, {
    cache,
    docsService,
    searchService,
  });

  return server;
}
