const fs = require('fs');
const { spawn, execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

console.log('Building transparent avatar assets...');

const W = 1280, H = 720;
const frameSize = W * H * 3;

// 1. Extract all frames
console.log('Step 1: Extracting raw frames...');
const rawRgb = execSync(`"${ffmpeg}" -i src/imports/ai-receptionist-avatar.mp4 -f rawvideo -pix_fmt rgb24 -`, {
  maxBuffer: 1000 * 1024 * 1024
});

const totalFrames = rawRgb.length / frameSize;
console.log(`Total frames: ${totalFrames}`);

// 2. Process all frames with flood fill matting + edge despill
console.log('Step 2: Processing alpha matte & loop seam...');

function processFrame(frameIdx) {
  const offset = frameIdx * frameSize;
  const rgba = Buffer.alloc(W * H * 4);
  const isBgCandidate = new Uint8Array(W * H);
  
  for (let i = 0; i < W * H; i++) {
    const r = rawRgb[offset + i * 3];
    const g = rawRgb[offset + i * 3 + 1];
    const b = rawRgb[offset + i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    
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

  // Crossfade seam on last 4 frames (236, 237, 238, 239) toward frame 0
  const crossfadeWeight = frameIdx >= 236 ? (frameIdx - 235) / 5 : 0;

  for (let i = 0; i < W * H; i++) {
    let r = rawRgb[offset + i * 3];
    let g = rawRgb[offset + i * 3 + 1];
    let b = rawRgb[offset + i * 3 + 2];

    if (crossfadeWeight > 0) {
      const r0 = rawRgb[i * 3];
      const g0 = rawRgb[i * 3 + 1];
      const b0 = rawRgb[i * 3 + 2];
      r = Math.round(r * (1 - crossfadeWeight) + r0 * crossfadeWeight);
      g = Math.round(g * (1 - crossfadeWeight) + g0 * crossfadeWeight);
      b = Math.round(b * (1 - crossfadeWeight) + b0 * crossfadeWeight);
    }

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
    }

    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = a;
  }

  return rgba;
}

// 3. Save avatar-rest.png (frame 0)
console.log('Step 3: Saving src/imports/avatar-rest.png...');
const frame0Rgba = processFrame(0);
const posterProc = spawn(ffmpeg, [
  '-f', 'rawvideo',
  '-pix_fmt', 'rgba',
  '-s', `${W}x${H}`,
  '-i', 'pipe:0',
  '-frames:v', '1',
  'src/imports/avatar-rest.png',
  '-y'
]);
posterProc.stdin.write(frame0Rgba);
posterProc.stdin.end();

posterProc.on('close', () => {
  console.log('src/imports/avatar-rest.png saved.');

  // 4. Encode WebM (VP9 + yuva420p)
  console.log('Step 4: Encoding src/imports/ai-receptionist-avatar.webm (VP9 with alpha)...');
  const webmProc = spawn(ffmpeg, [
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`,
    '-r', '24',
    '-i', 'pipe:0',
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-b:v', '0',
    '-crf', '30',
    '-auto-alt-ref', '0',
    '-an',
    'src/imports/ai-receptionist-avatar.webm',
    '-y'
  ]);

  let currentFrame = 0;
  function writeNextFrame() {
    while (currentFrame < totalFrames) {
      const rgba = processFrame(currentFrame);
      currentFrame++;
      const ok = webmProc.stdin.write(rgba);
      if (!ok) {
        webmProc.stdin.once('drain', writeNextFrame);
        return;
      }
    }
    webmProc.stdin.end();
  }

  writeNextFrame();

  webmProc.stderr.on('data', (d) => {
    // console.log(d.toString());
  });

  webmProc.on('close', (code) => {
    console.log(`WebM encoding finished with code ${code}.`);
    const stat = fs.statSync('src/imports/ai-receptionist-avatar.webm');
    console.log(`WebM size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

    // Let's also check if MP4 exists and is under 3MB
    const mp4Stat = fs.statSync('src/imports/ai-receptionist-avatar.mp4');
    console.log(`MP4 size: ${(mp4Stat.size / 1024 / 1024).toFixed(2)} MB`);
  });
});
