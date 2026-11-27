import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { incrementPageView } from "./visitor-counter.mjs";

const appDirectory = fileURLToPath(new URL(".", import.meta.url));
const staticDirectory = resolve(appDirectory, "dist");
const namespace = process.env.POD_NAMESPACE;
const configMapName = "kmu-room-finder-visitor-counts";
const serviceAccountDirectory = "/var/run/secrets/kubernetes.io/serviceaccount";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function kubernetesRequest(method, body) {
  if (!namespace || !/^[a-z0-9-]+$/.test(namespace)) {
    throw new Error("Pod namespace is not configured for the visitor counter.");
  }

  const requestPath = `/api/v1/namespaces/${namespace}/configmaps/${configMapName}`;
  return Promise.all([
    readFile(join(serviceAccountDirectory, "token"), "utf8"),
    readFile(join(serviceAccountDirectory, "ca.crt")),
  ]).then(([token, ca]) => {
    const payload = body ? Buffer.from(JSON.stringify(body)) : undefined;

    return new Promise((resolveRequest, rejectRequest) => {
      const request = httpsRequest(
        {
          hostname: "kubernetes.default.svc",
          port: 443,
          path: requestPath,
          method,
          ca,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token.trim()}`,
            ...(payload
              ? {
                  "Content-Length": payload.length,
                  "Content-Type": "application/json",
                }
              : {}),
          },
        },
        (response) => {
          let responseBody = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            responseBody += chunk;
          });
          response.on("end", () => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
              const error = new Error(
                `Kubernetes API returned HTTP ${response.statusCode}.`,
              );
              error.statusCode = response.statusCode;
              rejectRequest(error);
              return;
            }

            try {
              resolveRequest(JSON.parse(responseBody));
            } catch (error) {
              rejectRequest(new Error("Kubernetes API returned invalid JSON.", { cause: error }));
            }
          });
        },
      );

      request.setTimeout(5000, () => {
        request.destroy(new Error("Kubernetes API request timed out."));
      });
      request.on("error", rejectRequest);
      if (payload) request.write(payload);
      request.end();
    });
  });
}

const counterClient = {
  get: () => kubernetesRequest("GET"),
  update: (configMap) => kubernetesRequest("PUT", configMap),
};

async function getStaticFile(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const filePath = resolve(staticDirectory, `.${decodedPath}`);
  if (filePath !== staticDirectory && !filePath.startsWith(`${staticDirectory}${sep}`)) {
    const error = new Error("Requested path is outside the static directory.");
    error.statusCode = 403;
    throw error;
  }

  try {
    const info = await stat(filePath);
    return info.isDirectory() ? join(filePath, "index.html") : filePath;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    if (extname(filePath)) {
      const notFound = new Error("Static file was not found.");
      notFound.statusCode = 404;
      throw notFound;
    }
    return join(staticDirectory, "index.html");
  }
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : "ok");
    return;
  }

  if (pathname === "/runtime-config.js" && (request.method === "GET" || request.method === "HEAD")) {
    const config = JSON.stringify({
      kakaoJsKey: process.env.VITE_KAKAO_JS_KEY ?? "",
    });
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(
      request.method === "HEAD" ? undefined : `window.__APP_CONFIG__ = ${config};`,
    );
    return;
  }

  if (pathname === "/api/visits") {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    try {
      sendJson(response, 200, await incrementPageView(counterClient));
    } catch (error) {
      console.error("Visitor counter request failed:", error.message);
      sendJson(response, 503, { error: "Visit counts are temporarily unavailable." });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD, POST" }).end();
    return;
  }

  let filePath;
  try {
    filePath = await getStaticFile(pathname);
  } catch (error) {
    response.writeHead(error.statusCode ?? 500).end();
    return;
  }

  const extension = extname(filePath);
  const isHashedAsset = filePath.startsWith(join(staticDirectory, "assets") + sep);
  response.writeHead(200, {
    "Cache-Control": isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache",
    "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", (error) => {
    console.error("Static file read failed:", error.message);
    if (!response.headersSent) response.writeHead(500).end();
    else response.destroy(error);
  });
  stream.pipe(response);
});

const port = Number(process.env.PORT ?? 8080);
server.listen(port, "0.0.0.0", () => {
  console.log(`KMU Room Finder listening on port ${port}.`);
});
