import { copyFile, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const distDir = resolve(process.cwd(), "dist");

try {
  await stat(resolve(distDir, "app.html"));
} catch {
  throw new Error("dist/app.html not found; run `npm run build` first");
}

// CI 会在发布前把 app.html 复制成站点根入口；本地直接跑 build 后也补齐，
// 让同一个体检命令在两种环境下检查的是同一套产物。
try {
  await stat(resolve(distDir, "index.html"));
} catch {
  await copyFile(resolve(distDir, "app.html"), resolve(distDir, "index.html"));
}

try {
  const revision = await readFile(resolve(distDir, "REVISION"), "utf8");
  if (!revision.trim()) throw new Error("empty");
} catch {
  await writeFile(resolve(distDir, "REVISION"), "local\n");
}

const requiredFiles = [
  "index.html",
  "app.html",
  "apply.html",
  "faq.html",
  "favicon.png",
  "66th-merchant-application-form.docx",
  "REVISION",
];

for (const file of requiredFiles) {
  const info = await stat(resolve(distDir, file)).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    throw new Error(`Missing or empty build file: ${file}`);
  }
}

const revision = (await readFile(resolve(distDir, "REVISION"), "utf8")).trim();
if (!revision) throw new Error("dist/REVISION is empty");
if (process.env.GITHUB_SHA && revision !== process.env.GITHUB_SHA) {
  throw new Error(`REVISION ${revision} does not match ${process.env.GITHUB_SHA}`);
}

const mimeByExtension = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".txt", "text/plain; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://127.0.0.1").pathname,
    );
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = resolve(distDir, relativePath);
    if (!filePath.startsWith(`${distDir}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type":
        mimeByExtension.get(extname(filePath).toLowerCase()) ??
        "application/octet-stream",
      "Content-Length": body.byteLength,
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once("error", rejectListen);
  server.listen(0, "127.0.0.1", resolveListen);
});

const address = server.address();
if (!address || typeof address === "string") {
  server.close();
  throw new Error("Could not start static verification server");
}
const base = `http://127.0.0.1:${address.port}`;

function collectLocalReferences(source, pageUrl, patterns) {
  const references = new Set();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1];
      if (
        !value ||
        value.startsWith("data:") ||
        value.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/i.test(value)
      ) {
        continue;
      }
      references.add(new URL(value, pageUrl).pathname);
    }
  }
  return references;
}

const allJavaScript = [];

async function fetchOk(pathname) {
  const response = await fetch(new URL(pathname, base));
  if (!response.ok) {
    throw new Error(`GET ${pathname} -> ${response.status}`);
  }
  return response;
}

try {
  for (const page of ["/", "/app.html", "/apply.html", "/faq.html"]) {
    const response = await fetchOk(page);
    const html = await response.text();
    if (!html.includes('id="root"') || !html.includes("<script")) {
      throw new Error(`${page} is not a renderable Vite page`);
    }
    if (/["']\/src\//.test(html)) {
      throw new Error(`${page} still references source files`);
    }

    const pageUrl = new URL(page, base);
    const references = collectLocalReferences(html, pageUrl, [
      /<script\b[^>]*\bsrc="([^"]+)"/g,
      /<link\b[^>]*\bhref="([^"]+)"/g,
    ]);
    if (!references.size) {
      throw new Error(`${page} has no referenced assets`);
    }

    for (const reference of references) {
      const asset = await fetchOk(reference);
      const body = await asset.text();
      if (!body) throw new Error(`${reference} is empty`);
      if (reference.endsWith(".js")) allJavaScript.push(body);
      if (reference.endsWith(".css")) {
        const cssReferences = collectLocalReferences(
          body,
          new URL(reference, base),
          [/url\(\s*["']?([^"')]+)["']?\s*\)/g],
        );
        for (const cssReference of cssReferences) {
          await fetchOk(cssReference);
        }
      }
    }
    console.log(`ok   ${page}`);
  }

  const bundle = allJavaScript.join("\n");
  for (const endpoint of [
    "api/v1/form-schema",
    "api/v1/uploads",
    "api/v1/applications",
  ]) {
    if (!bundle.includes(endpoint)) {
      throw new Error(`Apply bundle is missing ${endpoint}`);
    }
  }

  const liveRevision = (await (await fetchOk("/REVISION")).text()).trim();
  if (liveRevision !== revision) {
    throw new Error(`Served REVISION ${liveRevision} does not match ${revision}`);
  }
  console.log(`ok   assets and API endpoints (${revision.slice(0, 12)})`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
