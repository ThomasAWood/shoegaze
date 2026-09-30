<script lang="ts">
  import { app, addFiles } from './lib/state.svelte';
  import DropZone from './components/DropZone.svelte';
  import SourceList from './components/SourceList.svelte';
  import ClipEditor from './components/ClipEditor.svelte';
  import ExportPanel from './components/ExportPanel.svelte';

  const selected = $derived(app.sources.find((s) => s.id === app.selectedId) ?? null);

  let dragDepth = $state(0);

  function hasFiles(e: DragEvent): boolean {
    return [...(e.dataTransfer?.types ?? [])].includes('Files');
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth = 0;
    if (e.dataTransfer?.files.length) addFiles([...e.dataTransfer.files]);
  }
</script>

<svelte:window
  ondragenter={(e) => {
    if (hasFiles(e)) dragDepth++;
  }}
  ondragleave={() => (dragDepth = Math.max(0, dragDepth - 1))}
  ondragover={(e) => e.preventDefault()}
  ondrop={onDrop}
/>

{#if app.sources.length === 0}
  <DropZone onFiles={addFiles} />
{:else}
  <div class="layout">
    <aside class="left"><SourceList /></aside>
    <main>
      {#if selected}
        {#key selected.id}
          <ClipEditor source={selected} />
        {/key}
      {:else}
        <p class="empty">Select a file on the left to trim it.</p>
      {/if}
    </main>
    <aside class="right"><ExportPanel /></aside>
  </div>
{/if}

{#if dragDepth > 0}
  <div class="drop-overlay"><span>Drop to add footage</span></div>
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 340px;
    height: 100vh;
  }

  .layout > * {
    min-height: 0;
  }

  .left {
    border-right: 1px solid var(--line);
  }

  .right {
    border-left: 1px solid var(--line);
  }

  .empty {
    display: grid;
    place-items: center;
    height: 100%;
    color: var(--muted);
  }

  .drop-overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-items: center;
    background: rgba(11, 11, 12, 0.82);
    border: 3px dashed var(--accent);
    pointer-events: none;
  }

  .drop-overlay span {
    color: var(--accent);
    font-size: 22px;
    font-weight: 600;
  }
</style>
