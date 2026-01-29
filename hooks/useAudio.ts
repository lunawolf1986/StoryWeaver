import { useState, useRef, useCallback, useEffect } from 'react';
import { decodeBase64, createWavFileFromChunks } from '../utils/audioUtils';

interface AudioChunk {
  data: Uint8Array;
  index: number;
}

interface AudioControls {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
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
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasAudioData, setHasAudioData] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioDataRef = useRef<Map<number, Uint8Array>>(new Map()); // Store raw PCM data chunks for WAV export

  const initAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 1.0; // Set volume to 1.0 as requested

      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0); // Reset time on end
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      audioRef.current.addEventListener('durationchange', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error("Audio playback error:", e);
        setError("Audio playback failed. The file might be corrupted or unsupported.");
        setIsLoading(false);
        setIsReady(false);
      });
      audioRef.current.addEventListener('canplaythrough', () => {
        setIsLoading(false);
        setIsReady(true);
      });
    }
    return audioRef.current;
  }, []);

  const unloadAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load(); // Reload to clear the audio buffer
    }
    audioDataRef.current.clear();
    setHasAudioData(false);
    setIsPlaying(false);
    setIsLoading(false);
    setIsReady(false);
    setDuration(0);
    setCurrentTime(0);
    setError(null);
  }, []);

  const loadAudio = useCallback(async (base64: string | string[]) => {
    unloadAudio(); // Clear any previous audio
    setIsLoading(true);
    setError(null);

    const b64Array = Array.isArray(base64) ? base64 : [base64];
    const audioElement = initAudioElement();

    try {
      const pcmChunks: Uint8Array[] = [];
      for (let i = 0; i < b64Array.length; i++) {
        if (!b64Array[i]) {
          console.warn(`Received null base64 for chunk index ${i}`);
          continue;
        }
        const bytes = decodeBase64(b64Array[i]);
        pcmChunks.push(bytes);
        audioDataRef.current.set(i, bytes); // Store for WAV export
      }

      if (pcmChunks.length === 0) {
        throw new Error("No valid audio data provided.");
      }

      const wavBlob = createWavFileFromChunks(pcmChunks, 24000, 1);
      const url = URL.createObjectURL(wavBlob);

      audioElement.src = url;
      audioElement.load();
      setHasAudioData(true);
      // Revoke old URL if any
      if (audioElement.dataset.blobUrl) {
          URL.revokeObjectURL(audioElement.dataset.blobUrl);
      }
      audioElement.dataset.blobUrl = url; // Store new URL for later revocation
      
    } catch (e: any) {
      console.error("Failed to load audio:", e);
      setError(`Audio loading failed: ${e.message || "An unknown error occurred."}`);
      setIsLoading(false);
      setIsReady(false);
    }
  }, [unloadAudio, initAudioElement]);

  const play = useCallback(() => {
    if (audioRef.current && isReady) {
      audioRef.current.play().catch(e => {
        console.error("Error playing audio:", e);
        setError("Failed to play audio. User interaction might be required or the media is not ready.");
      });
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isReady) {
      audioRef.current.currentTime = time;
    }
  }, [isReady]);

  // Fix: Correctly sort audio chunks by their original index (key in the Map)
  const downloadWav = useCallback((filename: string) => {
    if (audioDataRef.current.size === 0) {
        setError("No audio data available for WAV download.");
        return;
    }
    try {
      const sortedChunks = Array.from(audioDataRef.current.entries())
                               .sort(([idxA], [idxB]) => idxA - idxB) // Sort by the numerical index (key)
                               .map(([, data]) => data); // Extract only the Uint8Array data
      const blob = createWavFileFromChunks(sortedChunks, 24000, 1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(`WAV export failed: ${e.message}`);
    }
  }, []);
  
  // MP3 download is not supported in this version.
  const downloadMp3 = useCallback(async (filename: string) => {
      setError("MP3 download is not supported in this version. Please download as WAV.");
  }, []);


  useEffect(() => {
    // Cleanup URL when component unmounts or audio changes
    return () => {
      if (audioRef.current && audioRef.current.dataset.blobUrl) {
        URL.revokeObjectURL(audioRef.current.dataset.blobUrl);
      }
    };
  }, [audioRef]);


  return {
    isPlaying, isLoading, isReady, duration, currentTime, error,
    play, pause, stop, seek, unloadAudio, loadAudio,
    downloadWav, downloadMp3, hasAudioData,
  };
};

export default useAudio;