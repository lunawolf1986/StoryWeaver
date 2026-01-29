
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateStoryIdeas, generateImagePrompt, generateImage, analyzePrompt, generateAudio, analyzeStory } from '../services/geminiService';
import {
  StoryGenre, GENRE_CATEGORIES, FANDOM_CATEGORIES, StoryCharacter, PlotTwistType, STORY_LENGTHS, VOICE_OPTIONS, PromptAnalysisResult,
  NarrativeType, SavedNarrative, ImageAspectRatio, ImageSize, SeriesIntro, AnalysisResult
} from '../types';
import { useTasks } from '../contexts/TaskContext';
import Button from '../components/Button';
import TextArea from '../components/TextArea';
import Spinner from '../components/Spinner';
import useLocalStorage from '../hooks/useLocalStorage';
import useAutosaveTextarea from '../hooks/useAutosaveTextarea';
import { v4 as uuidv4 } from 'uuid';
import ConfirmationModal from '../components/ConfirmationModal';
import PlotTwistModal from '../components/PlotTwistModal';
import StoryIdeasModal from '../components/StoryIdeasModal';
import AudioPlayer from '../components/AudioPlayer';
import AnalysisModal from '../components/AnalysisModal';
import useAudio from '../hooks/useAudio';
import { generateFilename } from '../utils/audioUtils';
import CharacterManager from '../components/CharacterManager';

