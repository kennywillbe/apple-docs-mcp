import type { AppleContentNode, AppleReference } from "../types/apple.js";
import { compactWhitespace } from "./text.js";

export function contentNodesToText(nodes: AppleContentNode[] | undefined): string {
  if (!nodes?.length) return "";
  return compactWhitespace(nodes.map(contentNodeToText).filter(Boolean).join(" "));
}

export function referenceAbstractToText(reference: AppleReference | undefined): string {
  return contentNodesToText(reference?.abstract);
}

function contentNodeToText(node: AppleContentNode): string {
  if (typeof node.text === "string") return node.text;
  if (typeof node.code === "string") return node.code;
  if (Array.isArray(node.inlineContent)) return node.inlineContent.map(contentNodeToText).join("");
  if (Array.isArray(node.content)) return node.content.map(contentNodeToText).join(" ");
  return "";
}
