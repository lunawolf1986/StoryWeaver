
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedWavBlobRef = useRef<Blob | null>(null);
  const rawPcmRef = useRef<Uint8Array | null>(null);

  const initAudioElement = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = 1.0;

      audioRef.current.addEventListener('play', () => setIsPlaying(true));
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
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
      if (audioRef.current.dataset.blobUrl) {
          URL.revokeObjectURL(audioRef.current.dataset.blobUrl);
          delete audioRef.current.dataset.blobUrl;
      }
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    cachedWavBlobRef.current = null;
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
    const audioElement = initAudioElement();

    try {
      const pcmChunks: Uint8Array[] = [];
      let totalLength = 0;
      for (let i = 0; i < b64Array.length; i++) {
        if (!b64Array[i]) continue;
        const bytes = decodeBase64(b64Array[i]);
        pcmChunks.push(bytes);
        totalLength += bytes.length;
      }

      if (pcmChunks.length === 0) {
        throw new Error("No valid audio data provided.");
      }

      // Optimize: Create a single flattened PCM buffer for the encoder
      const flattenedPcm = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        flattenedPcm.set(chunk, offset);
        offset += chunk.length;
      }
      rawPcmRef.current = flattenedPcm;

      // Pre-create the WAV Blob for instant download later
      const wavBlob = createWavFileFromChunks(pcmChunks, 24000, 1);
      cachedWavBlobRef.current = wavBlob;

      const url = URL.createObjectURL(wavBlob);
      audioElement.src = url;
      audioElement.dataset.blobUrl = url;
      audioElement.load();
      setHasAudioData(true);
      
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
        setError("Playback blocked. Please interact with the page first.");
      });
    }
  }, [isReady]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
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
    if (audioRef.current && isReady) audioRef.current.currentTime = time;
  }, [isReady]);

  const downloadWav = useCallback((filename: string) => {
    if (!cachedWavBlobRef.current) {
        setError("No audio data ready for download.");
        return;
    }
    const url = URL.createObjectURL(cachedWavBlobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);
  
  const downloadMp3 = useCallback(async (filename: string) => {
      if (!rawPcmRef.current) {
          setError("No audio data ready for MP3 conversion.");
          return;
      }
      setIsEncoding(true);
      try {
        const mp3Blob = await encodePcmToMp3(rawPcmRef.current, 24000, 1, 128);
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e: any) {
        setError(`MP3 conversion failed: ${e.message}`);
      } finally {
        setIsEncoding(false);
      }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current && audioRef.current.dataset.blobUrl) {
        URL.revokeObjectURL(audioRef.current.dataset.blobUrl);
      }
    };
  }, []);

  return {
    isPlaying, isLoading, isReady, isEncoding, duration, currentTime, error,
    play, pause, stop, seek, unloadAudio, loadAudio,
    downloadWav, downloadMp3, hasAudioData,
  };
};

export default useAudio;
