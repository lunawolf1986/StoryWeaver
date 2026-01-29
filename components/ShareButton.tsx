import React, { useState } from 'react';

const ShareButton: React.FC = () => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500); // Reset after 2.5 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert("Could not copy link to clipboard. Please copy the URL from your browser's address bar.");
    }
  };

  return (
    <button
      onClick={handleShare}
      title={isCopied ? 'Link Copied!' : 'Copy Development Link'}
      className={`
        px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
        ${isCopied ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}
      `}
      aria-label={isCopied ? 'Link copied to clipboard' : 'Copy development link to clipboard'}
    >
      {isCopied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.875-5.929l-4.94-2.47A3.001 3.001 0 0015 8z" />
        </svg>
      )}
      <span>{isCopied ? 'Copied!' : 'Share'}</span>
    </button>
  );
};

export default ShareButton;