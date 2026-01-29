
import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { useTasks } from '../contexts/TaskContext';

interface TaskItemProps {
  task: Task;
}

const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const { cancelTask, retryTask } = useTasks();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (task.cooldownUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((new Date(task.cooldownUntil!).getTime() - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSecondsRemaining(null);
    }
  }, [task.cooldownUntil]);

  const getStatusIcon = () => {
    switch (task.status) {
      case 'running':
        return (
          <div className="relative">
            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
      case 'queued':
        if (task.cooldownUntil) {
             return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
        }
        if (task.retryCount && task.retryCount > 0) {
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 animate-bounce" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>;
        }
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
      case 'completed':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
      case 'failed':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>;
      case 'cancelled':
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
    }
  };

  const isActionable = task.status === 'running' || task.status === 'queued' || task.status === 'failed';

  return (
    <li className={`p-4 rounded-xl border transition-all duration-300 ${task.status === 'running' ? 'bg-indigo-900/20 border-indigo-500/50 shadow-inner shadow-indigo-500/10' : 'bg-gray-800/40 border-gray-700/50 hover:border-gray-600'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
          <div className="flex-grow">
            <p className="text-sm font-bold text-gray-100 truncate w-48">{task.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[10px] uppercase font-black tracking-widest ${task.cooldownUntil ? 'text-amber-400 animate-pulse' : 'text-gray-500'}`}>
                    {task.cooldownUntil ? `API COOLING DOWN (${secondsRemaining}s)` : task.status}
                </p>
                {task.retryCount && task.retryCount > 0 && task.status === 'queued' && (
                    <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50 font-bold">
                        RETRY {task.retryCount}
                    </span>
                )}
            </div>
          </div>
        </div>
        {isActionable && (
          <div className="flex-shrink-0 flex gap-1">
            {task.status === 'failed' && (
              <button onClick={() => retryTask(task.id)} className="p-1.5 text-[10px] uppercase font-bold text-indigo-300 hover:bg-indigo-500/20 rounded transition-colors border border-indigo-500/30">Retry</button>
            )}
            {(task.status === 'running' || task.status === 'queued') && (
              <button onClick={() => cancelTask(task.id)} className="p-1.5 text-[10px] uppercase font-bold text-red-400 hover:bg-red-500/20 rounded transition-colors border border-red-500/30">Cancel</button>
            )}
          </div>
        )}
      </div>
      
      {task.status === 'running' && (
        <div className="mt-3">
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
            <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.max(5, task.progress)}%` }}
            ></div>
          </div>
        </div>
      )}

      {task.error && (
        <div className={`mt-3 p-3 rounded-lg text-[11px] leading-relaxed border ${task.error.includes('Rate Limit') ? 'bg-amber-900/20 text-amber-200 border-amber-500/30' : 'bg-red-900/20 text-red-200 border-red-500/30'}`}>
          <div className="flex items-start gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
             </svg>
             <span>{task.error}</span>
          </div>
        </div>
      )}
    </li>
  );
};

export default TaskItem;
