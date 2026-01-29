

// Define types for story genres
export type StoryGenre = string;

export const GENRE_CATEGORIES: Record<string, string[]> = {
  "General": ["None (General)", "Action", "Adventure", "Comedy", "Drama", "Fiction", "Realism", "Slice of Life", "Satire", "Parody", "Fable"],
  "Fantasy": ["Adventure Fantasy", "Contemporary Fantasy", "Cozy Fantasy", "Dark Fantasy", "Epic Fantasy", "Fairy Tale", "Grimdark", "High Fantasy", "Historical Fantasy", "Isekai", "LitRPG", "Low Fantasy", "Magical Realism", "Medieval", "Sword and Sorcery", "Urban Fantasy", "Flintlock Fantasy", "Gaslamp Fantasy", "Mythic Fantasy", "Silkpunk", "Wuxia/Xianxia", "Military Fantasy"],
  "Sci-Fi": ["Alien Contact", "Alternate History", "Artificial Intelligence", "Cyberpunk", "Hard Science Fiction", "Military Sci-Fi", "Near Future Sci-Fi", "Post-Apocalyptic", "Robot Fiction", "Space Opera", "Steampunk", "Time Travel", "Biopunk", "Solarpunk", "Hopepunk", "Nanopunk", "First Contact", "Dystopian"],
  "Horror": ["Body Horror", "Creature Feature", "Eldritch Horror", "Ghost Story", "Gothic Horror", "Psychological Horror", "Slasher", "Supernatural Horror", "Zombie Apocalypse", "Cosmic Horror", "Folk Horror", "Splatterpunk", "Analog Horror", "Survival Horror"],
  "Thriller & Mystery": ["Conspiracy Thriller", "Cozy Mystery", "Crime", "Detective Fiction", "Espionage", "Heist", "Mystery", "Noir", "Police Procedural", "Political Thriller", "Psychological Thriller", "Spy Thriller", "Whodunit", "Hardboiled Noir", "Legal Thriller", "Medical Thriller", "Techno-Thriller"],
  "Romance": ["Contemporary Romance", "Dark Romance", "Enemies to Lovers", "Fantasy Romance", "Historical Romance", "LGBTQ+ Romance", "Paranormal Romance", "Regency Romance", "Romantic Comedy", "Romantic Suspense", "Slow Burn", "Fake Dating", "Forced Proximity", "Omegaverse", "Second Chance Romance", "Werewolf Romance", "Vampire Romance"],
  "Adult & Erotica": ["BDSM", "Dark College Romance", "Erotica", "Erotic Romance", "Mafia Romance", "Monster Romance", "Shifter Romance"],
  "Literary & Drama": ["Coming-of-Age", "Dark Academia", "Historical Fiction", "Literary Fiction", "Philosophical Fiction", "Satire", "Tragedy", "Young Adult (YA)", "New Adult", "Middle Grade", "Southern Gothic", "Epistolary"]
};

export const STORY_GENRES: StoryGenre[] = Object.values(GENRE_CATEGORIES).flat().sort();

export type StoryFandom = string;

export const FANDOM_CATEGORIES: Record<string, string[]> = {
  "General": ["None (General)"],
  "Anime & Manga": ["Attack on Titan", "Berserk", "Cowboy Bebop", "Demon Slayer", "Dragon Ball", "Fullmetal Alchemist", "My Hero Academia", "Naruto", "One Piece", "Spy x Family", "Jujutsu Kaisen", "Bleach", "Hunter x Hunter", "Death Note", "JoJo's Bizarre Adventure", "Neon Genesis Evangelion", "Chainsaw Man"],
  "Video Games": ["Baldur's Gate", "Call of Duty", "Cyberpunk 2077", "Elden Ring", "Fallout", "Final Fantasy", "The Legend of Zelda", "Mass Effect", "The Witcher", "Halo", "Resident Evil", "God of War", "Dragon Age", "Horizon Zero Dawn", "Metal Gear Solid", "Dark Souls", "Bloodborne", "Genshin Impact", "Persona"],
  "Movies & TV": ["Avatar", "Doctor Who", "Game of Thrones", "Marvel Universe", "Star Trek", "Star Wars", "Stranger Things", "The Walking Dead", "DC Universe", "Indiana Jones", "Jurassic Park", "Pirates of the Caribbean", "Breaking Bad", "The Boys", "Supernatural", "Twin Peaks", "The Last of Us", "The Witcher (Netflix Series)", "Twilight (Movies)"],
  "Books & Literature": ["Dune", "Harry Potter", "Lord of the Rings", "Sherlock Holmes", "The Wheel of Time", "The Stormlight Archive", "Mistborn", "The Chronicles of Narnia", "Discworld", "Percy Jackson", "Cthulhu Mythos", "The Witcher (Books)", "Grishaverse", "Twilight (Books)"]
};

