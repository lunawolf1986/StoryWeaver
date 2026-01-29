
import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import StoryWeaver from './features/StoryWeaver';
import Meditation from './features/Meditation';
import SleepStory from './features/SleepStory';
import AdStudio from './features/AdStudio';
import YouTubeStudio from './features/YouTubeStudio';
import { SavedNarrative, NarrativeType, SeriesIntro } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import SavedNarrativesDropdown from './components/SavedNarrativesDropdown';
import ShareButton from './components/ShareButton';
import { TaskProvider } from './contexts/TaskContext';
import TaskManager from './components/TaskManager';
import ApiKeySelector from './components/ApiKeySelector';

type Tab = 'story' | 'meditation' | 'sleep' | 'ad' | 'youtube';

const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center justify-center gap-3 px-6 py-2.5 rounded-full font-semibold transition-all duration-300 transform
      focus:outline-none focus:ring-4 focus:ring-opacity-50
      ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg scale-105 ring-indigo-400'
          : 'bg-gray-700/80 hover:bg-gray-600/90 text-gray-300 hover:scale-102'
      }
    `}
  >
    {icon}
    {label}
  </button>
);


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [savedNarratives, setSavedNarratives] = useLocalStorage<SavedNarrative[]>('narratives', []);
  const [seriesIntros, setSeriesIntros] = useLocalStorage<SeriesIntro[]>('seriesIntros', []);
  const [narrativeToLoad, setNarrativeToLoad] = useState<SavedNarrative | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    setInstallPrompt(null);
  };


  const handleSaveNarrative = useCallback((
    content: string, 
    type: NarrativeType, 
    title?: string, 
    seriesId?: string,
    imageBase64?: string,
    audioBase64?: string
  ) => {
    const newNarrative: SavedNarrative = {
        id: uuidv4(),
        type,
        title: title || content.substring(0, 40) + '...',
        content,
        createdAt: new Date().toISOString(),
        seriesId,
        imageBase64,
        audioBase64,
    };
    setSavedNarratives(prev => [...prev, newNarrative]);
  }, [setSavedNarratives]);
  
  const handleDeleteNarrative = useCallback((id: string) => {
    setSavedNarratives(prev => prev.filter(n => n.id !== id));
  }, [setSavedNarratives]);

  const handleSaveIntro = useCallback((introData: Omit<SeriesIntro, 'id' | 'createdAt'>) => {
    const existingIntroIndex = seriesIntros.findIndex(i => i.seriesId === introData.seriesId);
    if (existingIntroIndex > -1) {
        const updatedIntros = [...seriesIntros];
        updatedIntros[existingIntroIndex] = { ...seriesIntros[existingIntroIndex], ...introData, createdAt: new Date().toISOString() };
        setSeriesIntros(updatedIntros);
    } else {
        const newIntro: SeriesIntro = { id: uuidv4(), ...introData, createdAt: new Date().toISOString() };
        setSeriesIntros(prev => [...prev, newIntro]);
    }
  }, [seriesIntros, setSeriesIntros]);


  const handleLoadNarrative = (narrative: SavedNarrative) => {
    const tabMap: Record<string, Tab> = { 'Story': 'story', 'Meditation': 'meditation', 'SleepStory': 'sleep', 'Ad': 'ad' }
    setActiveTab(tabMap[narrative.type] || 'story');
    setNarrativeToLoad(narrative);
  };

  const onNarrativeLoadComplete = () => setNarrativeToLoad(null);

  const handleImportNarratives = useCallback((importedNarratives: SavedNarrative[]) => {
    setSavedNarratives(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNarratives = importedNarratives.filter(n => !existingIds.has(n.id));
        if (newNarratives.length === 0) return prev;
        return [...prev, ...newNarratives];
    });
  }, [setSavedNarratives]);

  const renderContent = () => {
    const commonProps = {
        onSave: handleSaveNarrative,
        narrativeToLoad,
        onLoadComplete: onNarrativeLoadComplete,
    };
    switch (activeTab) {
      case 'story': return <StoryWeaver {...commonProps} savedNarratives={savedNarratives} seriesIntros={seriesIntros} onSaveIntro={handleSaveIntro} />;
      case 'meditation': return <Meditation {...commonProps} />;
      case 'sleep': return <SleepStory {...commonProps} savedNarratives={savedNarratives} />;
      case 'ad': return <AdStudio {...commonProps} />;
      case 'youtube': return <YouTubeStudio savedNarratives={savedNarratives} />;
      default: return <StoryWeaver {...commonProps} savedNarratives={savedNarratives} seriesIntros={seriesIntros} onSaveIntro={handleSaveIntro} />;
    }
  };

  return (
    <TaskProvider>
      <ApiKeySelector />
      <div className="w-full max-w-5xl mx-auto my-8 pt-12 md:pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">AI Narrative Studio</h1>
            <div className="flex items-center gap-3">
              {installPrompt && (
                <button onClick={handleInstallClick} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all">Install App</button>
              )}
              <ShareButton />
              <SavedNarrativesDropdown narratives={savedNarratives} onLoad={handleLoadNarrative} onDelete={handleDeleteNarrative} onImport={handleImportNarratives} />
            </div>
        </div>
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <TabButton onClick={() => setActiveTab('story')} isActive={activeTab === 'story'} label="Stories" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>} />
          <TabButton onClick={() => setActiveTab('youtube')} isActive={activeTab === 'youtube'} label="YouTube Studio" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
          <TabButton onClick={() => setActiveTab('meditation')} isActive={activeTab === 'meditation'} label="Meditation" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l2.5 2.5a2.5 2.5 0 003.536 0l2.5-2.5A2.5 2.5 0 0013 8.379V5.5A2.5 2.5 0 0010.5 3h-5zm1 5.121a.5.5 0 00-.707 0l-2.5 2.5a.5.5 0 000 .707l2.5 2.5a.5.5 0 00.707 0l2.5-2.5a.5.5 0 000-.707l-2.5-2.5zM10 5a.5.5 0 01.5.5v3.793a.5.5 0 01-.146.353l-2.5 2.5a.5.5 0 01-.708-.707L9.5 8.707V5.5A.5.5 0 0110 5zm3.293 2.793a.5.5 0 010 .707l-2.5 2.5a.5.5 0 01-.707 0l-2.5-2.5a.5.5 0 01.707-.707L10 9.793l1.793-1.793a.5.5 0 01.707 0z" clipRule="evenodd" /></svg>} />
          <TabButton onClick={() => setActiveTab('sleep')} isActive={activeTab === 'sleep'} label="Sleep Story" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>} />
          <TabButton onClick={() => setActiveTab('ad')} isActive={activeTab === 'ad'} label="Ad Studio" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>} />
        </div>
        {renderContent()}
        <TaskManager />
      </div>
    </TaskProvider>
  );
};

export default App;
