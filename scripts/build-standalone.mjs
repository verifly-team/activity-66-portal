import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { build } from "esbuild";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(process.cwd(), "index.html");
let html = await readFile(resolve(distDir, "app.html"), "utf8");

const assetDir = resolve(distDir, "assets");
const assetNames = await readdir(assetDir).catch(() => []);
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

// 单文件预览从 file:// 打开，外置资源必须先变成 data URI 才有意义。
// 打包产物里图片是 new URL("x.png", import.meta.url) 形式，CSS 里则是 url(./assets/x)。
const assetData = new Map();
for (const name of assetNames) {
  const mime = mimeByExtension.get(extname(name).toLowerCase());
  if (!mime) continue;

  const data = await readFile(resolve(assetDir, name));
  assetData.set(name, `data:${mime};base64,${data.toString("base64")}`);
}

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

const stylesheetTags = html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? [];
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

  // Two HTML entries share React through a Rollup chunk, so the app bundle
  // still contains a relative import after Vite finishes. Bundle that chunk
  // back into the entry before the tag goes inline; relative ESM imports do
  // not work when the file is opened through file://.
  const bundled = await build({
    entryPoints: [resolve(distDir, src.replace(/^\.\//, ""))],
    bundle: true,
    write: false,
    format: "esm",
    target: ["es2020"],
    minify: true,
    legalComments: "none",
  });
  const script = await inlineAssets(
    bundled.outputFiles[0].text,
  );
  const escapedScript = script.replace(/<\/script/gi, "<\\/script");
  html = html.replace(
    tag,
    () => `<script type="module">\n${escapedScript}\n</script>`,
  );
}

html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");
html = html.replace(
  "<head>",
  `<head>
    <script>
      if (location.protocol !== "file:") location.replace("/app.html");
    </script>`,
);

await writeFile(outputPath, html);
console.log(`Wrote standalone file:// entry to ${outputPath}`);
