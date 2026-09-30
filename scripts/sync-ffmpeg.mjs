// Copies the ffmpeg.wasm core from node_modules into public/ so the app can
// load it without any bundler magic and fully offline. The worker script is
// NOT copied — it has relative imports, so Vite bundles it via `?worker&url`.
// Runs automatically on `npm install` (postinstall hook).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

const files = [
  ['node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', 'ffmpeg-core.js'],
  ['node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', 'ffmpeg-core.wasm'],
];

for (const [from, to] of files) {
  try {
    copyFileSync(join(root, from), join(pub, to));
    console.log(`copied ${from} -> public/${to}`);
  } catch (e) {
    console.warn(`could not copy ${from}: ${e.message}`);
  }
}
