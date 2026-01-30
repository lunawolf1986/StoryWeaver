
import { useState, useRef, useCallback, useEffect } from 'react';
import { decodeBase64, createWavFileFromChunks } from '../utils/audioUtils';
import { encodePcmToMp3 } from '../utils/mp3Encoder';

interface AudioControls {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  isEncoding: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  unloadAudio: () => void;
  loadAudio: (base64: string | string[]) => Promise<void>;
  hasAudioData: boolean;
  downloadWav: (filename: string) => void;
  downloadMp3: (filename: string) => Promise<void>;
}

const useAudio = (): AudioControls => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAudioData, setHasAudioData] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const rawPcmRef = useRef<Uint8Array | null>(null);

  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioCtxRef.current;
  }, []);

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
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
  };

  const unloadAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioBufferRef.current = null;
    rawPcmRef.current = null;
    setHasAudioData(false);
    setIsPlaying(false);
    setIsLoading(false);
    setIsEncoding(false);
    setIsReady(false);
    setDuration(0);
    setCurrentTime(0);
    setError(null);
  }, []);

  const loadAudio = useCallback(async (base64: string | string[]) => {
    unloadAudio();
    setIsLoading(true);
    setError(null);

    const b64Array = Array.isArray(base64) ? base64 : [base64];
    const ctx = initAudioCtx();

    try {
      const pcmChunks: Uint8Array[] = [];
      let totalLength = 0;
      for (const b64 of b64Array) {
        if (!b64) continue;
        const bytes = decodeBase64(b64);
        pcmChunks.push(bytes);
        totalLength += bytes.length;
      }

      const flattenedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        flattenedPcm.set(chunk, offset);
        offset += chunk.length;
      }
      rawPcmRef.current = flattenedPcm;

      const buffer = await decodeAudioData(flattenedPcm, ctx, 24000, 1);
      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      setHasAudioData(true);
      setIsReady(true);
      setIsLoading(false);
    } catch (e: any) {
      setError(`Audio decoding failed: ${e.message}`);
      setIsLoading(false);
      setIsReady(false);
    }
  }, [unloadAudio, initAudioCtx]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (isPlaying && audioCtxRef.current) {
        const played = audioCtxRef.current.currentTime - startTimeRef.current;
        setCurrentTime(Math.min(played, duration));
        if (played >= duration) {
            stop();
        }
      }
    }, 100);
  }, [isPlaying, duration, stop]);

  const play = useCallback(() => {
    const ctx = initAudioCtx();
    if (!audioBufferRef.current || !isReady) return;

    if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(ctx.destination);
    
    const offset = pauseTimeRef.current;
    source.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;
    sourceNodeRef.current = source;
    setIsPlaying(true);
    startTimer();
  }, [initAudioCtx, isReady, startTimer]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current && isPlaying) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      if (audioCtxRef.current) {
        pauseTimeRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
      }
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    stop();
    pauseTimeRef.current = time;
    setCurrentTime(time);
    if (wasPlaying) play();
  }, [isPlaying, stop, play]);

  const downloadWav = useCallback((filename: string) => {
    if (!rawPcmRef.current) return;
    const blob = createWavFileFromChunks([rawPcmRef.current], 24000, 1);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, []);

  const downloadMp3 = useCallback(async (filename: string) => {
    if (!rawPcmRef.current) return;
    setIsEncoding(true);
    try {
      const mp3Blob = await encodePcmToMp3(rawPcmRef.current, 24000, 1, 128);
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e: any) {
      setError(`MP3 fail: ${e.message}`);
    } finally {
      setIsEncoding(false);
    }
  }, []);

  return {
    isPlaying, isLoading, isReady, isEncoding, duration, currentTime, error,
    play, pause, stop, seek, unloadAudio, loadAudio,
    downloadWav, downloadMp3, hasAudioData,
  };
};

export default useAudio;
