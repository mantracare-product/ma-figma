const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Extract all 240 frames raw RGB into memory or iterate
// Character mouth is located around Y: 330-390, X: 610-670
// Let's inspect the mouth region per frame (every 1 frame = 1/24s = ~41.67ms)

console.log('Extracting frames and analyzing mouth...');
// Let's extract frames at 24fps
const out = execSync(`"${ffmpeg}" -i src/imports/ai-receptionist-avatar.mp4 -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 1000 * 1024 * 1024 });

const W = 1280, H = 720;
const frameSize = W * H * 3;
const totalFrames = out.length / frameSize;
console.log(`Total frames read: ${totalFrames}`);

// Let's analyze frame 0 vs frame (totalFrames - 1) difference
let diff0_last = 0;
for (let i = 0; i < frameSize; i++) {
  diff0_last += Math.abs(out[i] - out[(totalFrames - 1) * frameSize + i]);
}
const avgDiff0_last = diff0_last / (W * H * 3);
console.log(`Average pixel diff between Frame 0 and Last Frame: ${avgDiff0_last.toFixed(3)}`);

// Let's find mouth variance / openness per frame
// Mouth box: X [610, 670], Y [330, 390]
const mouthStats = [];
for (let f = 0; f < totalFrames; f++) {
  const offset = f * frameSize;
  let rSum = 0, gSum = 0, bSum = 0;
  let darkPixelCount = 0; // mouth interior / shadow when open is darker/redder
  let count = 0;
  for (let y = 330; y <= 390; y++) {
    for (let x = 610; x <= 670; x++) {
      const idx = offset + (y * W + x) * 3;
      const r = out[idx], g = out[idx+1], b = out[idx+2];
      rSum += r; gSum += g; bSum += b;
      count++;
      // Inside mouth when open has dark cavity or bright teeth
      if (r < 110 && g < 70 && b < 60) {
        darkPixelCount++;
      }
    }
  }
  const time = (f / 24).toFixed(3);
  mouthStats.push({ frame: f, time: parseFloat(time), darkPixels: darkPixelCount, avgR: rSum/count });
}

// Find local minima of darkPixelCount (where mouth is closed)
console.log('Mouth darkness / openness profile sample:');
for (let f = 0; f < totalFrames; f += 6) {
  console.log(`t=${mouthStats[f].time}s (f=${f}): darkPixels=${mouthStats[f].darkPixels}`);
}

// Let's find closed mouth points
const restCandidates = mouthStats.filter(m => m.darkPixels <= 20);
console.log(`Frames with darkPixels <= 20 (mouth closed): ${restCandidates.map(c => `${c.time}s(f=${c.frame})`).join(', ')}`);
