import React from 'react';
import { Suggestion } from '../types';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: 'accepted' | 'rejected' | 'pending') => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onStatusChange }) => {
  const { id, category, explanation, originalText, suggestedChange, status } = suggestion;

  const getButtonClass = (buttonStatus: 'accepted' | 'rejected') => {
    if (status === buttonStatus) {
      switch (status) {
        case 'accepted':
          return 'bg-green-600 ring-2 ring-green-400 text-white';
        case 'rejected':
          return 'bg-red-600 ring-2 ring-red-400 text-white';
      }
    }
    return 'bg-gray-700 hover:bg-gray-600 text-gray-300';
  };

  const handleStatusChange = (newStatus: 'accepted' | 'rejected') => {
    // Allows toggling: clicking an active button resets it to 'pending'
    onStatusChange(id, status === newStatus ? 'pending' : newStatus);
  };

  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-4 space-y-3 transition-all">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-900/50 px-2 py-1 rounded-full">
          {category}
        </span>
      </div>
      <p className="text-sm text-gray-300 italic">"{explanation}"</p>
      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-semibold text-red-400 mb-1">ORIGINAL</h4>
          <p className="bg-red-900/30 p-2 rounded-md text-sm text-red-200/80 border border-red-800/50">
            {originalText}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-green-400 mb-1">SUGGESTION</h4>
          <p className="bg-green-900/30 p-2 rounded-md text-sm text-green-200/90 border border-green-800/50">
            {suggestedChange}
          </p>
        </div>
      </div>
      <div className="flex justify-end items-center gap-3 pt-2">
        <button
          onClick={() => handleStatusChange('accepted')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${getButtonClass(
            'accepted'
          )}`}
        >
          Accept
        </button>
        <button
          onClick={() => handleStatusChange('rejected')}
          className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${getButtonClass(
            'rejected'
          )}`}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;