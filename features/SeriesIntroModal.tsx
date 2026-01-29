
import React, { useState, useEffect } from 'react';
import { SeriesIntro, IntroTone, INTRO_TONES, StorySeries } from '../types';
import { generateIntroScript } from '../services/geminiService';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';

interface SeriesIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: StorySeries;
  existingIntro: SeriesIntro | null;
  onSave: (introData: Omit<SeriesIntro, 'id' | 'createdAt'>) => void;
}

const SeriesIntroModal: React.FC<SeriesIntroModalProps> = ({ isOpen, onClose, series, existingIntro, onSave }) => {
  // Form State
  const [tone, setTone] = useState<IntroTone>(existingIntro?.tone || 'Epic & Grandiose');
  const [themes, setThemes] = useState(existingIntro?.themes || '');
  
  // Generation State
  const [script, setScript] = useState(existingIntro?.script || '');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [error, setError] = useState('');

  const isBusy = isGeneratingScript;

  const handleGenerateScript = async () => {
    if (!themes) {
      setError('Please provide some key themes or elements for the series.');
      return;
    }
    setIsGeneratingScript(true);
    setError('');
    setScript('');

    try {
      const generatedScript = await generateIntroScript(series.name, tone, themes);
      setScript(generatedScript);
    } catch (e: any) {
      setError(`Failed to generate script: ${e.message}`);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleSave = () => {
    if (!script) {
        setError("Cannot save without a script.");
        return;
    }
    onSave({
        seriesId: series.id,
        script,
        tone,
        themes,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in">
        <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-bold text-purple-400 mb-6 flex-shrink-0">
                Series Intro Creator: <span className="text-white">{series.name}</span>
            </h2>

            <div className="space-y-6">
                {/* Step 1: Configuration */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-lg font-semibold text-indigo-300">1. Configure Your Intro</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Tone / Mood</label>
                        <select value={tone} onChange={e => setTone(e.target.value as IntroTone)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md">
                            {INTRO_TONES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Key Themes & Elements</label>
                        <TextArea
                            value={themes}
                            onChange={(e) => setThemes(e.target.value)}
                            placeholder="e.g., A fallen kingdom, a cursed sword, the last hero's journey, betrayal, hope..."
                            rows={3}
                        />
                    </div>
                     <div className="text-center">
                        <Button onClick={handleGenerateScript} disabled={isBusy} className="bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2">
                           {isGeneratingScript ? <><Spinner /><span>Generating Script...</span></> : 'Generate Intro Script'}
                        </Button>
                    </div>
                </div>

                {/* Step 2: Script */}
                {(script || isGeneratingScript) && (
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
                        <h3 className="text-lg font-semibold text-indigo-300">2. Review Intro</h3>
                        <TextArea value={script} readOnly rows={6} className="bg-gray-800/50 text-base leading-relaxed" />
                    </div>
                )}
            </div>

            {error && <div className="text-red-400 p-3 mt-4 bg-red-900/50 rounded-lg text-center text-sm">{error}</div>}

            <div className="mt-8 flex justify-between items-center gap-4 flex-shrink-0">
                <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-500" disabled={isBusy}>
                    Cancel
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={isBusy || !script}>
                    Save Intro
                </Button>
            </div>
        </div>
    </div>
  );
};

export default SeriesIntroModal;
