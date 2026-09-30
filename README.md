# Shoegaze

Turn footage into short, hazy, blurred clips for website backgrounds. Drop in footage, trim out the good moments, bake in the blur, and export small web-ready H.264 files — entirely in the browser.

![Shoegaze with a clip queued for export](docs/screenshot-queue.png)

## Why

I like the aesthetic of a blurry video as a website background, but manually cropping and blurring 20+ clips in a proper video editor like premiere pro is slow, and time consuming. The alternative of blurring the video as part of the website is super slow client side, and uses unnecessary compute server side. I built Shoegaze to easily create lots of these blurred clips.

## Features

- **Drag-and-drop footage** — several files at once
- **Filmstrip timeline** — real frames on the strip. Drag the handles
  to trim, scrub anywhere, loop the selection to check the clip.
- **Many clips per source** — trim, add to the queue, trim again from the same clip
- **Live preview** — the preview applies the exact same blur and dim that the
  export will bake in.
- **Web-ready exports** — H.264, yuv420p, `faststart`, no audio, capped at
  1080p.
- **No install, no server** — the whole tool is a static page. The ffmpeg.wasm
  core is served locally, so it works offline, and no footage ever leaves the
  machine.

## Getting started

You need Node.js. Then:
```sh
npm install
npm run dev
```

## How it works

The tool runs [ffmpeg.wasm](https://ffmpegwasm.netlify.app/) in a web worker.

## Limitations

- Encoding runs in WebAssembly: allow roughly 10–40 s per 5-second clip.
- The wasm heap is 32-bit, so source files over about 1.5 GB may fail to load.
- If the browser cannot decode a file (some phone HEVC, for example), the tool
  cannot load it either.
