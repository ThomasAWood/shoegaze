<script lang="ts">
  import { app, addClip } from '../lib/state.svelte';
  import type { Source } from '../lib/types';
  import { clamp, fmt, fmtDur } from '../lib/time';
  import Timeline from './Timeline.svelte';

  let { source }: { source: Source } = $props();

  const MIN_LEN = 0.2;

  // Capturing the initial source is intentional — App keys this component by
  // source id, so a fresh mount resets all of this.
  // svelte-ignore state_referenced_locally
  let end = $state(source.duration);

  let v = $state<HTMLVideoElement | null>(null);
  let playing = $state(false);
  let currentTime = $state(0);
  let start = $state(0);
  let loop = $state(true);
  let flash = $state('');
  let flashTimer: ReturnType<typeof setTimeout> | undefined;

  // Keep the playhead and the <video> in step while scrubbing when paused.
  // (While playing, the rAF loop below writes currentTime from the video.)
  $effect(() => {
    const t = currentTime;
    if (v && !playing && Math.abs(v.currentTime - t) > 0.015) v.currentTime = t;
  });

  // Playhead driver + loop-within-selection while playing.
  $effect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (v) {
        currentTime = v.currentTime;
        if (v.currentTime >= end - 0.03) {
          if (loop) {
            v.currentTime = start;
          } else {
            currentTime = end;
            v.pause();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function setStart(t: number) {
    start = clamp(t, 0, end - MIN_LEN);
  }

  function setEnd(t: number) {
    end = clamp(t, start + MIN_LEN, source.duration);
  }

  function togglePlay() {
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start - 0.05 || v.currentTime >= end - 0.03) v.currentTime = start;
      v.play();
    } else {
      v.pause();
    }
  }

  function nudge(dt: number) {
    currentTime = clamp(currentTime + dt, 0, source.duration);
  }

  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (app.exporting) return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'i' || e.key === 'I') {
      setStart(currentTime);
    } else if (e.key === 'o' || e.key === 'O') {
      setEnd(currentTime);
    } else if (e.key === 'l' || e.key === 'L') {
      loop = !loop;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge(e.shiftKey ? -1 : -0.1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudge(e.shiftKey ? 1 : 0.1);
    }
  }

  function add() {
    if (end - start < MIN_LEN) {
      flash = 'Too short — drag the handles further apart.';
      return;
    }
    const label = addClip(source.id, start, end);
    flash = `Added ${label}.mp4 to the queue`;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flash = ''), 2800);
  }
</script>

<svelte:window onkeydown={onKey} />

<section class="editor">
  <div class="stage">
    <video
      bind:this={v}
      src={source.url}
      muted
      playsinline
      preload="auto"
      onplay={() => (playing = true)}
      onpause={() => (playing = false)}
      style:filter={app.effects.blur > 0 ? `blur(${app.effects.blur}px)` : 'none'}
    ></video>
    {#if app.effects.dim > 0}
      <div class="scrim" style:opacity={app.effects.dim}></div>
    {/if}
    <div class="badge">{source.width}×{source.height} · {fmt(source.duration)}</div>
  </div>

  <div class="transport">
    <button class="play" title="Play/pause (space)" onclick={togglePlay}>
      {playing ? '❚❚' : '▶'}
    </button>
    <span class="time">{fmt(currentTime)} <em>/ {fmt(source.duration)}</em></span>
    <span class="len">{fmtDur(end - start)}</span>

    <label class="toggle" title="Restart from the in point when the playhead reaches the out point">
      <input type="checkbox" bind:checked={loop} /> loop
    </label>

    <span class="spacer"></span>

    <button
      class="help"
      title="Keyboard:\nspace — play/pause\nI / O — set in / out at the playhead\n← / → — nudge 0.1 s (⇧ = 1 s)\nL — loop the selection"
    >?</button>
    <button class="primary" onclick={add}>+ Add clip to queue</button>
  </div>

  <Timeline url={source.url} duration={source.duration} {start} {end} bind:currentTime {setStart} {setEnd} />

  {#if flash}
    <p class="feedback">{flash}</p>
  {/if}
</section>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    min-width: 0;
  }

  .stage {
    position: relative;
    height: 46vh;
    background: #000;
    border: 1px solid var(--line);
    border-radius: 10px;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  video {
    max-width: 100%;
    max-height: 100%;
    display: block;
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: #000;
    pointer-events: none;
  }

  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 2px 8px;
    font-size: 11.5px;
    color: var(--muted);
  }

  .transport {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .play {
    width: 38px;
    font-size: 13px;
  }

  .time {
    font-variant-numeric: tabular-nums;
  }

  .time em {
    color: var(--muted);
    font-style: normal;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    cursor: pointer;
    user-select: none;
  }

  .len {
    color: var(--accent);
    background: rgba(245, 197, 66, 0.08);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 2px 8px;
    font-variant-numeric: tabular-nums;
    font-size: 12.5px;
  }

  .spacer {
    flex: 1;
  }

  .help {
    width: 26px;
    height: 26px;
    padding: 0;
    border-radius: 50%;
    color: var(--muted);
    font-size: 12px;
  }

  .help:hover {
    color: var(--text);
  }

  .feedback {
    margin: 0;
    font-size: 12px;
    color: var(--ok);
  }
</style>
