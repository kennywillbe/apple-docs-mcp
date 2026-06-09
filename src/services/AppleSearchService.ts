import type { HttpClient } from "./HttpClient.js";
import type { AppleSearchResult, SearchFilter } from "../types/apple.js";
import { normalizeLocale } from "../utils/locale.js";
import { annotateSearchSnippet } from "../utils/searchSnippets.js";

const filters: Record<SearchFilter, object | null> = {
  all: null,
  documentation: { documentation: {} },
  video: { videos: {} },
  sample_code: { sampleCode: {} },
  wwdc26: { wwdc: { year: 2026 } },
};

export interface AppleSearchServiceOptions {
  http: HttpClient;
  searchUrl: string;
}

export interface SearchAppleDocsArgs {
  query: string;
  filter: SearchFilter;
  locale?: string;
  limit: number;
  cacheTtlSeconds?: number;
}

export interface SearchAppleDocsResult {
  query: string;
  filter: SearchFilter;
  locale: string;
  fromCache: boolean;
  results: AppleSearchResult[];
}

export class AppleSearchService {
  constructor(private readonly options: AppleSearchServiceOptions) {}

  async search(args: SearchAppleDocsArgs): Promise<SearchAppleDocsResult> {
    const locale = normalizeLocale(args.locale);
    const body: Record<string, unknown> = {
      text: args.query,
      targetResultLocale: locale,
    };

    const filterCategory = filters[args.filter];
    if (filterCategory) body.filterCategory = filterCategory;

    const response = await this.options.http.postJson(
      this.options.searchUrl,
      body,
      args.cacheTtlSeconds,
    );
    const data = JSON.parse(response.body) as { results?: unknown[] };
    const results = (data.results ?? [])
      .map(extractSearchResult)
      .filter((result): result is AppleSearchResult => Boolean(result))
      .map((result) => annotateSearchResult(args.query, result))
      .slice(0, args.limit);

    return {
      query: args.query,
      filter: args.filter,
      locale,
      fromCache: response.fromCache,
      results,
    };
  }
}

function annotateSearchResult(query: string, result: AppleSearchResult): AppleSearchResult {
  const annotation = annotateSearchSnippet(query, [
    { name: "title", value: result.title },
    { name: "description", value: result.description },
    { name: "hierarchy", value: result.hierarchy },
    { name: "kind", value: result.kind },
    { name: "type", value: result.type },
    { name: "project", value: result.project },
  ]);

  return {
    ...result,
    matchedFields: annotation.matchedFields,
    snippet: annotation.snippet,
    source: "apple_search",
  };
}

function extractSearchResult(item: unknown): AppleSearchResult | null {
  if (!isRecord(item)) return null;

  const documentation = metadataFrom(item.documentation);
  if (documentation) {
    return {
      type: documentation.kind === "sampleCode" ? "sample_code" : "documentation",
      title: stringValue(documentation.title),
      description: stringValue(documentation.description),
      url: stringValue(documentation.permalink),
      hierarchy: stringValue(documentation.hierarchy),
      kind: stringValue(documentation.kind),
      availability: stringValue(documentation.availability),
    };
  }

  const developer = metadataFrom(item.developer);
  if (developer) {
    const itemType = firstString(developer.itemTypes) || "Developer";
    if (itemType === "Collection") return null;

    return {
      type: itemType,
      title: firstString(developer.titles),
      description: firstString(developer.descriptions),
      url: firstString(developer.permalinks) || firstString(developer.signupURLs),
      project: firstString(developer.projectNames),
      availabilityDate: firstString(developer.availabilityDates),
      durationSeconds: firstNumber(developer.mediaDurations),
    };
  }

  const devsite = metadataFrom(item.devsite);
  if (devsite) {
    return {
      type: "devsite",
      title: stringValue(devsite.title),
      description: stringValue(devsite.description),
      url: stringValue(devsite.sourceURL),
    };
  }

  const swiftdocs = metadataFrom(item.swiftdocs);
  if (swiftdocs) {
    return {
      type: "swift_org",
      title: stringValue(swiftdocs.title),
      description: stringValue(swiftdocs.description),
      url: stringValue(swiftdocs.sourceURL),
    };
  }

  const pdf = metadataFrom(item.pdf);
  if (pdf) {
    return {
      type: "pdf",
      title: stringValue(pdf.title),
      description: stringValue(pdf.description),
      url: stringValue(pdf.sourceURL),
      pageCount: firstNumber([pdf.pageCount]),
    };
  }

  return null;
}

function metadataFrom(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !isRecord(value.metadata)) return null;
  return value.metadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstString(value: unknown): string {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
}

function firstNumber(value: unknown): number | null {
  return Array.isArray(value) && typeof value[0] === "number" ? value[0] : null;
}
