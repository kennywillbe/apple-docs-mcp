import type { CacheStatus } from "../services/FileCache.js";
import type {
  AppleSymbolSearchResult,
  AppleSymbolResolutionResult,
  AppleSearchResult,
  AppleTechnologySelectionResult,
  AppleTechnologyResult,
  RelatedDocLink,
  ResolvedDocUrls,
} from "../types/apple.js";
import type { MarkdownHeading } from "../utils/markdown.js";

export function mcpText(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

export function formatSearchResults(args: {
  query: string;
  queryVariants?: string[];
  filter: string;
  locale: string;
  fromCache: boolean;
  results: AppleSearchResult[];
}): string {
  const lines = [
    "Apple Developer search",
    `Query: ${args.query}`,
    `Filter: ${args.filter}`,
    `Locale: ${args.locale}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
  ];

  if (args.queryVariants && args.queryVariants.length > 1) {
    lines.push(`Query variants: ${args.queryVariants.join(" | ")}`);
  }

  lines.push("");

  if (!args.results.length) {
    lines.push("No results.");
    return lines.join("\n");
  }

  for (const [index, result] of args.results.entries()) {
    lines.push(`${index + 1}. ${result.title || "(untitled)"}`);
    lines.push(`   Type: ${result.type || "unknown"}`);
    if (result.kind) lines.push(`   Kind: ${result.kind}`);
    if (result.hierarchy) lines.push(`   Hierarchy: ${result.hierarchy}`);
    if (result.availability) lines.push(`   Availability: ${result.availability}`);
    if (result.project) lines.push(`   Project: ${result.project}`);
    if (result.availabilityDate) lines.push(`   Date: ${result.availabilityDate}`);
    if (result.durationSeconds) lines.push(`   Duration seconds: ${result.durationSeconds}`);
    if (result.pageCount) lines.push(`   Page count: ${result.pageCount}`);
    if (result.description) lines.push(`   Description: ${result.description}`);
    if (result.url) lines.push(`   URL: ${result.url}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatResolvedUrls(urls: ResolvedDocUrls): string {
  return JSON.stringify(urls, null, 2);
}

export function formatHeadings(args: {
  sourceUrl: string;
  dataUrl: string;
  fromCache: boolean;
  headings: MarkdownHeading[];
}): string {
  const lines = [
    `Source: ${args.sourceUrl}`,
    `Data URL: ${args.dataUrl}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
    "",
  ];

  if (!args.headings.length) {
    lines.push("No headings found.");
    return lines.join("\n");
  }

  for (const heading of args.headings) {
    lines.push(
      `${"  ".repeat(Math.max(heading.level - 1, 0))}- H${heading.level} ${heading.title} (#${heading.anchor}, line ${heading.line})`,
    );
  }

  return lines.join("\n");
}

export function formatRelatedLinks(args: {
  sourceUrl: string;
  dataUrl: string;
  fromCache: boolean;
  related: RelatedDocLink[];
}): string {
  const lines = [
    `Source: ${args.sourceUrl}`,
    `Data URL: ${args.dataUrl}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
    "",
  ];

  if (!args.related.length) {
    lines.push("No related links found.");
    return lines.join("\n");
  }

  for (const [index, link] of args.related.entries()) {
    lines.push(`${index + 1}. ${link.title}`);
    lines.push(`   Section: ${link.sectionType}${link.sectionTitle ? ` / ${link.sectionTitle}` : ""}`);
    if (link.kind) lines.push(`   Kind: ${link.kind}`);
    if (link.role) lines.push(`   Role: ${link.role}`);
    if (link.abstract) lines.push(`   Abstract: ${link.abstract}`);
    if (link.url) lines.push(`   URL: ${link.url}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatCacheStatus(status: CacheStatus): string {
  return JSON.stringify(status, null, 2);
}

export function formatTechnologies(args: {
  dataUrl: string;
  fromCache: boolean;
  technologies: AppleTechnologyResult[];
}): string {
  const lines = [
    "Apple technologies",
    `Data URL: ${args.dataUrl}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
    "",
  ];

  if (!args.technologies.length) {
    lines.push("No technologies found.");
    return lines.join("\n");
  }

  for (const [index, technology] of args.technologies.entries()) {
    lines.push(`${index + 1}. ${technology.title}`);
    lines.push(`   Identifier: ${technology.identifier}`);
    lines.push(`   Path: ${technology.path}`);
    if (technology.abstract) lines.push(`   Abstract: ${technology.abstract}`);
    if (technology.url) lines.push(`   URL: ${technology.url}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatTechnologySelection(args: AppleTechnologySelectionResult): string {
  const lines = [
    "Apple technology selection",
    `Requested: ${args.requested}`,
    `Data URL: ${args.dataUrl}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
    "",
  ];

  if (args.selected) {
    lines.push(`Selected: ${args.selected.title}`);
    lines.push(`Identifier: ${args.selected.identifier}`);
    lines.push(`Path: ${args.selected.path}`);
    lines.push(`URL: ${args.selected.url}`);
    if (args.selected.abstract) lines.push(`Abstract: ${args.selected.abstract}`);
    return lines.join("\n");
  }

  lines.push("No technology selected.");
  if (args.suggestions.length) {
    lines.push("");
    lines.push("Suggestions:");
    for (const [index, technology] of args.suggestions.entries()) {
      lines.push(`${index + 1}. ${technology.title}`);
      lines.push(`   Path: ${technology.path}`);
      lines.push(`   URL: ${technology.url}`);
    }
  }

  return lines.join("\n");
}

export function formatCurrentTechnology(technology: AppleTechnologyResult | undefined): string {
  if (!technology) {
    return [
      "Current Apple technology",
      "No technology selected.",
      "",
      "Call choose_apple_technology or pass technology to search_apple_symbols.",
    ].join("\n");
  }

  return [
    "Current Apple technology",
    `Title: ${technology.title}`,
    `Identifier: ${technology.identifier}`,
    `Path: ${technology.path}`,
    `URL: ${technology.url}`,
    technology.abstract ? `Abstract: ${technology.abstract}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatSymbolSearch(args: {
  technology: AppleTechnologyResult;
  sourceUrl: string;
  dataUrl: string;
  fromCache: boolean;
  results: AppleSymbolSearchResult[];
}): string {
  const lines = [
    "Apple symbol search",
    `Technology: ${args.technology.title}`,
    `Technology path: ${args.technology.path}`,
    `Source: ${args.sourceUrl}`,
    `Data URL: ${args.dataUrl}`,
    `From cache: ${args.fromCache ? "yes" : "no"}`,
    "",
  ];

  if (!args.results.length) {
    lines.push("No symbols found.");
    return lines.join("\n");
  }

  const symbols = args.results.filter((result) => result.kind === "symbol" || result.role === "symbol");
  const articles = args.results.filter((result) => !symbols.includes(result));

  appendSymbolResults(lines, "Symbols", symbols);
  appendSymbolResults(lines, "Articles and guides", articles);

  return lines.join("\n");
}

export function formatSymbolContent(args: {
  text: string;
  resolution: AppleSymbolResolutionResult;
}): string {
  const lines = [
    "Resolved Apple symbol",
    `Technology: ${args.resolution.technology.title}`,
    `Requested: ${args.resolution.requested}`,
    `Resolved: ${args.resolution.title}`,
    `Path: ${args.resolution.path}`,
    `URL: ${args.resolution.url}`,
  ];

  if (args.resolution.external) lines.push("External: yes");
  if (args.resolution.kind) lines.push(`Kind: ${args.resolution.kind}`);
  if (args.resolution.role) lines.push(`Role: ${args.resolution.role}`);
  if (args.resolution.abstract) lines.push(`Abstract: ${args.resolution.abstract}`);
  lines.push("");
  lines.push(args.text);

  return lines.join("\n");
}

function appendSymbolResults(
  lines: string[],
  title: string,
  results: AppleSymbolSearchResult[],
): void {
  if (!results.length) return;

  lines.push(title);
  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   Kind: ${result.kind || "unknown"}`);
    if (result.role) lines.push(`   Role: ${result.role}`);
    if (result.external) lines.push("   External: yes");
    if (result.abstract) lines.push(`   Abstract: ${result.abstract}`);
    lines.push(`   Path: ${result.path}`);
    lines.push(`   URL: ${result.url}`);
    lines.push("");
  }
}
