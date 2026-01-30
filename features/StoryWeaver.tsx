
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateStoryIdeas, generateImagePrompt, generateImage, analyzePrompt, generateAudio, analyzeStory, generateYouTubeContent } from '../services/geminiService';
import {
  StoryGenre, GENRE_CATEGORIES, FANDOM_CATEGORIES, StoryCharacter, PlotTwistType, STORY_LENGTHS, VOICE_OPTIONS, PromptAnalysisResult,
  NarrativeType, SavedNarrative, ImageAspectRatio, ImageSize, SeriesIntro, AnalysisResult, YouTubeExportContent
} from '../types';
import { useTasks } from '../contexts/TaskContext';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';
import useLocalStorage from '../hooks/useLocalStorage';
import useAutosaveTextarea from '../hooks/useAutosaveTextarea';
import { v4 as uuidv4 } from 'uuid';
import ConfirmationModal from '../components/ConfirmationModal';
import PlotTwistModal from '../components/PlotTwistModal';
import StoryIdeasModal from '../components/StoryIdeasModal';
import AudioPlayer from '../components/AudioPlayer';
import AnalysisModal from '../components/AnalysisModal';
import YouTubeExportModal from '../components/YouTubeExportModal';
import useAudio from '../hooks/useAudio';
import { generateFilename } from '../utils/audioUtils';
import CharacterManager from '../components/CharacterManager';

// --- INSPIRATION LIBRARY DATA ---
const INSPIRATION_LIBRARY: Record<string, string[]> = {
  "Shifters & Paranormal": [
    "A submissive wolf who realizes they are the true heir to a forgotten royal pack after a freak accident.",
    "An urban detective investigates a series of 'animal attacks' only to find a secret underground society of shifters.",
    "The Alpha of the strongest pack in the North is forced to take a human 'mate' to settle an ancient blood debt."
  ],
  "Sci-Fi": [
    "A lonely AI on a drifting arkship starts writing poetry to cope with the silence of space.",
    "Humanity discovers that stars are actually ancient beings communicating via binary light bursts."
  ],
  "Fantasy": [
    "A disgraced knight is forced to protect a dragon egg from a kingdom that hates magic.",
    "In a city built on a giant turtle's back, the inhabitants realize their host is dying."
  ]
};

const GroupedSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
    categories: Record<string, string[]>;
    className?: string;
}> = ({ value, onChange, categories, className }) => (
    <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${className}`}
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

const InspirationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (prompt: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const [activeCat, setActiveCat] = useState<string>("Shifters & Paranormal");

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[150] p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-3">Inspiration Library</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                    {Object.keys(INSPIRATION_LIBRARY).map(cat => (
                        <button key={cat} onClick={() => setActiveCat(cat)} className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shrink-0 ${activeCat === cat ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{cat}</button>
                    ))}
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {INSPIRATION_LIBRARY[activeCat]?.map((prompt, i) => (
                        <button key={i} onClick={() => { onSelect(prompt); onClose(); }} className="w-full text-left p-4 bg-gray-800/40 hover:bg-indigo-900/20 border border-gray-700 hover:border-indigo-500/50 rounded-xl transition-all group flex gap-4">
                            <span className="text-sm text-gray-300 group-hover:text-white leading-relaxed">{prompt}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface StoryWeaverProps {
  onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string, audioBase64?: string) => void;
  narrativeToLoad: SavedNarrative | null;
  onLoadComplete: () => void;
  savedNarratives: SavedNarrative[];
  seriesIntros: SeriesIntro[];
  onSaveIntro: (introData: Omit<SeriesIntro, 'id' | 'createdAt'>) => void;
}

const StoryWeaver: React.FC<StoryWeaverProps> = ({ 
  onSave, 
  narrativeToLoad, 
  onLoadComplete, 
  savedNarratives,
}) => {
  const { addTask, tasks } = useTasks();
  const [genre, setGenre] = useLocalStorage<StoryGenre>('story-genre', 'None (General)');
  const [genre2, setGenre2] = useLocalStorage<StoryGenre>('story-genre2', 'None (General)');
  const [genre3, setGenre3] = useLocalStorage<StoryGenre>('story-genre3', 'None (General)');
  const [genre4, setGenre4] = useLocalStorage<StoryGenre>('story-genre4', 'None (General)');
  const [fandom1, setFandom1] = useLocalStorage<string>('story-fandom1', 'None (General)');
  const [fandom2, setFandom2] = useLocalStorage<string>('story-fandom2', 'None (General)');
  const [characters, setCharacters] = useLocalStorage<StoryCharacter[]>('story-characters', []);
  const [targetWordCount, setTargetWordCount] = useLocalStorage<number>('story-word-count', 1200);
  const [voice, setVoice] = useLocalStorage<string>('story-voice', 'Zephyr');
  const [isInfinite, setIsInfinite] = useLocalStorage<boolean>('story-isInfinite', false);

  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [generatedText, setGeneratedText] = useAutosaveTextarea('autosave-story', '');
  
  const [latestVisual, setLatestVisual] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(null);

  const [isGeneratingYouTube, setIsGeneratingYouTube] = useState(false);
  const [youtubeContent, setYoutubeContent] = useState<YouTubeExportContent | null>(null);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);

  const { loadAudio, unloadAudio, seek, downloadWav, downloadMp3, stop, ...audioPlayerProps } = useAudio();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);
  const [manuscriptAnalysisResult, setManuscriptAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isManuscriptAnalysisModalOpen, setIsManuscriptAnalysisModalOpen] = useState(false);

  const isBusy = tasks.some(t => t.status === 'running') || isGeneratingVisual || isGeneratingAudio || isGeneratingYouTube || audioPlayerProps.isLoading;

  useEffect(() => {
    const runningTask = tasks.find(t => t.status === 'running' && ['generate-story', 'continue-story', 'generate-ending', 'generate-plot-twist'].includes(t.type));
    if (runningTask) {
        setGeneratedText((runningTask.payload.story || '') + (runningTask.partialResult || ''));
    }
  }, [tasks, setGeneratedText]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setError(null); 
    setGeneratedText(''); 
    unloadAudio();
    setCurrentAudioBase64(null);
    addTask({
        type: 'generate-story',
        name: `Writing: ${title || 'Story'}`,
        payload: { prompt, genre, genre2, genre3, genre4, fandom1, fandom2, characters, wordCount: targetWordCount }
    });
  };

  const handleContinue = () => {
      if (!generatedText) return;
      addTask({
          type: 'continue-story',
          name: 'Extending Narrative...',
          payload: { story: generatedText, wordCount: 1000 }
      });
  };

  const handleYouTubeExport = async () => {
    if (!generatedText) return;
    setIsGeneratingYouTube(true);
    setIsYouTubeModalOpen(true);
    setError(null);
    try {
      const content = await generateYouTubeContent(generatedText, false);
      setYoutubeContent(content);
    } catch (e: any) {
      setError("YouTube Metadata failed: " + e.message);
      setIsYouTubeModalOpen(false);
    } finally {
      setIsGeneratingYouTube(false);
    }
  };

  const handleSave = () => {
    if (!generatedText) return;
    onSave(generatedText, 'Story', `Story: ${title || 'Untitled'}`, undefined, latestVisual || undefined, currentAudioBase64 || undefined);
  };

  return (
    <div className={`space-y-6 ${isFocusMode ? 'fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto p-8' : 'animate-fade-in'}`}>
      {!isFocusMode && (
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-indigo-300">Infinite Story Weaver</h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Infinite Chaining</span>
                        <div className={`w-10 h-5 rounded-full p-1 transition-colors ${isInfinite ? 'bg-indigo-600' : 'bg-gray-700'}`} onClick={() => setIsInfinite(!isInfinite)}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isInfinite ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </label>
                    <Button onClick={() => { setPrompt(''); setGeneratedText(''); setTitle(''); }} disabled={isBusy} className="bg-gray-600 hover:bg-gray-500 !py-1.5 !px-4 text-xs">Clear</Button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="The Eternal Thread..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Narrative Architecture (Genres)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <GroupedSelect value={genre} onChange={setGenre} categories={GENRE_CATEGORIES} />
                            <GroupedSelect value={genre2} onChange={setGenre2} categories={GENRE_CATEGORIES} />
                            <GroupedSelect value={genre3} onChange={setGenre3} categories={GENRE_CATEGORIES} />
                            <GroupedSelect value={genre4} onChange={setGenre4} categories={GENRE_CATEGORIES} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Voice Engine</label>
                            <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
                                {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Target Length</label>
                            <div className="p-2 bg-gray-700/50 border border-gray-600 rounded-md text-center text-indigo-300 font-bold text-xs">
                                ~{targetWordCount} Words
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest">World Settings (Fandoms)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <GroupedSelect value={fandom1} onChange={setFandom1} categories={FANDOM_CATEGORIES} />
                            <GroupedSelect value={fandom2} onChange={setFandom2} categories={FANDOM_CATEGORIES} />
                        </div>
                    </div>

                    <div className="bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">
                        <input type="range" min="300" max="15000" step="100" value={targetWordCount} onChange={e => setTargetWordCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        <div className="flex justify-between text-[8px] font-black text-gray-500 uppercase mt-1">
                            <span>Short Story</span>
                            <span>Epic Novel</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <CharacterManager characters={characters} setCharacters={setCharacters} />
                <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Initial Narrative Seed</label>
                    <Button onClick={() => setIsInspirationOpen(true)} className="!py-1 !px-3 text-[10px] font-black bg-purple-900/50 border border-purple-500/30 text-purple-300">Inspiration Library</Button>
                </div>
                <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="How does the journey begin? Describe the opening scene..." rows={3} />
            </div>

            <div className="text-center">
                <Button onClick={handleGenerate} disabled={isBusy || !prompt.trim()} className="text-lg px-12 py-4 bg-indigo-600 shadow-xl shadow-indigo-900/40 transform hover:scale-105 transition-all">Begin Weaving</Button>
            </div>
        </div>
      )}

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg h-full flex flex-col min-h-[600px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-indigo-300">Manuscript</h3>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsFocusMode(!isFocusMode)} className="!px-4 !py-1 text-xs bg-gray-700">Focus</Button>
                        <Button onClick={handleSave} disabled={!generatedText || isBusy} className="!px-4 !py-1 text-xs bg-green-600">Save</Button>
                    </div>
                </div>
                <div className="flex-grow">
                    <TextArea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={15} className="bg-transparent font-serif text-lg leading-relaxed border-none focus:ring-0 custom-scrollbar" />
                </div>
                {(audioPlayerProps.isReady || isGeneratingAudio || audioPlayerProps.isLoading) && (
                    <div className="mt-6">
                        <AudioPlayer {...audioPlayerProps} isLoading={isGeneratingAudio || audioPlayerProps.isLoading} loadingText="Synthesizing High-Fidelity Voice..." onSeek={seek} downloadWav={() => downloadWav(generateFilename(title || 'story', 'wav'))} downloadMp3={() => downloadMp3(generateFilename(title || 'story', 'mp3'))} stop={stop} />
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-4 rounded-xl shadow-lg">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Illustration</h3>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative flex items-center justify-center mb-3">
                    {latestVisual ? <img src={latestVisual} className="w-full h-full object-cover" /> : <p className="text-[10px] text-gray-500 italic uppercase">No visual generated</p>}
                    {isGeneratingVisual && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center"><Spinner className="mb-2" /><span className="text-[10px] font-bold text-indigo-300 uppercase animate-pulse">Rendering Concept...</span></div>}
                </div>
                <Button onClick={async () => { setIsGeneratingVisual(true); try { const p = await generateImagePrompt(generatedText); const b64 = await generateImage(p); setLatestVisual(`data:image/png;base64,${b64}`); } catch(e:any){setError(e.message);} finally{setIsGeneratingVisual(false);} }} disabled={isBusy || !generatedText} className="w-full bg-purple-600 text-xs font-black uppercase py-2">Illustrate Scene</Button>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
                <Button onClick={handleContinue} disabled={!generatedText || isBusy} className="w-full bg-indigo-600 !py-3 !rounded-lg text-xs uppercase font-black">Continue Narrative</Button>
                <Button onClick={async () => { setIsGeneratingAudio(true); try { const b64 = await generateAudio(generatedText, voice); setCurrentAudioBase64(b64); await loadAudio(b64); } catch(e:any){setError(e.message);} finally{setIsGeneratingAudio(false);} }} disabled={!generatedText || isBusy} className="w-full bg-emerald-600 !py-3 !rounded-lg text-xs uppercase font-black">Studio Narrate</Button>
                <Button onClick={handleYouTubeExport} disabled={!generatedText || isBusy} className="w-full bg-red-600 !py-3 !rounded-lg text-xs uppercase font-black flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    YouTube Bundle
                </Button>
                <Button onClick={() => addTask({ type: 'generate-ending', name: 'Closing Thread...', payload: { story: generatedText } })} disabled={!generatedText || isBusy} className="w-full bg-slate-700 !py-3 !rounded-lg text-xs uppercase font-black">The End</Button>
            </div>
        </div>
      </div>
      
      <InspirationModal isOpen={isInspirationOpen} onClose={() => setIsInspirationOpen(false)} onSelect={setPrompt} />
      
      {manuscriptAnalysisResult && (
        <AnalysisModal isOpen={isManuscriptAnalysisModalOpen} onClose={() => setIsManuscriptAnalysisModalOpen(false)} suggestions={manuscriptAnalysisResult} originalContent={generatedText} onApplyChanges={setGeneratedText} title="Manuscript Editor Analysis" />
      )}

      <YouTubeExportModal 
        isOpen={isYouTubeModalOpen} 
        onClose={() => setIsYouTubeModalOpen(false)} 
        content={youtubeContent} 
        isLoading={isGeneratingYouTube} 
        storyText={generatedText}
        imageBase64={latestVisual}
        audioBase64={currentAudioBase64}
      />
    </div>
  );
};

export default StoryWeaver;
