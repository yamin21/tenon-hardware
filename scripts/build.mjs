import { readFile, writeFile, mkdir, cp, readdir, rm } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { stitch } from './lib/stitch.mjs';

const root = process.cwd();
const outDir = join(root, 'dist');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

for (const name of ['css', 'js', 'assets']) {
  await cp(join(root, name), join(outDir, name), { recursive: true });
}
for (const file of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
  await cp(join(root, file), join(outDir, file));
}

const entries = await readdir(root, { withFileTypes: true });
const pages = entries.filter((e) => e.isFile() && extname(e.name) === '.html');

for (const { name } of pages) {
  const html = await readFile(join(root, name), 'utf8');
  await writeFile(join(outDir, name), await stitch(html));
}

console.log(`Built ${pages.length} pages to ${outDir}`);
