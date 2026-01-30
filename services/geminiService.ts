
import { GoogleGenAI, Type, GenerateContentResponse, Modality } from '@google/genai';
import {
  StoryCharacter,
  StoryFandom,
  StoryGenre,
  YouTubeExportContent,
  AnalysisResult,
  PromptAnalysisResult,
  AdBrainstormResult,
  ImageGenConfig,
} from '../types';

// Use Flash for high-speed creative generation
const NARRATIVE_MODEL = 'gemini-3-flash-preview';
// Use Pro for deep reasoning and analysis tasks
const ANALYSIS_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL_FLASH = 'gemini-2.5-flash-image';
const IMAGE_MODEL_PRO = 'gemini-3-pro-image-preview';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Robust cleaner that removes markdown symbols and labels for a clean story flow.
 */
export const cleanNarrativeText = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/###\s?/g, '')
      .replace(/##\s?/g, '')
      .replace(/#\s?/g, '')
      .replace(/Chapter \d+:\s?/gi, '')
      .replace(/Chapter \d+\s?/gi, '')
      .replace(/Part \d+:\s?/gi, '')
      .replace(/Part \d+\s?/gi, '')
      .replace(/Prologue:\s?/gi, '')
      .replace(/Prologue\s?/gi, '')
      .replace(/Epilogue:\s?/gi, '')
      .replace(/Epilogue\s?/gi, '');
  }
  if (Array.isArray(input)) {
    return input.map(item => cleanNarrativeText(item));
  }
  if (input !== null && typeof input === 'object') {
    const cleaned: any = {};
    for (const key in input) {
      cleaned[key] = cleanNarrativeText(input[key]);
    }
    return cleaned;
  }
  return input;
};

const request = async <T>(fn: () => Promise<T>, retries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || '').toLowerCase();
      
      if (msg.includes('requested entity was not found')) {
          throw new Error("The API key selected appears to be invalid for this project. Please go to 'Settings: API Key' and re-select your key.");
      }

      const isRetryable = msg.includes('429') || msg.includes('500') || msg.includes('internal error');
      
      if (isRetryable && i < retries - 1) {
          await delay(Math.pow(2, i) * 1000 + Math.random() * 1000);
          continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * Wraps text in a clean SSML container.
 * We avoid all 'prosody' modifiers as they introduce artifacts.
 */
const wrapInCleanSSML = (text: string): string => {
  return `<speak>${text.trim()}</speak>`;
};

export const generateAudio = async (text: string, voiceName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Removed directive/soothing voice instruction as requested.
  // Using the pure text ensures the cleanest narration.
  const ssmlText = wrapInCleanSSML(text);
  
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: ssmlText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  }));
  
  const data = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error("Audio generation returned no data.");
  return data;
};

export const generateStory = async (
  prompt: string,
  genre: StoryGenre,
  genre2: StoryGenre,
  genre3: StoryGenre,
  genre4: StoryGenre,
  fandom1: StoryFandom,
  fandom2: StoryFandom,
  characters: StoryCharacter[],
  wordCount: number,
  seriesContext?: { seriesName: string; previousStory?: string },
  onProgress?: (progress: number) => void,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const genres = [genre, genre2, genre3, genre4].filter(g => g && g !== 'None (General)').join(', ');
  const chars = characters.map(c => `${c.name}: ${c.description}`).join('\n');

  const systemInstruction = `You are a cinematic novelist. 
    Genre Mashup: ${genres}
    Characters: ${chars}
    STRICT: NO BOLDING. NO LABELS. Plain text only.
    Dialogue: "". Action: —. Target: ${wordCount} words.`;

  const userPrompt = seriesContext?.previousStory 
    ? `Continue "${seriesContext.seriesName}". Context: ...${seriesContext.previousStory.slice(-1500)}\n\nNext: ${prompt}`
    : `Start story: ${prompt}`;

  const stream = await request(() => ai.models.generateContentStream({
    model: NARRATIVE_MODEL,
    contents: userPrompt,
    config: { 
      systemInstruction,
      maxOutputTokens: Math.min(wordCount * 2, 4000),
      thinkingConfig: { thinkingBudget: Math.min(Math.floor(wordCount * 0.5), 1000) }
    }
  })) as any;

  let fullText = '';
  for await (const chunk of stream) {
    const text = chunk.text || '';
    const cleaned = cleanNarrativeText(text);
    fullText += cleaned;
    onChunk?.(cleaned);
  }
  return fullText;
};

export const generateImagePrompt = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: NARRATIVE_MODEL,
    contents: `Based on this story segment, write a 1-sentence cinematic image generation prompt. Focus on lighting, atmosphere, and character emotion. No symbols: ${text.slice(-1000)}`,
    config: {
      maxOutputTokens: 100,
      thinkingConfig: { thinkingBudget: 25 }
    }
  }));
  return cleanNarrativeText(response.text).trim();
};

