const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Let's dump all frames or check face / mouth bounding box.
// In 1280x720 video, let's find the character bounds first.
const raw0 = execSync(`"${ffmpeg}" -i src/imports/ai-receptionist-avatar.mp4 -vf "select=eq(n\\,0)" -vframes 1 -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });

// Let's see where the non-background pixels are:
// Background is light grey/white (r > 220, g > 220, b > 220 and |r-g| < 15, |g-b| < 15)
let minX = 1280, maxX = 0, minY = 720, maxY = 0;
for (let y = 0; y < 720; y++) {
  for (let x = 0; x < 1280; x++) {
    const idx = (y * 1280 + x) * 3;
    const r = raw0[idx], g = raw0[idx+1], b = raw0[idx+2];
    const isBg = (r > 225 && g > 225 && b > 225 && Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && Math.abs(r-b) < 15);
    if (!isBg) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log(`Character bounding box: X: [${minX}, ${maxX}], Y: [${minY}, ${maxY}]`);
