export interface MarkdownHeading {
  level: number;
  title: string;
  anchor: string;
  line: number;
}

export function parseMarkdownMetadata(markdown: string): Record<string, unknown> | null {
  const match = markdown.match(/^<!--\s*([\s\S]*?)\s*-->/);
  if (!match) return null;

  try {
    return JSON.parse(match[1] ?? "") as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function stripMarkdownMetadata(markdown: string): string {
  return markdown.replace(/^<!--\s*[\s\S]*?\s*-->\s*/, "");
}

export function extractMarkdownHeadings(markdown: string, maxHeadings: number): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const lines = stripMarkdownMetadata(markdown).split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const title = (match[2] ?? "").replace(/`/g, "").trim();
    headings.push({
      level: (match[1] ?? "").length,
      title,
      anchor: slugifyHeading(title),
      line: index + 1,
    });

    if (headings.length >= maxHeadings) break;
  }

  return headings;
}

function slugifyHeading(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
