
import React, { useState } from 'react';
import { SavedNarrative, YouTubeExportContent } from '../types';
import { generateYouTubeContent } from '../services/geminiService';
import Button from '../components/Button';
import YouTubeExportModal from '../components/YouTubeExportModal';
import Spinner from '../components/Spinner';

interface YouTubeStudioProps {
  savedNarratives: SavedNarrative[];
}

const YouTubeStudio: React.FC<YouTubeStudioProps> = ({ savedNarratives }) => {
  const [selectedNarrativeId, setSelectedNarrativeId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [youtubeContent, setYoutubeContent] = useState<YouTubeExportContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storiesOnly = savedNarratives.filter(n => n.type === 'Story' || n.type === 'SleepStory' || n.type === 'Meditation');

  const handleExportClick = async () => {
    const narrative = storiesOnly.find(n => n.id === selectedNarrativeId);
    if (!narrative) {
        setError("Please select a story from your library first.");
        return;
    }

    setIsGenerating(true);
    setError(null);
    setIsModalOpen(true);

    try {
      const content = await generateYouTubeContent(narrative.content, !!narrative.seriesId);
      setYoutubeContent(content);
    } catch (err: any) {
      setError("Failed to generate YouTube metadata: " + err.message);
      setIsModalOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedNarrative = storiesOnly.find(n => n.id === selectedNarrativeId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
        <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-red-500 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                YouTube Creator Studio
            </h2>
            <p className="text-gray-400">Select a story from your library to generate a professional YouTube Creator Bundle including metadata, tags, and a downloadable asset package.</p>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Saved Story</label>
                <select 
                    value={selectedNarrativeId} 
                    onChange={e => setSelectedNarrativeId(e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                >
                    <option value="">-- Choose a Narrative --</option>
                    {storiesOnly.map(n => (
                        <option key={n.id} value={n.id}>{n.title} ({new Date(n.createdAt).toLocaleDateString()})</option>
                    ))}
                </select>
            </div>

            {selectedNarrative && (
                <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg animate-fade-in">
                    <h4 className="text-indigo-300 font-semibold mb-2">Narrative Preview</h4>
                    <p className="text-sm text-gray-400 line-clamp-3 italic">"{selectedNarrative.content}"</p>
                    <div className="mt-3 flex gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span>Type: {selectedNarrative.type}</span>
                        <span>Length: {selectedNarrative.content.split(' ').length} words</span>
                        {selectedNarrative.imageBase64 && <span className="text-green-500">✓ Image Included</span>}
                        {selectedNarrative.audioBase64 && <span className="text-blue-400">✓ Audio Included</span>}
                    </div>
                </div>
            )}

            <div className="text-center pt-4">
                <Button 
                    onClick={handleExportClick} 
                    disabled={!selectedNarrativeId || isGenerating}
                    className="text-lg px-10 py-4 bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/40 flex items-center justify-center gap-3 mx-auto"
                >
                    {isGenerating ? <><Spinner /> <span>Analyzing for YouTube...</span></> : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Generate Creator Bundle
                        </>
                    )}
                </Button>
            </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-center animate-shake">
            {error}
        </div>
      )}

      <YouTubeExportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        content={youtubeContent} 
        isLoading={isGenerating} 
        storyText={selectedNarrative?.content || ''}
        imageBase64={selectedNarrative?.imageBase64 || null}
        audioBase64={selectedNarrative?.audioBase64 || null}
      />
    </div>
  );
};

export default YouTubeStudio;
