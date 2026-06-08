import type { HttpClient } from "./HttpClient.js";
import type {
  AppleDocJson,
  AppleReference,
  AppleSymbolResolutionResult,
  AppleSymbolSearchResult,
  AppleTechnologySelectionResult,
  AppleTechnologyResult,
  DocContentFormat,
  RelatedDocLink,
  ResolvedDocUrls,
} from "../types/apple.js";
import { contentNodesToText, referenceAbstractToText } from "../utils/appleContent.js";
import {
  bestExactReference,
  candidateSymbolPaths,
  directDocumentationPath,
  isPathInsideTechnology,
  metadataString,
  scoreExactReference,
  scoreKeyword,
  scoreTechnology,
  scoreWildcard,
  tokenize,
  uniqueStrings,
  wildcardPattern,
} from "../utils/appleDocMatching.js";
import { dataUrlForPath, normalizeDocPath, resolveAppleDocUrls } from "../utils/appleUrls.js";
import { extractMarkdownHeadings, parseMarkdownMetadata } from "../utils/markdown.js";
import { trimToMaxChars } from "../utils/text.js";

export interface AppleDocsServiceOptions {
  http: HttpClient;
  appleDocsOrigin: string;
  appleDocsDataBase: string;
}

export interface GetContentArgs {
  urlOrPath: string;
  format: DocContentFormat;
  maxChars: number;
  includeMetadata: boolean;
  cacheTtlSeconds?: number;
}

export interface GetContentResult {
  text: string;
  sourceUrl: string;
  dataUrl: string;
  fromCache: boolean;
}

export type RelatedSectionFilter = "all" | "topics" | "see_also" | "relationships";

export class AppleDocsService {
  private activeTechnology?: AppleTechnologyResult;

  constructor(private readonly options: AppleDocsServiceOptions) {}

  resolve(urlOrPath: string): ResolvedDocUrls {
    return resolveAppleDocUrls(
      urlOrPath,
      this.options.appleDocsOrigin,
      this.options.appleDocsDataBase,
    );
  }

  async getContent(args: GetContentArgs): Promise<GetContentResult> {
    const urls = this.resolve(args.urlOrPath);
    const dataUrl = args.format === "json" ? urls.jsonDataUrl : urls.markdownDataUrl;
    const response = await this.options.http.getText(dataUrl, args.cacheTtlSeconds);

    let text = response.body;
    if (args.format === "json") {
      text = JSON.stringify(JSON.parse(text), null, 2);
    } else if (args.includeMetadata) {
      const metadata = parseMarkdownMetadata(text);
      const header = [
        `Source: ${urls.canonicalUrl}`,
        `Data URL: ${dataUrl}`,
        `From cache: ${response.fromCache ? "yes" : "no"}`,
      ];
      const title = metadata?.title;
      const framework = metadata?.framework;
      const role = metadata?.role;
      if (typeof title === "string") header.push(`Title: ${title}`);
      if (typeof framework === "string") header.push(`Framework: ${framework}`);
      if (typeof role === "string") header.push(`Role: ${role}`);
      text = `${header.join("\n")}\n\n${text}`;
    }

    return {
      text: trimToMaxChars(text, args.maxChars),
      sourceUrl: urls.canonicalUrl,
      dataUrl,
      fromCache: response.fromCache,
    };
  }

  async getJson(urlOrPath: string, cacheTtlSeconds?: number): Promise<{
    data: AppleDocJson;
    dataUrl: string;
    canonicalUrl: string;
    fromCache: boolean;
  }> {
    const urls = this.resolve(urlOrPath);
    const response = await this.options.http.getText(urls.jsonDataUrl, cacheTtlSeconds);
    return {
      data: JSON.parse(response.body) as AppleDocJson,
      dataUrl: urls.jsonDataUrl,
      canonicalUrl: urls.canonicalUrl,
      fromCache: response.fromCache,
    };
  }

  async getMetadata(urlOrPath: string, cacheTtlSeconds?: number) {
    const json = await this.getJson(urlOrPath, cacheTtlSeconds);
    const metadata = json.data.metadata ?? {};

    return {
      sourceUrl: json.canonicalUrl,
      dataUrl: json.dataUrl,
      fromCache: json.fromCache,
      identifier: json.data.identifier,
      metadata,
      abstract: contentNodesToText(json.data.abstract),
      topicSectionCount: json.data.topicSections?.length ?? 0,
      seeAlsoSectionCount: json.data.seeAlsoSections?.length ?? 0,
      relationshipSectionCount: json.data.relationshipsSections?.length ?? 0,
    };
  }

