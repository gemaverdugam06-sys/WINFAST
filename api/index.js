import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverModule = null;

async function loadServer() {
  if (serverModule) return serverModule;

  try {
    serverModule = (await import("../dist/server/server.js")).default;
  } catch (e1) {
    try {
      const absolutePath = join(__dirname, "../dist/server/server.js");
      const absoluteFileUrl = `file://${absolutePath}`;
      serverModule = (await import(absoluteFileUrl)).default;
    } catch (e2) {
      console.error("[Handler] Failed:", e1?.message);
      throw new Error("Could not load server");
    }
  }
  return serverModule;
}

async function getRequestBody(req) {
  if (["GET", "HEAD", "DELETE"].includes(req.method)) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}

function serveStatic(filePath, res) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return false;
    }
    const content = fs.readFileSync(filePath);
    const ext = filePath.split(".").pop();
    const mimeTypes = {
      js: "application/javascript",
      css: "text/css",
      json: "application/json",
      ico: "image/x-icon",
      svg: "image/svg+xml",
    };
    res.statusCode = 200;
    res.setHeader("content-type", mimeTypes[ext] || "application/octet-stream");
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.end(content);
    return true;
  } catch (e) {
    console.error("[serveStatic]", e?.message);
    return false;
  }
}

export default async function handler(req, res) {
  try {
    const url = req.url ?? "/";

    // Try to serve static assets
    if (url.startsWith("/assets/")) {
      const assetUrl = decodeURIComponent(url.split("?")[0]);
      const assetPath = join(__dirname, "../dist/client", assetUrl);
      if (serveStatic(assetPath, res)) {
        return;
      }
    }

    if (
      url === "/favicon.svg" ||
      url === "/favicon.ico" ||
      url === "/manifest.webmanifest" ||
      url === "/sw.js"
    ) {
      const clientPath = join(__dirname, "../dist/client", url.slice(1));
      if (serveStatic(clientPath, res)) return;
    }

    // Delegate to SSR server
    const server = await loadServer();
    const protocol = req.headers["x-forwarded-proto"] ?? "https";
    const host = req.headers.host ?? "localhost";
    const fullUrl = `${protocol}://${host}${url}`;

    const body = await getRequestBody(req);
    const request = new Request(fullUrl, {
      method: req.method ?? "GET",
      headers: req.headers,
      body: body ? body : undefined,
    });

    const response = await server.fetch(request, {}, {});
    const responseBody = await response.text();

    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      if (value) {
        res.setHeader(key, value);
      }
    }

    res.end(responseBody);
  } catch (error) {
    console.error("[handler]", error?.message);
    res.statusCode = 500;
    res.setHeader("content-type", "text/html");
    res.end("<h1>Error</h1>");
  }
}
