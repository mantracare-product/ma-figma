const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// Let's read raw rgba from test_alpha.png and frame_0.png
const rawRgba = execSync(`"${ffmpeg}" -i test_alpha.png -f rawvideo -pix_fmt rgba -`, { maxBuffer: 10 * 1024 * 1024 });
const rawRgb = execSync(`"${ffmpeg}" -i frame_0.png -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });

// Let's inspect where alpha is < 255
let transparentCount = 0;
let insideTransparentCount = 0;
// Character bounding box was approx x in [300, 980], y in [100, 700]
for (let y = 0; y < 720; y++) {
  for (let x = 0; x < 1280; x++) {
    const idx4 = (y * 1280 + x) * 4;
    const a = rawRgba[idx4 + 3];
    if (a < 200) {
      transparentCount++;
      // check if inside central character area
      if (x > 500 && x < 780 && y > 200 && y < 600) {
        insideTransparentCount++;
      }
    }
  }
}
console.log('Total transparent pixels:', transparentCount);
console.log('Inside central body transparent pixels:', insideTransparentCount);
