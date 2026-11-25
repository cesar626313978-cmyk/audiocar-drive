import React, { useState } from 'react';
import { PlaylistFolder, Track } from '../types/audio';
import { Folder, Music, Search, Download, CheckCircle2, ChevronRight, Play } from 'lucide-react';

interface FolderExplorerProps {
  library: PlaylistFolder;
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (track: Track, allTracks: Track[]) => void;
  onDownloadTrack: (track: Track) => void;
  downloadedTrackIds: Set<string>;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  library,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onDownloadTrack,
  downloadedTrackIds
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(library.id);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Find active folder recursively
  const findFolder = (folder: PlaylistFolder, id: string): PlaylistFolder | null => {
    if (folder.id === id) return folder;
    if (folder.subfolders) {
      for (const sub of folder.subfolders) {
        const found = findFolder(sub, id);
        if (found) return found;
      }
    }
    return null;
  };

  const activeFolder = findFolder(library, selectedFolderId) || library;

  // Filter tracks by search query across all library or current folder
  const getAllTracks = (folder: PlaylistFolder): Track[] => {
    let list = [...folder.tracks];
    if (folder.subfolders) {
      for (const sub of folder.subfolders) {
        list = list.concat(getAllTracks(sub));
      }
    }
    return list;
  };

  const allTracks = getAllTracks(library);
  const displayedTracks = searchQuery.trim()
    ? allTracks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || (t.artist && t.artist.toLowerCase().includes(searchQuery.toLowerCase())))
    : activeFolder.tracks;

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-4 overflow-hidden">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tracks or artists in Mi música..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Folders / Playlists Horizontal Bar */}
      {!searchQuery && library.subfolders && library.subfolders.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Playlists & Folders</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedFolderId(library.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedFolderId === library.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>All Tracks ({allTracks.length})</span>
            </button>
            {library.subfolders.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedFolderId(sub.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedFolderId === sub.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>{sub.name} ({sub.tracks.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Track List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
          {searchQuery ? `Search Results (${displayedTracks.length})` : `${activeFolder.name} Tracks (${displayedTracks.length})`}
        </h3>

        {displayedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-500">
            <Music className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No audio tracks found</p>
            <p className="text-xs text-slate-600 mt-1">Add .mp3 or .flac files to your Google Drive "Mi música" folder.</p>
          </div>
        ) : (
          displayedTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isOffline = downloadedTrackIds.has(track.id) || track.offlineReady;

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track, displayedTracks)}
                className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-blue-600/15 border-blue-500/40 text-white'
                    : 'bg-slate-950/30 border-slate-800/60 hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}>
                    {isCurrent && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-white animate-bounce h-full"></span>
                        <span className="w-1 bg-white animate-bounce h-2/3 delay-75"></span>
                        <span className="w-1 bg-white animate-bounce h-4/5 delay-150"></span>
                      </div>
                    ) : (
                      <Music className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isCurrent ? 'text-blue-400 font-semibold' : 'text-slate-200'}`}>
                      {track.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                      <span>{track.artist || 'Google Drive'}</span>
                      {track.duration ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOffline ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold tracking-wide">
                      <CheckCircle2 className="w-3 h-3" />
                      OFFLINE READY
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadTrack(track);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Download for offline tunnel mode"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