export const generateImage = async (prompt: string, config?: ImageGenConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isHighRes = config?.imageSize === "2K" || config?.imageSize === "4K";
  const modelName = isHighRes ? IMAGE_MODEL_PRO : (config?.model || IMAGE_MODEL_FLASH);

  const imageConfig: any = {
    aspectRatio: config?.aspectRatio || "16:9",
  };
  
  if (modelName === IMAGE_MODEL_PRO) {
    imageConfig.imageSize = config?.imageSize || "1K";
  }

  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: modelName,
    contents: { 
      parts: [{ text: prompt }] 
    },
    config: { imageConfig }
  }));
  
  const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!imagePart?.inlineData?.data) throw new Error("Visual generation failed.");
  return imagePart.inlineData.data;
};

export const analyzeStory = async (story: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const storyContext = story.slice(-30000); 

  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: storyContext,
    config: {
      systemInstruction: "You are a professional book editor. Perform a deep structural, stylistic, and character analysis. Output JSON only.",
      responseMimeType: "application/json",
      maxOutputTokens: 3000,
      thinkingConfig: { thinkingBudget: 2000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          critique: { type: Type.STRING },
          vocabularyScore: { type: Type.NUMBER },
          characterAnalysis: { type: Type.STRING },
          pacingAnalysis: { type: Type.STRING },
          vocabularyAnalysis: { type: Type.STRING },
          plotStructure: {
            type: Type.OBJECT,
            properties: {
                incitingIncident: { type: Type.STRING },
                risingAction: { type: Type.STRING },
                climax: { type: Type.STRING },
                fallingAction: { type: Type.STRING },
                resolution: { type: Type.STRING }
            },
            required: ["incitingIncident", "risingAction", "climax", "fallingAction", "resolution"],
          },
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                originalText: { type: Type.STRING },
                suggestedChange: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["category", "originalText", "suggestedChange", "explanation"],
            }
          }
        },
        required: [
          "critique", 
          "vocabularyScore", 
          "plotStructure", 
          "suggestions", 
          "characterAnalysis", 
          "pacingAnalysis", 
          "vocabularyAnalysis"
        ],
      }
    }
  }));

  try {
    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  } catch (e) {
    return { 
        critique: "Analysis failed.", 
        suggestions: [], 
        vocabularyScore: 0,
        characterAnalysis: "Analysis failed.",
        pacingAnalysis: "Analysis failed.",
        vocabularyAnalysis: "Analysis failed."
    };
  }
};

export const generateYouTubeContent = async (story: string, isSeries?: boolean): Promise<YouTubeExportContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: story.slice(0, 10000),
    config: {
      systemInstruction: "YouTube metadata JSON. No bolding.",
      responseMimeType: "application/json",
      maxOutputTokens: 1500,
      thinkingConfig: { thinkingBudget: 500 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          videoHook: { type: Type.STRING },
          thumbnailIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          chapters: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "description", "videoHook", "thumbnailIdeas", "tags", "chapters"]
      }
    }
  }));
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { title: "Error", description: "Metadata parsing failed", videoHook: "", thumbnailIdeas: [], tags: [], chapters: [] };
  }
};

export const generateStoryIdeas = async (genres: string[], fandoms: string[]): Promise<{ title: string; prompt: string }[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const genreStr = genres.length > 0 ? genres.join(', ') : 'any imaginative genre';
  const universeStr = fandoms.length > 0 ? fandoms.join(', ') : 'any interesting universe';

  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: NARRATIVE_MODEL,
    contents: `Generate 6 diverse story premises. Genres: ${genreStr}. Universes: ${universeStr}`,
    config: {
      systemInstruction: "Creative consultant. Output JSON list. Each: 'title', 'prompt'.",
      responseMimeType: "application/json",
      maxOutputTokens: 750,
      thinkingConfig: { thinkingBudget: 150 },
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { 
            title: { type: Type.STRING }, 
            prompt: { type: Type.STRING } 
          },
          required: ["title", "prompt"]
        }
      }
    }
  }));
  
  try {
    return JSON.parse(response.text || '[]');
  } catch (e) {
    return [];
  }
};

