<script lang="ts">
  let { onFiles }: { onFiles: (files: File[]) => void } = $props();

  let over = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  function pick() {
    input?.click();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    over = false;
    if (e.dataTransfer?.files.length) onFiles([...e.dataTransfer.files]);
  }
</script>

<div
  class="hero"
  class:over
  role="button"
  tabindex="0"
  onclick={pick}
  onkeydown={(e) => e.key === 'Enter' && pick()}
  ondragover={(e) => e.preventDefault()}
  ondragenter={() => (over = true)}
  ondragleave={() => (over = false)}
  ondrop={onDrop}
>
  <div class="glyph">⬚ → ▢</div>
  <h2>Drop footage here</h2>
  <p>or click to browse</p>
  <p class="fine">
    mp4 / mov / webm — several files at once is fine.<br />
    Everything stays on this machine; the trimming and blurring run in this page
    via WebAssembly.
  </p>
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
  .hero {
    height: calc(100vh - 48px);
    margin: 24px;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 6px;
    text-align: center;
    border: 2px dashed var(--line);
    border-radius: 14px;
    color: var(--muted);
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .hero:hover,
  .hero.over {
    border-color: var(--accent);
    background: rgba(245, 197, 66, 0.04);
    color: var(--text);
  }

  .glyph {
    font-size: 34px;
    letter-spacing: 4px;
    color: var(--accent);
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    color: var(--text);
    font-weight: 600;
  }

  p {
    margin: 0;
  }

  .fine {
    margin-top: 18px;
    font-size: 12px;
    max-width: 420px;
  }
</style>
