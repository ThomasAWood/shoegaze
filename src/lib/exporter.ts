import { fetchFile } from '@ffmpeg/util';
import { ensureEngine, resetEngine } from './ffmpeg';
import { app } from './state.svelte';
import type { Clip, EncodeOpts, EffectOpts, Source } from './types';

class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** Site standard — the served clips are 1080p. */
const MAX_HEIGHT = 1080;

/** ffmpeg-safe input file name for a source, keeping its container ext. */
function inputName(source: Source): string {
  const m = /\.(mp4|mov|m4v|webm|mkv|avi|mts|m2ts)$/i.exec(source.name);
  return `input-${source.id}.${m ? m[1].toLowerCase() : 'mp4'}`;
}

/**
 * Trim + bake effects + encode to a small web H.264 file.
 *
 * Filter order matters: scale down first (cheaper, and blur is measured on
 * the export resolution), then gaussian blur, then the black scrim.
 * colorchannelmixer scales each channel by (1 - dim), which is exactly what
 * the site's black scrim at opacity `dim` does.
 */
export function buildArgs(
  clip: Clip,
  source: Source,
  encode: EncodeOpts,
  effects: EffectOpts,
): { args: string[]; outName: string } {
  const outName = `${clip.label}.mp4`;
  const vf: string[] = [];

  if (source.height > MAX_HEIGHT) {
    const h = even(MAX_HEIGHT);
    const w = even((h * source.width) / source.height);
    vf.push(`scale=${w}:${h}`);
  }
  if (effects.blur > 0) vf.push(`gblur=sigma=${effects.blur}`);
  if (effects.dim > 0) {
    const k = (1 - effects.dim).toFixed(4);
    vf.push(`colorchannelmixer=rr=${k}:gg=${k}:bb=${k}`);
  }

  const args = ['-ss', clip.start.toFixed(3), '-i', inputName(source), '-t', (clip.end - clip.start).toFixed(3)];
  if (vf.length > 0) args.push('-vf', vf.join(','));
  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', String(encode.crf),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    // The site plays everything muted; dropping audio/data tracks shrinks the files.
    '-an',
    '-dn',
    outName,
  );
  return { args, outName };
}

/**
 * Export every queued clip. Sources are written into the wasm filesystem once
 * and reused for all their clips, then deleted. Results land in app.results.
 */
export async function runExport(): Promise<void> {
  if (app.exporting || app.clips.length === 0) return;
  app.exporting = true;
  app.cancelled = false;
  app.error = '';
  app.progress = { done: 0, total: app.clips.length, current: '', ratio: 0 };

  try {
    const ff = await ensureEngine();

    // Group clips by source, preserving the queue's order.
    const groups = new Map<string, Clip[]>();
    for (const clip of app.clips) {
      const g = groups.get(clip.sourceId);
      if (g) g.push(clip);
      else groups.set(clip.sourceId, [clip]);
    }

    for (const [sourceId, clips] of groups) {
      if (app.cancelled) throw new Cancelled();
      const source = app.sources.find((s) => s.id === sourceId);
      if (!source) continue;

      const name = inputName(source);
      app.progress.current = `reading ${source.name}`;
      await ff.writeFile(name, await fetchFile(source.file));

      for (const clip of clips) {
        if (app.cancelled) throw new Cancelled();
        app.progress.current = clip.label;
        app.progress.ratio = 0;

        const { args, outName } = buildArgs(clip, source, app.encode, app.effects);
        await ff.exec(args);

        const data = (await ff.readFile(outName)) as Uint8Array;
        const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
        if (app.results[clip.id]) URL.revokeObjectURL(app.results[clip.id].url);
        app.results[clip.id] = { url: URL.createObjectURL(blob), size: blob.size, blob };
        await ff.deleteFile(outName);

        app.progress.done++;
        app.progress.ratio = 0;
      }

      await ff.deleteFile(name);
    }
  } catch (e) {
    if (app.cancelled || (e instanceof Error && e.message === 'called FFmpeg.terminate()')) {
      app.error = 'Export cancelled.';
    } else {
      app.error = e instanceof Error ? e.message : String(e);
      // A failed worker is often wedged; force a clean reload next time.
      resetEngine();
    }
  } finally {
    app.exporting = false;
    app.progress.current = '';
  }
}

export function cancelExport(): void {
  if (!app.exporting) return;
  app.cancelled = true;
  resetEngine();
}
