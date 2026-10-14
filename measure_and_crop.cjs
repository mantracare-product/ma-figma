const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const sourceWebm = path.resolve('src/imports/ai-receptionist-avatar.webm.orig');
const sourceMp4 = path.resolve('src/imports/ai-receptionist-avatar.mp4.orig');

console.log('=== STEP 1: MEASURE SOURCE VIDEO & BOUNDS ===');
const probeOut = execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "${sourceWebm}"`).toString().trim();
console.log('Probe result (width,height,r_frame_rate,duration):', probeOut);
const [srcWidth, srcHeight, rFrameRate, duration] = probeOut.split(',');

console.log('Running alphaextract + cropdetect over full video...');
const cropdetectOut = execSync(`"${ffmpeg}" -c:v libvpx-vp9 -i "${sourceWebm}" -vf "alphaextract,cropdetect=limit=8:round=2:reset=0" -f null - 2>&1`).toString();

const matches = cropdetectOut.match(/crop=(\d+):(\d+):(\d+):(\d+)/g);
if (!matches || matches.length === 0) {
  console.error('Failed to find cropdetect bounds');
  process.exit(1);
}

const lastCrop = matches[matches.length - 1];
console.log('Detected union alpha bounding box:', lastCrop);
const parts = lastCrop.replace('crop=', '').split(':').map(Number);
const [rawW, rawH, rawX, rawY] = parts;

console.log(`Raw bounds: w=${rawW}, h=${rawH}, x=${rawX}, y=${rawY}`);

console.log('\n=== STEP 2: COMPUTE CROPPED RECTANGLE ===');
// 3% of h extra on top (headroom), 2% of w extra on each side, and NO extra at bottom
const extraTop = Math.round(0.03 * rawH);
const extraSide = Math.round(0.02 * rawW);

let targetY = rawY - extraTop;
let targetH = rawH + extraTop; // no extra at bottom
let targetX = rawX - extraSide;
let targetW = rawW + (2 * extraSide);

// Clamp to source frame
if (targetX < 0) { targetW += targetX; targetX = 0; }
if (targetY < 0) { targetH += targetY; targetY = 0; }
if (targetX + targetW > Number(srcWidth)) { targetW = Number(srcWidth) - targetX; }
if (targetY + targetH > Number(srcHeight)) { targetH = Number(srcHeight) - targetY; }

// Round all four values to even numbers
function toEven(val) {
  return val % 2 === 0 ? val : val - 1;
}

const finalW = toEven(Math.round(targetW));
const finalH = toEven(Math.round(targetH));
const finalX = toEven(Math.round(targetX));
const finalY = toEven(Math.round(targetY));

const cropFilter = `crop=${finalW}:${finalH}:${finalX}:${finalY}`;
console.log(`Calculated crop filter: ${cropFilter}`);
console.log(`Crop dimensions: ${finalW}x${finalH} at (${finalX}, ${finalY})`);

// Export calculated parameters for step 2 execution
fs.writeFileSync('crop_params.json', JSON.stringify({
  srcWidth: Number(srcWidth),
  srcHeight: Number(srcHeight),
  rFrameRate,
  duration,
  rawCrop: lastCrop,
  finalW,
  finalH,
  finalX,
  finalY,
  cropFilter
}, null, 2));
