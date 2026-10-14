import { pipeline } from '@xenova/transformers';

async function test() {
  console.log('Loading Whisper pipeline...');
  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  console.log('Whisper pipeline loaded successfully!');
}

test().catch(console.error);
