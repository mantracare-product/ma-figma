const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Let's inspect frame_0.png. What does the character look like?
// Let's create an image with different background removal strategies or flood-fill from boundaries.
// Also let's inspect the mouth/lip region across frames to find the exact rest points (lip closure timestamps).

const rawRgb = execSync(`"${ffmpeg}" -i frame_0.png -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });

// Let's find what the character is wearing and what colors are in the center.
let whiteInside = [];
for (let y = 100; y < 700; y += 50) {
  for (let x = 400; x < 880; x += 50) {
    const idx = (y * 1280 + x) * 3;
    whiteInside.push(`(${x},${y}) RGB=[${rawRgb[idx]},${rawRgb[idx+1]},${rawRgb[idx+2]}]`);
  }
}
console.log('Sampled inside body points:\n', whiteInside.join('\n'));
