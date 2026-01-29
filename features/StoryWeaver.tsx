

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateStoryIdeas, generateImagePrompt, generateImage, analyzePrompt, generateAudio } from '../services/geminiService';
import {
  StoryGenre, GENRE_CATEGORIES, FANDOM_CATEGORIES, StoryCharacter, PlotTwistType, STORY_LENGTHS, VOICE_OPTIONS, PromptAnalysisResult,
  NarrativeType, SavedNarrative // Imported NarrativeType and SavedNarrative
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
import useAudio from '../hooks/useAudio';
import { generateFilename } from '../utils/audioUtils';

interface StoryWeaverProps {
  onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string, audioBase64?: string) => void;
  narrativeToLoad: SavedNarrative | null;
  onLoadComplete: () => void;
  savedNarratives: SavedNarrative[];
  seriesIntros: any[];
  onSaveIntro: (introData: any) => void;
}

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

const PromptAnalysisModal: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    onApply: (refined: string) => void;
    analysis: PromptAnalysisResult | null;
    isLoading: boolean;
}> = ({ isOpen, onClose, onApply, analysis, isLoading }) => {
    const [hasCopied, setHasCopied] = useState(false);

    const handleCopy = () => {
        if (analysis?.refinedPrompt) {
            navigator.clipboard.writeText(analysis.refinedPrompt);
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 2000);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-teal-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Prompt Intelligence
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto space-y-6 flex-grow pr-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <Spinner className="h-10 w-10 text-teal-500" />
                            <p className="text-teal-300 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Narrative Potential...</p>
                        </div>
                    ) : analysis ? (
                        <div className="animate-fade-in space-y-6">
                            <div className="p-5 bg-teal-900/20 border border-teal-500/30 rounded-xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-black text-teal-400 uppercase tracking-widest">Proposed Revision</h4>
                                    <button onClick={handleCopy} className="text-[10px] text-teal-300 hover:text-white uppercase font-bold flex items-center gap-1">
                                        {hasCopied ? '✓ Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-200 leading-relaxed italic border-l-2 border-teal-500/50 pl-4 py-1">
                                    {analysis.refinedPrompt}
                                </p>
                                <Button 
                                    onClick={() => onApply(analysis.refinedPrompt)} 
                                    className="w-full bg-teal-600 hover:bg-teal-500 !py-2 !text-xs !rounded-lg flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Accept Improved Prompt
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-green-900/10 border border-green-500/30 rounded-lg">
                                    <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Strengths</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.feedback.strengths}</p>
                                </div>
                                <div className="p-4 bg-red-900/10 border border-red-500/30 rounded-lg">
                                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Weaknesses</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.feedback.weaknesses}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="border-l-4 border-amber-500 pl-4 py-1">
                                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Plot Logic & Consistency</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.feedback.plotHoles || "No obvious plot holes detected."}</p>
                                </div>
                                <div className="border-l-4 border-indigo-500 pl-4 py-1">
                                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Pacing Forecast</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.feedback.pacing}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">Refinement Suggestions</h4>
                                <ul className="space-y-2">
                                    {analysis.suggestions.map((s, i) => (
                                        <li key={i} className="text-xs text-gray-300 flex items-start gap-3">
                                            <span className="h-5 w-5 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-400 flex-shrink-0 font-bold border border-teal-700/50">{i+1}</span>
                                            <span className="pt-0.5">{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 italic">No analysis available. Please try again.</p>
                    )}
                </div>

                <div className="mt-6 flex justify-end shrink-0">
                    <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 !px-8 text-xs font-bold uppercase">Close Analysis</Button>
                </div>
            </div>
        </div>
    );
};

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
  const [fandom1, setFandom1] = useLocalStorage<string>('story-fandom1', 'None (General)');
  const [fandom2, setFandom2] = useLocalStorage<string>('story-fandom2', 'None (General)');
  // Removed [style, setStyle] = useLocalStorage<WritingStyle>('story-style', 'Default');
  // Removed [intensity, setIntensity] = useLocalStorage<NarrativeIntensity>('story-intensity', 'Moderate');
  const [characters, setCharacters] = useLocalStorage<StoryCharacter[]>('story-characters', []);
  const [targetWordCount, setTargetWordCount] = useLocalStorage<number>('story-word-count', 1200);
  const [voice, setVoice] = useLocalStorage<string>('story-voice', 'Zephyr');

  const [isSeries, setIsSeries] = useLocalStorage<boolean>('story-isSeries', false);
  const [selectedSeriesId, setSelectedSeriesId] = useLocalStorage<string>('story-selectedSeriesId', 'new');
  const [newSeriesName, setNewSeriesName] = useLocalStorage<string>('story-newSeriesName', '');
  
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [generatedText, setGeneratedText] = useAutosaveTextarea('autosave-story', '');
  
  const [isCustomLength, setIsCustomLength] = useLocalStorage<boolean>('story-is-custom-len', false);
  const [latestVisual, setLatestVisual] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);

  // Audio Integration
  const { loadAudio, unloadAudio, seek, downloadWav, downloadMp3, stop, isMp3BackgroundEncoding, mp3BackgroundEncodingProgress, isMp3Ready, ...audioPlayerProps } = useAudio();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);
  const [isIdeasLoading, setIsIdeasLoading] = useState(false);
  const [storyIdeas, setStoryIdeas] = useState<{ title: string; prompt: string }[]>([]);

  // Prompt Improvement States
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [promptAnalysis, setPromptAnalysis] = useState<PromptAnalysisResult | null>(null);

  const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;
  const isBusy = activeTaskCount > 0 || isGeneratingVisual || isIdeasLoading || isAnalysisLoading || isGeneratingAudio || audioPlayerProps.isLoading;

  const currentLengthIndex = useMemo(() => {
    const idx = STORY_LENGTHS.findIndex(l => l.wordCount === targetWordCount);
    if (idx !== -1) return idx;
    
    let closestIdx = 0;
    let minDiff = Infinity;
    STORY_LENGTHS.forEach((l, i) => {
        const diff = Math.abs(l.wordCount - targetWordCount);
        if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
        }
    });
    return closestIdx;
  }, [targetWordCount]);

  const currentLengthName = useMemo(() => {
      const exact = STORY_LENGTHS.find(l => l.wordCount === targetWordCount);
      if (exact) return exact.name;
      if (targetWordCount < 800) return "Flash Story Scale";
      if (targetWordCount < 2500) return "Standard Story Scale";
      return "Epic Narrative Scale";
  }, [targetWordCount]);


  const handleConfirmReset = useCallback(() => {
    setPrompt(''); 
    setTitle(''); 
    setGeneratedText(''); 
    setError(null);
    setLatestVisual(null);
    setCurrentAudioBase64(null);
    unloadAudio();
    setIsResetModalOpen(false);
  }, [setGeneratedText, unloadAudio]);

  useEffect(() => {
    if (narrativeToLoad && narrativeToLoad.type === 'Story') {
      setGeneratedText(narrativeToLoad.content);
      setTitle(narrativeToLoad.title.replace(/^Story: /, ''));
      setLatestVisual(narrativeToLoad.imageBase64 || null);
      if (narrativeToLoad.audioBase64) {
          setCurrentAudioBase64(narrativeToLoad.audioBase64);
          loadAudio(narrativeToLoad.audioBase64).catch(console.error);
      }
      onLoadComplete();
    }
  }, [narrativeToLoad, setGeneratedText, setTitle, setLatestVisual, setCurrentAudioBase64, loadAudio, onLoadComplete]);

  const handleBrainstorm = async () => {
    setIsIdeasLoading(true);
    setIsIdeasModalOpen(true);
    try {
      const genres = [genre, genre2, genre3].filter(g => g !== 'None (General)');
      const fandoms = [fandom1, fandom2].filter(f => f !== 'None (General)');
      const ideas = await generateStoryIdeas(genres, fandoms);
      setStoryIdeas(ideas);
    } catch (e: any) {
      setError("Inspiration failed: " + e.message);
    } finally {
      setIsIdeasLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) {
        setError("Please enter a prompt first to receive improvements.");
        return;
    }
    setIsAnalysisLoading(true);
    setIsAnalysisModalOpen(true);
    setError(null);
    try {
        const result = await analyzePrompt(prompt);
        setPromptAnalysis(result);
    } catch (e: any) {
        setError("Analysis failed: " + e.message);
        setIsAnalysisModalOpen(false);
    } finally {
        setIsAnalysisLoading(false);
    }
  };

  const handleApplyRefinedPrompt = (refined: string) => {
    setPrompt(refined);
    setIsAnalysisModalOpen(false);
  };

  const handleIllustrate = async () => {
      if (!generatedText) return;
      setIsGeneratingVisual(true);
      setError(null);
      try {
          const imgPrompt = await generateImagePrompt(generatedText);
          const b64 = await generateImage(imgPrompt);
          setLatestVisual(`data:image/png;base64,${b64}`);
      } catch (e: any) {
          setError("Illustration failed: " + e.message);
      } finally {
          setIsGeneratingVisual(false);
      }
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

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setError(null); 
    setGeneratedText(''); 
    unloadAudio();
    setCurrentAudioBase64(null);
    
    let seriesContext;
    if (isSeries) {
        const previousStories = savedNarratives.filter(n => n.seriesId === selectedSeriesId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        seriesContext = { seriesName: selectedSeriesId === 'new' ? newSeriesName : (previousStories[0]?.title || 'Series'), previousStory: previousStories[0]?.content };
    }

    addTask({
        type: 'generate-story',
        name: `Writing: ${title || 'Story'}`,
        payload: { prompt, genre, genre2, genre3, fandom1, fandom2, characters, wordCount: targetWordCount, seriesContext }
    });
  };

  useEffect(() => {
    const runningTask = tasks.find(t => t.status === 'running' && (t.type === 'generate-story' || t.type === 'continue-story' || t.type === 'generate-ending' || t.type === 'generate-plot-twist'));
    if (runningTask) {
        setGeneratedText((runningTask.payload.story || '') + (runningTask.partialResult || ''));
    }
  }, [tasks, setGeneratedText]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPlotTwistModalOpen, setIsPlotTwistModalOpen] = useState(false);

  const handleSave = () => {
    if (!generatedText) return;
    onSave(generatedText, 'Story', `Story: ${title || 'Untitled'}`, isSeries ? (selectedSeriesId === 'new' ? uuidv4() : selectedSeriesId) : undefined, latestVisual || undefined, currentAudioBase64 || undefined);
  };

  const getReadingTime = (words: number) => {
    const min = Math.ceil(words / 150); // Average reading speed
    return min === 1 ? '1 min' : `${min} mins`;
  };

  return (
    <div className={`space-y-6 ${isFocusMode ? 'fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto flex flex-col p-8' : 'animate-fade-in'}`}>
      {!isFocusMode && (
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-indigo-300">Infinite Story Weaver</h2>
                <Button onClick={() => setIsResetModalOpen(true)} disabled={isBusy} className="bg-gray-600 hover:bg-gray-500 !py-1.5 !px-4 text-xs">Reset All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="The Onyx Panther..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Narration Voice</label>
                        <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white">
                            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    {/* Story Length Selection */}
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
                                    max={STORY_LENGTHS.length - 1}
                                    step="1"
                                    value={currentLengthIndex}
                                    onChange={e => setTargetWordCount(STORY_LENGTHS[parseInt(e.target.value)].wordCount)}
                                    className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 animate-fade-in"
                                />
                            )}
                            <span className="px-2 py-0.5 bg-indigo-900/40 border border-indigo-700/50 rounded text-[10px] font-bold text-indigo-300 uppercase shrink-0">~{getReadingTime(targetWordCount)} Read</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Genre Blend</label>
                    <div className="flex gap-2">
                        <GroupedSelect value={genre} onChange={setGenre} categories={GENRE_CATEGORIES} className="flex-grow" />
                        <GroupedSelect value={genre2} onChange={setGenre2} categories={GENRE_CATEGORIES} className="flex-grow" />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Universe</label>
                    <div className="flex gap-2">
                        <GroupedSelect value={fandom1} onChange={setFandom1} categories={FANDOM_CATEGORIES} className="flex-grow" />
                        <GroupedSelect value={fandom2} onChange={setFandom2} categories={FANDOM_CATEGORIES} className="flex-grow" />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Initial Prompt</label>
                    <div className="flex gap-2">
                        <Button onClick={handleImprovePrompt} disabled={isBusy || !prompt.trim()} className="!py-1 !px-3 text-[10px] font-black bg-teal-900/50 border border-teal-500/30 text-teal-300">Improve Prompt</Button>
                        <Button onClick={handleBrainstorm} disabled={isBusy} className="!py-1 !px-3 text-[10px] font-black bg-indigo-900/50 border border-indigo-500/30">Brainstorm Premise</Button>
                    </div>
                </div>
                <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Luna was the pack runt, bullied and rejected..." rows={2} />
            </div>

            <div className="text-center">
                <Button onClick={handleGenerate} disabled={isBusy} className="text-lg px-12 py-4 bg-indigo-600 shadow-xl shadow-indigo-900/40">Write Opening</Button>
            </div>
        </div>
      )}

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-indigo-300">Manuscript</h3>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsFocusMode(!isFocusMode)} className="!px-4 !py-1 text-xs bg-gray-700">Focus</Button>
                        <Button onClick={handleSave} disabled={!generatedText || isBusy} className="!px-4 !py-1 text-xs bg-green-600">Save</Button>
                    </div>
                </div>
                <div className="flex-grow min-h-[400px]">
                    <TextArea 
                        value={generatedText} 
                        onChange={e => setGeneratedText(e.target.value)} 
                        rows={15} 
                        className="bg-transparent font-serif text-lg leading-relaxed border-none focus:ring-0" 
                    />
                </div>
                
                {(audioPlayerProps.isReady || isGeneratingAudio || audioPlayerProps.isLoading || isMp3BackgroundEncoding) && (
                    <div className="mt-6">
                        <AudioPlayer 
                            {...audioPlayerProps}
                            isLoading={isGeneratingAudio || audioPlayerProps.isLoading}
                            loadingText={isGeneratingAudio ? "Preparing Studio Voice..." : "Loading Audio..."}
                            onSeek={seek}
                            downloadWav={() => downloadWav(generateFilename(title || 'story', 'wav'))}
                            downloadMp3={() => downloadMp3(generateFilename(title || 'story', 'mp3'))}
                            stop={stop}
                            isMp3BackgroundEncoding={isMp3BackgroundEncoding}
                            mp3BackgroundEncodingProgress={mp3BackgroundEncodingProgress}
                            isMp3Ready={isMp3Ready}
                        />
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-4 rounded-xl shadow-lg">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Scene Illustration</h3>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative flex items-center justify-center">
                    {latestVisual ? (
                        <img src={latestVisual} alt="Scene Visual" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center p-4">
                            <p className="text-xs text-gray-500 italic">Generate your story first to illustrate this scene.</p>
                        </div>
                    )}
                    {isGeneratingVisual && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                            <Spinner className="h-8 w-8 text-indigo-500 mb-2" />
                            <span className="text-[10px] font-bold text-indigo-300 uppercase animate-pulse">Painting Atmosphere...</span>
                        </div>
                    )}
                </div>
                <Button 
                    onClick={handleIllustrate} 
                    disabled={isBusy || !generatedText} 
                    className="w-full mt-4 bg-purple-600 text-xs py-2 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Illustrate Latest Scene
                </Button>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
                <Button 
                    onClick={() => addTask({ type: 'continue-story', name: 'Continuing...', payload: { story: generatedText, wordCount: targetWordCount } })} 
                    disabled={!generatedText || isBusy} 
                    className="w-full bg-indigo-600 py-3"
                >
                    Continue Narrative
                </Button>
                <Button 
                    onClick={handleGenerateAudio} 
                    disabled={!generatedText || isBusy} 
                    className="w-full bg-emerald-600 py-3 flex items-center justify-center gap-2"
                >
                    {isGeneratingAudio ? <Spinner className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.135A3.235 3.235 0 005 13a3 3 0 000 6c.983 0 1.812-.471 2.312-1.187A2.968 2.968 0 008 17.5V11l9-1.8V15.135A3.235 3.235 0 0016 14a3 3 0 000 6c.983 0 1.812-.471 2.312-1.187A2.968 2.968 0 0019 17.5V4a1 1 0 00-.312-.728L18 3.272V3z" /></svg>}
                    Studio Narrate
                </Button>
                <Button 
                    onClick={() => setIsPlotTwistModalOpen(true)} 
                    disabled={!generatedText || isBusy} 
                    className="w-full bg-purple-700 py-3"
                >
                    Add Plot Twist
                </Button>
                <Button 
                    onClick={() => addTask({ type: 'generate-ending', name: 'Ending...', payload: { story: generatedText, wordCount: targetWordCount } })} 
                    disabled={!generatedText || isBusy} 
                    className="w-full bg-slate-700 py-3"
                >
                    The End
                </Button>
            </div>
        </div>
      </div>
      
      <PlotTwistModal isOpen={isPlotTwistModalOpen} onClose={() => setIsPlotTwistModalOpen(false)} onGenerate={(type) => addTask({ type: 'generate-plot-twist', name: 'Twisting...', payload: { story: generatedText, twistType: type, wordCount: targetWordCount } })} isGenerating={isBusy} />
      <ConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleConfirmReset} title="Reset Progress" children="Are you sure? This will clear the current manuscript." />
      <StoryIdeasModal isOpen={isIdeasModalOpen} onClose={() => setIsIdeasModalOpen(false)} onSelect={(idea) => { setTitle(idea.title); setPrompt(idea.prompt); setIsIdeasModalOpen(false); }} onRegenerate={handleBrainstorm} ideas={storyIdeas} isLoading={isIdeasLoading} />
      <PromptAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} onApply={handleApplyRefinedPrompt} analysis={promptAnalysis} isLoading={isAnalysisLoading} />
    </div>
  );
};

export default StoryWeaver;
