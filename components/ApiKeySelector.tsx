
import React, { useState, useEffect } from 'react';
import Button from './Button';

const ApiKeySelector: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [manualOverride, setManualOverride] = useState<boolean>(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && !manualOverride) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
    
    // Polling is only active if we haven't manually overridden (clicked the button)
    const interval = manualOverride ? undefined : setInterval(checkKey, 3000);
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [manualOverride]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      setManualOverride(true);
      setHasKey(true); // Assume success per guidelines to mitigate race conditions
      try {
        await window.aistudio.openSelectKey();
      } catch (e) {
        console.error("Key selection failed:", e);
        // If it truly failed, we allow the check to resume
        setManualOverride(false);
      }
    }
  };

  // If the user has a key or we've overridden the UI, show a small "Change Key" utility instead of the banner
  if (hasKey || manualOverride) {
    return (
        <div className="fixed top-2 right-24 z-[200] opacity-30 hover:opacity-100 transition-opacity">
            <button 
                onClick={handleSelectKey}
                className="text-[9px] font-black uppercase bg-gray-900/50 text-indigo-400 hover:text-white px-2 py-1 rounded border border-indigo-500/30 transition-colors"
            >
                Settings: API Key
            </button>
        </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[250] bg-indigo-600 p-2 text-white shadow-xl flex items-center justify-center gap-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span className="text-sm font-bold">Studio Narration requires a Paid API Key selection</span>
      </div>
      <div className="flex items-center gap-2">
        <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline hover:text-indigo-200 font-semibold"
        >
            Billing Info
        </a>
        <Button onClick={handleSelectKey} className="!py-1 !px-4 text-xs bg-white !text-indigo-600 hover:bg-indigo-50 shadow-md">
            Select Key Now
        </Button>
      </div>
    </div>
  );
};

export default ApiKeySelector;
