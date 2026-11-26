import React, { useState, useEffect, useMemo } from 'react';
import { PlaylistFolder, Track } from '../types/audio';
import {
  Folder,
  FolderOpen,
  Music,
  Search,
  Download,
  CheckCircle2,
  ChevronRight,
  ArrowUp,
  Home,
  Play,
  Shuffle,
  LayoutGrid,
  List,
  X
} from 'lucide-react';

interface FolderExplorerProps {
  library: PlaylistFolder;
  currentTrack: Track | null;
  isPlaying: boolean;
  shuffle?: boolean;
  onSelectTrack: (track: Track, allTracks: Track[], enableShuffle?: boolean) => void;
  onDownloadTrack: (track: Track) => void;
  downloadedTrackIds: Set<string>;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  library,
  currentTrack,
  isPlaying,
  shuffle,
  onSelectTrack,
  onDownloadTrack,
  downloadedTrackIds
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>(library.id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'explorer' | 'all-tracks'>('explorer');
  const [folderDisplayStyle, setFolderDisplayStyle] = useState<'list' | 'grid'>('list');

  // Sync root folder ID when library loads or changes
  useEffect(() => {
    setCurrentFolderId(library.id);
  }, [library.id]);

  // Build path of folders from root to target id for Windows-style breadcrumbs
  const findFolderPath = (
    node: PlaylistFolder,
    targetId: string,
    path: PlaylistFolder[] = []
  ): PlaylistFolder[] | null => {
    const nextPath = [...path, node];
    if (node.id === targetId) return nextPath;
    if (node.subfolders) {
      for (const sub of node.subfolders) {
        const res = findFolderPath(sub, targetId, nextPath);
        if (res) return res;
      }
    }
    return null;
  };

  const breadcrumbPath = useMemo(() => {
    return findFolderPath(library, currentFolderId) || [library];
  }, [library, currentFolderId]);

  const activeFolder = breadcrumbPath[breadcrumbPath.length - 1] || library;
  const parentFolder = breadcrumbPath.length > 1 ? breadcrumbPath[breadcrumbPath.length - 2] : null;

  // Helper to count and gather all tracks inside a folder recursively
  const getFolderAllTracks = (folder: PlaylistFolder): Track[] => {
    let list = [...folder.tracks];
    if (folder.subfolders) {
      for (const sub of folder.subfolders) {
        list = list.concat(getFolderAllTracks(sub));
      }
    }
    return list;
  };

  const allLibraryTracks = useMemo(() => getFolderAllTracks(library), [library]);

  const activeSubfolders = useMemo(() => {
    if (!activeFolder.subfolders) return [];
    return [...activeFolder.subfolders].sort((a, b) => collator.compare(a.name, b.name));
  }, [activeFolder]);

  const activeFolderTracks = useMemo(() => {
    return [...activeFolder.tracks].sort((a, b) => collator.compare(a.name, b.name));
  }, [activeFolder]);

  // Tracks to show depending on search, "All Tracks" mode, or current folder
  const displayedTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return allLibraryTracks.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          (t.artist && t.artist.toLowerCase().includes(q)) ||
          (t.album && t.album.toLowerCase().includes(q))
      );
    }
    if (viewMode === 'all-tracks') {
      return allLibraryTracks;
    }
    return activeFolderTracks;
  }, [searchQuery, viewMode, allLibraryTracks, activeFolderTracks]);

  // Subfolders matching search query when searching
  const searchedSubfolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: PlaylistFolder[] = [];
    const traverse = (folder: PlaylistFolder) => {
      if (folder.id !== library.id && folder.name.toLowerCase().includes(q)) {
        results.push(folder);
      }
      folder.subfolders?.forEach(traverse);
    };
    traverse(library);
    return results.sort((a, b) => collator.compare(a.name, b.name));
  }, [searchQuery, library]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handlePlayCurrentFolder = () => {
    const tracksToPlay =
      viewMode === 'all-tracks'
        ? allLibraryTracks
        : activeFolderTracks.length > 0
        ? activeFolderTracks
        : getFolderAllTracks(activeFolder);

    if (tracksToPlay.length > 0) {
      onSelectTrack(tracksToPlay[0], tracksToPlay, false);
    }
  };

  const handleShuffleCurrentFolder = () => {
    const tracksToPlay =
      viewMode === 'all-tracks'
        ? allLibraryTracks
        : activeFolderTracks.length > 0
        ? activeFolderTracks
        : getFolderAllTracks(activeFolder);

    if (tracksToPlay.length > 0) {
      const randomIdx = Math.floor(Math.random() * tracksToPlay.length);
      onSelectTrack(tracksToPlay[randomIdx], tracksToPlay, true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-4 overflow-hidden">
      {/* Top Search & Mode Bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar carpeta o canción en mimusica..."
            className="w-full pl-10 pr-8 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Toggle Explorer vs All Tracks */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => {
              setViewMode('explorer');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'explorer' && !searchQuery
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Explorador por carpetas (estilo Windows)"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Carpetas</span>
          </button>
          <button
            onClick={() => {
              setViewMode('all-tracks');
              setSearchQuery('');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'all-tracks' && !searchQuery
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Ver todas las canciones"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Todas ({allLibraryTracks.length})</span>
          </button>
        </div>
      </div>

      {/* Windows Explorer Address / Breadcrumb Bar */}
      {viewMode === 'explorer' && !searchQuery && (
        <div className="flex items-center justify-between gap-2 mb-3 px-2.5 py-2 bg-slate-950/80 border border-slate-800/90 rounded-xl">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            {/* Up One Level Button */}
            <button
              onClick={() => parentFolder && setCurrentFolderId(parentFolder.id)}
              disabled={!parentFolder}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0 mr-1 border border-slate-800"
              title="Subir un nivel (Carpeta anterior)"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {/* Breadcrumbs */}
            {breadcrumbPath.map((node, index) => {
              const isLast = index === breadcrumbPath.length - 1;
              return (
                <React.Fragment key={node.id}>
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  <button
                    onClick={() => setCurrentFolderId(node.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium truncate max-w-[160px] transition-colors ${
                      isLast
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                    title={node.name}
                  >
                    {index === 0 ? (
                      <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{node.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right tools: Shuffle, Play Folder & Grid/List toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(activeFolderTracks.length > 0 || activeSubfolders.length > 0) && (
              <>
                <button
                  onClick={handleShuffleCurrentFolder}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    shuffle
                      ? 'bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border-purple-500/50 shadow-sm shadow-purple-500/20'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
                  }`}
                  title="Reproducir esta carpeta en modo aleatorio (Shuffle)"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Aleatorio</span>
                </button>
                <button
                  onClick={handlePlayCurrentFolder}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                  title="Reproducir esta carpeta en orden"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Reproducir</span>
                </button>
              </>
            )}

            {activeSubfolders.length > 0 && (
              <button
                onClick={() => setFolderDisplayStyle(prev => (prev === 'list' ? 'grid' : 'list'))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors"
                title={folderDisplayStyle === 'list' ? 'Vista en cuadrícula' : 'Vista en lista'}
              >
                {folderDisplayStyle === 'list' ? (
                  <LayoutGrid className="w-4 h-4" />
                ) : (
                  <List className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Scrollable Content Area (Folders + Tracks like Windows Explorer) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
        {/* Back Row (".. Carpeta superior") when inside a subfolder */}
        {viewMode === 'explorer' && !searchQuery && parentFolder && (
          <div
            onClick={() => setCurrentFolderId(parentFolder.id)}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/70 border border-slate-800/80 cursor-pointer text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ArrowUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">.. (Subir a {parentFolder.name})</p>
                <p className="text-[11px] text-slate-500">Volver a la carpeta anterior</p>
              </div>
            </div>
          </div>
        )}

        {/* SUBFOLDERS SECTION (Explorer Mode or Search Mode) */}
        {((viewMode === 'explorer' && !searchQuery && activeSubfolders.length > 0) ||
          (searchQuery && searchedSubfolders.length > 0)) && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Carpetas ({searchQuery ? searchedSubfolders.length : activeSubfolders.length})
                </span>
              </h3>
            </div>

            <div
              className={
                folderDisplayStyle === 'grid' && !searchQuery
                  ? 'grid grid-cols-2 gap-2'
                  : 'space-y-1.5'
              }
            >
              {(searchQuery ? searchedSubfolders : activeSubfolders).map((sub) => {
                const subAllTracks = getFolderAllTracks(sub);
                const subCount = sub.subfolders?.length || 0;
                const isContainingCurrentTrack =
                  currentTrack && subAllTracks.some(t => t.id === currentTrack.id);

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setCurrentFolderId(sub.id);
                      setViewMode('explorer');
                      setSearchQuery('');
                    }}
                    className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                      isContainingCurrentTrack
                        ? 'bg-amber-500/10 border-amber-500/40 text-white'
                        : 'bg-slate-950/40 border-slate-800/70 hover:bg-slate-800/60 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Windows-style Amber Folder Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          isContainingCurrentTrack
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500/25'
                        }`}
                      >
                        <Folder className="w-5 h-5 fill-amber-400/20" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-100 group-hover:text-amber-300 transition-colors">
                          {sub.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{subAllTracks.length} canciones</span>
                          {subCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{subCount} subcarpetas</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {subAllTracks.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrack(subAllTracks[0], subAllTracks);
                          }}
                          className="p-2 rounded-lg bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                          title={`Reproducir carpeta ${sub.name}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TRACKS SECTION */}
        {(displayedTracks.length > 0 || activeSubfolders.length === 0) && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {searchQuery
                    ? `Canciones encontradas (${displayedTracks.length})`
                    : viewMode === 'all-tracks'
                    ? `Todas las canciones (${displayedTracks.length})`
                    : `Archivos de audio en ${activeFolder.name} (${displayedTracks.length})`}
                </span>
              </h3>
            </div>

            {displayedTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-6 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Music className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No hay canciones sueltas en esta carpeta</p>
                <p className="text-xs text-slate-600 mt-1">
                  {activeSubfolders.length > 0
                    ? 'Toca cualquiera de las carpetas superiores para abrir sus canciones.'
                    : 'Añade archivos .mp3 o .flac en tu carpeta "mimusica" de Google Drive.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {displayedTracks.map((track) => {
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
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                          }`}
                        >
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
                          <p
                            className={`text-sm font-medium truncate ${
                              isCurrent ? 'text-blue-400 font-semibold' : 'text-slate-200'
                            }`}
                          >
                            {track.name}
                          </p>
                          <p className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                            <span>{track.album || track.artist || 'mimusica'}</span>
                            {track.size ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-[11px] text-slate-500">
                                  {formatFileSize(track.size)}
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
                            OFFLINE
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadTrack(track);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Guardar en caché anti-túneles"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
