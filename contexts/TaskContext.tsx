
import { GoogleGenAI } from '@google/genai';
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '../hooks/useLocalStorage';
import * as geminiService from '../services/geminiService';
import { Task, TaskStatus } from '../types';

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt'>) => string;
  cancelTask: (taskId: string) => void;
  retryTask: (taskId: string) => void;
  clearCompleted: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ai-tasks', []);
  const isProcessing = useRef(false);
  const cancellationTokens = useRef(new Map<string, boolean>()).current;
  
  const lastTaskFinishedAt = useRef<number>(0);
  const MIN_GAP_BETWEEN_TASKS = 200; // Significantly reduced gap for snappier performance

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));
  }, [setTasks]);

  useEffect(() => {
    setTasks(prev => {
        let hasChanges = false;
        const next = prev.map(t => {
            if (t.status === 'running') {
                hasChanges = true;
                return { ...t, status: 'queued' as TaskStatus, progress: 0, startedAt: undefined, partialResult: undefined };
            }
            return t;
        });
        return hasChanges ? next : prev;
    });
  }, []);

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing.current) return;
      
      const now = Date.now();
      if (now < (lastTaskFinishedAt.current + MIN_GAP_BETWEEN_TASKS)) return;
      
      const queuedTask = tasks.find(t => {
          if (t.status !== 'queued') return false;
          if (t.cooldownUntil && new Date(t.cooldownUntil).getTime() > now) return false;
          return true;
      });

      if (!queuedTask) return;

      isProcessing.current = true;
      cancellationTokens.set(queuedTask.id, false);
      updateTask(queuedTask.id, { status: 'running', startedAt: new Date().toISOString(), error: undefined });

      try {
        let result: any;
        const onProgress = (progress: number) => {
            if (cancellationTokens.get(queuedTask.id)) throw new Error('Task cancelled.');
            updateTask(queuedTask.id, { progress });
        };
        
        const onChunk = (chunk: string) => {
            if (cancellationTokens.get(queuedTask.id)) throw new Error('Task cancelled.');
            const cleanChunk = geminiService.cleanNarrativeText(chunk);
            setTasks(prev => prev.map(t => 
                t.id === queuedTask.id 
                    ? { ...t, partialResult: (t.partialResult || '') + cleanChunk } 
                    : t
            ));
        };
        
        const STORY_MOD_INSTRUCTION = `Professional novelist. 
            RULES:
            1. NO BOLDING (**). NO ITALICS (*). Plain text only.
            2. NO LABELS (Chapter, Part, etc).
            3. DIALOGUE: Use double quotes ("").
            4. ACTION: Use em-dashes (—) to interleave action beats directly into speech for a cinematic TTS experience.
            Seamlessly continue the story in this exact style.`;

        switch (queuedTask.type) {
            case 'generate-story':
                result = await geminiService.generateStory(queuedTask.payload.prompt, queuedTask.payload.genre, queuedTask.payload.genre2, queuedTask.payload.genre3, queuedTask.payload.fandom1, queuedTask.payload.fandom2, queuedTask.payload.style, queuedTask.payload.intensity, queuedTask.payload.characters, queuedTask.payload.wordCount, queuedTask.payload.seriesContext, onProgress, onChunk);
                break;
            case 'continue-story': {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const context = queuedTask.payload.story.slice(-4000);
                const stream = await ai.models.generateContentStream({
                    model: 'gemini-3-flash-preview', // Switched to Flash for speed
                    contents: `Continue this story seamlessly. NO BOLDING. Use em-dashes for action.\n\n...${context}`,
                    config: { 
                      systemInstruction: STORY_MOD_INSTRUCTION,
                      maxOutputTokens: 1000, // Limit to approx 1k tokens per continuation
                      thinkingConfig: { thinkingBudget: 250 }
                    }
                });
                let fullText = '';
                for await (const chunk of stream) {
                    if (cancellationTokens.get(queuedTask.id)) break;
                    const text = chunk.text || '';
                    const cleanText = geminiService.cleanNarrativeText(text);
                    fullText += cleanText;
                    onChunk(cleanText);
                }
                result = fullText;
                break;
            }
            case 'generate-ending': {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const context = queuedTask.payload.story.slice(-4000);
                const stream = await ai.models.generateContentStream({
                    model: 'gemini-3-flash-preview', // Switched to Flash for speed
                    contents: `Conclude the story definitively. NO BOLDING.\n\n...${context}`,
                    config: { 
                      systemInstruction: STORY_MOD_INSTRUCTION,
                      maxOutputTokens: 1000, // Limit to approx 1k tokens for ending
                      thinkingConfig: { thinkingBudget: 250 }
                    }
                });
                let fullText = '';
                for await (const chunk of stream) {
                    if (cancellationTokens.get(queuedTask.id)) break;
                    const text = chunk.text || '';
                    const cleanText = geminiService.cleanNarrativeText(text);
                    fullText += cleanText;
                    onChunk(cleanText);
                }
                result = fullText;
                break;
            }
            case 'generate-plot-twist': {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const context = queuedTask.payload.story.slice(-4000);
                const stream = await ai.models.generateContentStream({
                    model: 'gemini-3-flash-preview', // Switched to Flash for speed
                    contents: `Add a "${queuedTask.payload.twistType}" twist. NO BOLDING.\n\n...${context}`,
                    config: { 
                      systemInstruction: STORY_MOD_INSTRUCTION,
                      maxOutputTokens: 1000, // Limit to approx 1k tokens for twist
                      thinkingConfig: { thinkingBudget: 250 }
                    }
                });
                let fullText = '';
                for await (const chunk of stream) {
                    if (cancellationTokens.get(queuedTask.id)) break;
                    const text = chunk.text || '';
                    const cleanText = geminiService.cleanNarrativeText(text);
                    fullText += cleanText;
                    onChunk(cleanText);
                }
                result = fullText;
                break;
            }
            case 'analyze-story':
                result = await geminiService.analyzeStory(queuedTask.payload.story);
                break;
            case 'generate-youtube':
                 result = await geminiService.generateYouTubeContent(queuedTask.payload.story, queuedTask.payload.isSeries);
                 break;
            case 'generate-meditation':
                result = await geminiService.generateMeditationScript(queuedTask.payload.focus, queuedTask.payload.wordCount, queuedTask.payload.customPrompt, queuedTask.payload.fandom1, queuedTask.payload.fandom2, undefined, onChunk);
                break;
            case 'generate-sleep-story':
                result = await geminiService.generateSleepStoryScript(queuedTask.payload.theme, queuedTask.payload.wordCount, queuedTask.payload.customPrompt, queuedTask.payload.fandom1, queuedTask.payload.fandom2, queuedTask.payload.seriesContext, undefined, onChunk);
                break;
            case 'generate-ad-script':
                result = await geminiService.generateAdScript(queuedTask.payload.product, queuedTask.payload.audience, queuedTask.payload.style, queuedTask.payload.platform, queuedTask.payload.duration, queuedTask.payload.benefits, queuedTask.payload.format);
                break;
            case 'brainstorm-ad':
                result = await geminiService.brainstormAdDetails(queuedTask.payload.product);
                break;
            case 'generate-intro-script':
                result = await geminiService.generateIntroScript(queuedTask.payload.name, queuedTask.payload.tone, queuedTask.payload.themes);
                break;
            case 'generate-ideas':
                result = await geminiService.generateStoryIdeas(queuedTask.payload.genres, queuedTask.payload.fandoms);
                break;
            case 'analyze-prompt':
                result = await geminiService.analyzePrompt(queuedTask.payload.prompt);
                break;
            default:
                throw new Error(`Unknown task type: ${(queuedTask as any).type}`);
        }
        
        if (cancellationTokens.get(queuedTask.id)) {
          updateTask(queuedTask.id, { status: 'cancelled', completedAt: new Date().toISOString() });
        } else {
          const finalResult = geminiService.cleanNarrativeText(result);
          updateTask(queuedTask.id, { status: 'completed', progress: 100, result: finalResult, completedAt: new Date().toISOString() });
        }
        lastTaskFinishedAt.current = Date.now();

      } catch (error: any) {
        const errorMsg = (error.message || '').toLowerCase();
        const isRateLimit = errorMsg.includes('rate limit') || errorMsg.includes('429');
        const isInternalError = errorMsg.includes('500') || errorMsg.includes('internal error');
        
        const currentRetries = queuedTask.retryCount || 0;
        const MAX_AUTO_RETRIES = 3;

        if (isRateLimit) {
            const cooldownMs = 60000;
            const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();
            updateTask(queuedTask.id, { status: 'queued', error: 'API Rate Limit reached. Waiting 60s...', cooldownUntil });
        } else if (isInternalError && currentRetries < MAX_AUTO_RETRIES) {
             const nextRetry = currentRetries + 1;
             updateTask(queuedTask.id, { status: 'queued', error: `Transient AI error. Auto-retrying (${nextRetry}/${MAX_AUTO_RETRIES})...`, retryCount: nextRetry });
        } else if (cancellationTokens.get(queuedTask.id)) {
            updateTask(queuedTask.id, { status: 'cancelled', completedAt: new Date().toISOString(), error: 'Cancelled by user.' });
        } else {
            updateTask(queuedTask.id, { status: 'failed', error: error.message || 'An unknown error occurred.', completedAt: new Date().toISOString() });
        }
        lastTaskFinishedAt.current = Date.now();
      } finally {
        cancellationTokens.delete(queuedTask.id);
        isProcessing.current = false;
      }
    };
    
    const interval = setInterval(processQueue, 100); // Poll faster
    return () => clearInterval(interval);

  }, [tasks, setTasks, updateTask, cancellationTokens]);

  const addTask = (taskDetails: Omit<Task, 'id' | 'status' | 'progress' | 'createdAt'>): string => {
    const newTask: Task = {
      id: uuidv4(),
      ...taskDetails,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    setTasks(prev => [newTask, ...prev]);
    return newTask.id;
  };
  
  const cancelTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'queued' || task.status === 'running') {
      cancellationTokens.set(taskId, true);
      if (task.status === 'queued') {
        updateTask(taskId, { status: 'cancelled', completedAt: new Date().toISOString() });
      }
    }
  };

  const retryTask = (taskId: string) => {
     const task = tasks.find(t => t.id === taskId);
     if (task) {
        updateTask(taskId, {
            status: 'queued',
            progress: 0,
            error: undefined,
            startedAt: undefined,
            completedAt: undefined,
            retryCount: 0,
            cooldownUntil: undefined
        });
     }
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => t.status === 'running' || t.status === 'queued'));
  };

  const value = { tasks, addTask, cancelTask, retryTask, clearCompleted };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