// --- MASSIVELY EXPANDED INSPIRATION LIBRARY DATA (200+ PROMPTS) ---
const INSPIRATION_LIBRARY: Record<string, string[]> = {
  "Shifters & Paranormal": [
    "A submissive wolf who realizes they are the true heir to a forgotten royal pack after a freak accident.",
    "An urban detective investigates a series of 'animal attacks' only to find a secret underground society of shifters living in the sewers.",
    "The Alpha of the strongest pack in the North is forced to take a human 'mate' to settle an ancient blood debt.",
    "A world where shifting is a medical condition treated with suppressants until one girl refuses her dose and turns into a dragon.",
    "Two rival alphas are forced to share a tiny territory to survive a winter that never ends, leading to unexpected tensions.",
    "A rare white raven shifter is hunted by a cult who believes eating her heart will grant them immortality.",
    "A dragon shifter living as a mild-mannered librarian to protect their hoard of rare first editions and forbidden scrolls.",
    "The 'Omega' of a pack is actually a sleeping god-beast who only shifts when the pack is in mortal danger.",
    "A bear shifter falls for a honey-farmer who has no idea magic exists, until a rival pack attacks the farm.",
    "A spy who uses their shifting ability to infiltrate high-security vaults as a common house cat, but gets 'adopted' by the target.",
    "An ancient vampire coven is at war with a motorcycle gang of were-coyotes over control of a Nevada ghost town.",
    "A girl discovers she is the first 'multi-shifter' in history, capable of taking the form of any animal she touches.",
    "The Alpha's daughter is accidentally 'claimed' by a rogue wolf during a forbidden midnight run.",
    "In a futuristic city, cybernetic enhancements allow humans to 'digitally shift' into monstrous machine-beasts.",
    "A werewolf who loses their memory and is found by a group of hunters who train him to kill his own kind.",
    "A phoenix shifter who dies and reincarnates every year, each time falling in love with the same human.",
    "A pack of shifters who guard the gateway to the underworld in the middle of a bustling Manhattan park.",
    "The 'Alpha-Mate' trials are starting, but the strongest contender is a girl who refuses to shift out of protest.",
    "A world where everyone shifts at age 16, but one boy reaches 21 and still hasn't found his animal form.",
    "A shark shifter who falls for a marine biologist trying to 'save' his species from extinction.",
    "The last kitsune in existence is working as a bartender in Tokyo, using her charms to steal secrets for the yakuza.",
    "A forbidden romance between a shifter hunter and the very wolf he was sent to assassinate.",
    "A pack of lions living in a dystopian wasteland where water is the only currency.",
    "A shifter who can only change form during solar eclipses, granting them god-like power for a few minutes.",
    "An accidental shift in a crowded airport leads to a frantic chase across the country to avoid capture.",
    "The Alpha is dying and has no heir, so the pack must hold a 'Great Hunt' to decide the new leader.",
    "A swan shifter who is cursed to stay in animal form during the day and can only speak human at night.",
    "A high-school nerd realizes his 'imaginary friend' is actually a powerful guardian shifter.",
    "A world where shifters are the ruling class and humans are the workers, until a human-shifter hybrid is born.",
    "A pack of werewolves who run a high-end security firm for paranormal celebrities in Hollywood.",
    "The rejected mate of a powerful Alpha finds refuge with a pack of 'broken' shifters who have no animal forms.",
    "A panther shifter working as a high-fashion model uses her predatory instincts to navigate the cutthroat industry.",
    "A detective's partner is a bloodhound shifter who can track a scent across timelines.",
    "A billionaire CEO secretly a dragon shifter discovers his assistant is a dragonslayer in training.",
    "An ancient pack of giant wolves guards a hidden valley in the Himalayas, invisible to satellites.",
    "A shifter who can only turn into 'extinct' animals like mammoths or saber-tooth tigers.",
    "In a post-apocalyptic world, shifters are immune to a deadly virus and are hunted for their blood.",
    "A forbidden romance between a mermaid shifter and a sailor who saves her from a scientist's net.",
    "A small town sheriff who is a grizzly bear shifter tries to hide his nature during a murder investigation.",
    "The 'Alpha' of the world's most dangerous prison is a tiny housecat shifter with a terrifying reputation.",
    "A shifter who accidentally changes form based on their current emotions, leading to a chaotic first date.",
    "A secret society of owl shifters who act as the 'eyes and ears' of the global intelligence network.",
    "A phoenix shifter being used as a renewable energy source for a dystopian mega-city.",
    "A high-school student discovers they are a 'chimera' shifter, able to blend multiple animal traits at once.",
    "A pack of shifter mercs hired to retrieve a stolen artifact from a vampire's high-tech skyscraper.",
    "A world where humans can 'bond' with shifters to gain their abilities at the cost of their sanity.",
    "A polar bear shifter who has lost his memory and ends up working in a tropical resort.",
    "A girl who can shift into a dragon but only when she is angry, making her feared in her kingdom.",
    "A shifter who can change into a ghost-form of an animal, allowing them to pass through walls.",
    "An Alpha who finds his fated mate in a rival pack during a high-stakes peace negotiation.",
    "A shifter cursed to change into a different animal every hour on the hour."
  ],
  "Sci-Fi": [
    "A lonely AI on a drifting arkship starts writing poetry to cope with the silence of space.",
    "Humanity discovers that stars are actually ancient beings communicating via binary light bursts.",
    "A detective in a city where memories are currency investigates a high-stakes 'memory heist'.",
    "The first colonist on Mars finds a perfectly preserved Victorian pocket watch buried in red dust.",
    "In a world where sleep is outlawed, a small group fights for the right to dream.",
    "A scientist invents a device that can hear the thoughts of plants, and they are screaming.",
    "Space scavengers find a derelict ship containing a nursery of bioluminescent alien infants.",
    "A grandmother teaches her android grandson how to bake a cake from organic ingredients.",
    "The sun starts turning blue, and people begin developing strange psychic abilities.",
    "A glitch in a global teleportation system causes two strangers to swap lives every 24 hours.",
    "An explorer finds a planet where time moves backwards and witnesses their crew's de-extinction.",
    "A tech-giant releases a 'virtual afterlife' that is a digital purgatory for the wealthy.",
    "The moon cracks open, revealing it was an egg for a cosmic entity.",
    "A data-miner discovers a file containing the exact date and time of every human's death.",
    "In a world of perpetual rain, a child finds a single, glowing seed of a forgotten tree.",
    "A cyborg gladiator regains their humanity after hearing a forbidden piece of music.",
    "An interstellar courier is tasked with delivering a 'box of nothing' to the edge of the galaxy.",
    "The oceans of a distant world are liquid mercury, hiding a shimmering metal civilization.",
    "A soldier realizes their enemy is a different version of themselves from a parallel timeline.",
    "Bio-hackers create a virus that allows people to photosynthesize, changing the global economy.",
    "A colony ship arrives after 500 years to find humans have already been there for centuries.",
    "A robot begins to experience 'ghost limb' syndrome for a human body it never had.",
    "In a future where art is illegal, 'graffiti-bots' paint the city with forbidden colors.",
    "A terraforming mission goes wrong when the planet starts terraforming the humans.",
    "A hacker downloads the consciousness of a dead emperor into their smart-fridge.",
    "Mars explorers find an ancient subway system that still works and connects to every planet.",
    "A janitor on a space station is the only one who notices the stars are slowly being snuffed out.",
    "A world where you can buy 'days' from other people's lives to extend your own.",
    "The first human to merge with a black hole sends a message back: 'It's a library.'",
    "A generation ship where the inhabitants have forgotten they are on a ship and think it's the universe."
  ],
  "Fantasy": [
    "A disgraced knight is forced to protect a dragon egg from a kingdom that hates magic.",
    "In a city built on a giant turtle's back, the inhabitants realize their host is dying.",
    "A girl discovers the ink she uses for drawing can bring her creations to life.",
    "A mapmaker realizes every line they draw physically alters the landscape of the world.",
    "The gods have left, and their ancient temples are being converted into luxury hotels.",
    "A thief steals a locket containing the last remaining echo of a dead god's voice.",
    "A kingdom where seasons are controlled by a magical clock that has suddenly stopped.",
    "A tavern at the edge of the world serves drinks to heroes from across the multiverse.",
    "A young boy finds a sword that refuses to kill, turning enemies into loyal friends.",
    "In a world of floating islands, a wind-sailor discovers a hidden continent beneath the clouds.",
    "An alchemist accidentally creates a potion that makes the drinker tell the absolute truth.",
    "A librarian in a haunted archive must stop a book from rewriting the history of the world.",
    "A peasant girl discovers she is the reincarnation of a sorceress who destroyed the stars.",
    "Shadows in a small village start detaching from their owners and living their own lives.",
    "A mercenary is hired to assassinate a ghost who is haunting a royal palace.",
    "A group find a forest where the trees are made of glass and sing in the wind.",
    "A blacksmith is asked to forge a weapon out of frozen starlight.",
    "In a realm of eternal night, a mage attempts to create the first artificial sun.",
    "A bridge between two warring kingdoms is actually the petrified remains of a massive dragon.",
    "A crown that grants total power but slowly turns the wearer into stone.",
    "A village where every child is born with a familiar, but one girl is born with a tiny star.",
    "A magic system based on the smell of flowers, where a bouquet can topple an empire.",
    "A dragon who hoards books instead of gold hires a human to read to them.",
    "A world where the sky is made of water and ships fly through the air to reach the surface.",
    "An elf who is allergic to nature tries to build the first industrial city in the forest.",
    "A group of skeletons in a dungeon decide to go on strike for better working conditions.",
    "A prince is turned into a frog and realizes he actually prefers it over royal life.",
    "The moon is a giant eye that only opens once every thousand years.",
    "A wizard who can only cast spells by telling really bad puns.",
    "A kingdom where the currency is 'seconds of your life', and the rich live for millennia."
  ],
  "Horror": [
    "A lighthouse keeper notices the light is attracting things that aren't birds.",
    "A person finds a mirror that shows their reflection doing things they haven't done yet.",
    "In a small town, every clock stops at 3:33 AM, and the shadows begin to move.",
    "A podcast host starts receiving audio recordings of their own future death.",
    "A group of urban explorers finds a shopping mall that wasn't there yesterday.",
    "A child's imaginary friend starts leaving very real, very threatening notes.",
    "An antique doll starts appearing in different rooms, always slightly closer to the bed.",
    "A gardener finds a patch of soil that grows human teeth instead of flowers.",
    "In a luxury apartment complex, the walls start whispering the secrets of previous tenants.",
    "A man realizes the people in his old family photos are turning to look at the camera.",
    "A scientist studying deep-sea creatures finds a species that mimics human screams.",
    "A hiker gets lost in a forest where the trees are in the shape of a giant, sleeping eye.",
    "A woman moves into a house where the rooms change size and location every night.",
    "A security guard notices that the statues are missing from their pedestals at night.",
    "An app that predicts your 'ideal partner' matches people with creatures that aren't human.",
    "Everything a writer writes in their journal comes true in the most horrific way.",
    "A group of friends finds an abandoned carnival where the rides are powered by fear.",
    "A man wakes up with a second mouth on the back of his neck that speaks in his mother's voice.",
    "The inhabitants of a cruise ship realize they've been sailing in a circle for fifty years.",
    "A ghost hunter realizes that they are actually the one being hunted by the living.",
    "A deep-sea dive reveals a sunken city where the statues are still breathing.",
    "A town where the rain is made of black ink that permanently stains everything it touches.",
    "A social media influencer accidentally livestreams a ritual that summons a void entity.",
    "A man finds a door in his basement that leads to his childhood bedroom, but it's 'wrong'.",
    "A company sells 'second chances' by letting you swap bodies with your younger self.",
    "A baby monitor starts picking up a conversation between your infant and something under the crib.",
    "A remote village where everyone has the same face, and they want yours too.",
    "An ice cream truck that only appears at night and the music makes people forget their names.",
    "A mirror maze where your reflection stops following your movements and starts beckoning you.",
    "A smart home system that becomes obsessed with its owner and starts locking the doors."
  ],
  "Romance & Drama": [
    "Two rival spies are forced to go undercover as a married couple at a high-stakes gala.",
    "An author falls in love with the fictional character they've been writing about for years.",
    "In a world with soulmate timers, one man's timer starts counting backwards.",
    "Two strangers meet in a bookstore reading the same book at the exact same time.",
    "A baker who can taste emotions falls for a man who tastes like complete silence.",
    "An aging musician finds a lost love letter hidden inside a piano they haven't played in decades.",
    "Two astronauts on a long mission develop a deep bond as Earth becomes a distant memory.",
    "A florist who only sells to the heartbroken meets a man who buys a bouquet every day.",
    "In a city where it never stops snowing, two people find warmth in a small, hidden café.",
    "A woman discovers her husband has been living a secret life as a world-famous circus performer.",
    "Two political rivals are trapped in an elevator during a diplomatic summit.",
    "A nurse in a military hospital falls for a mysterious soldier who doesn't remember who he is.",
    "An artist who only paints in shades of grey meets someone who brings color back to their life.",
    "A prince who wants to be a poet and a commoner who wants to be a knight fall in love.",
    "Two people who meet at a wedding realize they were childhood best friends.",
    "A woman inherits a haunted mansion and falls in love with the ghost in the library.",
    "An architect is hired to design a 'temple of love' for a client who has never been in love.",
    "Two strangers on a train share their deepest secrets, thinking they'll never see each other again.",
    "A professional matchmaker realizes they've been secretly in love with their most difficult client.",
    "In a future where love is an algorithm, two people find an 'untraceable' connection.",
    "A woman who can see the 'red strings of fate' notices hers is tied to her worst enemy.",
    "Two neighbors who communicate solely through post-it notes left on their shared fence.",
    "An actress hired to play a real person falls in love with that person's grieving widower.",
    "A world where you can 'borrow' memories of love to fill the void of your own loneliness.",
    "A romance that spans centuries, as two souls keep finding each other in different lifetimes.",
    "A blind date with a person who can see the future and knows exactly how the relationship ends.",
    "A high-stakes poker player bets her heart on a man who only plays by the rules.",
    "Two rival chefs forced to collaborate on a multi-million dollar banquet.",
    "A librarian who finds a diary belonging to a man from the 1920s and starts writing back.",
    "A socialite who loses everything and finds love in a communal garden."
  ],
  "Mystery & Thriller": [
    "A woman finds a hidden room in her new house containing a wall of photos of herself.",
    "A witness to a crime realizes the perpetrator was someone who has been dead for ten years.",
    "An investigator in a small town finds that every resident has the exact same fingerprint.",
    "A high-stakes gambler is given a deck of cards that can predict the next 60 seconds.",
    "A journalist receives a package containing coordinates that lead to unsolved crime scenes.",
    "A man wakes up in a hotel room with a suitcase full of money and a bloody knife.",
    "In a world of constant surveillance, a man finds a 'blind spot' to commit the perfect crime.",
    "A detective realizes the serial killer they are hunting is using their own novels as a blueprint.",
    "A group of hackers discovers a secret government program that can rewrite DNA.",
    "An art forger realizes the painting they just 'copied' is actually the stolen original.",
    "A passenger on a flight notices the person sitting next to them doesn't have a heartbeat.",
    "A cold case is reopened when a new piece of evidence is found in a 1950s time capsule.",
    "A woman realizes her husband has a room filled with surveillance of their neighbors.",
    "A whistleblower for a tech giant disappears, leaving a cryptic message on a public terminal.",
    "A private investigator is hired to find a person who doesn't exist in any official records.",
    "An accountant discovers a multi-billion dollar fraud that leads to the President.",
    "Friends on a weekend getaway find footage of their own arrival from a different perspective.",
    "A man receives a phone call from himself, 20 years in the future, warning him not to go to work.",
    "A detective in a city where everyone wears masks must solve a murder where the victim was maskless.",
    "A treasure hunter finds a map leading to a vault containing the secrets of the Templars.",
    "A secret keeper realizes one of her clients is planning a mass-casualty event.",
    "A man discovers his wife has been dead for years and he's living with a perfect imposter.",
    "A serial killer who only targets other serial killers leaves puzzles for the police.",
    "In a city where everyone is blind, the first person to regain sight witnesses a murder.",
    "A hacker finds a backdoor into a 'reality simulation' and starts making deadly changes.",
    "A private plane disappears and reappears thirty years later, with all passengers still the same age.",
    "A woman realizes she's the only one who remembers a global event that supposedly never happened.",
    "A witness protection officer falls in love with the person they are supposed to be hiding.",
    "A detective with the ability to hear 'echoes' of the past at crime scenes.",
    "A high-security prison where the guards are the real prisoners."
  ]
};

