
import React, { useState, useMemo, useRef } from 'react';
import { SavedNarrative, NarrativeType } from '../types';
import IconButton from './IconButton';
import JSZip from 'jszip';
import Spinner from './Spinner';

interface SavedNarrativesDropdownProps {
  narratives: SavedNarrative[];
  onLoad: (narrative: SavedNarrative) => void;
  onDelete: (id: string) => void;
  onImport: (narratives: SavedNarrative[]) => void;
}

type ViewMode = 'all' | 'series' | 'meditation' | 'sleep';

interface SeriesGroup {
  id: string;
  name: string;
  narratives: SavedNarrative[];
  lastUpdated: string;
}

const SavedNarrativesDropdown: React.FC<SavedNarrativesDropdownProps> = ({ narratives, onLoad, onDelete, onImport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [zippingId, setZippingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { seriesGroups, standaloneStories, meditations, sleepStories } = useMemo(() => {
    const seriesMap = new Map<string, SeriesGroup>();
    const standalone: SavedNarrative[] = [];
    const meds: SavedNarrative[] = [];
    const sleep: SavedNarrative[] = [];
    const sorted = [...narratives].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sorted.forEach(n => {
      if (n.type === 'Meditation') meds.push(n);
      else if (n.type === 'SleepStory') sleep.push(n);
      else if (n.type === 'Story') {
        if (n.seriesId) {
          if (!seriesMap.has(n.seriesId)) {
            seriesMap.set(n.seriesId, { id: n.seriesId, name: '', narratives: [], lastUpdated: n.createdAt });
          }
          seriesMap.get(n.seriesId)!.narratives.push(n);
        } else standalone.push(n);
      }
    });

    Array.from(seriesMap.values()).forEach(group => {
      group.narratives.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstPart = group.narratives[0];
      let baseName = firstPart.title.replace(/^Story: /, '').replace(/ - Part \d+.*$/, '').replace(/\.\.\.$/, '');
      group.name = baseName || 'Untitled Series';
    });

    return {
      seriesGroups: Array.from(seriesMap.values()).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
      standaloneStories: standalone, meditations: meds, sleepStories: sleep
    };
  }, [narratives]);

  const handleLoad = (narrative: SavedNarrative) => {
    onLoad(narrative);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleDownloadAssets = async (e: React.MouseEvent<HTMLButtonElement>, narrative: SavedNarrative) => {
    e.stopPropagation();
    setZippingId(narrative.id);
    try {
        const zip = new JSZip();
        const folderName = narrative.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
        zip.file('script.txt', narrative.content);
        if (narrative.imageBase64) {
            zip.file('cover_art.png', narrative.imageBase64, { base64: true });
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}_Assets.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to create asset bundle:", error);
        alert("Failed to create asset bundle.");
    } finally {
        setZippingId(null);
    }
  };

  const toggleSeriesExpand = (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation();
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(seriesId)) next.delete(seriesId);
      else next.add(seriesId);
      return next;
    });
  };

  const handleContinueSeries = (e: React.MouseEvent, group: SeriesGroup) => {
    e.stopPropagation();
    const latestPart = group.narratives[group.narratives.length - 1];
    onLoad(latestPart);
    setIsOpen(false);
  };

  const handleDownloadSeries = (e: React.MouseEvent, group: SeriesGroup) => {
    e.stopPropagation();
    let combinedContent = `SERIES: ${group.name}\nGenerated with Story Weaver\n====================================\n\n`;
    group.narratives.forEach((part, index) => {
      combinedContent += `PART ${index + 1}: ${part.title}\nDate: ${new Date(part.createdAt).toLocaleDateString()}\n------------------------------------\n\n${part.content}\n\n====================================\n\n`;
    });
    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name.replace(/[^a-z0-9]/gi, '_')}_Full_Series.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSeriesJSON = (e: React.MouseEvent, group: SeriesGroup) => {
    e.stopPropagation();
    const exportData = {
      meta: { seriesName: group.name, seriesId: group.id, exportDate: new Date().toISOString(), partCount: group.narratives.length },
      narratives: group.narratives
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.name.replace(/[^a-z0-9]/gi, '_')}_Series_Data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result as string;
            const data = JSON.parse(json);
            let newNarratives = data.narratives && Array.isArray(data.narratives) ? data.narratives : (Array.isArray(data) ? data : [data]);
            const validNarratives = newNarratives.filter(n => n.id && n.content && n.type);
            if (validNarratives.length === 0) throw new Error("No valid narratives found in file.");
            onImport(validNarratives);
        } catch (err: any) { alert(`Import failed: ${err.message}`); }
        finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const renderNarrativeItem = (n: SavedNarrative, isCompact = false) => (
    <li key={n.id} className={`group flex items-center justify-between hover:bg-indigo-900/30 rounded-md ${isCompact ? 'pl-6' : ''}`}>
      <button onClick={() => handleLoad(n)} className="flex-grow text-left px-3 py-2 text-sm text-gray-300 hover:text-white truncate">{n.title}</button>
      <div className="pr-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         {zippingId === n.id ? <div className="p-1.5"><Spinner className="h-4 w-4 text-indigo-400" /></div> : (
          <IconButton onClick={(e) => handleDownloadAssets(e, n)} ariaLabel="Download bundle" className="hover:bg-indigo-500/50 hover:text-indigo-300 scale-75">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </IconButton>
         )}
        <IconButton onClick={(e) => handleDelete(e, n.id)} ariaLabel="Delete" className="hover:bg-red-500/50 hover:text-red-300 scale-75">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </IconButton>
      </div>
    </li>
  );

  return (
    <div className="relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg flex items-center gap-2 transition-colors shadow-md border border-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
        Library
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-[28rem] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gray-900/50 px-2 pt-2 flex gap-1 border-b border-gray-700 shrink-0">
               <button onClick={() => setViewMode('all')} className={`px-3 py-2 text-xs font-semibold rounded-t-lg ${viewMode === 'all' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400'}`}>Stories ({standaloneStories.length})</button>
               <button onClick={() => setViewMode('series')} className={`px-3 py-2 text-xs font-semibold rounded-t-lg ${viewMode === 'series' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400'}`}>Series ({seriesGroups.length})</button>
               <button onClick={() => setViewMode('meditation')} className={`px-3 py-2 text-xs font-semibold rounded-t-lg ${viewMode === 'meditation' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400'}`}>Meditation ({meditations.length})</button>
               <button onClick={() => setViewMode('sleep')} className={`px-3 py-2 text-xs font-semibold rounded-t-lg ${viewMode === 'sleep' ? 'bg-gray-800 text-indigo-400' : 'text-gray-400'}`}>Sleep ({sleepStories.length})</button>
               <div className="flex-grow"></div>
               <button onClick={handleImportClick} title="Import" className="mb-1 p-1.5 text-indigo-300 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
            </div>
            <div className="overflow-y-auto p-2 min-h-[200px]">
                {viewMode === 'all' && (<ul>{standaloneStories.map(n => renderNarrativeItem(n))}</ul>)}
                {viewMode === 'series' && (<div className="space-y-2">{seriesGroups.map(group => (
                    <div key={group.id} className="bg-gray-700/30 border border-gray-700 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={(e) => toggleSeriesExpand(e, group.id)}>
                            <div className="truncate"><span className="font-bold text-indigo-200">{group.name}</span></div>
                            <div className="flex gap-1">
                                <button onClick={(e) => handleDownloadSeries(e, group)} className="p-1.5 text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></button>
                                <button onClick={(e) => handleContinueSeries(e, group)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Continue</button>
                            </div>
                        </div>
                        {expandedSeries.has(group.id) && <ul className="border-t border-gray-700">{group.narratives.map(n => renderNarrativeItem(n, true))}</ul>}
                    </div>
                ))}</div>)}
                {viewMode === 'meditation' && (<ul>{meditations.map(n => renderNarrativeItem(n))}</ul>)}
                {viewMode === 'sleep' && (<ul>{sleepStories.map(n => renderNarrativeItem(n))}</ul>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SavedNarrativesDropdown;
