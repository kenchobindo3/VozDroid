import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  ExternalLink,
  Volume2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { hardwareService } from '../services/hardware';

interface MediaControlCardProps {
  onNotify?: (msg: string) => void;
}

export const MediaControlCard: React.FC<MediaControlCardProps> = ({ onNotify }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    const checkState = async () => {
      const active = await hardwareService.checkIsMusicPlaying();
      setIsPlaying(active);
    };
    checkState();
    const interval = setInterval(checkState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMediaAction = async (action: 'play' | 'pause' | 'play_pause' | 'next' | 'previous') => {
    const res = await hardwareService.controlMedia(action);
    setLastAction(res.message);
    if (res.isMusicActive !== undefined) {
      setIsPlaying(res.isMusicActive);
    }
    onNotify?.(res.message);
    setTimeout(() => setLastAction(''), 3000);
  };

  const handleOpenMusic = async (app: string) => {
    const res = await hardwareService.openMusicPlayer(app);
    onNotify?.(res.message);
  };

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-purple-950/20 p-4 sm:p-5 backdrop-blur-xl shadow-xl text-left">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-950/80 border border-purple-800/60 text-purple-400 shadow-md shadow-purple-950/40">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Control Multimedia Universal
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isPlaying
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                {isPlaying ? '● Sonando' : '○ Pausado'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Controla Spotify, YouTube Music y reproductores de fondo por voz o botones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenMusic('spotify')}
            title="Abrir Spotify"
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-xl hover:bg-emerald-900/60 transition active:scale-95"
          >
            <span>Spotify</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
        <button
          onClick={() => handleMediaAction('previous')}
          title="Canción anterior"
          className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-700 transition active:scale-95 shadow-md"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleMediaAction(isPlaying ? 'pause' : 'play')}
          title={isPlaying ? 'Pausar música' : 'Reanudar música'}
          className="p-4 rounded-3xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold hover:brightness-110 transition active:scale-95 shadow-lg shadow-purple-500/25"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
        </button>

        <button
          onClick={() => handleMediaAction('next')}
          title="Siguiente canción"
          className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-700 transition active:scale-95 shadow-md"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Status & Voice Command Guide */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          {lastAction ? (
            <span className="text-purple-300 font-medium">⚡ {lastAction}</span>
          ) : (
            <span>Comandos por voz: <i>"Pausa la música"</i>, <i>"Siguiente canción"</i></span>
          )}
        </span>
        <button
          onClick={() => handleMediaAction('play_pause')}
          className="text-cyan-400 hover:text-cyan-300 text-[10px] font-semibold uppercase tracking-wider shrink-0"
        >
          Alternar
        </button>
      </div>
    </div>
  );
};
