<script lang="ts">
  import { clamp } from '../lib/time';

  interface Props {
    url: string;
    duration: number;
    start: number;
    end: number;
    /** Playhead position, seconds. Two-way bound. */
    currentTime?: number;
    setStart: (t: number) => void;
    setEnd: (t: number) => void;
  }

  let { url, duration, start, end, currentTime = $bindable(0), setStart, setEnd }: Props = $props();

  const STRIP_H = 92;

  let box = $state<HTMLDivElement | null>(null);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let cssW = $state(0);
  let ready = $state(false); // thumbs drawn

  // Track the box width so thumbs regenerate on resize.
  $effect(() => {
    if (!box) return;
    const ro = new ResizeObserver(() => (cssW = box!.clientWidth));
    ro.observe(box);
    cssW = box.clientWidth;
    return () => ro.disconnect();
  });

  // (Re)generate the filmstrip whenever the file or the size changes.
  $effect(() => {
    if (!canvas || cssW <= 0 || duration <= 0) return;
    const w = cssW;
    let cancelled = false;

    canvas.width = Math.round(w * devicePixelRatio);
    canvas.height = Math.round(STRIP_H * devicePixelRatio);
    const ctx = canvas.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, STRIP_H);

    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.src = url;

    const cellCount = Math.max(4, Math.round(w / 110));
    const cellW = w / cellCount;

    const seek = (t: number) =>
      new Promise<void>((res) => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          v.removeEventListener('seeked', fin);
          clearTimeout(timer);
          res();
        };
        const timer = setTimeout(fin, 2500);
        v.addEventListener('seeked', fin);
        v.currentTime = t;
      });

    v.addEventListener('loadeddata', () => run(), { once: true });
    v.addEventListener('error', () => (cancelled = true), { once: true });

    async function run() {
      for (let i = 0; i < cellCount; i++) {
        if (cancelled) break;
        await seek((duration * (i + 0.5)) / cellCount);
        if (cancelled) break;
        const x = i * cellW;
        ctx.fillStyle = '#111';
        ctx.fillRect(x, 0, cellW, STRIP_H);
        if (v.videoWidth && v.videoHeight) {
          // object-fit: cover into the cell
          const s = Math.max(cellW / v.videoWidth, STRIP_H / v.videoHeight);
          const dw = v.videoWidth * s;
          const dh = v.videoHeight * s;
          ctx.drawImage(v, x + (cellW - dw) / 2, (STRIP_H - dh) / 2, dw, dh);
        }
      }
      if (!cancelled) ready = true;
      v.removeAttribute('src');
      v.load();
    }

    return () => {
      cancelled = true;
    };
  });

  // ---- pointer interaction: drag handles to trim, drag body to scrub ----

  let dragging = $state<'start' | 'end' | 'scrub' | null>(null);

  function tAt(clientX: number): number {
    const r = box!.getBoundingClientRect();
    return clamp(((clientX - r.left) / r.width) * duration, 0, duration);
  }

  function applyDrag(clientX: number) {
    const t = tAt(clientX);
    if (dragging === 'start') setStart(t);
    else if (dragging === 'end') setEnd(t);
    else currentTime = t;
  }

  function onDown(e: PointerEvent) {
    // Hit-test against [data-handle] rather than e.target: the visible grip is
    // an <i> child of the handle, and grabbing the grip directly used to fall
    // through to scrub mode.
    const el = (e.target as HTMLElement).closest?.('[data-handle]');
    const handle = el?.getAttribute('data-handle');
    dragging = handle === 'start' ? 'start' : handle === 'end' ? 'end' : 'scrub';
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic/unknown pointer id — dragging still works without capture */
    }
    applyDrag(e.clientX);
  }

  function onMove(e: PointerEvent) {
    if (dragging) applyDrag(e.clientX);
  }

  function onUp(e: PointerEvent) {
    // Snap the playhead to the trimmed point for a quick look at the cut.
    if (dragging === 'start') currentTime = start;
    if (dragging === 'end') currentTime = end;
    dragging = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* nothing captured */
    }
  }

  const pct = (t: number) => `${duration > 0 ? (t / duration) * 100 : 0}%`;
</script>

<div
  class="strip"
  class:dragging
  bind:this={box}
  role="slider"
  aria-label="Timeline: drag the yellow handles to trim, drag elsewhere to scrub"
  aria-valuemin={0}
  aria-valuemax={Math.round(duration * 100) / 100}
  aria-valuenow={Math.round(currentTime * 100) / 100}
  tabindex="-1"
  onpointerdown={onDown}
  onpointermove={onMove}
  onpointerup={onUp}
>
  <canvas bind:this={canvas} style:height="{STRIP_H}px"></canvas>

  {#if !ready}
    <span class="loading">reading frames…</span>
  {/if}

  <!-- dimmed regions outside the selection -->
  <div class="mask left" style:width={pct(start)}></div>
  <div class="mask right" style:left={pct(end)}></div>

  <!-- selection outline -->
  <div class="sel" style:left={pct(start)} style:width={pct(end - start)}></div>

  <!-- trim handles -->
  <div class="handle" data-handle="start" style:left={pct(start)}><i></i></div>
  <div class="handle" data-handle="end" style:left={pct(end)}><i></i></div>

  <!-- playhead -->
  <div class="playhead" style:left={pct(currentTime)}></div>
</div>

<style>
  .strip {
    position: relative;
    height: 92px;
    border-radius: 8px;
    overflow: hidden;
    background: #111;
    border: 1px solid var(--line);
    touch-action: none;
    user-select: none;
  }

  .strip.dragging {
    cursor: grabbing;
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    display: block;
  }

  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 12px;
    pointer-events: none;
  }

  .mask {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.62);
    pointer-events: none;
  }

  .mask.left {
    left: 0;
  }

  .sel {
    position: absolute;
    top: 0;
    bottom: 0;
    border: 1px solid var(--accent);
    border-radius: 2px;
    pointer-events: none;
    box-shadow: 0 0 0 9999px transparent;
  }

  .handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 16px;
    margin-left: -8px;
    cursor: ew-resize;
    display: grid;
    place-items: center;
  }

  .handle i {
    width: 5px;
    height: 46px;
    border-radius: 3px;
    background: var(--accent);
    pointer-events: none; /* clicks land on the handle itself, not the grip */
  }

  .handle:hover i {
    height: 60px;
  }

  .playhead {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: #fff;
    pointer-events: none;
    mix-blend-mode: difference;
  }
</style>
