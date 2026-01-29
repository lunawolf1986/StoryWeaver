
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[150] p-4 animate-fade-in" onClick={onClose}>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-0 w-full max-w-5xl flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-purple-900/40 p-6 border-b border-gray-700 shrink-0">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-purple-300 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Twist the Tale
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Inject a narrative shift to escalate stakes or subvert expectations.</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>

        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
            {/* Left Column: Selection List */}
            <div className="w-full md:w-5/12 border-r border-gray-700 overflow-y-auto bg-gray-900/30 p-2 custom-scrollbar">
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
                        <span className="text-xl shrink-0">{twist.icon}</span>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate">{twist.type}</span>
                            {selectedTwist === twist.type && <span className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mt-0.5">Selected</span>}
                        </div>
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 ml-auto shrink-0 transition-transform ${selectedTwist === twist.type ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100'}`} 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                        >
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                ))}
            </div>

            {/* Right Column: Description & Action */}
            <div className="w-full md:w-7/12 p-8 flex flex-col bg-gray-800">
                <div className="flex-grow space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                    {currentTwistDetail && (
                        <div className="animate-fade-in" key={currentTwistDetail.type}>
                            <div className="flex items-center gap-6 mb-6">
                                <span className="text-6xl p-6 bg-gray-900/50 rounded-3xl border border-gray-700 shadow-inner">{currentTwistDetail.icon}</span>
                                <div>
                                    <h3 className="text-3xl font-black text-white leading-tight">{currentTwistDetail.type}</h3>
                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-purple-900/30 px-2 py-1 rounded border border-purple-500/20 mt-2 inline-block">Narrative Reversal</span>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-2xl">
                                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Manifesto</h4>
                                    <p className="text-xl text-gray-200 leading-relaxed font-serif">
                                        "{currentTwistDetail.description}"
                                    </p>
                                </div>
                                <div className="p-5 bg-indigo-900/20 border border-indigo-800/40 rounded-xl space-y-3">
                                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2 uppercase tracking-wide">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                        </svg>
                                        The AI Strategy
                                    </h4>
                                    <p className="text-sm text-gray-400 leading-relaxed">
                                        Gemini will parse your existing narrative arc and identify the most impactful moment to pivot. It will weave the <strong>{currentTwistDetail.type}</strong> directly into the flow, ensuring the transition feels earned yet shocking.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-between items-center gap-4 pt-6 border-t border-gray-700 shrink-0">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white font-bold uppercase tracking-widest text-xs px-6 py-3 transition-colors"
                        disabled={isGenerating}
                    >
                        Dismiss
                    </button>
                    <Button
                        onClick={handleGenerateClick}
                        className="bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-3 !px-10 !py-4 min-w-[260px] shadow-xl shadow-purple-900/40 transform active:scale-95 transition-all text-sm font-black uppercase tracking-widest"
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                        <>
                            <Spinner />
                            <span>Twisting Reality...</span>
                        </>
                        ) : (
                        <>
                            <span>Add Twist to Story</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </>
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
