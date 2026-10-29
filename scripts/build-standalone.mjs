import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { build } from "esbuild";

const distDir = resolve(process.cwd(), "dist");
const publicDir = resolve(process.cwd(), "public");
const assetDir = resolve(distDir, "assets");

const mimeByExtension = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

const toDataUrl = (mime, data) =>
  `data:${mime};base64,${data.toString("base64")}`;

// 单文件预览从 file:// 打开，外置资源必须先变成 data URI 才有意义。
// 打包产物里图片是 new URL("x.png", import.meta.url) 形式，CSS 里则是 url(./assets/x)。
const assetData = new Map();
for (const name of await readdir(assetDir).catch(() => [])) {
  const mime = mimeByExtension.get(extname(name).toLowerCase());
  if (!mime) continue;

  const data = await readFile(resolve(assetDir, name));
  assetData.set(name, toDataUrl(mime, data));
}

const faviconData = toDataUrl(
  "image/png",
  await readFile(resolve(publicDir, "favicon.png")),
);
const docxData = toDataUrl(
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  await readFile(resolve(publicDir, "66th-merchant-application-form.docx")),
);

const inlineAssets = (source) =>
  source
    .replace(
      /new URL\(\s*(["'`])(?:\.\/)?([^"'`]+)\1\s*,\s*import\.meta\.url\s*\)(?:\.href)?/g,
      (match, _quote, name) =>
        assetData.has(name) ? `"${assetData.get(name)}"` : match,
    )
    .replace(
      /url\(\s*(?:\.\/)?assets\/([^)\s"']+)\s*\)/g,
      (match, name) =>
        assetData.has(name) ? `url(${assetData.get(name)})` : match,
    )
    .replace(
      /(["'])(?:\.\/)?assets\/([^"']+)\1/g,
      (match, quote, name) =>
        assetData.has(name)
          ? `${quote}${assetData.get(name)}${quote}`
          : match,
    );

async function buildStandalone(entry, output, { inlineDocx = false } = {}) {
  let html = await readFile(resolve(distDir, entry), "utf8");
  html = html.replace("<html", '<html data-standalone="true"');

  const stylesheetTags =
    html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? [];
  for (const tag of stylesheetTags) {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;

    const css = await inlineAssets(
      await readFile(resolve(distDir, href.replace(/^\.\//, "")), "utf8"),
    );
    html = html.replace(tag, () => `<style>\n${css}\n</style>`);
  }

  const scriptTags =
    html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g) ?? [];
  for (const tag of scriptTags) {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (!src) continue;

    // Shared chunks still contain a relative import after Vite finishes.
    // Bundle them back into the entry so file:// can execute the script.
    const bundled = await build({
      entryPoints: [resolve(distDir, src.replace(/^\.\//, ""))],
      bundle: true,
      write: false,
      format: "esm",
      target: ["es2020"],
      minify: true,
      legalComments: "none",
    });
    let script = await inlineAssets(bundled.outputFiles[0].text);
    if (inlineDocx) {
      script = script.replaceAll(
        "./66th-merchant-application-form.docx",
        docxData,
      );
    }
    const escapedScript = script.replace(/<\/script/gi, "<\\/script");
    html = html.replace(
      tag,
      () => `<script type="module">\n${escapedScript}\n</script>`,
    );
  }

  html = html.replace(
    /<link\b[^>]*\brel="icon"[^>]*>/,
    `<link rel="icon" type="image/png" href="${faviconData}" />`,
  );
  html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");

  await writeFile(resolve(output), html);
  console.log(`Wrote standalone entry ${output}`);
}

await buildStandalone("app.html", "index.html");
await buildStandalone("apply.html", "apply-standalone.html", {
  inlineDocx: true,
});
