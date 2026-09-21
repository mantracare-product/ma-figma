const fs = require('fs');
const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const raw0 = execSync(`"${ffmpeg}" -i frame_0.png -vframes 1 -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });
const rawMid = execSync(`"${ffmpeg}" -i frame_mid.png -vframes 1 -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });
const rawLast = execSync(`"${ffmpeg}" -i frame_last.png -vframes 1 -f rawvideo -pix_fmt rgb24 -`, { maxBuffer: 10 * 1024 * 1024 });

function analyze(name, raw) {
  function getPixel(x, y) {
    const idx = (y * 1280 + x) * 3;
    return [raw[idx], raw[idx+1], raw[idx+2]];
  }
  console.log(`=== ${name} ===`);
  console.log('Top-Left (0,0):', getPixel(0,0));
  console.log('Top-Right (1279,0):', getPixel(1279,0));
  console.log('Bottom-Left (0,719):', getPixel(0,719));
  console.log('Bottom-Right (1279,719):', getPixel(1279,719));
  console.log('Top-Center (640,10):', getPixel(640,10));
  console.log('Mid-Left (10,360):', getPixel(10,360));
  console.log('Mid-Right (1270,360):', getPixel(1270,360));
  console.log('Center-ish (640, 360):', getPixel(640,360));
}

analyze('Frame 0', raw0);
analyze('Frame Mid', rawMid);
analyze('Frame Last', rawLast);
