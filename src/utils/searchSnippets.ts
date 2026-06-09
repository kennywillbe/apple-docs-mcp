import { compactWhitespace } from "./text.js";

export interface SearchSnippetField {
  name: string;
  value?: string;
}

export interface SearchSnippetAnnotation {
  matchedFields: string[];
  snippet: string;
}

export function annotateSearchSnippet(
  query: string,
  fields: SearchSnippetField[],
): SearchSnippetAnnotation {
  const tokens = queryTokens(query);
  const matchedFields: string[] = [];
  let snippet = "";

  for (const field of fields) {
    const value = compactWhitespace(field.value ?? "");
    if (!value) continue;

    const lower = value.toLowerCase();
    const matchedToken = tokens.find((token) => lower.includes(token));
    if (!matchedToken) continue;

    matchedFields.push(field.name);
    if (!snippet) snippet = snippetAround(value, matchedToken);
  }

  return {
    matchedFields,
    snippet: snippet || compactWhitespace(fields.map((field) => field.value ?? "").join(" ")).slice(0, 220),
  };
}

function queryTokens(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const tokens = new Set<string>();
  if (normalizedQuery) tokens.add(normalizedQuery);

  for (const token of normalizedQuery.split(/[\s/._:-]+/).filter((value) => value.length >= 2)) {
    tokens.add(token);
  }

  return [...tokens].sort((a, b) => b.length - a.length);
}

function snippetAround(value: string, token: string): string {
  const lower = value.toLowerCase();
  const index = lower.indexOf(token);
  if (index < 0) return value.slice(0, 220);

  const start = Math.max(0, index - 70);
  const end = Math.min(value.length, index + token.length + 150);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < value.length ? "..." : "";
  return `${prefix}${value.slice(start, end)}${suffix}`;
}
