export function trimToMaxChars(text: string, maxChars?: number): string {
  if (!maxChars || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Truncated to ${maxChars} characters]`;
}

export function compactWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
