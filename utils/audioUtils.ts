
// This file provides utility functions for audio processing, used by hooks/useAudio.ts.

export function decodeBase64(base64: string): Uint8Array {
  // A robust base64 decoder that handles URL-safe characters and missing padding.
  const paddedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  
  try {
    const binaryString = atob(paddedBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed:", e, "Input:", base64.substring(0, 100));
    throw new Error("Invalid base64 string provided for audio decoding.");
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function createWavFileFromChunks(audioDataChunks: Uint8Array[], sampleRate: number, numChannels: number = 1): Blob {
    const totalDataSize = audioDataChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const headerLength = 44;
    const totalLength = totalDataSize + headerLength;
    
    // Use a single buffer for the entire WAV file for maximum performance
    const wavBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(wavBuffer);
    const uint8View = new Uint8Array(wavBuffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, totalDataSize, true);

    // Efficiently copy PCM data into the buffer
    let offset = headerLength;
    for (const chunk of audioDataChunks) {
        uint8View.set(chunk, offset);
        offset += chunk.byteLength;
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
};
