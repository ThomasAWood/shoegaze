<script lang="ts">
  import { app, addFiles, removeSource, selectSource } from '../lib/state.svelte';
  import { fmt, fmtSize } from '../lib/time';

  let input = $state<HTMLInputElement | null>(null);
  let busy = $state(false);

  async function onFiles(files: File[]) {
    busy = true;
    try {
      await addFiles(files);
    } finally {
      busy = false;
    }
  }
</script>

<div class="sources">
  <ul>
    {#each app.sources as source (source.id)}
      <li>
        <button class="pick" class:selected={source.id === app.selectedId} onclick={() => selectSource(source.id)}>
          {#if source.thumb}
            <img src={source.thumb} alt="" />
          {:else}
            <span class="nothumb"></span>
          {/if}
          <span class="meta">
            <span class="name" title={source.name}>{source.name}</span>
            <span class="sub">{fmt(source.duration)} · {source.width}×{source.height} · {fmtSize(source.size)}</span>
          </span>
        </button>
        <button
          class="x"
          title="Remove"
          onclick={() => removeSource(source.id)}
        >×</button>
      </li>
    {/each}
    <li class="add">
      <button class="add-btn" title="Add footage" disabled={busy} onclick={() => input?.click()}>
        +
      </button>
    </li>
  </ul>
</div>

<input
  bind:this={input}
  type="file"
  accept="video/*"
  multiple
  hidden
  onchange={(e) => {
    const files = (e.currentTarget as HTMLInputElement).files;
    if (files) onFiles([...files]);
    (e.currentTarget as HTMLInputElement).value = '';
  }}
/>

<style>
  .sources {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: 100%;
  }

  li {
    display: flex;
    align-items: center;
    gap: 2px;
    border-radius: 8px;
  }

  .pick {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    background: none;
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .pick:hover,
  li:has(.x:hover) .pick {
    background: var(--panel-2);
  }

  .pick.selected {
    background: var(--panel-2);
    border-color: var(--accent);
  }

  img,
  .nothumb {
    width: 52px;
    height: 30px;
    border-radius: 4px;
    object-fit: cover;
    flex: none;
    background: #000;
    border: 1px solid var(--line);
  }

  .meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    color: var(--muted);
    font-size: 11.5px;
  }

  li.add {
    margin-top: 2px;
  }

  .add-btn {
    width: 100%;
    padding: 5px;
    border-style: dashed;
    color: var(--muted);
    font-size: 17px;
    line-height: 1;
  }

  .add-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
    background: none;
  }

  .x {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--muted);
    padding: 2px 6px;
    font-size: 15px;
  }

  .x:hover {
    color: var(--danger);
    background: none;
  }
</style>
