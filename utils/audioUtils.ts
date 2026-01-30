
// This file provides optimized utility functions for audio processing.

/**
 * Direct Base64 to Uint8Array conversion without intermediate string creation.
 * Standard atob() is fast but this is more robust for huge files.
 */
export function decodeBase64(base64: string): Uint8Array {
  const paddedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binaryString = atob(paddedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed:", e);
    throw new Error("Invalid audio data format.");
  }
}

/**
 * Creates a valid WAV file from raw PCM chunks.
 * Uses a single pre-allocated ArrayBuffer for maximum performance.
 */
export function createWavFileFromChunks(audioDataChunks: Uint8Array[], sampleRate: number, numChannels: number = 1): Blob {
  let totalDataSize = 0;
  for (let i = 0; i < audioDataChunks.length; i++) {
    totalDataSize += audioDataChunks[i].byteLength;
  }

  const headerLength = 44;
  const totalLength = totalDataSize + headerLength;
  const wavBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(wavBuffer);
  const uint8View = new Uint8Array(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, totalDataSize, true);

  // Fastest memory copy
  let offset = headerLength;
  for (let i = 0; i < audioDataChunks.length; i++) {
    uint8View.set(audioDataChunks[i], offset);
    offset += audioDataChunks[i].byteLength;
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

export function generateFilename(text: string, extension: string): string {
  if (!text) return `narrative-audio.${extension}`;
  const slug = text
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  return `${slug || 'narrative'}.${extension}`;
}
