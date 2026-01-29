
import React, { useState } from 'react';
import Button from './Button';
import Spinner from './Spinner';
import { PlotTwistType, PLOT_TWIST_DETAILS } from '../types';

interface PlotTwistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (twistType: PlotTwistType) => void;
  isGenerating: boolean;
}

const PlotTwistModal: React.FC<PlotTwistModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}) => {
  const [selectedTwist, setSelectedTwist] = useState<PlotTwistType>(PLOT_TWIST_DETAILS[0].type);

  if (!isOpen) {
    return null;
  }

  const handleGenerateClick = () => {
    onGenerate(selectedTwist);
  };

  const currentTwistDetail = PLOT_TWIST_DETAILS.find(d => d.type === selectedTwist);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in">
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-0 w-full max-w-4xl flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-purple-900/40 p-6 border-b border-gray-700">
            <h2 className="text-3xl font-bold text-purple-300 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Twist the Tale
            </h2>
            <p className="text-gray-400 text-sm mt-1">Select a narrative reversal to inject into your story.</p>
        </div>

        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
            {/* Left Column: Selection List */}
            <div className="w-full md:w-2/5 border-r border-gray-700 overflow-y-auto bg-gray-900/30 p-2 custom-scrollbar">
                {PLOT_TWIST_DETAILS.map((twist) => (
                    <button
                        key={twist.type}
                        onClick={() => setSelectedTwist(twist.type)}
                        className={`w-full text-left p-4 rounded-lg transition-all mb-1 flex items-center gap-3 group ${
                            selectedTwist === twist.type 
                                ? 'bg-purple-600/80 text-white shadow-lg ring-1 ring-purple-400' 
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                        }`}
                        disabled={isGenerating}
                    >
                        <span className="text-xl">{twist.icon}</span>
                        <span className="font-semibold text-sm">{twist.type}</span>
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 ml-auto transition-transform ${selectedTwist === twist.type ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100'}`} 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                        >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                ))}
            </div>

            {/* Right Column: Description & Action */}
            <div className="w-full md:w-3/5 p-8 flex flex-col bg-gray-800">
                <div className="flex-grow space-y-6">
                    {currentTwistDetail && (
                        <div className="animate-fade-in" key={currentTwistDetail.type}>
                            <div className="flex items-center gap-4 mb-4">
                                <span className="text-5xl p-4 bg-gray-900/50 rounded-2xl border border-gray-700">{currentTwistDetail.icon}</span>
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{currentTwistDetail.type}</h3>
                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Twist Category</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-lg text-gray-300 leading-relaxed italic">
                                    "{currentTwistDetail.description}"
                                </p>
                                <div className="p-4 bg-indigo-900/20 border border-indigo-800/50 rounded-lg">
                                    <h4 className="text-sm font-bold text-indigo-300 mb-1 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        How it works
                                    </h4>
                                    <p className="text-xs text-gray-400">
                                        The AI will analyze your current narrative and find a seamless point of departure. It will generate a new segment that reveals this specific shift, changing the stakes or direction of the story permanently.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-between items-center gap-4 pt-6 border-t border-gray-700">
                    <Button
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 !px-8"
                        disabled={isGenerating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerateClick}
                        className="bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-2 !px-8 min-w-[220px] shadow-lg shadow-purple-900/40"
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                        <>
                            <Spinner />
                            <span>Twisting Fate...</span>
                        </>
                        ) : (
                        'Add Twist to Story'
                        )}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlotTwistModal;
