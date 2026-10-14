const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const params = JSON.parse(fs.readFileSync('crop_params.json', 'utf-8'));
const { finalW, finalH, finalX, finalY, cropFilter } = params;

const srcWebmOrig = path.resolve('src/imports/ai-receptionist-avatar.webm.orig');
const destWebm = path.resolve('src/imports/ai-receptionist-avatar.webm');
const destMp4 = path.resolve('src/imports/ai-receptionist-avatar.mp4');
const destPng = path.resolve('src/imports/avatar-fallback.png');

console.log(`Applying crop filter: ${cropFilter}`);

// 1. WebM VP9 with Alpha Channel
if (!fs.existsSync(destWebm) || fs.statSync(destWebm).size < 10000) {
  console.log('Encoding cropped WebM (VP9 + Alpha)...');
  execSync(`"${ffmpeg}" -y -c:v libvpx-vp9 -i "${srcWebmOrig}" -vf "${cropFilter}" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an "${destWebm}"`, { stdio: 'inherit' });
}

// 2. MP4 Fallback from the cropped WebM (solid navy/dark background compatible)
console.log('Encoding cropped MP4 from WebM...');
execSync(`"${ffmpeg}" -y -c:v libvpx-vp9 -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -crf 22 -preset slow -movflags +faststart -an "${destMp4}"`, { stdio: 'inherit' });

// 3. Fallback PNG from first frame of cropped webm
console.log('Generating cropped fallback PNG...');
execSync(`"${ffmpeg}" -y -c:v libvpx-vp9 -i "${destWebm}" -vframes 1 -f image2 "${destPng}"`, { stdio: 'inherit' });

// Verify sizes
const webmSize = fs.statSync(destWebm).size;
const mp4Size = fs.statSync(destMp4).size;
const pngSize = fs.statSync(destPng).size;

console.log('\n--- Cropping Results ---');
console.log(`WebM size: ${(webmSize / (1024 * 1024)).toFixed(2)} MB (${webmSize} bytes)`);
console.log(`MP4 size:  ${(mp4Size / (1024 * 1024)).toFixed(2)} MB (${mp4Size} bytes)`);
console.log(`PNG size:  ${(pngSize / 1024).toFixed(2)} KB`);

// Probe cropped WebM to verify dimensions and frame rate
const probeWebm = execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "${destWebm}"`).toString().trim();
console.log('Cropped WebM probe (width,height,r_frame_rate,duration):', probeWebm);

const probeMp4 = execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "${destMp4}"`).toString().trim();
console.log('Cropped MP4 probe (width,height,r_frame_rate,duration):', probeMp4);
