import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // @ffmpeg/ffmpeg and @ffmpeg/util are already ESM — skip prebundling so the
  // worker wiring stays intact.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
});
