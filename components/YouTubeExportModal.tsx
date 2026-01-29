
import React, { useState, useMemo } from 'react';
import Button from './Button';
import { YouTubeExportContent } from '../types';
import Spinner from './Spinner';
import TextArea from './TextArea';
import JSZip from 'jszip';

interface YouTubeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: YouTubeExportContent | null;
  isLoading: boolean;
  storyText: string;
  imageBase64: string | null;
  audioBase64?: string | null;
}

const CopyButton: React.FC<{ onCopy: () => void; hasCopied: boolean }> = ({ onCopy, hasCopied }) => (
  <button
    onClick={onCopy}
    className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${
      hasCopied
        ? 'bg-green-600 text-white'
        : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
    }`}
  >
    {hasCopied ? 'Copied!' : 'Copy'}
  </button>
);

const YouTubeExportModal: React.FC<YouTubeExportModalProps> = ({
  isOpen,
  onClose,
  content,
  isLoading,
  storyText,
  imageBase64,
  audioBase64,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isBundling, setIsBundling] = useState(false);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text: ', err);
    });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadBundle = async () => {
    if (!content) return;
    setIsBundling(true);

    try {
      const zip = new JSZip();
      const folderName = content.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const folder = zip.folder(folderName);

      if (!folder) return;

      // 1. Metadata File
      const tags = content.tags ? content.tags.join(', ') : '';
      const chapters = content.chapters ? content.chapters.map(c => `00:00 - ${c}`).join('\n') : '';

      const metaContent = `TITLE:\n${content.title}\n\n` +
        `VIDEO HOOK (Intro):\n${content.videoHook}\n\n` +
        `DESCRIPTION:\n${content.description}\n\n` +
        `TAGS:\n${tags}\n\n` +
        `CHAPTERS:\n${chapters}`;
      
      folder.file('youtube_metadata.txt', metaContent);

      // 2. Story Script
      folder.file('story_script.txt', storyText);

      // 3. Image (Cover Art)
      if (imageBase64) {
        const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
        folder.file('cover_art.png', base64Data, { base64: true });
      }

      // 4. Audio Narration
      if (audioBase64) {
        const base64Data = audioBase64.includes('base64,') ? audioBase64.split('base64,')[1] : audioBase64;
        folder.file('narration.mp3', base64Data, { base64: true });
      }

      // Generate Zip
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Trigger Download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_Creator_Bundle.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to create bundle:", error);
      alert("Failed to create download bundle. Please try downloading assets individually.");
    } finally {
      setIsBundling(false);
    }
  };

  const formattedChapters = useMemo(() => {
    if (!content?.chapters || !Array.isArray(content.chapters)) return '';
    const chapterLines = content.chapters.map(ch => `00:00 - ${ch}`);
    return `TIMESTAMPS:\n${chapterLines.join('\n')}\n\n(Note: Please update timestamps manually in your video editor.)`;
  }, [content]);

  const formattedTags = useMemo(() => {
    if (!content?.tags || !Array.isArray(content.tags)) return '';
    return content.tags.join(', ');
  }, [content]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <style>{`.animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6 flex-shrink-0">
             <h2 className="text-3xl font-bold text-red-400 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Export for YouTube
            </h2>
            {content && (
                <Button 
                    onClick={handleDownloadBundle} 
                    disabled={isBundling}
                    className="bg-indigo-600 hover:bg-indigo-700 !py-2 !px-4 text-sm flex items-center gap-2 shadow-lg shadow-indigo-900/50"
                >
                    {isBundling ? (
                        <>
                            <Spinner className="h-4 w-4" />
                            <span>Packaging Assets...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download Creator Bundle
                        </>
                    )}
                </Button>
            )}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner className="h-8 w-8" />
            <span className="ml-4 text-lg">Optimizing Content...</span>
          </div>
        ) : content ? (
          <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <h4 className="text-blue-300 font-semibold text-sm">Bundle Package Ready</h4>
                    <p className="text-blue-200/80 text-sm mt-1">
                        Your bundle includes: <span className="text-white font-bold">Metadata</span>, <span className="text-white font-bold">Story Script</span>, 
                        {imageBase64 ? <span className="text-green-400 font-bold"> Cover Art</span> : ''}
                        {audioBase64 ? <span className="text-indigo-400 font-bold">, and Studio Audio</span> : ''}.
                    </p>
                </div>
            </div>

            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-200">Video Title</h3>
                <CopyButton onCopy={() => handleCopy(content.title, 'title')} hasCopied={copiedField === 'title'} />
              </div>
              <p className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white">{content.title}</p>
            </div>

            {/* Video Hook */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-200">Video Hook (Intro Script)</h3>
                <CopyButton onCopy={() => handleCopy(content.videoHook, 'hook')} hasCopied={copiedField === 'hook'} />
              </div>
              <p className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white italic">"{content.videoHook}"</p>
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-200">Video Description</h3>
                <CopyButton onCopy={() => handleCopy(content.description, 'description')} hasCopied={copiedField === 'description'} />
              </div>
              <TextArea value={content.description} readOnly rows={6} className="text-sm leading-relaxed" />
            </div>

            {/* Thumbnail Ideas */}
            <div>
              <h3 className="font-semibold text-lg text-gray-200 mb-2">Thumbnail Ideas</h3>
              <div className="space-y-3">
                {content.thumbnailIdeas?.map((idea, index) => (
                  <div key={index} className="p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <strong className="text-indigo-300">Idea {index + 1}:</strong> {idea}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapters */}
            {content.chapters && content.chapters.length > 0 && (
                <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg text-gray-200">Chapter Markers</h3>
                    <CopyButton onCopy={() => handleCopy(formattedChapters, 'chapters')} hasCopied={copiedField === 'chapters'} />
                </div>
                <TextArea value={formattedChapters} readOnly rows={5} className="text-sm leading-relaxed" />
                </div>
            )}

            {/* Tags */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-gray-200">Tags / Keywords</h3>
                <CopyButton onCopy={() => handleCopy(formattedTags, 'tags')} hasCopied={copiedField === 'tags'} />
              </div>
              <p className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-300 text-sm">{formattedTags}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 p-8">No content to display.</p>
        )}

        <div className="mt-8 flex justify-end gap-4 flex-shrink-0">
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-500">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default YouTubeExportModal;
