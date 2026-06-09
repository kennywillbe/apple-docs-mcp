import assert from "node:assert/strict";
import test from "node:test";
import { annotateSearchSnippet } from "./searchSnippets.js";

test("annotateSearchSnippet reports matched fields", () => {
  const annotation = annotateSearchSnippet("App Intent", [
    { name: "title", value: "AppIntent" },
    { name: "description", value: "Make app actions available to the system." },
  ]);

  assert.deepEqual(annotation.matchedFields, ["title", "description"]);
  assert.match(annotation.snippet, /AppIntent/i);
});

test("annotateSearchSnippet falls back to compact snippet without matches", () => {
  const annotation = annotateSearchSnippet("widget", [
    { name: "title", value: "SwiftUI View" },
    { name: "description", value: "A type that represents part of an app interface." },
  ]);

  assert.deepEqual(annotation.matchedFields, []);
  assert.match(annotation.snippet, /SwiftUI View/);
});
