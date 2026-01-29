
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { brainstormAdDetails } from '../services/geminiService';
import { SavedNarrative, NarrativeType, AdStyle, AD_STYLES, AdPlatform, AD_PLATFORMS, AdDuration, AD_DURATIONS, AdBrainstormResult, AdFormat, AD_FORMATS } from '../types';
import { useTasks } from '../contexts/TaskContext';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';
import useLocalStorage from '../hooks/useLocalStorage';
import ConfirmationModal from '../components/ConfirmationModal';

interface AdStudioProps {
  onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string) => void;
  narrativeToLoad: SavedNarrative | null;
  onLoadComplete: () => void;
}

const AdStudio: React.FC<AdStudioProps> = ({ onSave, narrativeToLoad, onLoadComplete }) => {
  const { addTask, tasks } = useTasks();
  const [productName, setProductName] = useLocalStorage<string>('ad-product', '');
  const [audience, setAudience] = useLocalStorage<string>('ad-audience', '');
  const [style, setStyle] = useLocalStorage<AdStyle>('ad-style', AD_STYLES[0]);
  const [platform, setPlatform] = useLocalStorage<AdPlatform>('ad-platform', AD_PLATFORMS[0]);
  const [duration, setDuration] = useLocalStorage<AdDuration>('ad-duration', AD_DURATIONS[0]);
  const [format, setFormat] = useLocalStorage<AdFormat>('ad-format', AD_FORMATS[0]);
  const [keyBenefits, setKeyBenefits] = useState('');

  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormResults, setBrainstormResults] = useState<AdBrainstormResult | null>(null);

  const [script, setScript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;
  const isBusy = activeTaskCount > 0 || isBrainstorming;

  useEffect(() => {
    const runningTask = tasks.find(t => t.type === 'generate-ad-script' && t.status === 'running');
    if (runningTask && runningTask.partialResult) {
        setScript(runningTask.partialResult);
    } else if (runningTask === undefined && tasks.find(t => t.type === 'generate-ad-script' && t.status === 'completed')) {
        const lastCompleted = tasks.filter(t => t.type === 'generate-ad-script' && t.status === 'completed')[0];
        if (lastCompleted && lastCompleted.result) setScript(lastCompleted.result);
    }
  }, [tasks]);

  useEffect(() => {
    if (narrativeToLoad && narrativeToLoad.type === 'Ad') {
      setScript(narrativeToLoad.content);
      const match = narrativeToLoad.title.match(/^Ad: (.*)$/);
      if (match) setProductName(match[1]);
      onLoadComplete();
    }
  }, [narrativeToLoad, onLoadComplete, setProductName]);

  const handleBrainstorm = async () => {
      if (!productName.trim()) return;
      setIsBrainstorming(true); setError(null);
      try {
          const results = await brainstormAdDetails(productName);
          setBrainstormResults(results);
      } catch (e: any) { setError(e.message); } finally { setIsBrainstorming(false); }
  };

  const handleGenerateScript = () => {
    if (!productName || !keyBenefits) return;
    setError(null); setScript('');
    addTask({
        type: 'generate-ad-script',
        name: `Ad: ${productName}`,
        payload: { productName, audience, style, platform, duration, keyBenefits, format }
    });
  };

  const handleSave = () => {
      if (!script) return;
      onSave(script, 'Ad', `Ad: ${productName.substring(0, 30) || 'Untitled'}`);
  };

  const handleConfirmReset = useCallback(() => {
    setProductName(''); setAudience(''); setKeyBenefits(''); setScript('');
    setStyle(AD_STYLES[0]); setPlatform(AD_PLATFORMS[0]); setDuration(AD_DURATIONS[0]);
    setIsResetModalOpen(false);
  }, [setProductName, setAudience, setStyle, setPlatform, setDuration]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-indigo-300">Ad Studio</h2>
            <Button onClick={() => setIsResetModalOpen(true)} disabled={isBusy} className="bg-gray-600 hover:bg-gray-500 !py-1.5 text-xs">Clear</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Product</label>
                    <div className="flex gap-2">
                        <input type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Galaxy Energy" className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                        <Button onClick={handleBrainstorm} disabled={isBusy || !productName.trim()} className="!px-3 bg-purple-600">Brainstorm</Button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Audience</label>
                    <input type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="Tired Gamers" className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Benefits</label>
                    <TextArea value={keyBenefits} onChange={e => setKeyBenefits(e.target.value)} placeholder="No crash, tastes like stardust" rows={3} />
                </div>
            </div>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Platform</label>
                        <select value={platform} onChange={e => setPlatform(e.target.value as AdPlatform)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm">
                            {AD_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Vibe</label>
                        <select value={style} onChange={e => setStyle(e.target.value as AdStyle)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm">
                            {AD_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div className="text-center pt-2">
            <Button onClick={handleGenerateScript} disabled={isBusy} className="text-lg px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">Generate Script</Button>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}

      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-4">
         <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-indigo-300">Script</h3>
             <Button onClick={handleSave} disabled={!script} className="px-4 py-2 text-sm bg-green-600">Save</Button>
         </div>
         <TextArea value={script} onChange={e => setScript(e.target.value)} rows={10} className="bg-gray-900/50 font-mono text-sm" />
      </div>

      <ConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleConfirmReset} title="Confirm Reset" children="Clear all progress?" />
    </div>
  );
};

export default AdStudio;