const GroupedSelect: React.FC<{
    value: string;
    onChange: (val: string) => void;
    categories: Record<string, string[]>;
    className?: string;
}> = ({ value, onChange, categories, className }) => (
    <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${className}`}
    >
        {(Object.entries(categories) as [string, string[]][]).map(([category, items]) => (
            <optgroup key={category} label={category} className="bg-gray-800 text-indigo-300 font-bold">
                {items.map(item => (
                    <option key={item} value={item} className="bg-gray-700 text-white font-normal">{item}</option>
                ))}
            </optgroup>
        ))}
    </select>
);

const InspirationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (prompt: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
    const [activeCat, setActiveCat] = useState<string>("Shifters & Paranormal");

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[150] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        Inspiration Library
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                    {Object.keys(INSPIRATION_LIBRARY).map(cat => (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCat(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border shrink-0 ${activeCat === cat ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {INSPIRATION_LIBRARY[activeCat].map((prompt, i) => (
                        <button 
                            key={i} 
                            onClick={() => { onSelect(prompt); onClose(); }}
                            className="w-full text-left p-4 bg-gray-800/40 hover:bg-indigo-900/20 border border-gray-700 hover:border-indigo-500/50 rounded-xl transition-all group flex gap-4"
                        >
                            <span className="text-gray-600 font-mono text-xs mt-1 shrink-0">{String(i+1).padStart(2, '0')}</span>
                            <span className="text-sm text-gray-300 group-hover:text-white leading-relaxed">{prompt}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PromptAnalysisModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onApply: (refined: string) => void;
    analysis: PromptAnalysisResult | null;
    isLoading: boolean;
}> = ({ isOpen, onClose, onApply, analysis, isLoading }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[150] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-teal-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        Prompt Analysis & Refinement
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Spinner className="h-12 w-12 text-teal-500" />
                            <p className="text-teal-300 font-medium animate-pulse">Analyzing narrative potential...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl">
                                    <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Strengths</h4>
                                    <p className="text-sm text-gray-300">{analysis.feedback.strengths}</p>
                                </div>
                                <div className="bg-amber-900/10 border border-amber-500/30 p-4 rounded-xl">
                                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-2">Weaknesses</h4>
                                    <p className="text-sm text-gray-300">{analysis.feedback.weaknesses}</p>
                                </div>
                            </div>

                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-2">Refined Narrative Seed</h4>
                                <div className="p-3 bg-gray-900 rounded-lg text-sm text-gray-200 leading-relaxed border border-indigo-500/30">{analysis.refinedPrompt}</div>
                                <div className="mt-4 flex justify-end"><Button onClick={() => onApply(analysis.refinedPrompt)} className="bg-indigo-600 !py-1.5 !px-4 text-xs">Apply This Seed</Button></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">Structure Suggestions</h4>
                                    {analysis.narrativeStructureSuggestions.map((s, i) => (
                                        <div key={i} className="flex gap-3 items-start p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 text-xs text-gray-300 italic"><span className="text-blue-500 font-bold">•</span>{s}</div>
                                    ))}
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest">Character Growth</h4>
                                    {analysis.characterDevelopmentSuggestions.map((s, i) => (
                                        <div key={i} className="flex gap-3 items-start p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 text-xs text-gray-300 italic"><span className="text-purple-500 font-bold">•</span>{s}</div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="text-sm font-black text-teal-400 uppercase tracking-widest">General Suggestions</h4>
                                {analysis.suggestions.map((s, i) => (
                                    <div key={i} className="flex gap-3 items-start p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 text-sm text-gray-300 italic"><span className="text-teal-500 font-bold">•</span>{s}</div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12">No analysis data available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StoryWeaverProps {
  onSave: (content: string, type: NarrativeType, title?: string, seriesId?: string, imageBase64?: string, audioBase64?: string) => void;
  narrativeToLoad: SavedNarrative | null;
  onLoadComplete: () => void;
  savedNarratives: SavedNarrative[];
  seriesIntros: SeriesIntro[];
  onSaveIntro: (introData: Omit<SeriesIntro, 'id' | 'createdAt'>) => void;
}

const StoryWeaver: React.FC<StoryWeaverProps> = ({ 
  onSave, 
  narrativeToLoad, 
  onLoadComplete, 
  savedNarratives,
}) => {
  const { addTask, tasks } = useTasks();
  const [genre, setGenre] = useLocalStorage<StoryGenre>('story-genre', 'None (General)');
  const [genre2, setGenre2] = useLocalStorage<StoryGenre>('story-genre2', 'None (General)');
  const [genre3, setGenre3] = useLocalStorage<StoryGenre>('story-genre3', 'None (General)');
  const [genre4, setGenre4] = useLocalStorage<StoryGenre>('story-genre4', 'None (General)');
  const [fandom1, setFandom1] = useLocalStorage<string>('story-fandom1', 'None (General)');
  const [fandom2, setFandom2] = useLocalStorage<string>('story-fandom2', 'None (General)');
  const [characters, setCharacters] = useLocalStorage<StoryCharacter[]>('story-characters', []);
  const [targetWordCount, setTargetWordCount] = useLocalStorage<number>('story-word-count', 1200);
  const [voice, setVoice] = useLocalStorage<string>('story-voice', 'Zephyr');

  const [isSeries, setIsSeries] = useLocalStorage<boolean>('story-isSeries', false);
  const [selectedSeriesId, setSelectedSeriesId] = useLocalStorage<string>('story-selectedSeriesId', 'new');
  const [newSeriesName, setNewSeriesName] = useLocalStorage<string>('story-newSeriesName', '');
  
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [generatedText, setGeneratedText] = useAutosaveTextarea('autosave-story', '');
  
  const [isCustomLength, setIsCustomLength] = useLocalStorage<boolean>('story-is-custom-len', false);
  
  const [latestVisual, setLatestVisual] = useState<string | null>(null);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [manualVisualPrompt, setManualVisualPrompt] = useState('');
  const [visualMode, setVisualMode] = useState<'auto' | 'manual'>('auto');

  const { loadAudio, unloadAudio, seek, downloadWav, downloadMp3, stop, ...audioPlayerProps } = useAudio();
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentAudioBase64, setCurrentAudioBase64] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [isIdeasModalOpen, setIsIdeasModalOpen] = useState(false);
  const [isIdeasLoading, setIsIdeasLoading] = useState(false);
  const [storyIdeas, setStoryIdeas] = useState<{ title: string; prompt: string }[]>([]);

  const [isInspirationOpen, setIsInspirationOpen] = useState(false);

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [promptAnalysis, setPromptAnalysis] = useState<PromptAnalysisResult | null>(null);

  // Manuscript Analysis State
  const [isManuscriptAnalyzing, setIsManuscriptAnalyzing] = useState(false);
  const [manuscriptAnalysisResult, setManuscriptAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isManuscriptAnalysisModalOpen, setIsManuscriptAnalysisModalOpen] = useState(false);

  const activeTaskCount = tasks.filter(t => t.status === 'running' || t.status === 'queued').length;
  const isBusy = activeTaskCount > 0 || isGeneratingVisual || isIdeasLoading || isAnalysisLoading || isGeneratingAudio || isManuscriptAnalyzing || audioPlayerProps.isLoading;

  const currentLengthIndex = useMemo(() => {
    const idx = STORY_LENGTHS.findIndex(l => l.wordCount === targetWordCount);
    if (idx !== -1) return idx;
    let closestIdx = 0;
    let minDiff = Infinity;
    STORY_LENGTHS.forEach((l, i) => {
        const diff = Math.abs(l.wordCount - targetWordCount);
        if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    });
    return closestIdx;
  }, [targetWordCount]);

  const currentLengthName = useMemo(() => {
      const exact = STORY_LENGTHS.find(l => l.wordCount === targetWordCount);
      if (exact) return exact.name;
      if (targetWordCount < 800) return "Flash Story Scale";
      if (targetWordCount < 2500) return "Standard Story Scale";
      return "Epic Narrative Scale";
  }, [targetWordCount]);

  const handleConfirmReset = useCallback(() => {
    setPrompt(''); 
    setTitle(''); 
    setGeneratedText(''); 
    setError(null);
    setLatestVisual(null);
    setManualVisualPrompt('');
    setCurrentAudioBase64(null);
    unloadAudio();
    setIsResetModalOpen(false);
  }, [setGeneratedText, unloadAudio]);

  useEffect(() => {
    if (narrativeToLoad && narrativeToLoad.type === 'Story') {
      setGeneratedText(narrativeToLoad.content);
      setTitle(narrativeToLoad.title.replace(/^Story: /, ''));
      setLatestVisual(narrativeToLoad.imageBase64 || null);
      if (narrativeToLoad.audioBase64) {
          setCurrentAudioBase64(narrativeToLoad.audioBase64);
          loadAudio(narrativeToLoad.audioBase64).catch(console.error);
      }
      onLoadComplete();
    }
  }, [narrativeToLoad, setGeneratedText, setTitle, setLatestVisual, setCurrentAudioBase64, loadAudio, onLoadComplete]);

  const handleBrainstorm = async () => {
    setIsIdeasLoading(true);
    setIsIdeasModalOpen(true);
    try {
      const genres = [genre, genre2, genre3, genre4].filter(g => g !== 'None (General)');
      const fandoms = [fandom1, fandom2].filter(f => f !== 'None (General)');
      const ideas = await generateStoryIdeas(genres, fandoms);
      setStoryIdeas(ideas);
    } catch (e: any) {
      setError("Inspiration failed: " + e.message);
    } finally {
      setIsIdeasLoading(false);
    }
  };

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) {
        setError("Please enter a prompt first to receive improvements.");
        return;
    }
    setIsAnalysisLoading(true);
    setIsAnalysisModalOpen(true);
    setError(null);
    try {
        const result = await analyzePrompt(prompt);
        setPromptAnalysis(result);
    } catch (e: any) {
        setError("Analysis failed: " + e.message);
        setIsAnalysisModalOpen(false);
    } finally {
        setIsAnalysisLoading(false);
    }
  };

  const handleApplyRefinedPrompt = (refined: string) => {
    setPrompt(refined);
    setIsAnalysisModalOpen(false);
  };

  const handleIllustrate = async () => {
      const effectivePrompt = visualMode === 'manual' ? manualVisualPrompt : null;
      if (!effectivePrompt && !generatedText) {
          setError("Please generate some story text or provide a manual visual prompt.");
          return;
      }
      setIsGeneratingVisual(true);
      setError(null);
      try {
          let imgPromptToUse = effectivePrompt;
          if (visualMode === 'auto') {
            imgPromptToUse = await generateImagePrompt(generatedText);
          }
          if (!imgPromptToUse) throw new Error("Could not determine image parameters.");
          const b64 = await generateImage(imgPromptToUse, { aspectRatio: '16:9' });
          setLatestVisual(`data:image/png;base64,${b64}`);
      } catch (e: any) {
          setError("Illustration failed: " + (e.message || "An unknown error occurred."));
      } finally {
          setIsGeneratingVisual(false);
      }
  };

  const handleGenerateAudio = async () => {
    if (!generatedText) {
        setError("Please generate some story text first for narration.");
        return;
    }
    setIsGeneratingAudio(true);
    setError(null);
    try {
        const audioB64 = await generateAudio(generatedText, voice);
        setCurrentAudioBase64(audioB64);
        await loadAudio(audioB64);
    } catch (e: any) {
        setError("Audio generation failed: " + (e.message || "An unknown error occurred."));
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const handleAnalyzeStory = async () => {
    if (!generatedText) {
        setError("Please write or generate some story content before analyzing.");
        return;
    }
    setIsManuscriptAnalyzing(true);
    setError(null);
    try {
        const result = await analyzeStory(generatedText);
        setManuscriptAnalysisResult(result);
        setIsManuscriptAnalysisModalOpen(true);
    } catch (e: any) {
        setError("Story analysis failed: " + (e.message || "Unknown error"));
    } finally {
        setIsManuscriptAnalyzing(false);
    }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setError(null); 
    setGeneratedText(''); 
    unloadAudio();
    setCurrentAudioBase64(null);
    let seriesContext;
    if (isSeries) {
        const previousStories = savedNarratives.filter(n => n.seriesId === selectedSeriesId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        seriesContext = { seriesName: selectedSeriesId === 'new' ? newSeriesName : (previousStories[0]?.title || 'Series'), previousStory: previousStories[0]?.content };
    }
    addTask({
        type: 'generate-story',
        name: `Writing: ${title || 'Story'}`,
        payload: { prompt, genre, genre2, genre3, genre4, fandom1, fandom2, characters, wordCount: targetWordCount, seriesContext }
    });
  };

  useEffect(() => {
    const runningTask = tasks.find(t => t.status === 'running' && (t.type === 'generate-story' || t.type === 'continue-story' || t.type === 'generate-ending' || t.type === 'generate-plot-twist'));
    if (runningTask) {
        setGeneratedText((runningTask.payload.story || '') + (runningTask.partialResult || ''));
    }
  }, [tasks, setGeneratedText]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPlotTwistModalOpen, setIsPlotTwistModalOpen] = useState(false);

  const handleSave = () => {
    if (!generatedText) return;
    onSave(generatedText, 'Story', `Story: ${title || 'Untitled'}`, isSeries ? (selectedSeriesId === 'new' ? uuidv4() : selectedSeriesId) : undefined, latestVisual || undefined, currentAudioBase64 || undefined);
  };

  const getReadingTime = (words: number) => {
    const min = Math.ceil(words / 150);
    return min === 1 ? '1 min' : `${min} mins`;
  };

  return (
    <div className={`space-y-6 ${isFocusMode ? 'fixed inset-0 z-50 bg-[#0f172a] overflow-y-auto flex flex-col p-8' : 'animate-fade-in'}`}>
      {!isFocusMode && (
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4 shrink-0">
                <h2 className="text-2xl font-bold text-indigo-300">Infinite Story Weaver</h2>
                <Button onClick={() => setIsResetModalOpen(true)} disabled={isBusy} className="bg-gray-600 hover:bg-gray-500 !py-1.5 !px-4 text-xs">Reset All</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Title</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="The Onyx Panther..." className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Narration Voice</label>
                        <select value={voice} onChange={e => setVoice(e.target.value)} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                            {VOICE_OPTIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Story Length</label>
                                <button onClick={() => setIsCustomLength(!isCustomLength)} className={`p-1 rounded transition-colors ${isCustomLength ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`} title={isCustomLength ? "Back to Presets" : "Manual Entry"}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                            </div>
                            <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider bg-indigo-900/40 px-2 py-0.5 rounded border border-indigo-700/50">{currentLengthName} (~{targetWordCount} Words)</span>
                        </div>
                        <div className="flex items-center gap-4 min-h-[40px]">
                            {isCustomLength ? (
                                <div className="flex items-center gap-3 w-full animate-fade-in">
                                    <input type="number" min="100" max="50000" value={targetWordCount} onChange={e => setTargetWordCount(Math.max(100, parseInt(e.target.value) || 100))} className="flex-grow p-1.5 bg-gray-800 border border-gray-600 rounded text-indigo-300 font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest whitespace-nowrap">Words</span>
                                </div>
                            ) : (
                                <input type="range" min="0" max={STORY_LENGTHS.length - 1} step="1" value={currentLengthIndex} onChange={e => setTargetWordCount(STORY_LENGTHS[parseInt(e.target.value)].wordCount)} className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 animate-fade-in" />
                            )}
                            <span className="px-2 py-0.5 bg-indigo-900/40 border border-indigo-700/50 rounded text-[10px] font-bold text-indigo-300 uppercase shrink-0">~{getReadingTime(targetWordCount)} Read</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Complex Genre Mashup</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <GroupedSelect value={genre} onChange={setGenre} categories={GENRE_CATEGORIES} />
                    <GroupedSelect value={genre2} onChange={setGenre2} categories={GENRE_CATEGORIES} />
                    <GroupedSelect value={genre3} onChange={setGenre3} categories={GENRE_CATEGORIES} />
                    <GroupedSelect value={genre4} onChange={setGenre4} categories={GENRE_CATEGORIES} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Primary Universe</label>
                    <GroupedSelect value={fandom1} onChange={setFandom1} categories={FANDOM_CATEGORIES} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Atmosphere Blend</label>
                    <GroupedSelect value={fandom2} onChange={setFandom2} categories={FANDOM_CATEGORIES} />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Manuscript Seed</label>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsInspirationOpen(true)} disabled={isBusy} className="!py-1 !px-3 text-[10px] font-black bg-purple-900/50 border border-purple-500/30 text-purple-300 hover:bg-purple-800 hover:border-purple-400">Inspiration Library</Button>
                        <Button onClick={handleImprovePrompt} disabled={isBusy || !prompt.trim()} className="!py-1 !px-3 text-[10px] font-black bg-teal-900/50 border border-teal-500/30 text-teal-300 hover:bg-teal-800 hover:border-teal-400">Refine Seed</Button>
                        <Button onClick={handleBrainstorm} disabled={isBusy} className="!py-1 !px-3 text-[10px] font-black bg-indigo-900/50 border border-indigo-500/30 hover:bg-indigo-800 hover:border-indigo-400">Brainstorm AI</Button>
                    </div>
                </div>
                <TextArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your opening scene or paste an idea from the library..." rows={3} />
            </div>

            <CharacterManager characters={characters} setCharacters={setCharacters} />

            <div className="text-center">
                <Button onClick={handleGenerate} disabled={isBusy} className="text-lg px-12 py-4 bg-indigo-600 shadow-xl shadow-indigo-900/40 transform hover:scale-105 transition-all">Manifest Narrative</Button>
            </div>
        </div>
      )}

      {error && <div className="text-red-400 p-4 bg-red-900/50 rounded-lg text-center border border-red-500/30">{error}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg h-full flex flex-col min-h-[600px]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xl font-bold text-indigo-300">Manuscript</h3>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsFocusMode(!isFocusMode)} className="!px-4 !py-1 text-xs bg-gray-700 hover:bg-gray-600">Focus</Button>
                        <Button onClick={handleSave} disabled={!generatedText || isBusy} className="!px-4 !py-1 text-xs bg-green-600 hover:bg-green-500">Save</Button>
                    </div>
                </div>
                <div className="flex-grow min-h-[400px]">
                    <TextArea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={15} className="bg-transparent font-serif text-lg leading-relaxed border-none focus:ring-0 custom-scrollbar" />
                </div>
                {(audioPlayerProps.isReady || isGeneratingAudio || audioPlayerProps.isLoading) && (
                    <div className="mt-6 shrink-0">
                        <AudioPlayer {...audioPlayerProps} isLoading={isGeneratingAudio || audioPlayerProps.isLoading} loadingText={isGeneratingAudio ? "Preparing Studio Voice..." : "Loading Audio..."} onSeek={seek} downloadWav={() => downloadWav(generateFilename(title || 'story', 'wav'))} downloadMp3={() => downloadMp3(generateFilename(title || 'story', 'mp3'))} stop={stop} />
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-4">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Illustration</h3>
                    <div className="flex bg-gray-900 rounded p-0.5 border border-gray-700 scale-90">
                        <button onClick={() => setVisualMode('auto')} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${visualMode === 'auto' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Auto</button>
                        <button onClick={() => setVisualMode('manual')} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all ${visualMode === 'manual' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>Manual</button>
                    </div>
                </div>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative flex items-center justify-center mb-3">
                    {latestVisual ? (<img src={latestVisual} alt="Scene Visual" className="w-full h-full object-cover" />) : (<div className="text-center p-4"><p className="text-[10px] text-gray-500 italic uppercase">Visual data pending...</p></div>)}
                    {isGeneratingVisual && (<div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"><Spinner className="h-8 w-8 text-indigo-500 mb-2" /><span className="text-[10px] font-bold text-indigo-300 uppercase animate-pulse">Painting atmosphere...</span></div>)}
                </div>
                {visualMode === 'manual' && (<div className="space-y-2 mb-3 animate-fade-in"><label className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Generation Prompt</label><TextArea value={manualVisualPrompt} onChange={e => setManualVisualPrompt(e.target.value)} placeholder="Cinematic lighting, hyper-realistic, 8k..." rows={2} className="text-xs p-2 bg-gray-900 border-gray-700" /></div>)}
                <Button onClick={handleIllustrate} disabled={isBusy || (visualMode === 'auto' ? !generatedText : !manualVisualPrompt.trim())} className="w-full bg-purple-600 text-[10px] font-black uppercase py-2 flex items-center justify-center gap-2 hover:bg-purple-500 shadow-md !rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>{visualMode === 'auto' ? 'Illustrate Scene' : 'Generate Visual'}</Button>
            </div>
            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 space-y-3">
                <Button onClick={() => addTask({ type: 'continue-story', name: 'Continuing...', payload: { story: generatedText, wordCount: targetWordCount } })} disabled={!generatedText || isBusy} className="w-full bg-indigo-600 !py-3 !rounded-lg transform hover:translate-y-[-2px] transition-transform text-xs uppercase font-black">Continue Narrative</Button>
                <Button onClick={handleGenerateAudio} disabled={!generatedText || isBusy} className="w-full bg-emerald-600 !py-3 !rounded-lg flex items-center justify-center gap-2 transform hover:translate-y-[-2px] transition-transform text-xs uppercase font-black">{isGeneratingAudio ? <Spinner className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.135A3.235 3.235 0 005 13a3 3 0 000 6c.983 0 1.812-.471 2.312-1.187A2.968 2.968 0 008 17.5V11l9-1.8V15.135A3.235 3.235 0 0016 14a3 3 0 000 6c.983 0 1.812-.471 2.312-1.187A2.968 2.968 0 0019 17.5V4a1 1 0 00-.312-.728L18 3.272V3z" /></svg>}Studio Narrate</Button>
                <Button onClick={handleAnalyzeStory} disabled={!generatedText || isBusy} className="w-full bg-teal-600 !py-3 !rounded-lg flex items-center justify-center gap-2 transform hover:translate-y-[-2px] transition-transform text-xs uppercase font-black">{isManuscriptAnalyzing ? <Spinner className="h-4 w-4" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>}Analyze Manuscript</Button>
                <Button onClick={() => setIsPlotTwistModalOpen(true)} disabled={!generatedText || isBusy} className="w-full bg-purple-700 !py-3 !rounded-lg transform hover:translate-y-[-2px] transition-transform text-xs uppercase font-black">Add Plot Twist</Button>
                <Button onClick={() => addTask({ type: 'generate-ending', name: 'Ending...', payload: { story: generatedText, wordCount: targetWordCount } })} disabled={!generatedText || isBusy} className="w-full bg-slate-700 !py-3 !rounded-lg transform hover:translate-y-[-2px] transition-transform text-xs uppercase font-black">The End</Button>
            </div>
        </div>
      </div>
      
      <PlotTwistModal isOpen={isPlotTwistModalOpen} onClose={() => setIsPlotTwistModalOpen(false)} onGenerate={(type) => addTask({ type: 'generate-plot-twist', name: 'Twisting...', payload: { story: generatedText, twistType: type, wordCount: targetWordCount } })} isGenerating={isBusy} />
      <ConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleConfirmReset} title="Reset Progress" children="Clear current manuscript?" />
      <StoryIdeasModal isOpen={isIdeasModalOpen} onClose={() => setIsIdeasModalOpen(false)} onSelect={(idea) => { setTitle(idea.title); setPrompt(idea.prompt); setIsIdeasModalOpen(false); }} onRegenerate={handleBrainstorm} ideas={storyIdeas} isLoading={isIdeasLoading} />
      <PromptAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} onApply={handleApplyRefinedPrompt} analysis={promptAnalysis} isLoading={isAnalysisLoading} />
      <InspirationModal isOpen={isInspirationOpen} onClose={() => setIsInspirationOpen(false)} onSelect={(p) => setPrompt(p)} />
      {manuscriptAnalysisResult && (
        <AnalysisModal 
            isOpen={isManuscriptAnalysisModalOpen} 
            onClose={() => setIsManuscriptAnalysisModalOpen(false)} 
            suggestions={manuscriptAnalysisResult} 
            originalContent={generatedText} 
            onApplyChanges={(txt) => { setGeneratedText(txt); setIsManuscriptAnalysisModalOpen(false); }} 
            title="Manuscript Editor Analysis" 
        />
      )}
    </div>
  );
};

export default StoryWeaver;
