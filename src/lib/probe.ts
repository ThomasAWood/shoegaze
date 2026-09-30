/**
 * Reads duration, dimensions and a thumbnail frame out of a video file using
 * a throwaway <video> element. Rejects if the browser cannot decode the file.
 */
export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  thumb: string;
}

function seekOnce(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      v.removeEventListener('seeked', done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 2000);
    v.addEventListener('seeked', done);
    v.currentTime = t;
  });
}

function grabThumb(v: HTMLVideoElement): string {
  const W = 192;
  const H = 108;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx || !v.videoWidth || !v.videoHeight) return '';
  // cover-fit the frame into the 16:9 cell, same object-fit: cover math
  const s = Math.max(W / v.videoWidth, H / v.videoHeight);
  const dw = v.videoWidth * s;
  const dh = v.videoHeight * s;
  ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function probeVideo(url: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    const cleanup = () => {
      v.removeAttribute('src');
      v.load();
    };
    const failTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out reading the file'));
    }, 20000);
    v.addEventListener(
      'loadeddata',
      async () => {
        clearTimeout(failTimer);
        const { duration, videoWidth: width, videoHeight: height } = v;
        if (!isFinite(duration) || duration <= 0 || !width || !height) {
          cleanup();
          reject(new Error('Not a readable video'));
          return;
        }
        try {
          await seekOnce(v, Math.min(0.3, duration / 2));
          const thumb = grabThumb(v);
          resolve({ duration, width, height, thumb });
        } catch {
          resolve({ duration, width, height, thumb: '' });
        } finally {
          cleanup();
        }
      },
      { once: true },
    );
    v.addEventListener(
      'error',
      () => {
        clearTimeout(failTimer);
        cleanup();
        reject(new Error('This browser cannot decode that file'));
      },
      { once: true },
    );
    v.src = url;
    v.load();
  });
}
