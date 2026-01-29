import React from 'react';
import { StoryCharacter } from '../types';
import IconButton from './IconButton';

interface CharacterCardProps {
  character: StoryCharacter;
  onDelete: (id: string) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onDelete }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <IconButton
          onClick={() => onDelete(character.id)}
          ariaLabel={`Delete ${character.name}`}
          className="hover:bg-red-500/50 hover:text-red-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </IconButton>
      </div>
      <h5 className="font-bold text-gray-100 pr-8">{character.name}</h5>
      <p className="text-sm text-gray-400 mt-1">{character.description}</p>
    </div>
  );
};

export default CharacterCard;