export const STORY_FANDOMS: StoryFandom[] = Object.values(FANDOM_CATEGORIES).flat().sort();

// Removed WritingStyle type and WRITING_STYLES constant
// Removed NarrativeIntensity type and NARRATIVE_INTENSITIES constant

export type MeditationFocus = 'Relaxation' | 'Stress Relief' | 'Focus' | 'Sleep' | 'Mindfulness' | 'Loving-Kindness' | 'Visualization';
export const MEDITATION_FOCUSES: MeditationFocus[] = ['Mindfulness', 'Relaxation', 'Stress Relief', 'Focus', 'Sleep', 'Loving-Kindness', 'Visualization'];

export type SleepTheme = 'Enchanted Forest' | 'Cosmic Voyage' | 'Undersea Kingdom' | 'Cozy Cabin' | 'Ancient Library' | 'Moonlit Garden';
export const SLEEP_THEMES: SleepTheme[] = ['Enchanted Forest', 'Cosmic Voyage', 'Undersea Kingdom', 'Cozy Cabin', 'Ancient Library', 'Moonlit Garden'];

export interface LengthOption { name: string; wordCount: number; }
export const STORY_LENGTHS: LengthOption[] = [
    { name: 'Micro Fiction', wordCount: 150 },
    { name: 'Drabble', wordCount: 300 },
    { name: 'Sudden Fiction', wordCount: 400 },
    { name: 'Flash Fiction', wordCount: 500 },
    { name: 'Miniature Tale', wordCount: 650 },
    { name: 'Quick Tale', wordCount: 800 },
    { name: 'Short Story (Short)', wordCount: 1000 },
    { name: 'Short Story', wordCount: 1200 },
    { name: 'Short Story (Long)', wordCount: 1500 },
    { name: 'Novelette', wordCount: 2000 },
    { name: 'Standard Chapter', wordCount: 3000 },
    { name: 'Epic Segment', wordCount: 5000 },
    { name: 'Long Chapter', wordCount: 7500 },
    { name: 'Novella Part', wordCount: 10000 },
    { name: 'Extended Chapter', wordCount: 12500 },
    { name: 'Epic Conclusion', wordCount: 15000 }
];

export const MEDITATION_LENGTHS: LengthOption[] = [
    { name: 'Quick Reset', wordCount: 150 },
    { name: 'Short Session', wordCount: 300 },
    { name: 'Brisk Practice', wordCount: 400 },
    { name: 'Standard Session', wordCount: 500 },
    { name: 'Mindful Mid-Length', wordCount: 750 },
    { name: 'Focused Practice', wordCount: 1000 },
    { name: 'Deep Immersion', wordCount: 2000 },
    { name: 'Extended Journey', wordCount: 3000 }
];
export const SLEEP_STORY_LENGTHS: LengthOption[] = STORY_LENGTHS;

export type IntroTone = 'Epic' | 'Gritty' | 'Whimsical' | 'Suspenseful' | 'Heartfelt' | 'Epic & Grandiose';
export const INTRO_TONES: IntroTone[] = ['Epic', 'Gritty', 'Whimsical', 'Suspenseful', 'Heartfelt', 'Epic & Grandiose'];

// Voice options for TTS generation
export const VOICE_OPTIONS = [
  { id: 'Zephyr', name: 'Zephyr' },
  { id: 'Puck', name: 'Puck' },
  { id: 'Charon', name: 'Charon' },
  { id: 'Kore', name: 'Kore' },
  { id: 'Fenrir', name: 'Fenrir' }
];

export type PlotTwistType = 'The Betrayal' | 'The False Protagonist' | 'The "It Was All a Dream"' | 'The Hidden Villain' | 'The Time Loop' | 'The Identity Swap';
export interface PlotTwistDetail { type: PlotTwistType; description: string; icon: string; }
export const PLOT_TWIST_DETAILS: PlotTwistDetail[] = [
    { type: 'The Betrayal', icon: '⚔️', description: 'A trusted ally reveals their true colors.' },
    { type: 'The False Protagonist', icon: '👤', description: 'Focus shifts unexpectedly to another character.' },
    { type: 'The "It Was All a Dream"', icon: '💭', description: 'Reality is revealed as a simulation.' },
    { type: 'The Hidden Villain', icon: '🎭', description: 'The real threat was pulling strings from shadows.' },
    { type: 'The Time Loop', icon: '⏳', description: 'Events start repeating.' },
    { type: 'The Identity Swap', icon: '🔁', description: 'Two characters have switched roles.' }
];

export interface StoryCharacter { id: string; name: string; description: string; }
export interface StorySeries { id: string; name: string; }
export interface SeriesIntro { id: string; seriesId: string; script: string; tone: IntroTone; themes: string; createdAt: string; voice?: string; audioBase64?: string; }
export type NarrativeType = 'Story' | 'Meditation' | 'SleepStory' | 'Ad';
export interface SavedNarrative { id: string; type: NarrativeType; title: string; content: string; createdAt: string; seriesId?: string; imageBase64?: string; audioBase64?: string; }

