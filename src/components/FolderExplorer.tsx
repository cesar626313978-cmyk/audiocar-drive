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
  X,
  Disc
} from 'lucide-react';

interface FolderExplorerProps {
  library: PlaylistFolder;
  currentTrack: Track | null;
  isPlaying: boolean;
  shuffle?: boolean;
  selectedFolderId?: string;
  onFolderChange?: (folderId: string, folderName: string) => void;
  onSelectTrack: (track: Track, allTracks: Track[], enableShuffle?: boolean) => void;
  onDownloadTrack: (track: Track) => void;
  downloadedTrackIds: Set<string>;
  onSwitchToPlayer?: () => void;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  library,
  currentTrack,
  isPlaying,
  shuffle,
  selectedFolderId,
  onFolderChange,
  onSelectTrack,
  onDownloadTrack,
  downloadedTrackIds,
  onSwitchToPlayer
}) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>(selectedFolderId || library.id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'explorer' | 'all-tracks'>('explorer');
  const [folderDisplayStyle, setFolderDisplayStyle] = useState<'list' | 'grid'>('list');

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

  useEffect(() => {
    if (selectedFolderId && findFolderPath(library, selectedFolderId)) {
      setCurrentFolderId(selectedFolderId);
    } else if (!findFolderPath(library, currentFolderId)) {
      setCurrentFolderId(library.id);
    }
  }, [library, selectedFolderId]);

  const breadcrumbPath = useMemo(() => {
    return findFolderPath(library, currentFolderId) || [library];
  }, [library, currentFolderId]);

  const activeFolder = breadcrumbPath[breadcrumbPath.length - 1] || library;
  const parentFolder = breadcrumbPath.length > 1 ? breadcrumbPath[breadcrumbPath.length - 2] : null;

  useEffect(() => {
    if (onFolderChange && activeFolder && activeFolder.id !== 'root-empty') {
      onFolderChange(activeFolder.id, activeFolder.name);
    }
  }, [activeFolder.id, activeFolder.name]);

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
    <div className="flex flex-col h-full bg-white dark:bg-[#1C1E22] rounded-2xl border border-[#E2E8F0] dark:border-[#2A2D34] shadow-sm dark:shadow-none p-3.5 sm:p-4 overflow-hidden transition-colors">
      {/* Top Search & Mode Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569] dark:text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar carpeta o canción..."
            className="w-full min-h-[42px] pl-10 pr-8 py-2 bg-white dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-[12px] text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#475569] dark:placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6] dark:focus:border-[#4DA8FF] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle Explorer vs All Tracks */}
        <div className="flex items-center bg-[#F8FAFC] dark:bg-[#16181C] p-1 rounded-[12px] border border-[#E2E8F0] dark:border-[#2A2D34] shrink-0">
          <button
            onClick={() => {
              setViewMode('explorer');
              setSearchQuery('');
            }}
            className={`min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'explorer' && !searchQuery
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
            title="Explorador por carpetas"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Carpetas</span>
          </button>
          <button
            onClick={() => {
              setViewMode('all-tracks');
              setSearchQuery('');
            }}
            className={`min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'all-tracks' && !searchQuery
                ? 'bg-[#3B82F6] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
            title="Ver todas las canciones"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Todas ({allLibraryTracks.length})</span>
          </button>
        </div>

        {onSwitchToPlayer && (
          <button
            onClick={onSwitchToPlayer}
            className="min-[1100px]:hidden min-h-[42px] px-3.5 py-2 rounded-[12px] bg-[#EFF6FF] hover:bg-blue-100 border border-[#93C5FD] text-[#1D4ED8] dark:bg-[#16181C] dark:hover:bg-[#22252B] dark:border-[#2A2D34] dark:text-[#4DA8FF] text-xs font-bold flex items-center gap-1.5 shrink-0"
            title="Volver a la vista principal del reproductor"
          >
            <Disc className="w-4 h-4" />
            <span>Reproductor</span>
          </button>
        )}
      </div>

      {/* Breadcrumb Bar with [Aleatorio] and [Reproducir] */}
      {viewMode === 'explorer' && !searchQuery && (
        <div className="flex items-center justify-between gap-2 mb-3 px-2.5 py-2 bg-[#F8FAFC] dark:bg-[#16181C] border border-[#E2E8F0] dark:border-[#2A2D34] rounded-[12px]">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => parentFolder && setCurrentFolderId(parentFolder.id)}
              disabled={!parentFolder}
              className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 rounded-lg bg-white dark:bg-[#1C1E22] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#EFF6FF] dark:hover:bg-[#22252B] disabled:opacity-35 disabled:pointer-events-none transition-colors shrink-0 mr-1 border border-[#E2E8F0] dark:border-[#2A2D34]"
              title="Subir un nivel"
            >
              <ArrowUp className="w-4 h-4" />
            </button>

            {breadcrumbPath.map((node, index) => {
              const isLast = index === breadcrumbPath.length - 1;
              return (
                <React.Fragment key={node.id}>
                  {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#475569] dark:text-[#94A3B8] shrink-0" />}
                  <button
                    onClick={() => setCurrentFolderId(node.id)}
                    className={`min-h-[34px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium truncate max-w-[170px] transition-colors ${
                      isLast
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#93C5FD] dark:bg-[#3B82F6]/15 dark:text-[#4DA8FF] dark:border-[#3B82F6]/40 font-semibold'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#EFF6FF] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:hover:bg-[#1C1E22]'
                    }`}
                    title={node.name}
                  >
                    {index === 0 ? (
                      <Home className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF] shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF] shrink-0" />
                    )}
                    <span className="truncate">{node.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(activeFolderTracks.length > 0 || activeSubfolders.length > 0) && (
              <>
                <button
                  onClick={handleShuffleCurrentFolder}
                  className={`min-h-[34px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    shuffle
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#93C5FD] dark:bg-[#3B82F6]/20 dark:text-[#4DA8FF] dark:border-[#3B82F6]/50'
                      : 'bg-white hover:bg-[#EFF6FF] text-[#0F172A] border-[#E2E8F0] dark:bg-[#1C1E22] dark:hover:bg-[#22252B] dark:text-[#F8FAFC] dark:border-[#2A2D34]'
                  }`}
                  title="Reproducir esta carpeta en modo aleatorio"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF]" />
                  <span>Aleatorio</span>
                </button>
                <button
                  onClick={handlePlayCurrentFolder}
                  className="min-h-[34px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-blue-500 text-white border border-[#3B82F6] text-xs font-semibold transition-colors"
                  title="Reproducir esta carpeta en orden"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Reproducir</span>
                </button>
              </>
            )}

            {activeSubfolders.length > 0 && (
              <button
                onClick={() => setFolderDisplayStyle(prev => (prev === 'list' ? 'grid' : 'list'))}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center p-1.5 rounded-lg bg-white dark:bg-[#1C1E22] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#2A2D34] transition-colors"
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

      {/* Main Scrollable Content Area (Cards with min-h-[60px], rounded-[12px], bg-[#F8FAFC] / dark:bg-[#16181C], border-[#E2E8F0] / dark:border-[#2A2D34]) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#2A2D34]">
        {/* Back Row (".. Carpeta superior") when inside a subfolder */}
        {viewMode === 'explorer' && !searchQuery && parentFolder && (
          <div
            onClick={() => setCurrentFolderId(parentFolder.id)}
            className="min-h-[60px] flex items-center justify-between p-3 rounded-[12px] bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#93C5FD] dark:bg-[#16181C] dark:hover:bg-[#22252B] dark:border-[#2A2D34] cursor-pointer text-[#0F172A] dark:text-[#F8FAFC] transition-colors active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-white dark:bg-[#1C1E22] border border-[#E2E8F0] dark:border-[#2A2D34] text-[#3B82F6] dark:text-[#4DA8FF] flex items-center justify-center">
                <ArrowUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">.. (Subir a {parentFolder.name})</p>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">Volver a la carpeta anterior</p>
              </div>
            </div>
          </div>
        )}

        {/* SUBFOLDERS SECTION */}
        {((viewMode === 'explorer' && !searchQuery && activeSubfolders.length > 0) ||
          (searchQuery && searchedSubfolders.length > 0)) && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF]" />
                <span>
                  Carpetas ({searchQuery ? searchedSubfolders.length : activeSubfolders.length})
                </span>
              </h3>
            </div>

            <div
              className={
                folderDisplayStyle === 'grid' && !searchQuery
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                  : 'space-y-2'
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
                    className={`group min-h-[60px] flex items-center justify-between p-3 rounded-[12px] transition-all cursor-pointer border active:scale-[0.99] ${
                      isContainingCurrentTrack
                        ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#0F172A] dark:bg-[#3B82F6]/15 dark:border-[#4DA8FF]/60 dark:text-[#F8FAFC]'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#93C5FD] text-[#0F172A] dark:bg-[#16181C] dark:border-[#2A2D34] dark:hover:bg-[#22252B] dark:hover:border-[#3B82F6]/50 dark:text-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border transition-colors ${
                          isContainingCurrentTrack
                            ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                            : 'bg-white border-[#E2E8F0] text-[#3B82F6] dark:bg-[#1C1E22] dark:border-[#2A2D34] dark:text-[#4DA8FF]'
                        }`}
                      >
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-bold truncate transition-colors ${
                            isContainingCurrentTrack
                              ? 'text-[#1D4ED8] dark:text-[#4DA8FF]'
                              : 'text-[#0F172A] group-hover:text-[#1D4ED8] dark:text-[#F8FAFC] dark:group-hover:text-[#4DA8FF]'
                          }`}
                        >
                          {sub.name}
                        </p>
                        <p className="text-xs text-[#475569] dark:text-[#94A3B8] truncate flex items-center gap-1.5 mt-0.5">
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

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {subAllTracks.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrack(subAllTracks[0], subAllTracks);
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-white hover:bg-[#3B82F6] text-[#0F172A] hover:text-white border border-[#E2E8F0] hover:border-[#3B82F6] dark:bg-[#1C1E22] dark:hover:bg-[#3B82F6] dark:text-[#F8FAFC] dark:border-[#2A2D34] transition-colors"
                          title={`Reproducir carpeta ${sub.name}`}
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#475569] group-hover:text-[#0F172A] dark:text-[#94A3B8] dark:group-hover:text-[#F8FAFC] transition-colors" />
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
              <h3 className="text-xs font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#3B82F6] dark:text-[#4DA8FF]" />
                <span>
                  {searchQuery
                    ? `Canciones encontradas (${displayedTracks.length})`
                    : viewMode === 'all-tracks'
                    ? `Todas las canciones (${displayedTracks.length})`
                    : `Pistas en ${activeFolder.name} (${displayedTracks.length})`}
                </span>
              </h3>
            </div>

            {displayedTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-6 text-[#475569] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#16181C] border border-dashed border-[#E2E8F0] dark:border-[#2A2D34] rounded-[12px]">
                <Music className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">No hay canciones sueltas en esta carpeta</p>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  {activeSubfolders.length > 0
                    ? 'Toca cualquiera de las carpetas superiores para abrir sus canciones.'
                    : 'Añade archivos .mp3 o .flac en tu carpeta "mimusica" de Google Drive.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedTracks.map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isOffline = downloadedTrackIds.has(track.id) || track.offlineReady;

                  return (
                    <div
                      key={track.id}
                      onClick={() => onSelectTrack(track, displayedTracks)}
                      className={`group min-h-[60px] flex items-center justify-between p-3 rounded-[12px] transition-all cursor-pointer border active:scale-[0.99] ${
                        isCurrent
                          ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#0F172A] dark:bg-[#3B82F6]/15 dark:border-[#4DA8FF]/60 dark:text-[#F8FAFC]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#EFF6FF] hover:border-[#93C5FD] text-[#0F172A] dark:bg-[#16181C] dark:border-[#2A2D34] dark:hover:bg-[#22252B] dark:hover:border-[#3B82F6]/50 dark:text-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border transition-colors ${
                            isCurrent
                              ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                              : 'bg-white border-[#E2E8F0] text-[#475569] group-hover:text-[#3B82F6] dark:bg-[#1C1E22] dark:border-[#2A2D34] dark:text-[#94A3B8] dark:group-hover:text-[#4DA8FF]'
                          }`}
                        >
                          {isCurrent && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-4">
                              <span className="w-1 bg-white animate-bounce h-full"></span>
                              <span className="w-1 bg-white animate-bounce h-2/3 delay-75"></span>
                              <span className="w-1 bg-white animate-bounce h-4/5 delay-150"></span>
                            </div>
                          ) : (
                            <Music className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm truncate ${
                              isCurrent
                                ? 'text-[#1D4ED8] dark:text-[#4DA8FF] font-bold'
                                : 'text-[#0F172A] dark:text-[#F8FAFC] font-semibold'
                            }`}
                          >
                            {track.name}
                          </p>
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] truncate flex items-center gap-2 mt-0.5">
                            <span>{track.album || track.artist || 'mimusica'}</span>
                            {track.size ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-[11px]">
                                  {formatFileSize(track.size)}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {isOffline ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-400 text-[10px] font-bold tracking-wide">
                            <CheckCircle2 className="w-3 h-3" />
                            OFFLINE
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadTrack(track);
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-[10px] text-[#475569] hover:text-[#0F172A] bg-white hover:bg-[#EFF6FF] border border-[#E2E8F0] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] dark:bg-[#1C1E22] dark:hover:bg-[#22252B] dark:border-[#2A2D34] transition-colors"
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