  async listTechnologies(args: {
    query?: string;
    limit: number;
    cacheTtlSeconds?: number;
  }): Promise<{
    dataUrl: string;
    fromCache: boolean;
    technologies: AppleTechnologyResult[];
  }> {
    const json = await this.getJson("/documentation/technologies", args.cacheTtlSeconds);
    const technologies = Object.values(json.data.references ?? [])
      .filter((reference) => reference.kind === "symbol" && reference.role === "collection")
      .map((reference) => this.technologyFromReference(reference))
      .filter((technology) => Boolean(technology.path))
      .sort((a, b) => a.title.localeCompare(b.title));

    const query = args.query?.trim();
    const filtered = query
      ? technologies
          .map((technology) => ({
            technology,
            score: scoreTechnology(technology, query),
          }))
          .filter((entry) => Number.isFinite(entry.score))
          .sort((a, b) => a.score - b.score || a.technology.title.localeCompare(b.technology.title))
          .map((entry) => entry.technology)
      : technologies;

    return {
      dataUrl: json.dataUrl,
      fromCache: json.fromCache,
      technologies: filtered.slice(0, args.limit),
    };
  }

  async chooseTechnology(args: {
    technology: string;
    cacheTtlSeconds?: number;
  }): Promise<AppleTechnologySelectionResult> {
    const result = await this.findTechnology(args.technology, args.cacheTtlSeconds);
    if (result.selected) this.activeTechnology = result.selected;
    return result;
  }

  currentTechnology(): AppleTechnologyResult | undefined {
    return this.activeTechnology;
  }

  async searchSymbols(args: {
    technology?: string;
    query: string;
    limit: number;
    kind?: string;
    cacheTtlSeconds?: number;
  }): Promise<{
    technology: AppleTechnologyResult;
    sourceUrl: string;
    dataUrl: string;
    fromCache: boolean;
    results: AppleSymbolSearchResult[];
  }> {
    const technology = await this.requireTechnology(args.technology, args.cacheTtlSeconds);
    const frameworkPath = technology.path;
    const json = await this.getJson(frameworkPath, args.cacheTtlSeconds);
    const references = await this.collectSearchReferences(json.data, frameworkPath, args.cacheTtlSeconds);
    const queryTokens = tokenize(args.query);
    const wildcard = wildcardPattern(args.query);
    const kindFilter = args.kind?.toLowerCase();
    const scored: AppleSymbolSearchResult[] = [];

    for (const reference of references) {
      if (!reference.url || !reference.title) continue;
      if (kindFilter && reference.kind?.toLowerCase() !== kindFilter) continue;

      const abstract = referenceAbstractToText(reference);
      const path = reference.url;
      const external = !isPathInsideTechnology(path, frameworkPath);
      let score = wildcard
        ? scoreWildcard(reference.title, path, abstract, wildcard)
        : scoreKeyword(reference.title, path, abstract, args.query, queryTokens);

      const exactScore = scoreExactReference(reference, args.query, frameworkPath);
      if (exactScore !== undefined) score += 240 - exactScore * 20;
      if (!external) score += 15;
      if (reference.kind === "symbol" || reference.role === "symbol") score += 8;

      if (score <= 0) continue;

      scored.push({
        title: reference.title,
        identifier: reference.identifier ?? "",
        path,
        url: `${this.options.appleDocsOrigin}${path}`,
        kind: reference.kind ?? "",
        role: reference.role ?? "",
        abstract,
        external,
        score,
      });
    }

    return {
      technology,
      sourceUrl: json.canonicalUrl,
      dataUrl: json.dataUrl,
      fromCache: json.fromCache,
      results: scored.sort((a, b) => b.score - a.score).slice(0, args.limit),
    };
  }