export const generateMeditationScript = async (
  focus: string,
  wordCount: number,
  customPrompt: string,
  fandom1?: string[],
  fandom2?: string[],
  _unused?: any,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const atmosphere = [...(fandom1 || []), ...(fandom2 || [])].filter(x => x && x !== 'None (General)').join(', ');
  const stream = await ai.models.generateContentStream({
    model: NARRATIVE_MODEL,
    contents: customPrompt || `Guided ${focus} meditation.`,
    config: { 
      systemInstruction: `Meditation guide. Length: ${wordCount}. Atmosphere: ${atmosphere}. No bolding.`,
      maxOutputTokens: Math.min(wordCount * 2, 1000),
      thinkingConfig: { thinkingBudget: Math.min(Math.floor(wordCount * 0.5), 250) }
    }
  }) as any;
  let fullText = '';
  for await (const chunk of stream) {
    const cleaned = cleanNarrativeText(chunk.text || '');
    fullText += cleaned;
    onChunk?.(cleaned);
  }
  return fullText;
};

export const generateSleepStoryScript = async (
  theme: string,
  wordCount: number,
  customPrompt: string,
  fandom1?: string[],
  fandom2?: string[],
  seriesContext?: any,
  _unused?: any,
  onChunk?: (chunk: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const atmosphere = [...(fandom1 || []), ...(fandom2 || [])].filter(x => x && x !== 'None (General)').join(', ');
  const prompt = seriesContext?.previousStory 
    ? `Continue sleep story. Context: ${seriesContext.previousStory.slice(-1000)}\n\nNext: ${customPrompt || theme}`
    : customPrompt || `Sleep story: ${theme}`;

  const stream = await ai.models.generateContentStream({
    model: NARRATIVE_MODEL,
    contents: prompt,
    config: { 
      systemInstruction: `Sleep storyteller. Length: ${wordCount}. Atmosphere: ${atmosphere}. No bolding.`,
      maxOutputTokens: Math.min(wordCount * 2, 1000),
      thinkingConfig: { thinkingBudget: Math.min(Math.floor(wordCount * 0.5), 250) }
    }
  }) as any;
  let fullText = '';
  for await (const chunk of stream) {
    const cleaned = cleanNarrativeText(chunk.text || '');
    fullText += cleaned;
    onChunk?.(cleaned);
  }
  return fullText;
};

export const generateIntroScript = async (name: string, tone: string, themes: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
        model: NARRATIVE_MODEL,
        contents: `Cinematic intro for "${name}". Tone: ${tone}. Themes: ${themes}.`,
        config: {
          maxOutputTokens: 500,
          thinkingConfig: { thinkingBudget: 100 }
        }
    }));
    return cleanNarrativeText(response.text);
};

export const analyzePrompt = async (prompt: string): Promise<PromptAnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: prompt,
    config: {
      systemInstruction: "Analyze story prompt. JSON output only. No bolding.",
      responseMimeType: "application/json",
      maxOutputTokens: 1500,
      thinkingConfig: { thinkingBudget: 500 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          refinedPrompt: { type: Type.STRING },
          narrativeStructureSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          characterDevelopmentSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          feedback: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.STRING },
              weaknesses: { type: Type.STRING },
              plotHoles: { type: Type.STRING },
              characterConsistency: { type: Type.STRING },
              pacing: { type: Type.STRING }
            },
            required: ["strengths", "weaknesses", "plotHoles", "characterConsistency", "pacing"]
          }
        },
        required: ["suggestions", "refinedPrompt", "feedback", "narrativeStructureSuggestions", "characterDevelopmentSuggestions"]
      }
    }
  }));
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { 
        suggestions: [], 
        refinedPrompt: prompt, 
        narrativeStructureSuggestions: [],
        characterDevelopmentSuggestions: [],
        feedback: { strengths: "N/A", weaknesses: "N/A", plotHoles: "N/A", characterConsistency: "N/A", pacing: "N/A" } 
    };
  }
};

export const generateAdScript = async (
  product: string,
  audience: string,
  style: string,
  platform: string,
  duration: string,
  benefits: string,
  format: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Write an ad for "${product}". Target audience: ${audience}. Key benefits: ${benefits}.`;
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: NARRATIVE_MODEL,
    contents: prompt,
    config: { 
      systemInstruction: `Advertising copywriter. Platform: ${platform}. Style: ${style}. Duration: ${duration}. Format: ${format}. No bolding.`,
      maxOutputTokens: 1000,
      thinkingConfig: { thinkingBudget: 250 }
    }
  }));
  return cleanNarrativeText(response.text);
};

export const brainstormAdDetails = async (product: string): Promise<AdBrainstormResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await request<GenerateContentResponse>(() => ai.models.generateContent({
    model: NARRATIVE_MODEL,
    contents: `Brainstorm audiences and benefits for "${product}".`,
    config: {
      systemInstruction: "Strict JSON. No bolding.",
      responseMimeType: "application/json",
      maxOutputTokens: 500,
      thinkingConfig: { thinkingBudget: 100 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          audiences: { type: Type.ARRAY, items: { type: Type.STRING } },
          benefits: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["audiences", "benefits"]
      }
    }
  }));
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { audiences: [], benefits: [] };
  }
};
