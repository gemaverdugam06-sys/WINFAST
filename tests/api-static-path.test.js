import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { resolveClientAssetPath } from "../api/index.js";

const clientRoot = resolve("dist/client");

test("resolves static assets inside the client output directory", () => {
  assert.equal(
    resolveClientAssetPath("/assets/app.js", clientRoot),
    resolve(clientRoot, "assets/app.js"),
  );
});

test("rejects direct and URL-encoded traversal outside the client output directory", () => {
  assert.equal(resolveClientAssetPath("/assets/../../server/server.js", clientRoot), null);
  assert.equal(resolveClientAssetPath("/assets/%2e%2e/%2e%2e/server/server.js", clientRoot), null);
});
