

// This file is no longer used. Its contents have been inlined into useAudio.ts
// for better control over the Web Worker lifecycle and to avoid module import issues.
// The code has been replaced by MP3_WORKER_SCRIPT constant in useAudio.ts.

export function decodeBase64(base64: string): Uint8Array {
  // A robust base64 decoder that handles URL-safe characters and missing padding.
  let paddedBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (paddedBase64.length % 4) {
    paddedBase64 += '=';
  }

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

export function encodeToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // PCM data is Int16 (2 bytes per sample)
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function createWavFileFromChunks(audioDataChunks: Uint8Array[], sampleRate: number, numChannels: number = 1): Blob {
    const totalDataSize = audioDataChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const headerLength = 44;
    const buffer = new ArrayBuffer(headerLength);
    const view = new DataView(buffer);
    const totalLength = totalDataSize + headerLength;

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

    return new Blob([view, ...audioDataChunks], { type: 'audio/wav' });
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