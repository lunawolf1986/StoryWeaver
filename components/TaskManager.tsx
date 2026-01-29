
import React, { useState } from 'react';
import { useTasks } from '../contexts/TaskContext';
import TaskItem from './TaskItem';

const TaskManager: React.FC = () => {
  const { tasks, clearCompleted } = useTasks();
  const [isOpen, setIsOpen] = useState(false);

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'queued');
  const runningTask = tasks.find(t => t.status === 'running');
  const queuedCount = tasks.filter(t => t.status === 'queued').length;
  const hasHistory = tasks.some(t => t.status === 'completed' || t.status === 'failed');

  const getButtonContent = () => {
    if (runningTask) {
      return (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-semibold">{runningTask.name.substring(0, 15)}... ({runningTask.progress}%)</span>
          {queuedCount > 0 && <span className="text-[10px] bg-indigo-500 rounded-full px-1.5 py-0.5">{queuedCount}</span>}
        </>
      );
    }
    if (activeTasks.length > 0) {
      return <><span className="text-xs font-semibold">Queued ({activeTasks.length})</span></>;
    }
    return (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        <span className="text-xs font-semibold">Activity</span>
      </>
    );
  };
  
  if (tasks.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-white shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50
            ${runningTask ? 'bg-indigo-600 ring-indigo-400 animate-pulse' : 'bg-gray-700 hover:bg-gray-600 ring-gray-500'}`}
        >
          {getButtonContent()}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[98]" onClick={() => setIsOpen(false)}></div>
      )}
      
      <div className={`fixed bottom-16 right-4 w-96 max-h-[60vh] bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-[99] flex flex-col overflow-hidden transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-indigo-300">Activity Center</h3>
          {hasHistory && <button onClick={clearCompleted} className="text-xs text-gray-400 hover:text-white">Clear History</button>}
        </div>
        <div className="overflow-y-auto p-2">
            {tasks.length > 0 ? (
                <ul className="space-y-2">
                    {tasks.map(task => <TaskItem key={task.id} task={task} />)}
                </ul>
            ) : (
                <p className="p-8 text-center text-gray-500 text-sm">No recent activity.</p>
            )}
        </div>
      </div>
    </>
  );
};

export default TaskManager;
