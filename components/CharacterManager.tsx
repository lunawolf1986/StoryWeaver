import React, { useState } from 'react';
import { StoryCharacter, STORY_ARCHETYPES } from '../types';
import Button from './Button';
import TextArea from './TextArea';
import IconButton from './IconButton';
import CharacterCard from './CharacterCard';
import { v4 as uuidv4 } from 'uuid';

interface CharacterManagerProps {
  characters: StoryCharacter[];
  setCharacters: React.Dispatch<React.SetStateAction<StoryCharacter[]>>;
}

const CharacterManager: React.FC<CharacterManagerProps> = ({ characters, setCharacters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  const handleAddCharacter = () => {
    if (!newCharName.trim() || !newCharDesc.trim()) return;
    setCharacters([...characters, { id: uuidv4(), name: newCharName, description: newCharDesc }]);
    setNewCharName('');
    setNewCharDesc('');
    setSelectedArchetype(null);
  };

  const handleSelectTemplate = (name: string, description: string) => {
    setNewCharName(name);
    setNewCharDesc(description);
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
  };
  
  if (!isOpen) {
    return (
      <div className="text-center">
        <Button onClick={() => setIsOpen(true)} className="bg-gray-600 hover:bg-gray-500">
          {characters.length > 0 ? `Edit Characters (${characters.length})` : 'Add Characters (Optional)'}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-200">Character Creator</h3>
        <Button onClick={() => setIsOpen(false)} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-500">Done</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Form and Archetypes */}
        <div className="space-y-4">
          <div className="bg-gray-800/60 p-3 rounded-md">
            <h4 className="font-semibold mb-2 text-indigo-300">Add a New Character</h4>
            <div className="space-y-2">
              <input
                type="text"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Character Name"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400"
              />
              <TextArea
                value={newCharDesc}
                onChange={(e) => setNewCharDesc(e.target.value)}
                placeholder="Character Description (e.g., personality, appearance, backstory)"
                rows={4}
              />
              <Button onClick={handleAddCharacter} disabled={!newCharName || !newCharDesc} className="w-full">
                Add Character to Story
              </Button>
            </div>
          </div>
          <div className="bg-gray-800/60 p-3 rounded-md">
             <h4 className="font-semibold mb-2 text-indigo-300">... or use an Archetype</h4>
             <div className="space-y-2">
              {STORY_ARCHETYPES.map(archetype => (
                <div key={archetype.name}>
                  <button onClick={() => setSelectedArchetype(selectedArchetype === archetype.name ? null : archetype.name)} className="w-full text-left font-semibold p-2 bg-gray-700 rounded-md hover:bg-gray-600">
                    {archetype.name}
                  </button>
                  {selectedArchetype === archetype.name && (
                    <div className="p-2 space-y-1">
                      {archetype.templates.map(template => (
                        <button key={template.name} onClick={() => handleSelectTemplate(template.name, template.description)} className="w-full text-left text-sm p-2 rounded-md hover:bg-indigo-600/50 text-gray-300">
                          <strong>{template.name}:</strong> {template.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
             </div>
          </div>
        </div>

        {/* Right Side: Character List */}
        <div className="space-y-3">
            <h4 className="font-semibold text-indigo-300">Characters Added to Story</h4>
            {characters.length === 0 ? (
                <p className="text-gray-400 text-sm p-4 text-center bg-gray-800/60 rounded-md">No characters added yet.</p>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {characters.map(char => (
                        <CharacterCard key={char.id} character={char} onDelete={handleDeleteCharacter} />
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CharacterManager;