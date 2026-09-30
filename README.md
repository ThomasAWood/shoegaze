# Shoegaze

Turn raw band footage into the short, hazy, pre-blurred clips that play behind
[it-site](https://github.com/)'s pages. Drop in footage, trim out the good
moments, bake in the blur, export small web-ready H.264 — all in the browser,
no ffmpeg install needed.

Named for the genre: dreamy, blurred, and looking down at the pedals.

## Run it

```sh
cd ~/personal/shoegaze
npm install
npm run dev
```

The ffmpeg.wasm core (~30 MB) is copied into `public/` on install and served
locally, so the tool works offline. Nothing is uploaded anywhere.

## Workflow

1. **Drop footage** into the page (or click the `+` to browse).
2. **Trim**: drag the yellow handles on the filmstrip, or park the playhead and
   press `I` / `O`. `space` plays, `←`/`→` nudge by 0.1 s (`shift` = 1 s),
   `L` toggles looping over the selection.
3. **Add clip to queue** — one source can yield several clips; trim again and
   add more.
4. **Export** (Queue tab): trims each clip, downscales to ≤ 1080p, bakes in
   blur and dim, and encodes web-friendly H.264 (audio is stripped — the site
   plays muted).
5. **Save all** into the site's `src/lib/assets/videos/` — it picks up every
   `.mp4` in that folder automatically.

## Settings

The right sidebar has two tabs: **Settings** (blur / dim / quality) and
**Queue** (the clips waiting for export, plus the export button and ffmpeg
log).

- **Blur** — gaussian σ baked into the file. 8 ≈ the site's CSS `blur(8px)`.
  The published clips are pre-blurred so the browser doesn't pay for it;
  compare the preview against the live site and tune to taste.
- **Dim** — black scrim baked in. The gigs page adds its own 72% scrim at
  runtime, so this stays at 0 unless you want it permanent.
- **Quality (CRF)** — 24 lands near the current 0.5–0.75 MB per 5 s clip.
  Exports are always capped at 1080p, matching the current clips.

The preview always applies the exact same math the export will (CSS blur σ
matches ffmpeg's `gblur` σ), so what you see is what gets baked.

## Notes & limits

- Export speed is wasm-bound: expect roughly 10–40 s of encoding per 5 s clip.
- WebAssembly is 32-bit: source files over ~1.5 GB may fail to load.
- Phone `.mov`/`.mp4` (H.264/HEVC) work; exotic codecs your browser can't
  preview won't load either.
