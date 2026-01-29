
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { AISuggestion, Suggestion, AnalysisResult } from '../types';
import SuggestionCard from './SuggestionCard';
import { v4 as uuidv4 } from 'uuid';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: AnalysisResult | null;
  originalContent: string;
  onApplyChanges: (newText: string) => void;
  title: string;
}

type AnalysisFilter = 'All' | 'Character' | 'Pacing' | 'Plot' | 'Structure' | 'Style' | 'Vocabulary';

const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  originalContent,
  onApplyChanges,
  title,
}) => {
  const [suggestionList, setSuggestionList] = useState<Suggestion[]>([]);
  const [activeFilter, setActiveFilter] = useState<AnalysisFilter>('All');

  useEffect(() => {
    if (suggestions && suggestions.suggestions) {
      setSuggestionList(
        suggestions.suggestions.map((s) => ({
          ...s,
          id: uuidv4(),
          status: 'pending',
        }))
      );
    }
  }, [suggestions]);

  const filteredSuggestions = useMemo(() => {
    if (activeFilter === 'All') return suggestionList;
    if (activeFilter === 'Structure') return []; // Structure is handled by a separate dashboard
    return suggestionList.filter(s => 
      s.category.toLowerCase().includes(activeFilter.toLowerCase())
    );
  }, [suggestionList, activeFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<AnalysisFilter, number> = {
      All: suggestionList.length,
      Character: 0,
      Pacing: 0,
      Plot: 0,
      Structure: suggestions?.plotStructure ? 1 : 0,
      Style: 0,
      Vocabulary: 0
    };

    suggestionList.forEach(s => {
      const cat = s.category.toLowerCase();
      if (cat.includes('character')) counts.Character++;
      if (cat.includes('pacing')) counts.Pacing++;
      if (cat.includes('plot')) counts.Plot++;
      if (cat.includes('style')) counts.Style++;
      if (cat.includes('vocabulary') || cat.includes('diction')) counts.Vocabulary++;
    });

    return counts;
  }, [suggestionList, suggestions]);

  if (!isOpen) {
    return null;
  }

  const handleStatusChange = (
    id: string,
    status: 'accepted' | 'rejected' | 'pending'
  ) => {
    setSuggestionList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleApplyChanges = () => {
    let lastIndex = 0;
    const indexedSuggestions = suggestionList
      .map((suggestion) => {
        const startIndex = originalContent.indexOf(suggestion.originalText, lastIndex);
        if (startIndex !== -1) {
          lastIndex = startIndex + suggestion.originalText.length;
        }
        return { ...suggestion, startIndex };
      })
      .filter((s) => s.startIndex !== -1)
      .sort((a, b) => a.startIndex - b.startIndex);

    let currentIndex = 0;
    let finalContent = '';
    for (const suggestion of indexedSuggestions) {
      if (suggestion.startIndex < currentIndex) continue;
      finalContent += originalContent.substring(currentIndex, suggestion.startIndex);
      if (suggestion.status === 'accepted') {
        finalContent += suggestion.suggestedChange;
      } else {
        finalContent += suggestion.originalText;
      }
      currentIndex = suggestion.startIndex + suggestion.originalText.length;
    }
    finalContent += originalContent.substring(currentIndex);
    onApplyChanges(finalContent);
  };
  
  const handleSelectAll = (status: 'accepted' | 'pending') => {
    setSuggestionList(prev => prev.map(s => {
        const isMatch = activeFilter === 'All' || s.category.toLowerCase().includes(activeFilter.toLowerCase());
        return isMatch ? { ...s, status: status } : s;
    }));
  };

  const acceptedCount = suggestionList.filter(
    (s) => s.status === 'accepted'
  ).length;
  
  const hasParsingError = suggestionList.length > 0 && suggestionList[0].category === "Parsing Error";

  const FilterChip: React.FC<{ label: AnalysisFilter }> = ({ label }) => {
    const isActive = activeFilter === label;
    const count = filterCounts[label];
    
    if (label !== 'All' && count === 0) return null;

    return (
      <button
        onClick={() => setActiveFilter(label)}
        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${
          isActive 
            ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-900/50' 
            : 'bg-gray-700/50 text-gray-400 border-gray-600 hover:border-gray-500 hover:text-gray-200'
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-400 text-white' : 'bg-gray-800 text-gray-500'}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  const VocabularyDashboard = () => {
      const score = suggestions?.vocabularyScore || 0;
      const getScoreColor = () => {
          if (score >= 80) return 'text-emerald-400';
          if (score >= 60) return 'text-indigo-400';
          if (score >= 40) return 'text-amber-400';
          return 'text-red-400';
      };

      return (
          <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-2xl mb-6 animate-fade-in">
              <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative h-32 w-32 flex-shrink-0">
                      <svg className="h-full w-full transform -rotate-90">
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-800" />
                          <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray={364} 
                            strokeDashoffset={364 - (364 * score) / 100} 
                            strokeLinecap="round"
                            className={`${getScoreColor()} transition-all duration-1000 ease-out`} 
                          />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-4xl font-black ${getScoreColor()}`}>{score}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Richness</span>
                      </div>
                  </div>
                  <div className="flex-grow">
                      <h3 className="text-xl font-bold text-emerald-300 mb-2">Lexical Insights</h3>
                      <p className="text-sm text-gray-300 leading-relaxed italic">
                        {suggestions?.vocabularyAnalysis || "Analyzing your choice of words..."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded text-[10px] font-bold text-emerald-300 uppercase">Diversity Score: {score}/100</span>
                          <span className="px-2 py-1 bg-emerald-900/40 border border-emerald-700/50 rounded text-[10px] font-bold text-emerald-300 uppercase">{score > 70 ? 'Professional Vocabulary' : 'Common Vocabulary'}</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const StructureVisualizer = () => {
    if (!suggestions?.plotStructure) return null;
    const arc = suggestions.plotStructure;
    
    return (
        <div className="space-y-8 py-6 animate-fade-in">
            <div className="bg-indigo-900/10 border border-indigo-500/30 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-indigo-300 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Narrative Arc Architecture
                </h3>
                
                {/* Timeline Visualization */}
                <div className="relative pt-12 pb-16 px-4">
                    {/* The Arc Path */}
                    <svg className="w-full h-32 absolute top-0 left-0" preserveAspectRatio="none">
                        <path 
                            d="M 10 120 Q 25% 40, 50% 10 L 50% 10 Q 75% 40, 100% 120" 
                            stroke="rgba(99, 102, 241, 0.3)" 
                            strokeWidth="4" 
                            fill="transparent" 
                            strokeDasharray="8 4"
                        />
                    </svg>
                    
                    <div className="relative z-10 grid grid-cols-5 gap-4">
                        {[
                            { label: 'Inciting Incident', data: arc.incitingIncident, pos: '0%' },
                            { label: 'Rising Action', data: arc.risingAction, pos: '25%' },
                            { label: 'Climax', data: arc.climax, pos: '50%' },
                            { label: 'Falling Action', data: arc.fallingAction, pos: '75%' },
                            { label: 'Resolution', data: arc.resolution, pos: '100%' }
                        ].map((point, i) => (
                            <div key={i} className="flex flex-col items-center text-center group cursor-default">
                                <div className={`h-4 w-4 rounded-full border-2 transition-all duration-300 group-hover:scale-150 ${i === 2 ? 'bg-indigo-500 border-white shadow-[0_0_15px_rgba(99,102,241,1)]' : 'bg-gray-800 border-indigo-500'}`}></div>
                                <h4 className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">{point.label}</h4>
                                <div className="p-3 bg-gray-900/80 border border-gray-700 rounded-lg text-[11px] leading-relaxed text-gray-300 transition-all duration-300 group-hover:border-indigo-400 group-hover:text-white group-hover:shadow-lg">
                                    {point.data}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="bg-purple-900/10 border border-purple-500/30 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-purple-300 mb-2">Pacing Feedback</h3>
                <p className="text-sm text-gray-300 leading-relaxed italic">
                    {suggestions.pacingAnalysis || "Analyzing the flow of your narrative arc..."}
                </p>
            </div>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in">
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
            <h2 className="text-3xl font-bold text-indigo-300">
            {title}
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                {(['All', 'Vocabulary', 'Structure', 'Plot', 'Pacing', 'Character', 'Style'] as AnalysisFilter[]).map(f => (
                    <FilterChip key={f} label={f} />
                ))}
            </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-2 md:p-4 shadow-inner flex-grow min-h-0">
          <div className="text-gray-300 max-h-full overflow-y-auto pr-2 space-y-6">
             
             {/* Special Vocabulary Dashboard */}
             {(activeFilter === 'All' || activeFilter === 'Vocabulary') && !hasParsingError && suggestions?.vocabularyScore !== undefined && (
                 <VocabularyDashboard />
             )}

             {/* Structure Visualizer */}
             {(activeFilter === 'All' || activeFilter === 'Structure') && !hasParsingError && suggestions?.plotStructure && (
                 <StructureVisualizer />
             )}

             {/* Editor's Critique Section */}
             {(activeFilter === 'All' || activeFilter === 'Plot') && !hasParsingError && suggestions?.critique && (
                 <div className="bg-indigo-900/20 border border-indigo-700/50 p-4 rounded-lg mb-6 animate-fade-in">
                     <h3 className="text-lg font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        Editor's Critique
                     </h3>
                     <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                         {suggestions.critique}
                     </p>
                 </div>
             )}

             {/* Character Analysis Section */}
             {(activeFilter === 'All' || activeFilter === 'Character') && !hasParsingError && suggestions?.characterAnalysis && (
                 <div className="bg-blue-900/20 border border-blue-700/50 p-4 rounded-lg mb-6 animate-fade-in">
                     <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        Character Consistency
                     </h3>
                     <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                         {suggestions.characterAnalysis}
                     </p>
                 </div>
             )}

             {/* Pacing Analysis Section */}
             {(activeFilter === 'All' || activeFilter === 'Pacing') && !hasParsingError && suggestions?.pacingAnalysis && (
                 <div className="bg-purple-900/20 border border-purple-700/50 p-4 rounded-lg mb-6 animate-fade-in">
                     <h3 className="text-lg font-semibold text-purple-300 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Pacing & Flow
                     </h3>
                     <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                         {suggestions.pacingAnalysis}
                     </p>
                 </div>
             )}

             {/* Suggestions List */}
            {filteredSuggestions.length > 0 && !hasParsingError ? (
              filteredSuggestions.map((s) => (
                <div key={s.id} className="animate-fade-in">
                    <SuggestionCard
                    suggestion={s}
                    onStatusChange={handleStatusChange}
                    />
                </div>
              ))
            ) : hasParsingError ? (
              <div className="p-4 text-center text-gray-400">
                <h3 className="font-semibold text-lg text-yellow-400 mb-2">Analysis Error</h3>
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{suggestionList[0]?.explanation}</p>
              </div>
             ) : (
              activeFilter !== 'Structure' && (
                <div className="p-12 text-center text-gray-500 italic">
                    <p>No {activeFilter === 'All' ? '' : activeFilter.toLowerCase()} improvements were found for this segment.</p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
          <Button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 w-full md:w-auto"
          >
            Cancel
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
              <Button
                onClick={() => handleSelectAll('accepted')}
                className="!px-4 !py-2 text-sm bg-gray-600 hover:bg-green-700"
                disabled={hasParsingError || filteredSuggestions.length === 0}
              >
                Accept {activeFilter === 'All' ? 'All' : `All ${activeFilter}`}
              </Button>
              <Button
                onClick={() => handleSelectAll('pending')}
                className="!px-4 !py-2 text-sm bg-gray-600 hover:bg-yellow-700"
                disabled={hasParsingError || suggestionList.length === 0}
              >
                Clear
              </Button>
              <Button
                onClick={handleApplyChanges}
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={hasParsingError || acceptedCount === 0}
              >
                {`Apply ${
                  acceptedCount > 0 ? acceptedCount : ''
                } Change${acceptedCount !== 1 ? 's' : ''}`}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;
