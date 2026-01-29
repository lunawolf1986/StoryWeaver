
import React, { useMemo } from 'react';

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  isReady: boolean;
  isStreaming?: boolean;
  isEncoding?: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
  play: () => void;
  pause: () => void;
  onSeek: (time: number) => void;
  stop: () => void;
  downloadWav?: (filename: string) => void;
  downloadMp3?: (filename: string) => Promise<void>;
  hasAudioData?: boolean;
  loadingText?: string;
  downloadSegment?: () => void;
  segmentLabel?: string;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  isLoading,
  isReady,
  isStreaming,
  isEncoding,
  duration,
  currentTime,
  error,
  play,
  pause,
  onSeek,
  stop,
  downloadWav,
  downloadMp3,
  hasAudioData,
  loadingText = "Preparing Voice...",
  segmentLabel,
}) => {

  const progress = useMemo(() => (duration > 0 ? (currentTime / duration) * 100 : 0), [
    currentTime,
    duration,
  ]);

  const handleDownloadMp3 = async () => {
    if (!downloadMp3) return;
    await downloadMp3('narration.mp3');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-indigo-900/40 border border-indigo-500/30 rounded-xl animate-pulse">
        <svg className="animate-spin -ml-1 mr-4 h-6 w-6 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span className="text-lg font-semibold text-indigo-200">{loadingText}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-900/50 rounded-lg border border-red-500/30">
        <div className="flex items-center gap-3 text-red-300 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </div>
      </div>
    );
  }

  if (!isReady && !isPlaying) return null;

  return (
    <div className="bg-slate-900 border-2 border-indigo-500/50 p-6 rounded-2xl shadow-2xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full animate-pulse ${hasAudioData ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                <span className={`text-xs font-bold uppercase tracking-widest ${hasAudioData ? 'text-green-400' : 'text-amber-400'}`}>
                    {hasAudioData ? (isStreaming ? 'Streaming Content...' : 'Studio Narration Active') : 'Basic Live Preview'}
                </span>
            </div>
            {segmentLabel && (
                <span className="text-[10px] text-indigo-400 font-bold uppercase mt-1">Source: {segmentLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {hasAudioData && !isStreaming && (
              <div className="flex items-center gap-2 bg-gray-800/50 p-1.5 px-3 rounded-lg border border-gray-700 shadow-inner">
                <span className="text-[10px] text-gray-500 font-black uppercase mr-1">Download Narration:</span>
                <button 
                  onClick={() => downloadWav?.('narration.wav')} 
                  className="px-2.5 py-1 text-[10px] bg-gray-700 hover:bg-emerald-600 text-gray-200 hover:text-white rounded font-bold uppercase transition-all flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  WAV
                </button>
                <button 
                  onClick={handleDownloadMp3} 
                  disabled={isEncoding}
                  className="px-2.5 py-1 text-[10px] bg-gray-700 hover:bg-indigo-600 text-gray-200 hover:text-white rounded font-bold uppercase transition-all disabled:opacity-50 flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  {isEncoding ? 'Processing...' : 'MP3'}
                </button>
              </div>
            )}
            <button onClick={stop} className="text-[10px] text-red-400 font-bold uppercase hover:bg-red-900/20 px-2 py-1 rounded transition-colors">Stop</button>
          </div>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={isPlaying ? pause : play}
          className={`p-4 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-110 focus:outline-none ${isPlaying ? 'bg-amber-600' : 'bg-indigo-600'}`}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          )}
        </button>
        <div className="flex-grow space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative cursor-pointer group" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                onSeek((x / rect.width) * duration);
            }}>
                <div className="bg-indigo-500 h-full transition-all duration-100 ease-out relative" style={{ width: `${progress}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
