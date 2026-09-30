import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
// Vite bundles the ffmpeg worker (and its relative imports) and hands back its URL.
import ffmpegWorkerUrl from '@ffmpeg/ffmpeg/worker?worker&url';
import { app } from './state.svelte';

/**
 * The wasm ffmpeg engine, loaded once and reused. The core files are copied
 * into public/ by scripts/sync-ffmpeg.mjs (runs on npm install), so this
 * works fully offline — nothing is fetched from a CDN.
 */

let instance: FFmpeg | null = null;

export async function ensureEngine(): Promise<FFmpeg> {
  if (instance) return instance;
  app.engine = 'loading';
  app.engineError = '';
  try {
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => {
      app.logs.push(message);
      if (app.logs.length > 400) app.logs.splice(0, app.logs.length - 400);
    });
    ff.on('progress', ({ progress }) => {
      // Progress can be negative or > 1 on odd files; clamp it.
      if (app.exporting) app.progress.ratio = Math.min(1, Math.max(0, progress));
    });
    await ff.load({
      coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      classWorkerURL: ffmpegWorkerUrl,
    });
    instance = ff;
    app.engine = 'ready';
    return ff;
  } catch (e) {
    app.engine = 'error';
    app.engineError = e instanceof Error ? e.message : String(e);
    instance = null;
    throw e;
  }
}

/** Hard-stop the worker (cancel). The engine reloads on next use. */
export function resetEngine(): void {
  try {
    instance?.terminate();
  } catch {
    /* already dead */
  }
  instance = null;
  app.engine = 'idle';
}
