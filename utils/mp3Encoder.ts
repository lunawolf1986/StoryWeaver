
/**
 * Encodes raw PCM data (Int16) to MP3 format.
 * Optimized for minimal allocations.
 */
export async function encodePcmToMp3(
  pcmData: Uint8Array, 
  sampleRate: number, 
  numChannels: number = 1, 
  kbps: number = 128
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const lib = (window as any).lamejs;
      if (!lib) {
        throw new Error("MP3 encoder not available.");
      }

      // Use the actual buffer slice to ensure we only process the relevant data
      const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
      const mp3encoder = new lib.Mp3Encoder(numChannels, sampleRate, kbps);
      const mp3Data: Uint8Array[] = [];

      const blockSize = 1152; // Lame standard block size for better efficiency
      for (let i = 0; i < samples.length; i += blockSize) {
        const sampleChunk = samples.subarray(i, i + blockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
          // lamejs returns a buffer that might be reused, so we must copy it
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