export interface AISuggestion { category: string; originalText: string; suggestedChange: string; explanation: string; }
export interface Suggestion extends AISuggestion { id: string; status: 'accepted' | 'rejected' | 'pending'; }

export interface PlotStructure {
    incitingIncident: string;
    risingAction: string;
    climax: string;
    fallingAction: string;
    resolution: string;
}

export interface AnalysisResult { 
    critique: string; 
    suggestions: AISuggestion[]; 
    characterAnalysis?: string; 
    vocabularyAnalysis?: string; 
    vocabularyScore?: number; 
    pacingAnalysis?: string;
    plotStructure?: PlotStructure;
}
export interface YouTubeExportContent { title: string; description: string; videoHook: string; chapters: string[]; thumbnailIdeas: string[]; tags: string[]; }
export interface PromptAnalysisResult { 
    suggestions: string[]; 
    refinedPrompt: string;
    feedback: { strengths: string; weaknesses: string; plotHoles: string; characterConsistency: string; pacing: string; }; 
}

export interface AdBrainstormResult { audiences: string[]; benefits: string[]; }
export type AdStyle = 'Hype' | 'Storytelling' | 'Problem/Solution';
export const AD_STYLES: AdStyle[] = ['Hype', 'Storytelling', 'Problem/Solution'];
export type AdPlatform = 'TikTok' | 'YouTube' | 'Instagram';
export const AD_PLATFORMS: AdPlatform[] = ['TikTok', 'YouTube', 'Instagram'];
export type AdDuration = 'Short' | 'Medium' | 'Long';
export const AD_DURATIONS: AdDuration[] = ['Short', 'Medium', 'Long'];
export type AdFormat = 'Script' | 'Narrative' | 'Script (Visuals + Audio)';
export const AD_FORMATS: AdFormat[] = ['Script', 'Narrative', 'Script (Visuals + Audio)'];

export const STORY_ARCHETYPES = [
  { 
    name: 'The Hero', 
    templates: [
      { name: 'Reluctant Hero', description: 'Ordinary person forced into extraordinary circumstances, initially unwilling to answer the call.' },
      { name: 'The Chosen One', description: 'Destined from birth or by prophecy to save the world or defeat a great evil.' },
      { name: 'The Anti-Hero', description: 'Driven by self-interest or a flawed moral code, yet ultimately serving a greater good.' }
    ] 
  },
  {
    name: 'The Mentor',
    templates: [
      { name: 'The Wise Wizard', description: 'An elderly guide with mystical knowledge who prepares the hero for their journey.' },
      { name: 'The Retired Veteran', description: 'A battle-hardened expert who teaches the hero practical skills and survival.' },
      { name: 'The Hard-knocks Teacher', description: 'Uses tough love and harsh reality to ground the hero\'s idealism.' }
    ]
  },
  {
    name: 'The Shadow',
    templates: [
      { name: 'Tragic Villain', description: 'A primary antagonist whose evil stems from a deep personal loss or betrayal.' },
      { name: 'The Pure Evil', description: 'A force of nature with no redeeming qualities, seeking total destruction or power.' },
      { name: 'The Mirror Reflection', description: 'Possesses all the hero\'s strengths but lacks their moral compass; the "what if" version of the hero.' }
    ]
  },
  {
    name: 'The Shapeshifter',
    templates: [
      { name: 'The Double Agent', description: 'Their loyalties are constantly in question, switching sides to suit their own agenda.' },
      { name: 'The Mysterious Stranger', description: 'Provides critical help or hindrance but disappears before their true motives are known.' },
      { name: 'The Fickle Ally', description: 'A character who is genuinely torn between doing what is right and what is safe.' }
    ]
  },
  {
    name: 'The Ally',
    templates: [
      { name: 'Loyal Sidekick', description: 'Always at the hero\'s side, providing emotional support and reliable help.' },
      { name: 'The Skeptic', description: 'Questions the hero\'s decisions, often acting as the voice of reason or caution.' },
      { name: 'Comedic Relief', description: 'Lightens the mood during dark times, though often surprisingly brave when it counts.' }
    ]
  }
];

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'generate-story' | 'continue-story' | 'generate-ending' | 'generate-plot-twist' | 'analyze-story' | 'generate-youtube' | 'generate-meditation' | 'generate-sleep-story' | 'generate-ad-script' | 'brainstorm-ad' | 'generate-intro-script' | 'generate-ideas' | 'analyze-prompt';

export interface Task {
  id: string;
  type: TaskType;
  name: string;
  status: TaskStatus;
  progress: number;
  payload: any;
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  parentId?: string;
  partialResult?: string;
  retryCount?: number;
  cooldownUntil?: string;
}
