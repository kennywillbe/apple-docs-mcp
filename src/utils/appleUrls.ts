import type { DocContentFormat, ResolvedDocUrls } from "../types/apple.js";

const appleHosts = new Set(["developer.apple.com", "docs.developer.apple.com"]);

export function isAppleDeveloperUrl(url: string): boolean {
  try {
    return appleHosts.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function normalizeDocPath(urlOrPath: string): string {
  const input = String(urlOrPath).trim();
  if (!input) throw new Error("url_or_path is required.");

  if (/^https?:\/\//i.test(input)) {
    if (!isAppleDeveloperUrl(input)) {
      throw new Error("Only developer.apple.com documentation URLs are supported.");
    }
    return new URL(input).pathname.replace(/\/+$/, "");
  }

  const pathValue = input.startsWith("/") ? input : `/documentation/${input}`;
  return pathValue.replace(/\/+$/, "");
}

export function resolveAppleDocUrls(
  urlOrPath: string,
  appleDocsOrigin: string,
  appleDocsDataBase: string,
): ResolvedDocUrls {
  const normalizedPath = normalizeDocPath(urlOrPath);
  const canonicalPath = canonicalPathFor(normalizedPath);

  return {
    input: urlOrPath,
    normalizedPath,
    canonicalUrl: `${appleDocsOrigin}${canonicalPath}`,
    markdownDataUrl: dataUrlForPath(normalizedPath, "markdown", appleDocsOrigin, appleDocsDataBase),
    jsonDataUrl: dataUrlForPath(normalizedPath, "json", appleDocsOrigin, appleDocsDataBase),
  };
}

export function dataUrlForPath(
  path: string,
  format: DocContentFormat,
  appleDocsOrigin: string,
  appleDocsDataBase: string,
): string {
  if (path.startsWith("/tutorials/data/") && (path.endsWith(".md") || path.endsWith(".json"))) {
    return `${appleDocsOrigin}${path}`;
  }

  const extension = format === "json" ? "json" : "md";
  if (
    path.startsWith("/documentation/") ||
    path.startsWith("/tutorials/") ||
    path.startsWith("/design/")
  ) {
    return `${appleDocsDataBase}${path}.${extension}`;
  }

  throw new Error(
    "Unsupported Apple docs path. Use a /documentation/... path or a developer.apple.com documentation URL.",
  );
}

function canonicalPathFor(path: string): string {
  if (!path.startsWith("/tutorials/data/")) return path;
  return path.replace(/^\/tutorials\/data/, "").replace(/\.(md|json)$/i, "");
}
