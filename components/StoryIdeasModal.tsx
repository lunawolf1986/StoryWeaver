
import React from 'react';
import Button from './Button';
import Spinner from './Spinner';

interface StoryIdea {
  title: string;
  prompt: string;
}

interface StoryIdeasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (idea: StoryIdea) => void;
  onRegenerate: () => void;
  ideas: StoryIdea[];
  isLoading: boolean;
}

const StoryIdeasModal: React.FC<StoryIdeasModalProps> = ({ isOpen, onClose, onSelect, onRegenerate, ideas, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-indigo-300 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              AI-Brainstormed Premises
            </h2>
            <p className="text-gray-400 text-sm mt-1">Based on your selected genres and fandom settings.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto pr-2 flex-grow mb-4 relative min-h-[300px]">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-gray-800/50 backdrop-blur-sm z-10">
              <Spinner className="h-12 w-12 text-indigo-500" />
              <p className="text-indigo-300 font-medium animate-pulse">Consulting the creative muse...</p>
            </div>
          ) : ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map((idea, index) => (
                <div 
                  key={index}
                  onClick={() => onSelect(idea)}
                  className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-indigo-500 rounded-lg p-4 cursor-pointer transition-all duration-200 group h-full flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <h3 className="font-bold text-indigo-300 group-hover:text-indigo-200 mb-2">{idea.title}</h3>
                  <p className="text-sm text-gray-300 group-hover:text-gray-100 flex-grow leading-relaxed">{idea.prompt}</p>
                  <div className="mt-3 text-xs text-indigo-400/50 group-hover:text-indigo-400 font-semibold uppercase tracking-wider text-right">
                    Use this premise &rarr;
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p>No ideas generated yet. Click "Brainstorm New Ideas" to start.</p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-700 flex-shrink-0">
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-500">Cancel</Button>
          <Button 
            onClick={onRegenerate} 
            disabled={isLoading} 
            className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-900/40"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Brainstorm New Ideas
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryIdeasModal;
