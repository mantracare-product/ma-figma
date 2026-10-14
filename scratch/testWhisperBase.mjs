import { pipeline } from '@xenova/transformers';

async function main() {
  console.log('Testing Xenova/whisper-base...');
  const t0 = Date.now();
  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
  console.log(`Loaded whisper-base in ${Date.now() - t0}ms`);
}

main().catch(console.error);
