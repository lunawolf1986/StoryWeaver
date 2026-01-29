
import React, { useState, useEffect, useRef } from 'react';
import { analyzeStory } from '../services/geminiService';
import { SavedNarrative, NarrativeType, AnalysisResult } from '../types';
import { useTasks } from '../contexts/TaskContext';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import AnalysisModal from '../components/AnalysisModal';
import Spinner from '../components/Spinner';
import useLocalStorage from '../hooks/useLocalStorage';

interface ClassicStoriesProps {
  onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string) => void;
  narrativeToLoad: SavedNarrative | null;
  onLoadComplete: () => void;
}

const CLASSIC_LIBRARY = [
  {
      id: 'short-story-classics',
      title: 'Great Short Stories',
      chapters: [{ title: 'The Tell-Tale Heart (Poe)', content: `TRUE! -- nervous -- very, very dreadfully nervous I had been and am; but why will you say that I am mad?` }]
  }
];

const ClassicStories: React.FC<ClassicStoriesProps> = ({ onSave, narrativeToLoad, onLoadComplete }) => {
  const { addTask, tasks } = useTasks();
  const [selectedBookId, setSelectedBookId] = useLocalStorage<string>('classic-book-id', CLASSIC_LIBRARY[0].id);
  const [selectedChapterIndex, setSelectedChapterIndex] = useLocalStorage<number>('classic-chapter-index', 0);
  const [text, setText] = useState('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isAnalyzing;

  useEffect(() => {
    if (narrativeToLoad && narrativeToLoad.type === 'Classic') {
        setText(narrativeToLoad.content);
        onLoadComplete();
    } else if (!text) {
        const book = CLASSIC_LIBRARY.find(b => b.id === selectedBookId) || CLASSIC_LIBRARY[0];
        setText(book.chapters[selectedChapterIndex]?.content || '');
    }
  }, [narrativeToLoad, onLoadComplete, selectedBookId, selectedChapterIndex, text]);

  const handleAnalyze = async () => {
      if (!text) return;
      setIsAnalyzing(true); setError(null);
      try {
          const result = await analyzeStory(text);
          setAnalysisResult(result);
          setIsAnalysisModalOpen(true);
      } catch (e: any) { setError(e.message); } finally { setIsAnalyzing(false); }
  };

  const handleSave = () => {
      if (!text) return;
      onSave(text, 'Classic', `Classic: Story`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
        <h2 className="text-2xl font-bold text-indigo-300">Classic Stories</h2>
        <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md">
            {CLASSIC_LIBRARY.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
        </select>
      </div>
      
      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}

      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-indigo-300">Text</h3>
             <Button onClick={handleSave} disabled={!text || isBusy} className="px-4 py-2 text-sm bg-green-600">Save</Button>
        </div>
        <TextArea value={text} onChange={e => setText(e.target.value)} rows={12} className="bg-gray-900/50 font-serif" />
        <div className="flex justify-center flex-wrap gap-4">
            <Button onClick={handleAnalyze} disabled={!text || isBusy} className="bg-teal-600">{isAnalyzing ? <Spinner /> : 'Analyze'}</Button>
        </div>
      </div>
      
      {analysisResult && (
        <AnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} suggestions={analysisResult} originalContent={text} onApplyChanges={(newText) => { setText(newText); setIsAnalysisModalOpen(false); }} title="Analysis" />
      )}
    </div>
  );
};

export default ClassicStories;
