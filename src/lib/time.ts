/** 73.46 -> "1:13.5" */
export function fmt(t: number): string {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

/** 2.4 -> "2.40s" */
export function fmtDur(t: number): string {
  return `${Math.max(0, t).toFixed(2)}s`;
}

/** KB/MB for file sizes. */
export function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function clamp(t: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, t));
}

/** "GX010042.MP4" -> "gx010042" — safe to use as a file name. */
export function sanitizeStem(name: string): string {
  const stem = name.replace(/\.[^.]+$/, '');
  return (
    stem
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'clip'
  );
}
