export type SearchFilter = "all" | "documentation" | "video" | "sample_code" | "wwdc26";

export type DocContentFormat = "markdown" | "json";

export interface AppleSearchResult {
  type: string;
  title: string;
  description: string;
  url: string;
  hierarchy?: string;
  kind?: string;
  availability?: string;
  project?: string;
  availabilityDate?: string;
  durationSeconds?: number | null;
  pageCount?: number | null;
}

export interface AppleReference {
  title?: string;
  url?: string;
  kind?: string;
  role?: string;
  abstract?: AppleContentNode[];
  fragments?: Array<{ text?: string; kind?: string }>;
  identifier?: string;
  type?: string;
}

export interface AppleTopicSection {
  title?: string;
  anchor?: string;
  identifiers?: string[];
}

export interface AppleDocJson {
  identifier?: { url?: string; interfaceLanguage?: string };
  metadata?: Record<string, unknown>;
  abstract?: AppleContentNode[];
  primaryContentSections?: unknown[];
  references?: Record<string, AppleReference>;
  relationshipsSections?: AppleTopicSection[];
  seeAlsoSections?: AppleTopicSection[];
  sections?: AppleTopicSection[];
  topicSections?: AppleTopicSection[];
  variants?: unknown[];
  [key: string]: unknown;
}

export interface AppleContentNode {
  type?: string;
  text?: string;
  inlineContent?: AppleContentNode[];
  content?: AppleContentNode[];
  code?: string;
  [key: string]: unknown;
}

export interface ResolvedDocUrls {
  input: string;
  normalizedPath: string;
  canonicalUrl: string;
  markdownDataUrl: string;
  jsonDataUrl: string;
}

export interface RelatedDocLink {
  sectionType: string;
  sectionTitle: string;
  title: string;
  url: string;
  kind: string;
  role: string;
  abstract: string;
}

export interface AppleTechnologyResult {
  title: string;
  identifier: string;
  path: string;
  url: string;
  kind: string;
  role: string;
  abstract: string;
}

export interface AppleTechnologySelectionResult {
  requested: string;
  dataUrl: string;
  fromCache: boolean;
  selected?: AppleTechnologyResult;
  suggestions: AppleTechnologyResult[];
}

export interface AppleSymbolSearchResult {
  title: string;
  identifier: string;
  path: string;
  url: string;
  kind: string;
  role: string;
  abstract: string;
  external: boolean;
  score: number;
}

export interface AppleSymbolResolutionResult {
  technology: AppleTechnologyResult;
  requested: string;
  title: string;
  identifier: string;
  path: string;
  url: string;
  kind: string;
  role: string;
  abstract: string;
  external: boolean;
  sourceUrl: string;
  dataUrl: string;
  fromCache: boolean;
}
