
import React, { useState } from 'react';
import { generateImagePrompt, generateImage } from '../services/geminiService';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';
import { ImageAspectRatio, ImageSize } from '../types';

const ImageStudio: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'prompt' | 'sketch'>('prompt');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('16:9');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastPromptUsed, setLastPromptUsed] = useState<string | null>(null);
  
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to generate an image.");
      return;
    }

    setError(null);
    setGeneratedImage(null);
    setLastPromptUsed(null);
    setIsLoadingPrompt(mode === 'sketch');
    setIsLoadingImage(false);

    try {
      let finalPrompt = inputText;

      if (mode === 'sketch') {
        finalPrompt = await generateImagePrompt(inputText);
        if (!finalPrompt) {
          throw new Error("AI failed to generate a descriptive image prompt. Please try again or provide more detailed text.");
        }
        setLastPromptUsed(finalPrompt);
        setIsLoadingPrompt(false);
      }

      setIsLoadingImage(true);
      const base64Image = await generateImage(finalPrompt, {
        aspectRatio,
        imageSize,
      });
      setGeneratedImage(`data:image/png;base64,${base64Image}`);
    } catch (e: any) {
      setError(`Image generation failed: ${e.message || "An unknown error occurred. Ensure your API key is valid."}`);
    } finally {
      setIsLoadingPrompt(false);
      setIsLoadingImage(false);
    }
  };

  const isBusy = isLoadingPrompt || isLoadingImage;

  const ratios: { label: string, value: ImageAspectRatio, icon: string }[] = [
    { label: 'Square', value: '1:1', icon: '◻️' },
    { label: 'Portrait', value: '3:4', icon: '▯' },
    { label: 'Landscape', value: '4:3', icon: '▭' },
    { label: 'Cinematic', value: '16:9', icon: '🎞️' },
    { label: 'Vertical', value: '9:16', icon: '📱' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-indigo-300 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Image Studio
            </h2>
            <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700">
                <button 
                    onClick={() => setMode('prompt')} 
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'prompt' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Direct Prompt
                </button>
                <button 
                    onClick={() => setMode('sketch')} 
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'sketch' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Creative Sketch
                </button>
            </div>
        </div>
        
        <p className="text-gray-400 text-sm">
            {mode === 'prompt' 
                ? 'Provide exact technical instructions for the image generation model.' 
                : 'Paste a story snippet or a loose description. The AI will brainstorm a cinematic prompt for you.'}
        </p>

        <div className="space-y-6">
          <TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={mode === 'prompt' 
                ? "e.g., 'A cyberpunk street scene, neon lighting, rain-slicked asphalt, cinematic 8k resolution, volumetric fog...'" 
                : "e.g., 'The hero stood atop the burning ruins of the obsidian castle, his cape fluttering in the wind as the first rays of dawn broke through the clouds...'"}
            rows={5}
            className="bg-gray-900/40 rounded-xl border-gray-700 focus:border-indigo-500"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                    {ratios.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setAspectRatio(r.value)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all w-20 h-20 gap-1 ${aspectRatio === r.value ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-gray-700/20 border-gray-600 text-gray-500 hover:border-gray-500'}`}
                        >
                            <span className="text-xl">{r.icon}</span>
                            <span className="text-[9px] font-black uppercase tracking-tighter">{r.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Resolution & Quality</label>
                <div className="flex gap-2">
                    {(['1K', '2K', '4K'] as ImageSize[]).map(size => (
                        <button
                            key={size}
                            onClick={() => setImageSize(size)}
                            className={`flex-grow py-3 rounded-xl border transition-all text-sm font-black flex flex-col items-center gap-1 ${imageSize === size ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-700/40 border-gray-600 text-gray-500 hover:text-gray-300'}`}
                        >
                            {size}
                            <span className="text-[8px] font-normal opacity-60">
                                {size === '1K' ? 'Standard' : size === '2K' ? 'High Definition' : 'Pro (Experimental)'}
                            </span>
                        </button>
                    ))}
                </div>
                {imageSize !== '1K' && (
                    <div className="flex items-center gap-2 p-2 bg-indigo-900/20 rounded-lg border border-indigo-700/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-[9px] text-indigo-300 leading-tight">Switching to Gemini 3 Pro model for high-resolution output. Requires an API key from a paid project.</p>
                    </div>
                )}
            </div>
          </div>

          <div className="text-center pt-4">
            <Button
              onClick={handleGenerateImage}
              disabled={isBusy || !inputText.trim()}
              className="text-lg px-12 py-4 bg-purple-600 shadow-xl shadow-purple-900/40"
            >
              {isLoadingPrompt ? (
                <>
                  <Spinner />
                  <span className="ml-2">Brainstorming Concept...</span>
                </>
              ) : isLoadingImage ? (
                <>
                  <Spinner />
                  <span className="ml-2">Forging Image...</span>
                </>
              ) : (
                'Generate Image'
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}

      {(generatedImage || lastPromptUsed) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {lastPromptUsed && (
            <div className="lg:col-span-1 bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg">
                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Interpreted Prompt</h3>
                <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg italic text-sm text-gray-300 leading-relaxed">
                    "{lastPromptUsed}"
                </div>
            </div>
          )}
          <div className={`${lastPromptUsed ? 'lg:col-span-2' : 'lg:col-span-3'} bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-indigo-300">Generated Visual</h3>
                {generatedImage && (
                    <a href={generatedImage} download="forge-visual.png" className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download PNG
                    </a>
                )}
            </div>
            <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center min-h-[400px]">
              {generatedImage ? (
                <img src={generatedImage} alt="Generated Visual" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-gray-600 animate-pulse">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="text-sm font-bold uppercase tracking-widest">Image Data Pending...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStudio;
