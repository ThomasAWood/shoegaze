<script lang="ts">
  import { app, removeClip } from '../lib/state.svelte';
  import { cancelExport, runExport } from '../lib/exporter';
  import { ensureEngine, resetEngine } from '../lib/ffmpeg';
  import { fmtDur, fmtSize } from '../lib/time';

  let tab = $state<'settings' | 'queue'>('queue');

  const done = () => app.clips.filter((c) => app.results[c.id]).length;

  function retryEngine() {
    resetEngine();
    ensureEngine().catch(() => {});
  }

  async function saveAll() {
    const items = app.clips
      .map((c) => ({ c, r: app.results[c.id] }))
      .filter((x) => x.r);
    if (items.length === 0) return;
    const w = window as unknown as {
      showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    };
    if (w.showDirectoryPicker) {
      try {
        const dir = await w.showDirectoryPicker({ mode: 'readwrite' });
        for (const { c, r } of items) {
          const fh = await dir.getFileHandle(`${c.label}.mp4`, { create: true });
          const ws = await (fh as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
          await ws.write(r!.blob);
          await ws.close();
        }
      } catch {
        /* user dismissed the picker */
      }
    } else {
      // Safari & co: fall back to plain downloads.
      for (const { c, r } of items) {
        const a = document.createElement('a');
        a.href = r!.url;
        a.download = `${c.label}.mp4`;
        a.click();
        await new Promise((res) => setTimeout(res, 350));
      }
    }
  }
</script>

<div class="panel">
  <div class="tabs" role="tablist">
    <button
      role="tab"
      aria-selected={tab === 'settings'}
      class:active={tab === 'settings'}
      onclick={() => (tab = 'settings')}
    >Settings</button>
    <button
      role="tab"
      aria-selected={tab === 'queue'}
      class:active={tab === 'queue'}
      onclick={() => (tab = 'queue')}
    >
      Queue {#if app.clips.length > 0}<span class="count">{app.clips.length}</span>{/if}
    </button>
  </div>

  {#if tab === 'settings'}
    <div class="scroll">
      <section>
        <div class="row">
          <label for="blur">Blur <b>{app.effects.blur}px</b></label>
          <input id="blur" type="range" min="0" max="32" step="0.5" bind:value={app.effects.blur} />
        </div>
        <div class="row">
          <label for="dim">Dim <b>{Math.round(app.effects.dim * 100)}%</b></label>
          <input id="dim" type="range" min="0" max="0.9" step="0.01" bind:value={app.effects.dim} />
        </div>
        <div class="row">
          <label for="crf">Quality <b>CRF {app.encode.crf}</b></label>
          <input id="crf" type="range" min="18" max="30" step="1" bind:value={app.encode.crf} />
          <p class="note">
            Lower = better + bigger. 24 lands near the current site clips
            (0.5–0.75 MB per 5 s at 1080p).
          </p>
        </div>
      </section>
    </div>
  {:else}
    <div class="scroll">
      <section>
        {#if app.clips.length === 0}
          <p class="note">Trim a clip and hit “+ Add clip to queue”.</p>
        {:else}
          <ul>
            {#each app.clips as clip (clip.id)}
              {@const source = app.sources.find((s) => s.id === clip.sourceId)}
              <li>
                <div class="line">
                  <input class="label" type="text" bind:value={clip.label} title="File name (without .mp4)" />
                  <button class="x" title="Remove from queue" onclick={() => removeClip(clip.id)}>×</button>
                </div>
                <div class="sub">
                  {source?.name ?? '(removed)'} · {clip.start.toFixed(2)}–{clip.end.toFixed(2)}
                  ({fmtDur(clip.end - clip.start)})
                </div>
                {#if app.results[clip.id]}
                  <div class="sub ok">
                    ✓ {fmtSize(app.results[clip.id].size)} —
                    <a href={app.results[clip.id].url} download={`${clip.label}.mp4`}>download</a>
                  </div>
                {:else if app.exporting && app.progress.current === clip.label}
                  <div class="sub">encoding… {Math.round(app.progress.ratio * 100)}%</div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>

    <div class="dock">
      {#if app.engine === 'loading'}
        <p class="engine">loading encoder…</p>
      {:else if app.engine === 'error'}
        <button class="ghost retry" onclick={retryEngine} title={app.engineError}>
          encoder failed — retry
        </button>
      {/if}

      {#if app.error}
        <p class="error">{app.error}</p>
      {/if}

      {#if app.exporting}
        <div class="progress">
          <div class="bar">
            <div
              class="fill"
              style:width={`${((app.progress.done + app.progress.ratio) / Math.max(1, app.progress.total)) * 100}%`}
            ></div>
          </div>
          <span class="stat">
            {app.progress.done}/{app.progress.total}
            {#if app.progress.current}· {app.progress.current}{/if}
          </span>
        </div>
        <button onclick={cancelExport}>Cancel</button>
      {:else}
        <button class="primary" disabled={app.clips.length === 0} onclick={runExport}>
          Export {app.clips.length || ''} clip{app.clips.length === 1 ? '' : 's'}
        </button>
        {#if done() > 0}
          <button class="save" onclick={saveAll} title="Pick a folder — e.g. src/lib/assets/videos">
            Save all ({done()})
          </button>
        {/if}
      {/if}

      <details class="log">
        <summary>ffmpeg log</summary>
        <pre>{app.logs.join('\n')}</pre>
      </details>
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--line);
    flex: none;
  }

  .tabs button {
    flex: 1;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 10px;
    color: var(--muted);
    font-weight: 500;
  }

  .tabs button:hover {
    background: none;
    color: var(--text);
  }

  .tabs button.active {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .count {
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0 7px;
    margin-left: 4px;
    font-size: 11.5px;
  }

  .scroll {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  section {
    padding: 16px;
  }

  .row {
    margin-bottom: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .row:last-child {
    margin-bottom: 0;
  }

  label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  label b {
    font-variant-numeric: tabular-nums;
    color: var(--accent);
    font-weight: 600;
  }

  .note {
    margin: 2px 0 0;
    font-size: 11.5px;
    color: var(--muted);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .line {
    display: flex;
    gap: 6px;
  }

  .label {
    flex: 1;
    min-width: 0;
  }

  .x {
    padding: 2px 8px;
    color: var(--muted);
    border: none;
    background: none;
  }

  .x:hover {
    color: var(--danger);
    background: none;
  }

  .sub {
    font-size: 11.5px;
    color: var(--muted);
    margin-top: 2px;
    word-break: break-all;
  }

  .sub.ok {
    color: var(--ok);
  }

  .sub a {
    color: var(--ok);
  }

  .dock {
    padding: 14px 16px;
    border-top: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dock button.primary,
  .dock button.save {
    padding: 9px;
  }

  .engine {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }

  .retry {
    color: var(--danger);
  }

  .error {
    margin: 0;
    color: var(--danger);
    font-size: 12px;
    word-break: break-word;
  }

  .progress {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bar {
    height: 6px;
    background: var(--panel-2);
    border-radius: 3px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s ease;
  }

  .stat {
    font-size: 12px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .log summary {
    cursor: pointer;
    color: var(--muted);
    font-size: 12px;
  }

  .log pre {
    max-height: 180px;
    overflow-y: auto;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 8px;
    font-size: 10.5px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 8px 0 0;
  }
</style>
