import React, { useEffect, useState } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Hand,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { screenVisionTalkbackService } from '../services/screenVisionTalkback';
import { TalkBackState } from '../types';

export const TalkBackHud: React.FC = () => {
  const [state, setState] = useState<TalkBackState>(screenVisionTalkbackService.getState());
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = screenVisionTalkbackService.subscribe((newState) => {
      setState(newState);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!state.enabled) return null;

  const handleReadScreen = async () => {
    setIsAnalyzing(true);
    await screenVisionTalkbackService.readScreenAloud();
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="rounded-2xl border-2 border-cyan-400 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl text-left">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
              Modo TalkBack Activo
            </span>
          </div>
          <button
            onClick={() => screenVisionTalkbackService.disableTalkBack(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Desactivar TalkBack"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Focused Element Banner */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Elemento Enfocado ({state.focusedIndex + 1})
          </span>
          <p className="text-xs font-semibold text-white truncate">
            {state.focusedElement ? state.focusedElement.label : 'Sin elemento enfocado'}
          </p>
          {state.focusedElement && (
            <span className="text-[10px] text-cyan-300 font-mono">
              Tipo: {state.focusedElement.role}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => screenVisionTalkbackService.previousElement()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 transition active:scale-95"
            title="Elemento Anterior"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold">Anterior</span>
          </button>

          <button
            onClick={() => screenVisionTalkbackService.activateFocusedElement()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-cyan-500/50 bg-cyan-600/30 p-2 text-white hover:bg-cyan-500/40 transition active:scale-95 shadow-sm shadow-cyan-500/20"
            title="Activar o presionar elemento"
          >
            <Hand className="w-4 h-4 text-cyan-300" />
            <span className="text-[10px] font-bold">Tocar</span>
          </button>

          <button
            onClick={() => screenVisionTalkbackService.nextElement()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-950/40 transition active:scale-95"
            title="Elemento Siguiente"
          >
            <ChevronRight className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold">Siguiente</span>
          </button>

          <button
            onClick={handleReadScreen}
            disabled={isAnalyzing}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-purple-800 bg-purple-950/60 p-2 text-purple-200 hover:bg-purple-900/60 transition active:scale-95"
            title="Leer lo que está en pantalla"
          >
            {isAnalyzing ? (
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 text-purple-300" />
            )}
            <span className="text-[10px] font-semibold">Leer Vista</span>
          </button>
        </div>
      </div>
    </div>
  );
};
