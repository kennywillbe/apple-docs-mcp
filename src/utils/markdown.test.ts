import assert from "node:assert/strict";
import test from "node:test";
import { extractMarkdownHeadings, parseMarkdownMetadata, stripMarkdownMetadata } from "./markdown.js";

const markdown = `<!--
{"title":"View","framework":"SwiftUI","role":"Protocol"}
-->

# View

## Overview

### Creating views
`;

test("parseMarkdownMetadata reads Apple markdown front comment", () => {
  assert.deepEqual(parseMarkdownMetadata(markdown), {
    title: "View",
    framework: "SwiftUI",
    role: "Protocol",
  });
});

test("stripMarkdownMetadata removes leading JSON comment", () => {
  assert.ok(stripMarkdownMetadata(markdown).startsWith("# View"));
});

test("extractMarkdownHeadings returns heading levels and anchors", () => {
  assert.deepEqual(extractMarkdownHeadings(markdown, 3), [
    { level: 1, title: "View", anchor: "view", line: 1 },
    { level: 2, title: "Overview", anchor: "overview", line: 3 },
    { level: 3, title: "Creating views", anchor: "creating-views", line: 5 },
  ]);
});
