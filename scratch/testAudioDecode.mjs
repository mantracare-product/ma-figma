import { pipeline } from '@xenova/transformers';
import pkg from 'wavefile';
const { WaveFile } = pkg;

async function main() {
  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  
  const wav = new WaveFile();
  const sampleRate = 16000;
  const samples = new Float32Array(sampleRate);
  wav.fromScratch(1, sampleRate, '32f', samples);
  
  let wavBuffer = wav.toBuffer();
  const loadedWav = new WaveFile(wavBuffer);
  loadedWav.toSampleRate(16000);
  loadedWav.toBitDepth('32f');
  
  const audioData = loadedWav.getSamples(false, Float32Array);
  console.log('Audio samples length:', audioData.length);
  
  const result = await transcriber(audioData);
  console.log('Transcription result:', result);
}

main().catch(console.error);
