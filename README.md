# Apple Docs MCP

MCP server for Apple Developer Documentation. It uses Apple Developer search and
Apple's official documentation Markdown/JSON endpoints, so clients can read
Apple docs without falling back to general web search.

## Install

```bash
codex mcp add apple_docs -- npx -y github:kennywillbe/apple-docs-mcp
```

Restart Codex, then run `/mcp` and check that `apple_docs` is enabled.

To reinstall:

```bash
codex mcp remove apple_docs
codex mcp add apple_docs -- npx -y github:kennywillbe/apple-docs-mcp
```

## MCP Command

Use this command anywhere a client asks for a stdio MCP command:

```bash
npx -y github:kennywillbe/apple-docs-mcp
```

## Client Config

### Claude Code

```bash
claude mcp add --transport stdio apple_docs -- npx -y github:kennywillbe/apple-docs-mcp
```

```bash
claude mcp list
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apple_docs": {
      "command": "npx",
      "args": ["-y", "github:kennywillbe/apple-docs-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Cursor

Use `~/.cursor/mcp.json` for global config or `.cursor/mcp.json` for a single
project:

```json
{
  "mcpServers": {
    "apple_docs": {
      "command": "npx",
      "args": ["-y", "github:kennywillbe/apple-docs-mcp"]
    }
  }
}
```

### Windsurf

Add this server to `mcp_config.json`:

```json
{
  "mcpServers": {
    "apple_docs": {
      "command": "npx",
      "args": ["-y", "github:kennywillbe/apple-docs-mcp"]
    }
  }
}
```

### VS Code / GitHub Copilot

VS Code uses `servers` instead of `mcpServers`:

```json
{
  "servers": {
    "apple_docs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "github:kennywillbe/apple-docs-mcp"]
    }
  }
}
```

## Tools

- `search_apple_docs`: Search Apple Developer results.
- `list_apple_technologies`: Find Apple documentation technologies/frameworks.
- `choose_apple_technology`: Select a technology for follow-up symbol tools.
- `current_apple_technology`: Show the selected technology.
- `search_apple_symbols`: Search symbols/articles inside a selected technology.
- `get_apple_symbol_documentation`: Resolve a symbol inside a technology and fetch its docs.
- `get_apple_doc_content`: Fetch documentation as Markdown or JSON.
- `get_apple_doc_metadata`: Fetch parsed metadata and section counts.
- `list_apple_doc_related`: List topic, see-also, and relationship links.
- `list_apple_doc_headings`: List Markdown headings.
- `resolve_apple_doc_url`: Resolve canonical and Apple data URLs.
- `apple_docs_cache_status`: Show cache status.
- `clear_apple_docs_cache`: Clear cached responses.

## Typical Flow

For API work, avoid broad web-style search first:

1. `list_apple_technologies` with a query like `intent` or `widget`.
2. `choose_apple_technology` with `App Intents`, `SwiftUI`, `WidgetKit`, etc.
3. `search_apple_symbols` with a symbol or keyword like `AppIntent`.
4. `get_apple_symbol_documentation` with `AppIntent` or `AppIntent/perform()`.

Use `search_apple_docs` when you need broad Apple Developer results across
documentation, videos, sample code, or WWDC content.

## Local Development

```bash
git clone https://github.com/kennywillbe/apple-docs-mcp.git
cd apple-docs-mcp
npm install
npm run build
npm run typecheck
```

Run locally with Codex:

```bash
codex mcp add apple_docs -- node "$PWD/dist/index.js"
```

Use the inspector:

```bash
npm run inspect
```

## Environment

- `APPLE_DOCS_MCP_CACHE_DIR`: Override cache directory.
- `APPLE_DOCS_MCP_CACHE_TTL_SECONDS`: Override cache TTL. Default: `86400`.
- `APPLE_DOCS_MCP_USER_AGENT`: Override User-Agent header.
- `APPLE_DOCS_MCP_SYMBOL_SEARCH_CHILD_PAGES`: Child collection pages to inspect for normal symbol search. Default: `40`.
- `APPLE_DOCS_MCP_SYMBOL_SEARCH_DEEP_CHILD_PAGES`: Child collection pages to inspect when `deep` is enabled. Default: `120`.

## Notes

This server fetches pages on demand. Do not bulk crawl Apple documentation.

The search tool depends on the Apple Developer search endpoint used by Apple's
own search page. If that endpoint is unavailable, `search_apple_docs` falls
back to official documentation indexes for documentation queries. Direct
Markdown/JSON documentation fetches are separate from that search endpoint.

`search_apple_symbols` and `get_apple_symbol_documentation` support `deep` and
`max_child_pages` for cases where a framework spreads symbols across many child
documentation pages. Keep the default search for normal use, and enable deep
search only when a known symbol is missing.
