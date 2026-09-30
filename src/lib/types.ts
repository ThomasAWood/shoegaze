/** A raw footage file added to the tool. */
export interface Source {
  id: string;
  /** Original file name, e.g. "GX010042.MP4". */
  name: string;
  file: File;
  /** objectURL for <video> playback. */
  url: string;
  /** Seconds. */
  duration: number;
  width: number;
  height: number;
  size: number;
  /** Small JPEG dataURL of an early frame, for the sidebar. */
  thumb: string;
}

/** One trimmed selection queued for export. */
export interface Clip {
  id: string;
  sourceId: string;
  /** File name without extension; editable. */
  label: string;
  /** Seconds. */
  start: number;
  /** Seconds. */
  end: number;
}

export interface ExportResult {
  url: string;
  size: number;
  blob: Blob;
}

export interface EffectOpts {
  /** Gaussian sigma in px, matches the site's CSS blur(Npx). */
  blur: number;
  /** Black scrim opacity 0-1, matches the site's dim prop. */
  dim: number;
}

export interface EncodeOpts {
  /** x264 CRF. Lower = better quality and bigger files. */
  crf: number;
}

export type EngineState = 'idle' | 'loading' | 'ready' | 'error';
