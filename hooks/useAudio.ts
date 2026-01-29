
import { useState, useRef, useCallback, useEffect } from 'react';
import { decodeBase64, decodeAudioData, createWavFileFromChunks } from '../utils/audioUtils';
import { Mp3Encoder } from '../utils/mp3Encoder';

interface AudioChunk {
  buffer: AudioBuffer;
  data: Uint8Array;
  index: number;
}

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
  queueAudioChunk: (base64: string | null, index: number) => Promise<void>;
  prepareForStreaming: () => void;
  downloadWav: (filename: string) => void;
  downloadMp3: (filename: string) => Promise<void>;
  hasAudioData: boolean;
}

const useAudio = (): AudioControls => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAudioData, setHasAudioData] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Map<number, AudioChunk>>(new Map());
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const nextIndexToScheduleRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const currentPlaybackOffset = useRef(0);
  const playbackStartTime = useRef(0);
  
  const mp3EncoderRef = useRef<Mp3Encoder | null>(null);
  const mp3BlobRef = useRef<Blob | null>(null);
  const mp3InitPromiseRef = useRef<Promise<void> | null>(null);

  const nextIndexToEncodeRef = useRef<number>(0);
  const encodingBufferRef = useRef<Map<number, Uint8Array | null>>(new Map());

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const initAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioCtxRef.current;
  }, []);

  const ensureEncoder = useCallback(async () => {
    if (mp3EncoderRef.current && mp3InitPromiseRef.current) {
        await mp3InitPromiseRef.current;
        return mp3EncoderRef.current;
    }
    const encoder = new Mp3Encoder(24000, 1);
    mp3EncoderRef.current = encoder;
    mp3InitPromiseRef.current = encoder.init();
    await mp3InitPromiseRef.current;
    return encoder;
  }, []);

  const processEncodingQueue = useCallback(async () => {
    const encoder = await ensureEncoder();
    while (encodingBufferRef.current.has(nextIndexToEncodeRef.current)) {
        const data = encodingBufferRef.current.get(nextIndexToEncodeRef.current);
        if (data) {
          encoder.push(data);
        }
        encodingBufferRef.current.delete(nextIndexToEncodeRef.current);
        nextIndexToEncodeRef.current++;
    }
  }, [ensureEncoder]);

  const stop = useCallback(() => {
    sourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) {}
    });
    sourceNodesRef.current = [];
    
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    nextStartTimeRef.current = 0;
    nextIndexToScheduleRef.current = 0;
    currentPlaybackOffset.current = 0;
    playbackStartTime.current = 0;
  }, []);

  const pause = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
    audioCtxRef.current.suspend();
    setIsPlaying(false);
    currentPlaybackOffset.current += audioCtxRef.current.currentTime - playbackStartTime.current;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const unloadAudio = useCallback(() => {
    stop();
    chunksRef.current.clear();
    encodingBufferRef.current.clear();
    nextIndexToEncodeRef.current = 0;
    setIsReady(false);
    setIsLoading(false);
    setHasAudioData(false);
    setDuration(0);
    mp3BlobRef.current = null;
    if (mp3EncoderRef.current) {
        mp3EncoderRef.current.terminate();
        mp3EncoderRef.current = null;
    }
    mp3InitPromiseRef.current = null;
    setError(null);
  }, [stop]);

  const scheduleAvailableChunks = useCallback(() => {
    const ctx = initAudioCtx();
    if (!isPlayingRef.current) return;

    let schedulePointer = nextStartTimeRef.current;
    if (schedulePointer < ctx.currentTime) {
      schedulePointer = ctx.currentTime + 0.1;
    }

    while (chunksRef.current.has(nextIndexToScheduleRef.current) || encodingBufferRef.current.has(nextIndexToScheduleRef.current)) {
      const chunk = chunksRef.current.get(nextIndexToScheduleRef.current);
      if (chunk) {
        const source = ctx.createBufferSource();
        source.buffer = chunk.buffer;
        source.connect(ctx.destination);
        source.start(schedulePointer);
        sourceNodesRef.current.push(source);
        schedulePointer += chunk.buffer.duration;
      }
      // Increment even if it was a failed/null chunk to keep the timeline moving
      nextIndexToScheduleRef.current += 1;
    }
    nextStartTimeRef.current = schedulePointer;
    
    let totalDur = 0;
    chunksRef.current.forEach(c => totalDur += c.buffer.duration);
    setDuration(totalDur);

    if (timerRef.current === null && chunksRef.current.size > 0) {
      playbackStartTime.current = ctx.currentTime;
      timerRef.current = window.setInterval(() => {
        if (ctx.state === 'running') {
            const newTime = currentPlaybackOffset.current + (ctx.currentTime - playbackStartTime.current);
            setCurrentTime(newTime);
        }
      }, 100);
    }
  }, [initAudioCtx]);

  const queueAudioChunk = useCallback(async (base64: string | null, index: number) => {
    const ctx = initAudioCtx();
    try {
      if (!base64) {
        encodingBufferRef.current.set(index, null);
        processEncodingQueue();
        scheduleAvailableChunks();
        return;
      }

      const bytes = decodeBase64(base64);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
      
      chunksRef.current.set(index, { buffer, index, data: bytes });
      encodingBufferRef.current.set(index, bytes);
      
      processEncodingQueue();
      setHasAudioData(true);
      setIsReady(true);
      
      if (index === 0) {
          setIsLoading(false);
          if (!isPlayingRef.current) {
              setIsPlaying(true);
              isPlayingRef.current = true;
          }
      }
      scheduleAvailableChunks();
    } catch (e) {
      console.error("Failed to queue audio chunk:", e);
      encodingBufferRef.current.set(index, null);
      processEncodingQueue();
      scheduleAvailableChunks();
    }
  }, [initAudioCtx, scheduleAvailableChunks, processEncodingQueue]);
  
  const prepareForStreaming = useCallback(() => {
      unloadAudio();
      setIsLoading(true);
  }, [unloadAudio]);

  const loadAudio = useCallback(async (base64: string | string[]) => {
    prepareForStreaming();
    const b64Array = Array.isArray(base64) ? base64 : [base64];
    try {
        for(let i = 0; i < b64Array.length; i++) {
            await queueAudioChunk(b64Array[i], i);
        }
    } catch(e) {
        setError("Narrator encountered a connectivity issue.");
    } finally {
        setIsLoading(false);
    }
  }, [prepareForStreaming, queueAudioChunk]);

  const play = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else if (isReady) {
      const ctx = initAudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      setIsPlaying(true);
      playbackStartTime.current = ctx.currentTime;
      scheduleAvailableChunks();
    }
  }, [isPlaying, isReady, pause, initAudioCtx, scheduleAvailableChunks]);

  const seek = useCallback((time: number) => {
    if (!hasAudioData) return;
    stop();
    const ctx = initAudioCtx();
    let accumulatedDuration = 0;
    const sortedChunks = (Array.from(chunksRef.current.values()) as AudioChunk[]).sort((a,b) => a.index - b.index);
    let targetChunkIndex = -1;
    let timeIntoChunk = 0;

    for(let i=0; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        if (accumulatedDuration + chunk.buffer.duration > time) {
            targetChunkIndex = i;
            timeIntoChunk = time - accumulatedDuration;
            break;
        }
        accumulatedDuration += chunk.buffer.duration;
    }

    if (targetChunkIndex === -1) return;

    currentPlaybackOffset.current = time;
    let scheduleTime = ctx.currentTime + 0.1;

    for (let i = targetChunkIndex; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        const source = ctx.createBufferSource();
        source.buffer = chunk.buffer;
        source.connect(ctx.destination);
        const offset = (i === targetChunkIndex) ? timeIntoChunk : 0;
        source.start(scheduleTime, offset);
        scheduleTime += chunk.buffer.duration - offset;
        sourceNodesRef.current.push(source);
    }
    
    setIsPlaying(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    scheduleAvailableChunks();
  }, [hasAudioData, stop, initAudioCtx, scheduleAvailableChunks]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const downloadWav = (filename: string) => {
    if (chunksRef.current.size === 0) {
        setError("No audio data available for download.");
        return;
    }
    try {
      const sortedChunks = (Array.from(chunksRef.current.values()) as AudioChunk[])
        .sort((a, b) => a.index - b.index)
        .map(c => c.data);
      const blob = createWavFileFromChunks(sortedChunks, 24000, 1);
      triggerDownload(blob, filename);
    } catch (e: any) {
      setError(`Export failed: ${e.message}`);
    }
  };

  const downloadMp3 = async (filename: string) => {
    if (mp3BlobRef.current) {
        triggerDownload(mp3BlobRef.current, filename);
        return;
    }
    if (!mp3EncoderRef.current) {
        setError("Studio voice not ready.");
        return;
    }
    setIsEncoding(true);
    try {
        await mp3InitPromiseRef.current;
        const mp3DataChunks = await mp3EncoderRef.current.finalize();
        const blob = new Blob(mp3DataChunks, { type: 'audio/mpeg' });
        mp3BlobRef.current = blob;
        triggerDownload(blob, filename);
    } catch (e) {
        console.error("MP3 finalization failed:", e);
        setError("Studio export timed out. Partial content saved.");
    } finally {
        setIsEncoding(false);
    }
  };

  return {
    isPlaying, isLoading, isReady, isEncoding, duration, currentTime, error,
    play, pause, stop, seek, unloadAudio, loadAudio, queueAudioChunk, prepareForStreaming,
    downloadWav, downloadMp3, hasAudioData
  };
};

export default useAudio;
