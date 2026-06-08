import type { AppleReference, AppleTechnologyResult } from "../types/apple.js";
import { normalizeDocPath } from "./appleUrls.js";

export function tokenize(value: string): string[] {
  const tokens = new Set<string>();
  for (const token of value.split(/[\s/._:-]+/).filter(Boolean)) {
    tokens.add(token.toLowerCase());
    const camelParts = token.split(/(?=[A-Z])/).filter(Boolean);
    if (camelParts.length > 1) {
      for (const part of camelParts) tokens.add(part.toLowerCase());
      tokens.add(camelParts.join("").toLowerCase());
    }
  }
  return [...tokens];
}

export function metadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

export function scoreTechnology(technology: AppleTechnologyResult, query: string): number {
  const trimmed = query.trim();
  if (!trimmed) return Number.POSITIVE_INFINITY;

  const lowerQuery = trimmed.toLowerCase();
  const compactQuery = compactKey(trimmed);
  const directPath = directDocumentationPath(trimmed)?.toLowerCase();
  const pathCandidate = `/documentation/${compactQuery}`;
  const lowerValues = [
    technology.title,
    technology.identifier,
    technology.path,
    technology.url,
  ].map((value) => value.toLowerCase());

  if (directPath && technology.path.toLowerCase() === directPath) return 0;
  if (lowerValues.some((value) => value === lowerQuery)) return 0;
  if (compactKey(technology.title) === compactQuery) return 1;
  if (technology.path.toLowerCase() === pathCandidate) return 1;
  if (technology.path.toLowerCase().endsWith(`/${compactQuery}`)) return 2;
  if (technology.title.toLowerCase().startsWith(lowerQuery)) return 3;
  if (lowerQuery.startsWith(technology.title.toLowerCase())) return 4;
  if (normalizeSearchText(technology.title).includes(normalizeSearchText(trimmed))) return 5;
  if (
    normalizeSearchText(
      [technology.title, technology.identifier, technology.path, technology.abstract].join(" "),
    ).includes(normalizeSearchText(trimmed))
  ) {
    return 8;
  }

  return Number.POSITIVE_INFINITY;
}

export function directDocumentationPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return normalizeDocPath(trimmed);
  if (trimmed.startsWith("/documentation/")) return normalizeDocPath(trimmed);
  if (trimmed.startsWith("documentation/")) return normalizeDocPath(`/${trimmed}`);
  return undefined;
}

export function candidateSymbolPaths(frameworkPath: string, value: string): string[] {
  if (directDocumentationPath(value)) return [];
  const normalized = value.trim().replace(/^\/+/, "");
  if (!normalized) return [];

  const parts = normalized.split("/").filter(Boolean);
  const dashed = parts.map((part) => toDocPathPart(part, false)).filter(Boolean).join("/");
  const compact = parts.map((part) => toDocPathPart(part, true)).filter(Boolean).join("/");

  return uniqueStrings([
    dashed ? `${frameworkPath}/${dashed}` : undefined,
    compact ? `${frameworkPath}/${compact}` : undefined,
  ]);
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function bestExactReference(
  references: AppleReference[],
  query: string,
  frameworkPath: string,
): AppleReference | undefined {
  return references
    .map((reference) => ({
      reference,
      score: scoreExactReference(reference, query, frameworkPath),
    }))
    .filter((entry): entry is { reference: AppleReference; score: number } => entry.score !== undefined)
    .sort((a, b) => {
      const externalA = a.reference.url
        ? Number(!isPathInsideTechnology(a.reference.url, frameworkPath))
        : 1;
      const externalB = b.reference.url
        ? Number(!isPathInsideTechnology(b.reference.url, frameworkPath))
        : 1;
      const symbolA = a.reference.kind === "symbol" || a.reference.role === "symbol" ? 0 : 1;
      const symbolB = b.reference.kind === "symbol" || b.reference.role === "symbol" ? 0 : 1;
      return a.score - b.score || externalA - externalB || symbolA - symbolB;
    })[0]?.reference;
}

export function scoreExactReference(
  reference: AppleReference,
  query: string,
  frameworkPath: string,
): number | undefined {
  if (!reference.title || !reference.url) return undefined;

  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();
  const compactQuery = compactKey(trimmed);
  const directPath = directDocumentationPath(trimmed)?.toLowerCase();
  const lowerTitle = reference.title.toLowerCase();
  const lowerPath = reference.url.toLowerCase();
  const lowerFrameworkPath = frameworkPath.toLowerCase();
  const relativePath = lowerPath.startsWith(`${lowerFrameworkPath}/`)
    ? lowerPath.slice(lowerFrameworkPath.length + 1)
    : lowerPath.replace(/^\/documentation\//, "");
  const lastPathPart = lowerPath.split("/").at(-1) ?? "";

  if (directPath && lowerPath === directPath) return 0;
  if (lowerTitle === lowerQuery) return 0;
  if (compactKey(reference.title) === compactQuery) return 1;
  if (relativePath === lowerQuery || compactKey(relativePath) === compactQuery) return 1;
  if (lowerPath.endsWith(`/${lowerQuery}`)) return 2;
  if (lastPathPart === lowerQuery || compactKey(lastPathPart) === compactQuery) return 2;

  return undefined;
}

export function isPathInsideTechnology(path: string, frameworkPath: string): boolean {
  const lowerPath = path.toLowerCase();
  const lowerFrameworkPath = frameworkPath.toLowerCase();
  return lowerPath === lowerFrameworkPath || lowerPath.startsWith(`${lowerFrameworkPath}/`);
}

export function wildcardPattern(query: string): RegExp | undefined {
  if (!query.includes("*") && !query.includes("?")) return undefined;
  const escaped = query.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replaceAll("*", ".*").replaceAll("?", ".")}$`, "i");
}

export function scoreWildcard(
  title: string,
  path: string,
  abstract: string,
  pattern: RegExp,
): number {
  const values = [title, path, abstract, ...tokenize(title), ...tokenize(path)];
  return values.some((value) => pattern.test(value)) ? 100 : 0;
}

export function scoreKeyword(
  title: string,
  path: string,
  abstract: string,
  query: string,
  queryTokens: string[],
): number {
  const lowerTitle = title.toLowerCase();
  const lowerPath = path.toLowerCase();
  const lowerAbstract = abstract.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const titleKey = compactKey(title);
  const lastPathPart = lowerPath.split("/").at(-1) ?? "";
  let score = 0;

  if (lowerTitle === lowerQuery || lowerPath.endsWith(`/${lowerQuery}`)) score += 120;

  for (const queryToken of queryTokens) {
    const tokenKey = compactKey(queryToken);
    if (lowerTitle === queryToken || titleKey === tokenKey) score += 120;
    if (lastPathPart === queryToken || compactKey(lastPathPart) === tokenKey) score += 100;
    if (lowerTitle.startsWith(queryToken)) score += 20;
    if (lowerTitle.includes(queryToken)) score += 50;
    if (lowerPath.includes(queryToken)) score += 40;
    if (lowerAbstract.includes(queryToken)) score += 10;
  }

  return score;
}

function normalizeSearchText(value: string): string {
  return tokenize(value).join(" ");
}

function compactKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toDocPathPart(value: string, compact: boolean): string {
  const lower = value.trim().toLowerCase();
  const normalized = compact
    ? lower.replace(/\s+/g, "")
    : lower.replace(/\s+/g, "-");
  return normalized
    .replace(/[^a-z0-9()_:.-]+/g, compact ? "" : "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
