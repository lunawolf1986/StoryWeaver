
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateSleepStoryScript, generateAudio } from '../services/geminiService';
import { SleepTheme, SLEEP_THEMES, StoryFandom, GENRE_CATEGORIES, FANDOM_CATEGORIES, SavedNarrative, NarrativeType, StoryGenre, VOICE_OPTIONS, SLEEP_STORY_LENGTHS } from '../types';
import { useTasks } from '../contexts/TaskContext';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';
import AudioPlayer from '../components/AudioPlayer';
import useAudio from '../hooks/useAudio';
import useLocalStorage from '../hooks/useLocalStorage';
import useAutosaveTextarea from '../hooks/useAutosaveTextarea';
import ConfirmationModal from '../components/ConfirmationModal';
import { generateFilename } from '../utils/audioUtils';

const GroupedSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
    categories: Record<string, string[]>;
    className?: string;
}> = ({ value, onChange, categories, className }) => (
    <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={`p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white ${className}`}
    >
        {(Object.entries(categories) as [string, string[]][]).map(([category, items]) => (
            <optgroup key={category} label={category} className="bg-gray-800 text-indigo-300 font-bold">
                {items.map(item => (
                    <option key={item} value={item} className="bg-gray-700 text-white font-normal">{item}</option>
                ))}
            </optgroup>
        ))}
    </select>
);

