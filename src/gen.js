// Regenerates dist/ from tokens.json and the vendored font. Run it through `mise run gen`;
// check-generated (and CI) catch a dist/ whose text files are out of date, and the tests catch
// stale images.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR, FONT_FILE, TOKENS_FILE, build } from './assets.js';

const root = join(import.meta.dirname, '..');
const dist = join(root, DIST_DIR);
const files = build(
	readFileSync(join(root, TOKENS_FILE), 'utf8'),
	readFileSync(join(root, FONT_FILE))
);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const [name, data] of files) {
	writeFileSync(join(dist, name), data);
}
