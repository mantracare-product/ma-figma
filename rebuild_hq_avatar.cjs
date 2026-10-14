const fs = require('fs');
const { spawn, execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

console.log('Rebuilding High-Quality Avatar Assets (1080p, choked matte, defringed)...');

// 1. Extract frames upscaled to 1920x1080 for crisp rendering at large size
const W = 1920, H = 1080;
const frameSize = W * H * 3;

console.log('Step 1: Extracting 1080p raw frames with lanczos scaling...');
const rawRgb = execSync(`"${ffmpeg}" -i src/imports/ai-receptionist-avatar.mp4 -vf "scale=1920:1080:flags=lanczos" -f rawvideo -pix_fmt rgb24 -`, {
  maxBuffer: 1500 * 1024 * 1024
});

const totalFrames = rawRgb.length / frameSize;
console.log(`Total 1080p frames: ${totalFrames}`);

// 2. High-precision matting with morphological alpha choke (erosion) and defringe
console.log('Step 2: Processing alpha matte with 1.5px choke & defringe...');

function processFrame(frameIdx) {
  const offset = frameIdx * frameSize;
  const isBgCandidate = new Uint8Array(W * H);
  
  for (let i = 0; i < W * H; i++) {
    const r = rawRgb[offset + i * 3];
    const g = rawRgb[offset + i * 3 + 1];
    const b = rawRgb[offset + i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Background candidate
    if (lum > 218 && diff < 20) {
      isBgCandidate[i] = 1;
    }
  }

  // Flood fill from borders
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

  // Bottom corners (outside character body: x < 450 or x > 1450 at 1920 width)
  for (let x = 0; x < 450; x++) {
    const bIdx = (H - 1) * W + x;
    if (isBgCandidate[bIdx] && !bgMask[bIdx]) {
      bgMask[bIdx] = 1;
      queue[qTail++] = bIdx;
    }
  }
  for (let x = 1450; x < W; x++) {
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

  // Morphological dilation of bgMask by 1.5px (choking the foreground matte)
  // This pulls the border inwards by 1-2px, completely erasing white backdrop fringes!
  const dilatedBg = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      if (bgMask[idx]) {
        dilatedBg[idx] = 1;
        dilatedBg[idx - 1] = 1;
        dilatedBg[idx + 1] = 1;
        dilatedBg[idx - W] = 1;
        dilatedBg[idx + W] = 1;
      }
    }
  }

  // Crossfade seam on last 4 frames
  const crossfadeWeight = frameIdx >= 236 ? (frameIdx - 235) / 5 : 0;
  const rgba = Buffer.alloc(W * H * 4);

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
    if (dilatedBg[i]) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum >= 220) {
        a = 0;
      } else if (lum <= 180) {
        a = 255;
      } else {
        // Smooth feathering
        const t = (lum - 180) / (220 - 180);
        a = Math.round(255 * (1 - t * t * (3 - 2 * t)));
      }

      // Strong defringe: remove white halo contamination
      if (a > 0 && a < 255) {
        const bgVal = 240;
        const alphaNorm = a / 255;
        r = Math.max(0, Math.min(255, Math.round((r - bgVal * (1 - alphaNorm)) / alphaNorm)));
        g = Math.max(0, Math.min(255, Math.round((g - bgVal * (1 - alphaNorm)) / alphaNorm)));
        b = Math.max(0, Math.min(255, Math.round((b - bgVal * (1 - alphaNorm)) / alphaNorm)));
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
console.log('Step 3: Saving src/imports/avatar-rest.png (1080p)...');
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
  console.log('Step 4: Encoding src/imports/ai-receptionist-avatar.webm (1080p VP9 with alpha)...');
  const webmProc = spawn(ffmpeg, [
    '-f', 'rawvideo',
    '-pix_fmt', 'rgba',
    '-s', `${W}x${H}`,
    '-r', '24',
    '-i', 'pipe:0',
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuva420p',
    '-b:v', '0',
    '-crf', '28',
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

  webmProc.on('close', (code) => {
    console.log(`WebM encoding finished with code ${code}.`);
    const stat = fs.statSync('src/imports/ai-receptionist-avatar.webm');
    console.log(`WebM size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  });
});
