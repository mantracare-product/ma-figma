const { execSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

// The background is around #f5f5f5 / #ebebeb / #ffffff (light grey/white gradient).
// Let's test colorkey filter in ffmpeg:
// e.g. colorkey=0xf0f0f0:0.18:0.1 or similar, or floodfill/chromakey.
// Let's test on frame_0.png and output test_alpha.png

try {
  execSync(`"${ffmpeg}" -i frame_0.png -vf "colorkey=0xf0f0f0:0.15:0.08" -frames:v 1 test_alpha.png -y`);
  console.log('test_alpha.png generated');
} catch (e) {
  console.error(e.message);
}
