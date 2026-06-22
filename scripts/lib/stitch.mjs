import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const partialsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'partials');

// Matches the whole line (including its leading indent and trailing newline)
// so the substituted partial's own indentation isn't doubled up.
const INCLUDE_RE = /^[ \t]*<!--\s*include:(\S+)\s*-->\n?/gm;

// Replaces <!-- include:name --> markers with the matching partials/name.html
// content. Reads from disk on every call (no caching) so editing a partial
// is reflected immediately by the dev server's live reload.
export async function stitch(html) {
  const names = [...new Set([...html.matchAll(INCLUDE_RE)].map(m => m[1]))];
  const partials = await Promise.all(
    names.map(async (name) => [name, await readFile(join(partialsDir, `${name}.html`), 'utf8')])
  );
  const partialByName = new Map(partials);
  return html.replace(INCLUDE_RE, (_, name) => partialByName.get(name));
}
