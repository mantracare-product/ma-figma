const fs = require('fs');
const { spawn, execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Let's inspect the background pixels in the corner/top region (e.g. y < 80, x < 400)
const raw0 = execSync(`"${ffmpeg}" -i frame_0.png -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });

let minLum = 255, maxLum = 0;
let maxDiff = 0;
for (let y = 0; y < 70; y++) {
  for (let x = 0; x < 400; x++) {
    const idx = (y * 1280 + x) * 3;
    const r = raw0[idx], g = raw0[idx+1], b = raw0[idx+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const diff = Math.max(r, g, b) - Math.min(r, g, b);
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
    if (diff > maxDiff) maxDiff = diff;
  }
}
console.log(`Background stats in top-left region: minLum=${minLum.toFixed(1)}, maxLum=${maxLum.toFixed(1)}, maxDiff=${maxDiff}`);

// Let's check the person hair and shoulder perimeter
// Top of head is around y=90-100, x=640
const headIdx = (95 * 1280 + 640) * 3;
console.log('Top of head hair RGB:', [raw0[headIdx], raw0[headIdx+1], raw0[headIdx+2]]);
// Shoulder around y=500, x=380
const shoulderIdx = (500 * 1280 + 380) * 3;
console.log('Shoulder RGB:', [raw0[shoulderIdx], raw0[shoulderIdx+1], raw0[shoulderIdx+2]]);