const SleepStory: React.FC<{
    onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string, audioBase64?: string) => void;
    narrativeToLoad: SavedNarrative | null;
    onLoadComplete: () => void;
    savedNarratives: SavedNarrative[];
}> = ({ onSave, narrativeToLoad, onLoadComplete, savedNarratives }) => {
  const { addTask, tasks } = useTasks();
  const [theme, setTheme] = useLocalStorage<SleepTheme>('sleepstory-theme', 'Enchanted Forest');
  const [targetWordCount, setTargetWordCount] = useLocalStorage<number>('sleep-word-count', 1500);
  const [voice, setVoice] = useLocalStorage<string>('sleep-voice', 'Charon');
  
  const [genre, setGenre] = useLocalStorage<StoryGenre>('sleep-genre', 'None (General)');
  const [genre2, setGenre2] = useLocalStorage<StoryGenre>('sleep-genre2', 'None (General)');
  const [genre3, setGenre3] = useLocalStorage<StoryGenre>('sleep-genre3', 'None (General)');
  const [fandom1, setFandom1] = useLocalStorage<StoryFandom>('sleep-fandom1', 'None (General)');
  const [fandom2, setFandom2] = useLocalStorage<StoryFandom>('sleep-fandom2', 'None (General)');
  
  const [customPrompt, setCustomPrompt] = useState('');

  const [generatedText, setGeneratedText, wasTextRestored] = useAutosaveTextarea('autosave-sleepstory', '');
  const [error, setError] = useState<string | null>(null);

  // Custom Length Toggle State
  const [isCustomLength, setIsCustomLength] = useLocalStorage<boolean>('sleep-is-custom-len', false);

  // Audio State
  const { loadAudio, unloadAudio, seek, downloadWav, downloadMp3, stop, isMp3BackgroundEncoding, mp3BackgroundEncodingProgress, isMp3Ready, ...audioPlayerProps } = useAudio();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;
  const isBusy = activeTaskCount > 0 || isGeneratingAudio || audioPlayerProps.isLoading;

  const currentLengthIndex = useMemo(() => {
    const idx = SLEEP_STORY_LENGTHS.findIndex(l => l.wordCount === targetWordCount);
    if (idx !== -1) return idx;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    SLEEP_STORY_LENGTHS.forEach((l, i) => {
        const diff = Math.abs(l.wordCount - targetWordCount);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
    });
    return closestIdx;
  }, [targetWordCount]);

  const currentLengthName = useMemo(() => {
      const exact = SLEEP_STORY_LENGTHS.find(l => l.wordCount === targetWordCount);
      if (exact) return exact.name;
      if (targetWordCount < 800) return "Flash Sleep Scale";
      if (targetWordCount < 2500) return "Standard Sleep Scale";
      return "Epic Sleep Journey";
  }, [targetWordCount]);

  useEffect(() => {
    const runningTask = tasks.find(t => t.type === 'generate-sleep-story' && t.status === 'running');
    if (runningTask && runningTask.partialResult) {
        setGeneratedText(runningTask.partialResult);
    } else if (runningTask === undefined && tasks.find(t => t.type === 'generate-sleep-story' && t.status === 'completed')) {
        const lastCompleted = tasks.filter(t => t.type === 'generate-sleep-story' && t.status === 'completed')[0];
        if (lastCompleted && lastCompleted.result) setGeneratedText(lastCompleted.result);
    }
  }, [tasks, setGeneratedText]);

  const handleConfirmReset = useCallback(() => {
    setCustomPrompt(''); setGeneratedText(''); setError(null);
    setTheme('Enchanted Forest'); setTargetWordCount(1500);
    setGenre('None (General)'); setGenre2('None (General)'); setGenre3('None (General)');
    setFandom1('None (General)'); setFandom2('None (General)');
    setIsCustomLength(false);
    unloadAudio();
    setCurrentAudioBase64(null);
    setIsResetModalOpen(false);
  }, [setGeneratedText, setTheme, setTargetWordCount, setGenre, setGenre2, setGenre3, setFandom1, setFandom2, setIsCustomLength, unloadAudio]);
  
  useEffect(() => {
    if(narrativeToLoad && narrativeToLoad.type === 'SleepStory') {
      setGeneratedText(narrativeToLoad.content);
      if (narrativeToLoad.audioBase64) {
          setCurrentAudioBase64(narrativeToLoad.audioBase64);
          loadAudio(narrativeToLoad.audioBase64).catch(console.error);
      }
      onLoadComplete();
    }
  }, [narrativeToLoad, onLoadComplete, setGeneratedText, loadAudio]);

  const handleGenerateScript = () => {
    setError(null); setGeneratedText('');
    unloadAudio();
    setCurrentAudioBase64(null);
    addTask({
        type: 'generate-sleep-story',
        name: `Sleep Story: ${theme}`,
        payload: { theme, wordCount: targetWordCount, customPrompt, fandom1: [genre, genre2, genre3], fandom2: [fandom1, fandom2] }
    });
  };

  const handleGenerateAudio = async () => {
    if (!generatedText) return;
    setIsGeneratingAudio(true);
    setError(null);
    try {
        const audioB64 = await generateAudio(generatedText, voice);
        setCurrentAudioBase64(audioB64);
        await loadAudio(audioB64);
    } catch (e: any) {
        setError("Audio generation failed: " + e.message);
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const handleSave = () => {
    if (!generatedText) return;
    onSave(generatedText, 'SleepStory', `Sleep Story: ${customPrompt.substring(0, 30) || theme}`, undefined, undefined, currentAudioBase64 || undefined);
  };

  const getReadingTime = (words: number) => {
      const min = Math.ceil(words / 110);
      return min === 1 ? '1 min' : `${min} mins`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-indigo-300">Sleep Story</h2>
            <Button onClick={() => setIsResetModalOpen(true)} disabled={isBusy} className="bg-gray-600 hover:bg-gray-500 !py-1.5 text-xs">Clear</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Base Theme</label>
                <select value={theme} onChange={e => setTheme(e.target.value as SleepTheme)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
                  {SLEEP_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Narration Voice</label>
                <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
                    {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Length</label>
                    <button 
                        onClick={() => setIsCustomLength(!isCustomLength)}
                        className={`p-1 rounded transition-colors ${isCustomLength ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        title={isCustomLength ? "Back to Presets" : "Manual Entry"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                </div>
                <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-700/50">
                    {currentLengthName} (~{targetWordCount} Words)
                </span>
            </div>
            <div className="flex items-center gap-4 min-h-[40px]">
                {isCustomLength ? (
                    <div className="flex items-center gap-3 w-full animate-fade-in">
                        <input
                            type="number"
                            min="100"
                            max="50000"
                            value={targetWordCount}
                            onChange={e => setTargetWordCount(Math.max(100, parseInt(e.target.value) || 100))}
                            className="flex-grow p-1.5 bg-gray-800 border border-gray-600 rounded text-indigo-300 font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap">Words</span>
                    </div>
                ) : (
                    <input
                        type="range"
                        min="0"
                        max={SLEEP_STORY_LENGTHS.length - 1}
                        step="1"
                        value={currentLengthIndex}
                        onChange={e => setTargetWordCount(SLEEP_STORY_LENGTHS[parseInt(e.target.value)].wordCount)}
                        className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 animate-fade-in"
                    />
                )}
                <span className="px-2 py-0.5 bg-indigo-900/40 border border-indigo-700/50 rounded text-[10px] font-bold text-indigo-300 uppercase shrink-0">~{getReadingTime(targetWordCount)} Read</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Vibe Blend</label>
                <div className="flex flex-wrap gap-2">
                    <GroupedSelect value={genre} onChange={setGenre} categories={GENRE_CATEGORIES} className="flex-grow" />
                    <GroupedSelect value={genre2} onChange={setGenre2} categories={GENRE_CATEGORIES} className="flex-grow" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Universe Settings</label>
                <div className="flex gap-2">
                    <GroupedSelect value={fandom1} onChange={setFandom1} categories={FANDOM_CATEGORIES} className="flex-grow" />
                    <GroupedSelect value={fandom2} onChange={setFandom2} categories={FANDOM_CATEGORIES} className="flex-grow" />
                </div>
            </div>
        </div>

        <TextArea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Describe the starting scene or a specific world element..." rows={2}/>
        <div className="text-center pt-2">
          <Button onClick={handleGenerateScript} disabled={isBusy} className="text-lg px-8 py-4 bg-indigo-600 shadow-xl shadow-indigo-900/40">Generate Story</Button>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}

      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-indigo-300">Manuscript</h3>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!generatedText || isBusy} className="px-4 py-2 text-sm bg-green-600">Save</Button>
          </div>
        </div>
        <TextArea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={10} className="bg-gray-900/50 rounded-xl font-serif leading-relaxed" />
        
        {(audioPlayerProps.isReady || isGeneratingAudio || audioPlayerProps.isLoading || audioPlayerProps.error || isMp3BackgroundEncoding) && (
            <div className="mt-4">
                <AudioPlayer 
                    {...audioPlayerProps}
                    isLoading={isGeneratingAudio || audioPlayerProps.isLoading}
                    loadingText={isGeneratingAudio ? "Generating Studio Narration..." : "Preparing Story Audio..."}
                    onSeek={seek}
                    downloadWav={(name) => downloadWav(generateFilename(`sleep-story-${theme.toLowerCase().replace(/\s+/g, '-')}`, 'wav'))}
                    downloadMp3={(name) => downloadMp3(generateFilename(`sleep-story-${theme.toLowerCase().replace(/\s+/g, '-')}`, 'mp3'))}
                    stop={stop}
                    isMp3BackgroundEncoding={isMp3BackgroundEncoding}
                    mp3BackgroundEncodingProgress={mp3BackgroundEncodingProgress}
                    isMp3Ready={isMp3Ready}
                />
            </div>
        )}

        <div className="flex justify-center pt-4">
            <Button onClick={handleGenerateAudio} disabled={!generatedText || isBusy} className="bg-emerald-600 flex items-center gap-2">
                {isGeneratingAudio ? <Spinner className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 14.657a1 1 0 01-1.414-1.414A3 3 0 0013.5 10a3 3 0 00-.257-1.243 1 1 0 011.414-1.414A5 5 0 0115.5 10a5 5 0 01-.843 4.657z" clipRule="evenodd" /></svg>}
                Studio Narrate
            </Button>
        </div>
      </div>

      <ConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleConfirmReset} title="Confirm Reset" children="Clear all progress?" />
    </div>
  );
};

export default SleepStory;
