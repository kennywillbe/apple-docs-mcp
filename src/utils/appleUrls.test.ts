import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDocPath, resolveAppleDocUrls } from "./appleUrls.js";

test("normalizeDocPath accepts Apple documentation URLs", () => {
  assert.equal(
    normalizeDocPath("https://developer.apple.com/documentation/swiftui/view/"),
    "/documentation/swiftui/view",
  );
});

test("normalizeDocPath expands bare paths under documentation", () => {
  assert.equal(normalizeDocPath("swiftui/view"), "/documentation/swiftui/view");
});

test("normalizeDocPath rejects non-Apple hosts", () => {
  assert.throws(
    () => normalizeDocPath("https://example.com/documentation/swiftui/view"),
    /Only developer\.apple\.com/,
  );
});

test("resolveAppleDocUrls builds canonical and data URLs", () => {
  const urls = resolveAppleDocUrls(
    "/documentation/swiftui/view",
    "https://developer.apple.com",
    "https://developer.apple.com/tutorials/data",
  );

  assert.equal(urls.canonicalUrl, "https://developer.apple.com/documentation/swiftui/view");
  assert.equal(
    urls.markdownDataUrl,
    "https://developer.apple.com/tutorials/data/documentation/swiftui/view.md",
  );
  assert.equal(
    urls.jsonDataUrl,
    "https://developer.apple.com/tutorials/data/documentation/swiftui/view.json",
  );
});
