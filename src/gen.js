// Regenerates dist/ from tokens.json and the vendored font. Run it through `mise run gen`;
// check-generated (and CI) catch a dist/ whose text files are out of date, and the tests catch
// stale images.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DIST_DIR, build, readSources } from './assets.js';

const root = join(import.meta.dirname, '..');
const dist = join(root, DIST_DIR);
const files = build(readSources(root));

rmSync(dist, { recursive: true, force: true });
for (const [name, data] of files) {
	mkdirSync(dirname(join(dist, name)), { recursive: true });
	writeFileSync(join(dist, name), data);
}
