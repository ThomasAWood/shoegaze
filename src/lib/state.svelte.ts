import type { Clip, EncodeOpts, EffectOpts, EngineState, ExportResult, Source } from './types';
import { probeVideo } from './probe';
import { sanitizeStem } from './time';
import { ensureEngine } from './ffmpeg';

let seq = 0;
export function uid(): string {
  return `id${++seq}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * The whole app state, in one place (Svelte 5 runes in a .svelte.ts module).
 * Components read from `app` directly and mutate via the helpers below.
 */
export const app = $state({
  sources: [] as Source[],
  clips: [] as Clip[],
  selectedId: null as string | null,

  /** Blur/dim values, shared by the live preview and the export command. */
  effects: { blur: 8, dim: 0 } as EffectOpts,
  encode: { crf: 24 } as EncodeOpts,

  engine: 'idle' as EngineState,
  engineError: '',

  exporting: false,
  cancelled: false,
  progress: { done: 0, total: 0, current: '', ratio: 0 },
  results: {} as Record<string, ExportResult>,
  error: '',
  logs: [] as string[],
});

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|mts|m2ts)$/i;

export function isVideoFile(f: File): boolean {
  return f.type.startsWith('video/') || VIDEO_EXT.test(f.name);
}

/** Probe each file and add it as a source. Also warms the wasm encoder. */
export async function addFiles(files: File[]): Promise<void> {
  const vids = files.filter(isVideoFile);
  if (vids.length === 0) {
    app.error = 'None of those files look like video.';
    return;
  }
  app.error = '';
  for (const file of vids) {
    const url = URL.createObjectURL(file);
    try {
      const probe = await probeVideo(url);
      app.sources.push({
        id: uid(),
        name: file.name,
        file,
        url,
        size: file.size,
        ...probe,
      });
      app.selectedId ??= app.sources[app.sources.length - 1].id;
    } catch (e) {
      URL.revokeObjectURL(url);
      app.error = `${file.name}: ${e instanceof Error ? e.message : 'could not be read'}.`;
    }
  }
  // Start loading the ~30MB wasm core now so Export doesn't wait for it later.
  ensureEngine().catch(() => {});
}

export function selectSource(id: string): void {
  app.selectedId = id;
}

export function removeSource(id: string): void {
  if (app.exporting) {
    app.error = 'Wait for the export to finish (or cancel it) first.';
    return;
  }
  const i = app.sources.findIndex((s) => s.id === id);
  if (i === -1) return;
  URL.revokeObjectURL(app.sources[i].url);
  app.sources.splice(i, 1);
  for (const c of app.clips.filter((c) => c.sourceId === id)) removeClip(c.id);
  if (app.selectedId === id) {
    app.selectedId = app.sources[Math.min(i, app.sources.length - 1)]?.id ?? null;
  }
}

/** Queue a trimmed selection. Returns the label it was given. */
export function addClip(sourceId: string, start: number, end: number): string {
  const source = app.sources.find((s) => s.id === sourceId);
  if (!source) return '';
  const count = app.clips.filter((c) => c.sourceId === sourceId).length;
  const base = sanitizeStem(source.name);
  const label = count === 0 ? base : `${base}-${count + 1}`;
  app.clips.push({ id: uid(), sourceId, label, start, end });
  return label;
}

export function removeClip(id: string): void {
  if (app.exporting) {
    app.error = 'Wait for the export to finish (or cancel it) first.';
    return;
  }
  const i = app.clips.findIndex((c) => c.id === id);
  if (i === -1) return;
  const result = app.results[id];
  if (result) URL.revokeObjectURL(result.url);
  delete app.results[id];
  app.clips.splice(i, 1);
}

export function setEffect<K extends keyof EffectOpts>(key: K, value: number): void {
  app.effects[key] = value;
}
