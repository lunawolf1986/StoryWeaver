
import { useState, useRef, useCallback, useEffect } from 'react';
import { decodeBase64, decodeAudioData, createWavFileFromChunks } from '../utils/audioUtils';

interface AudioChunk {
  buffer: AudioBuffer;
  data: Uint8Array;
  index: number;
}

interface AudioControls {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  isEncoding: boolean; // For explicit download (finalization)
  isMp3BackgroundEncoding: boolean; // For continuous background encoding
  mp3BackgroundEncodingProgress: number; // Background encoding progress
  isMp3Ready: boolean; // Is MP3 ready for immediate download?
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

// Inlined Web Worker Script for MP3 encoding
const MP3_WORKER_SCRIPT = `
  self.lame = null;
  importScripts('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js');

  self.onmessage = function(e) {
    const { command, payload } = e.data;
    switch(command) {
      case 'init': {
        self.lame = new lamejs.Mp3Encoder(payload.channels, payload.sampleRate, payload.bitRate);
        self.postMessage({ command: 'init-complete' });
        break;
      }
      case 'encode-chunk': {
        if (!self.lame) {
            console.warn('LAME encoder not initialized in worker for encode-chunk.');
            return;
        }
        const int16Buffer = new Int16Array(payload.buffer, payload.byteOffset, payload.byteLength / 2);
        const mp3buf = self.lame.encodeBuffer(int16Buffer);
        if (mp3buf.length > 0) {
          self.postMessage({ command: 'mp3-data', buffer: mp3buf }, [mp3buf.buffer]);
        }
        break;
      }
      case 'flush': {
        if (!self.lame) {
            self.postMessage({ command: 'mp3-end' });
            return;
        }
        const mp3buf = self.lame.flush();
        if (mp3buf.length > 0) {
          self.postMessage({ command: 'mp3-data', buffer: mp3buf }, [mp3buf.buffer]);
        }
        self.postMessage({ command: 'mp3-end' });
        break;
      }
    }
  };
`;

const useAudio = (): AudioControls => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false); // Playback ready
  const [isEncoding, setIsEncoding] = useState(false); // Foreground download encoding (final flush)
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAudioData, setHasAudioData] = useState(false);

  // MP3 Background Encoding States
  const [isMp3BackgroundEncoding, setIsMp3BackgroundEncoding] = useState(false);
  const [mp3BackgroundEncodingProgress, setMp3BackgroundEncodingProgress] = useState(0);
  const [isMp3Ready, setIsMp3Ready] = useState(false); // MP3 data is fully encoded and ready

  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Map<number, AudioChunk>>(new Map()); // Raw PCM for playback/WAV
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const nextIndexToScheduleRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const currentPlaybackOffset = useRef(0);
  const playbackStartTime = useRef(0);
  
  // MP3 Background Worker References
  const mp3WorkerRef = useRef<Worker | null>(null);
  const mp3WorkerInitPromiseRef = useRef<Promise<void> | null>(null);
  const mp3EncodedChunksRef = useRef<Uint8Array[]>([]); // MP3 data chunks from worker
  const mp3BlobRef = useRef<Blob | null>(null); // Final MP3 Blob once ready

  // To ensure the background worker receives chunks in order
  const nextIndexToPushToMp3WorkerRef = useRef<number>(0);
  const rawPcmBufferForMp3Ref = useRef<Map<number, Uint8Array>>(new Map()); // Raw PCM buffered for worker

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
    rawPcmBufferForMp3Ref.current.clear();
    nextIndexToPushToMp3WorkerRef.current = 0;

    setIsReady(false);
    setIsLoading(false);
    setHasAudioData(false);
    setDuration(0);
    setError(null);

    // Clear MP3 specific states and terminate worker
    if (mp3WorkerRef.current) {
        mp3WorkerRef.current.terminate();
        mp3WorkerRef.current = null;
    }
    mp3WorkerInitPromiseRef.current = null;
    mp3EncodedChunksRef.current = [];
    mp3BlobRef.current = null;
    setIsMp3BackgroundEncoding(false);
    setMp3BackgroundEncodingProgress(0);
    setIsMp3Ready(false);
  }, [stop]);


  // MP3 Background Worker Initialization & Message Handling
  const initMp3Worker = useCallback(() => {
    if (mp3WorkerRef.current && mp3WorkerInitPromiseRef.current) {
        return mp3WorkerInitPromiseRef.current;
    }
    const promise = new Promise<void>((resolve, reject) => {
      try {
        const blob = new Blob([MP3_WORKER_SCRIPT], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);
        mp3WorkerRef.current = worker;

        worker.onmessage = (e) => {
          const { command, buffer } = e.data;
          if (command === 'init-complete') {
            resolve();
          } else if (command === 'mp3-data') {
            mp3EncodedChunksRef.current.push(buffer);
            // Optional: update progress here if we could track total raw PCM bytes
            // setMp3BackgroundEncodingProgress(...)
          } else if (command === 'mp3-end') {
            setIsMp3BackgroundEncoding(false);
            setMp3BackgroundEncodingProgress(100);
            mp3BlobRef.current = new Blob(mp3EncodedChunksRef.current, { type: 'audio/mpeg' });
            setIsMp3Ready(true);
            mp3WorkerRef.current?.terminate(); // Terminate worker after finalization
            mp3WorkerRef.current = null;
          }
        };

        worker.onerror = (e) => {
          console.error('MP3 Worker Error:', e);
          setError("MP3 background encoding failed.");
          setIsMp3BackgroundEncoding(false);
          reject(e);
        };

        worker.postMessage({
          command: 'init',
          payload: { channels: 1, sampleRate: 24000, bitRate: 128 },
        });
      } catch (e: any) {
        reject(e);
      }
    });
    mp3WorkerInitPromiseRef.current = promise;
    return promise;
  }, []);

  const pushRawPcmToMp3Worker = useCallback(async (data: Uint8Array, index: number, totalChunks: number | null) => {
    rawPcmBufferForMp3Ref.current.set(index, data);
    setIsMp3BackgroundEncoding(true);
    await initMp3Worker(); // Ensure worker is initialized

    while (rawPcmBufferForMp3Ref.current.has(nextIndexToPushToMp3WorkerRef.current)) {
      const chunkToEncode = rawPcmBufferForMp3Ref.current.get(nextIndexToPushToMp3WorkerRef.current);
      if (chunkToEncode) {
        // Use .slice() to create a new buffer for transfer; original `data` might be retained by `chunksRef`
        mp3WorkerRef.current?.postMessage({ command: 'encode-chunk', payload: chunkToEncode.slice() }, [chunkToEncode.buffer.slice(chunkToEncode.byteOffset, chunkToEncode.byteOffset + chunkToEncode.byteLength)]);
        // Simple progress calculation based on number of chunks processed
        if (totalChunks) {
          setMp3BackgroundEncodingProgress(Math.floor((nextIndexToPushToMp3WorkerRef.current + 1) / totalChunks * 100));
        }
      }
      rawPcmBufferForMp3Ref.current.delete(nextIndexToPushToMp3WorkerRef.current);
      nextIndexToPushToMp3WorkerRef.current++;
    }

    // If all chunks were pushed and we know the total, trigger flush
    if (totalChunks !== null && nextIndexToPushToMp3WorkerRef.current === totalChunks) {
        mp3WorkerRef.current?.postMessage({ command: 'flush' });
    }
  }, [initMp3Worker]);


  const scheduleAvailableChunks = useCallback(() => {
    const ctx = initAudioCtx();
    if (!isPlayingRef.current) return;

    let schedulePointer = nextStartTimeRef.current;
    if (schedulePointer < ctx.currentTime) {
      schedulePointer = ctx.currentTime + 0.1;
    }

    while (chunksRef.current.has(nextIndexToScheduleRef.current)) {
      const chunk = chunksRef.current.get(nextIndexToScheduleRef.current);
      if (chunk) {
        const source = ctx.createBufferSource();
        source.buffer = chunk.buffer;
        source.connect(ctx.destination);
        source.start(schedulePointer);
        sourceNodesRef.current.push(source);
        schedulePointer += chunk.buffer.duration;
      }
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

  const queueAudioChunk = useCallback(async (base64: string | null, index: number, totalChunks: number | null = null) => {
    const ctx = initAudioCtx();
    try {
      if (!base64) {
        // Handle null/empty chunk if necessary for sequencing, though usually for audio we expect data
        console.warn(`Received null base64 for chunk index ${index}`);
        return;
      }

      const bytes = decodeBase64(base64);
      const buffer = await decodeAudioData(bytes, ctx, 24000, 1);
      
      chunksRef.current.set(index, { buffer, index, data: bytes });
      
      // Also push to background MP3 encoder
      pushRawPcmToMp3Worker(bytes, index, totalChunks);

      setHasAudioData(true);
      setIsReady(true);
      
      if (index === 0) {
          setIsLoading(false); // First chunk indicates playback loading is done
          if (!isPlayingRef.current) {
              setIsPlaying(true);
              isPlayingRef.current = true;
          }
      }
      scheduleAvailableChunks();
    } catch (e) {
      console.error("Failed to queue audio chunk:", e);
      // Fallback for audio generation error, attempt to keep playback going if possible
      scheduleAvailableChunks(); 
    }
  }, [initAudioCtx, scheduleAvailableChunks, pushRawPcmToMp3Worker]);
  
  const prepareForStreaming = useCallback(() => {
      unloadAudio();
      setIsLoading(true);
      setIsMp3Ready(false); // Reset MP3 ready state for new stream
      setMp3BackgroundEncodingProgress(0);
      mp3EncodedChunksRef.current = []; // Clear previous MP3 chunks
      mp3BlobRef.current = null;
  }, [unloadAudio]);

  const loadAudio = useCallback(async (base64: string | string[]) => {
    prepareForStreaming();
    const b64Array = Array.isArray(base64) ? base64 : [base64];
    try {
        // Initialize MP3 worker upfront
        setIsMp3BackgroundEncoding(true);
        mp3EncodedChunksRef.current = []; // Clear for new load
        await initMp3Worker();
        
        for(let i = 0; i < b64Array.length; i++) {
            await queueAudioChunk(b64Array[i], i, b64Array.length);
        }
    } catch(e) {
        setError("Narrator encountered a connectivity issue.");
    } finally {
        setIsLoading(false);
    }
  }, [prepareForStreaming, queueAudioChunk, initMp3Worker]);

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

    if (targetChunkIndex === -1) return; // Should not happen if time is within duration

    currentPlaybackOffset.current = time;
    let scheduleTime = ctx.currentTime + 0.1;

    // Reschedule from target chunk onwards
    for (let i = targetChunkIndex; i < sortedChunks.length; i++) {
        const chunk = sortedChunks[i];
        const source = ctx.createBufferSource();
        source.buffer = chunk.buffer;
        source.connect(ctx.destination);
        const offset = (sortedChunks[i].index === sortedChunks[targetChunkIndex].index) ? timeIntoChunk : 0;
        source.start(scheduleTime, offset);
        scheduleTime += chunk.buffer.duration - offset;
        sourceNodesRef.current.push(source);
    }
    
    setIsPlaying(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    scheduleAvailableChunks(); // Restart timer
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
        .map(c => c.data); // Use the raw Uint8Array data
      const blob = createWavFileFromChunks(sortedChunks, 24000, 1);
      triggerDownload(blob, filename);
    } catch (e: any) {
      setError(`Export failed: ${e.message}`);
    }
  };

  const downloadMp3 = async (filename: string) => {
    if (!hasAudioData) {
        setError("No audio data available for download.");
        return;
    }
    if (mp3BlobRef.current && isMp3Ready) {
        triggerDownload(mp3BlobRef.current, filename);
        return;
    }
    
    setIsEncoding(true); // Indicate foreground encoding if not ready
    setError(null);
    
    try {
        // Ensure worker is initialized and all chunks have been pushed to it
        await initMp3Worker(); // This also ensures any remaining buffered PCM is pushed to worker
        mp3WorkerRef.current?.postMessage({ command: 'flush' }); // Force flush any remaining data in worker

        // Wait for the 'mp3-end' message which will set mp3BlobRef.current and isMp3Ready
        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (isMp3Ready && mp3BlobRef.current) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });

        if (mp3BlobRef.current) {
            triggerDownload(mp3BlobRef.current, filename);
        } else {
            throw new Error("MP3 data not available after finalization.");
        }

    } catch (e) {
        console.error("MP3 finalization failed:", e);
        setError("Studio export timed out or failed.");
    } finally {
        setIsEncoding(false);
    }
  };

  return {
    isPlaying, isLoading, isReady, isEncoding, duration, currentTime, error,
    play, pause, stop, seek, unloadAudio, loadAudio, queueAudioChunk, prepareForStreaming,
    downloadWav, downloadMp3, hasAudioData,
    isMp3BackgroundEncoding, mp3BackgroundEncodingProgress, isMp3Ready,
  };
};

export default useAudio;