  async resolveSymbol(args: {
    technology?: string;
    symbolOrPath: string;
    cacheTtlSeconds?: number;
  }): Promise<AppleSymbolResolutionResult> {
    const technology = await this.requireTechnology(args.technology, args.cacheTtlSeconds);
    const requested = args.symbolOrPath.trim();
    if (!requested) throw new Error("symbol_or_path is required.");

    const directPath = directDocumentationPath(requested);
    const references = directPath
      ? []
      : await this.referencesForTechnology(technology, args.cacheTtlSeconds);
    const referenceMatch = directPath
      ? undefined
      : bestExactReference(references, requested, technology.path);
    const candidates = uniqueStrings([
      directPath,
      referenceMatch?.url,
      ...candidateSymbolPaths(technology.path, requested),
    ]);

    let lastError: unknown;
    for (const candidate of candidates) {
      try {
        const json = await this.getJson(candidate, args.cacheTtlSeconds);
        const metadata = json.data.metadata ?? {};
        const path = normalizeDocPath(candidate);
        const title = metadataString(metadata, "title") ?? referenceMatch?.title ?? requested;
        const kind =
          metadataString(metadata, "symbolKind") ??
          referenceMatch?.kind ??
          metadataString(metadata, "role") ??
          "";
        const role = metadataString(metadata, "role") ?? referenceMatch?.role ?? "";

        return {
          technology,
          requested,
          title,
          identifier: json.data.identifier?.url ?? referenceMatch?.identifier ?? "",
          path,
          url: `${this.options.appleDocsOrigin}${path}`,
          kind,
          role,
          abstract: contentNodesToText(json.data.abstract) || referenceAbstractToText(referenceMatch),
          external: !isPathInsideTechnology(path, technology.path),
          sourceUrl: json.canonicalUrl,
          dataUrl: json.dataUrl,
          fromCache: json.fromCache,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      `Could not resolve Apple symbol "${requested}" in ${technology.title}. ` +
        `Try search_apple_symbols first. Last error: ${String(lastError)}`,
    );
  }

  async getSymbolContent(args: {
    technology?: string;
    symbolOrPath: string;
    format: DocContentFormat;
    maxChars: number;
    includeMetadata: boolean;
    cacheTtlSeconds?: number;
  }): Promise<GetContentResult & { resolution: AppleSymbolResolutionResult }> {
    const resolution = await this.resolveSymbol({
      technology: args.technology,
      symbolOrPath: args.symbolOrPath,
      cacheTtlSeconds: args.cacheTtlSeconds,
    });
    const content = await this.getContent({
      urlOrPath: resolution.path,
      format: args.format,
      maxChars: args.maxChars,
      includeMetadata: args.includeMetadata,
      cacheTtlSeconds: args.cacheTtlSeconds,
    });

    return {
      ...content,
      resolution,
    };
  }

  async getRelatedLinks(args: {
    urlOrPath: string;
    section: RelatedSectionFilter;
    limit: number;
    cacheTtlSeconds?: number;
  }): Promise<{
    sourceUrl: string;
    dataUrl: string;
    fromCache: boolean;
    related: RelatedDocLink[];
  }> {
    const json = await this.getJson(args.urlOrPath, args.cacheTtlSeconds);
    const related: RelatedDocLink[] = [];

    for (const sectionGroup of this.relatedSectionGroups(json.data, args.section)) {
      for (const section of sectionGroup.sections) {
        for (const identifier of section.identifiers ?? []) {
          const reference = json.data.references?.[identifier];
          if (!reference?.url && !reference?.title) continue;

          related.push({
            sectionType: sectionGroup.type,
            sectionTitle: section.title ?? "",
            title: reference.title ?? identifier,
            url: reference.url ? `${this.options.appleDocsOrigin}${reference.url}` : "",
            kind: reference.kind ?? "",
            role: reference.role ?? "",
            abstract: referenceAbstractToText(reference),
          });

          if (related.length >= args.limit) {
            return {
              sourceUrl: json.canonicalUrl,
              dataUrl: json.dataUrl,
              fromCache: json.fromCache,
              related,
            };
          }
        }
      }
    }

    return {
      sourceUrl: json.canonicalUrl,
      dataUrl: json.dataUrl,
      fromCache: json.fromCache,
      related,
    };
  }

  async getHeadings(args: {
    urlOrPath: string;
    maxHeadings: number;
    cacheTtlSeconds?: number;
  }) {
    const urls = this.resolve(args.urlOrPath);
    const response = await this.options.http.getText(urls.markdownDataUrl, args.cacheTtlSeconds);
    return {
      sourceUrl: urls.canonicalUrl,
      dataUrl: urls.markdownDataUrl,
      fromCache: response.fromCache,
      headings: extractMarkdownHeadings(response.body, args.maxHeadings),
    };
  }

  dataUrlFor(urlOrPath: string, format: DocContentFormat): string {
    return dataUrlForPath(
      normalizeDocPath(urlOrPath),
      format,
      this.options.appleDocsOrigin,
      this.options.appleDocsDataBase,
    );
  }

  private technologyFromReference(reference: AppleReference): AppleTechnologyResult {
    const path = reference.url ?? "";
    return {
      title: reference.title ?? "",
      identifier: reference.identifier ?? "",
      path,
      url: path ? `${this.options.appleDocsOrigin}${path}` : "",
      kind: reference.kind ?? "",
      role: reference.role ?? "",
      abstract: referenceAbstractToText(reference),
    };
  }

  private async findTechnology(
    requested: string,
    cacheTtlSeconds?: number,
  ): Promise<AppleTechnologySelectionResult> {
    const list = await this.listTechnologies({
      limit: 1000,
      cacheTtlSeconds,
    });
    const scored = list.technologies
      .map((technology) => ({
        technology,
        score: scoreTechnology(technology, requested),
      }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score || a.technology.title.localeCompare(b.technology.title));

    return {
      requested,
      dataUrl: list.dataUrl,
      fromCache: list.fromCache,
      selected: scored[0]?.score <= 4 ? scored[0].technology : undefined,
      suggestions: scored.slice(0, 8).map((entry) => entry.technology),
    };
  }

  private async requireTechnology(
    requested: string | undefined,
    cacheTtlSeconds?: number,
  ): Promise<AppleTechnologyResult> {
    if (!requested) {
      if (this.activeTechnology) return this.activeTechnology;
      throw new Error(
        "No Apple technology selected. Call choose_apple_technology first or pass technology.",
      );
    }

    const result = await this.findTechnology(requested, cacheTtlSeconds);
    if (result.selected) return result.selected;

    const suggestions = result.suggestions
      .slice(0, 5)
      .map((technology) => technology.title)
      .join(", ");
    throw new Error(
      `Could not resolve Apple technology "${requested}".` +
        (suggestions ? ` Suggestions: ${suggestions}.` : ""),
    );
  }

  private async referencesForTechnology(
    technology: AppleTechnologyResult,
    cacheTtlSeconds?: number,
  ): Promise<AppleReference[]> {
    const json = await this.getJson(technology.path, cacheTtlSeconds);
    return this.collectSearchReferences(json.data, technology.path, cacheTtlSeconds);
  }

  private relatedSectionGroups(data: AppleDocJson, filter: RelatedSectionFilter) {
    const groups = [
      { type: "topics", sections: data.topicSections ?? [] },
      { type: "see_also", sections: data.seeAlsoSections ?? [] },
      { type: "relationships", sections: data.relationshipsSections ?? [] },
    ];

    if (filter === "all") return groups;
    return groups.filter((group) => group.type === filter);
  }

  private async collectSearchReferences(
    data: AppleDocJson,
    frameworkPath: string,
    cacheTtlSeconds?: number,
  ) {
    const references = new Map<string, AppleReference>();
    const addReferences = (items: AppleDocJson["references"] | undefined) => {
      for (const reference of Object.values(items ?? {})) {
        const key = (reference.url ?? reference.identifier ?? reference.title)?.toLowerCase();
        if (key && !references.has(key)) references.set(key, reference);
      }
    };
    const addPageReference = (page: AppleDocJson, path: string) => {
      const metadata = page.metadata ?? {};
      const title = metadataString(metadata, "title");
      if (!title) return;
      const reference: AppleReference = {
        title,
        url: path,
        kind: metadataString(metadata, "role") === "symbol" ? "symbol" : "article",
        role: metadataString(metadata, "role") ?? "",
        abstract: page.abstract,
        identifier: page.identifier?.url,
      };
      const key = path.toLowerCase();
      if (!references.has(key)) references.set(key, reference);
    };

    addPageReference(data, frameworkPath);
    addReferences(data.references);

    const childUrls = this.childCollectionUrls(data, frameworkPath).slice(0, 40);
    const childPages = await Promise.all(
      childUrls.map(async (url) => {
        try {
          const page = await this.getJson(url, cacheTtlSeconds);
          return { page, url };
        } catch {
          return null;
        }
      }),
    );

    for (const childPage of childPages) {
      if (!childPage) continue;
      addPageReference(childPage.page.data, childPage.url);
      addReferences(childPage.page.data.references);
    }

    return [...references.values()];
  }

  private childCollectionUrls(data: AppleDocJson, frameworkPath: string): string[] {
    const urls = new Set<string>();
    const sections = [
      ...(data.topicSections ?? []),
      ...(data.sections ?? []),
      ...(data.seeAlsoSections ?? []),
    ];

    for (const section of sections) {
      for (const identifier of section.identifiers ?? []) {
        const reference = data.references?.[identifier];
        if (!reference?.url) continue;
        if (!reference.url.toLowerCase().startsWith(frameworkPath.toLowerCase())) continue;
        if (reference.kind !== "article" && reference.role !== "collectionGroup") continue;
        urls.add(reference.url);
      }
    }

    return [...urls];
  }
}
