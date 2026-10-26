import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const distDir = resolve(process.cwd(), "dist");
const outputPath = resolve(process.cwd(), "index.html");
let html = await readFile(resolve(distDir, "app.html"), "utf8");

const stylesheetTags = html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? [];
for (const tag of stylesheetTags) {
  const href = tag.match(/href="([^"]+)"/)?.[1];
  if (!href) continue;

  const css = await readFile(
    resolve(distDir, href.replace(/^\.\//, "")),
    "utf8",
  );
  html = html.replace(tag, () => `<style>\n${css}\n</style>`);
}

const scriptTags =
  html.match(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g) ?? [];
for (const tag of scriptTags) {
  const src = tag.match(/src="([^"]+)"/)?.[1];
  if (!src) continue;

  const script = await readFile(
    resolve(distDir, src.replace(/^\.\//, "")),
    "utf8",
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
