import assert from "node:assert/strict";
import test from "node:test";
import {
  bestExactReference,
  candidateSymbolPaths,
  scoreKeyword,
  scoreTechnology,
  tokenize,
} from "./appleDocMatching.js";
import type { AppleReference, AppleTechnologyResult } from "../types/apple.js";

test("tokenize includes camel-case parts and compact form", () => {
  assert.deepEqual(
    tokenize("AppIntent perform"),
    ["appintent", "app", "intent", "perform"],
  );
});

test("candidateSymbolPaths creates dashed and compact candidates", () => {
  assert.deepEqual(candidateSymbolPaths("/documentation/appintents", "Open Intent"), [
    "/documentation/appintents/open-intent",
    "/documentation/appintents/openintent",
  ]);
});

test("scoreTechnology prefers exact title and path matches", () => {
  const technology: AppleTechnologyResult = {
    title: "App Intents",
    identifier: "doc://appintents",
    path: "/documentation/appintents",
    url: "https://developer.apple.com/documentation/appintents",
    kind: "symbol",
    role: "collection",
    abstract: "Make app features available to the system.",
  };

  assert.equal(scoreTechnology(technology, "App Intents"), 0);
  assert.equal(scoreTechnology(technology, "/documentation/appintents"), 0);
  assert.equal(scoreTechnology(technology, "appintents"), 1);
});

test("bestExactReference prefers in-technology symbols", () => {
  const references: AppleReference[] = [
    {
      title: "Perform",
      url: "/documentation/other/perform",
      kind: "symbol",
    },
    {
      title: "perform()",
      url: "/documentation/appintents/appintent/perform()",
      kind: "symbol",
    },
  ];

  assert.equal(
    bestExactReference(references, "perform()", "/documentation/appintents")?.url,
    "/documentation/appintents/appintent/perform()",
  );
});

test("scoreKeyword uses title, path, and abstract matches", () => {
  assert.ok(
    scoreKeyword(
      "OpenURLIntent",
      "/documentation/appintents/openurlintent",
      "Opens a URL from an app intent.",
      "open url",
      ["open", "url"],
    ) > 0,
  );
});
