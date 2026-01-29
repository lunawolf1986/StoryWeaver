
// @ts-ignore
import * as lamejs from 'lamejs';

/**
 * Encodes raw PCM data (Int16) to MP3 format.
 * This is a CPU intensive operation.
 */
export async function encodePcmToMp3(
  pcmData: Uint8Array, 
  sampleRate: number, 
  numChannels: number = 1, 
  kbps: number = 128
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // @ts-ignore
      const lib = window.lamejs || (typeof lamejs !== 'undefined' ? lamejs : null);
      if (!lib) {
        throw new Error("MP3 encoder library not loaded.");
      }

      // Convert Uint8Array PCM to Int16Array for the encoder
      const samples = new Int16Array(pcmData.buffer);
      const mp3encoder = new lib.Mp3Encoder(numChannels, sampleRate, kbps);
      const mp3Data: any[] = [];

      const sampleBlockSize = 576; // standard block size
      for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const sampleChunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(new Uint8Array(mp3buf));
        }
      }

      const mp3last = mp3encoder.flush();
      if (mp3last.length > 0) {
        mp3Data.push(new Uint8Array(mp3last));
      }

      resolve(new Blob(mp3Data, { type: 'audio/mp3' }));
    } catch (e) {
      reject(e);
    }
  });
}
