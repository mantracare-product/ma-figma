const fs = require('fs');
const { spawn, execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const W = 1280, H = 720;

function processFrameRgbToRgba(rgbBuffer) {
  const rgba = Buffer.alloc(W * H * 4);
  const isBgCandidate = new Uint8Array(W * H);
  
  for (let i = 0; i < W * H; i++) {
    const r = rgbBuffer[i * 3];
    const g = rgbBuffer[i * 3 + 1];
    const b = rgbBuffer[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Background candidate
    if (lum > 220 && diff < 20) {
      isBgCandidate[i] = 1;
    }
  }

  const bgMask = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let qHead = 0, qTail = 0;

  for (let x = 0; x < W; x++) {
    if (isBgCandidate[x]) {
      bgMask[x] = 1;
      queue[qTail++] = x;
    }
  }
  for (let y = 1; y < H; y++) {
    const leftIdx = y * W;
    const rightIdx = y * W + (W - 1);
    if (isBgCandidate[leftIdx] && !bgMask[leftIdx]) {
      bgMask[leftIdx] = 1;
      queue[qTail++] = leftIdx;
    }
    if (isBgCandidate[rightIdx] && !bgMask[rightIdx]) {
      bgMask[rightIdx] = 1;
      queue[qTail++] = rightIdx;
    }
  }

  for (let x = 0; x < 300; x++) {
    const bIdx = (H - 1) * W + x;
    if (isBgCandidate[bIdx] && !bgMask[bIdx]) {
      bgMask[bIdx] = 1;
      queue[qTail++] = bIdx;
    }
  }
  for (let x = 950; x < W; x++) {
    const bIdx = (H - 1) * W + x;
    if (isBgCandidate[bIdx] && !bgMask[bIdx]) {
      bgMask[bIdx] = 1;
      queue[qTail++] = bIdx;
    }
  }

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % W;
    const cy = (curr / W) | 0;

    if (cx > 0) {
      const n = curr - 1;
      if (isBgCandidate[n] && !bgMask[n]) {
        bgMask[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (cx < W - 1) {
      const n = curr + 1;
      if (isBgCandidate[n] && !bgMask[n]) {
        bgMask[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (cy > 0) {
      const n = curr - W;
      if (isBgCandidate[n] && !bgMask[n]) {
        bgMask[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (cy < H - 1) {
      const n = curr + W;
      if (isBgCandidate[n] && !bgMask[n]) {
        bgMask[n] = 1;
        queue[qTail++] = n;
      }
    }
  }

  for (let i = 0; i < W * H; i++) {
    let r = rgbBuffer[i * 3];
    let g = rgbBuffer[i * 3 + 1];
    let b = rgbBuffer[i * 3 + 2];
    let a = 255;

    if (bgMask[i]) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum >= 226) {
        a = 0;
      } else if (lum <= 195) {
        a = 255;
      } else {
        const t = (lum - 195) / (226 - 195);
        a = Math.round(255 * (1 - t * t * (3 - 2 * t)));
        if (a > 0 && a < 255) {
          const bgVal = lum;
          r = Math.max(0, Math.min(255, Math.round((r - bgVal * (1 - a / 255)) / (a / 255))));
          g = Math.max(0, Math.min(255, Math.round((g - bgVal * (1 - a / 255)) / (a / 255))));
          b = Math.max(0, Math.min(255, Math.round((b - bgVal * (1 - a / 255)) / (a / 255))));
        }
      }
    } else {
      a = 255;
    }

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }

  return rgba;
}

const raw0 = execSync(`"${ffmpeg}" -i frame_0.png -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });
const rgba0 = processFrameRgbToRgba(raw0);

const ffmpegProc = spawn(ffmpeg, [
  '-f', 'rawvideo',
  '-pix_fmt', 'rgba',
  '-s', `${W}x${H}`,
  '-i', 'pipe:0',
  '-frames:v', '1',
  'avatar-rest.png',
  '-y'
]);
ffmpegProc.stdin.write(rgba0);
ffmpegProc.stdin.end();

ffmpegProc.on('close', (code) => {
  console.log(`avatar-rest.png created with code ${code}`);
});
