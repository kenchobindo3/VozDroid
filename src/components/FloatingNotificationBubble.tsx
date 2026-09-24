import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Maximize2,
  X,
  Radio,
  Sparkles,
  Pause,
  Play,
  Zap,
} from 'lucide-react';
import { AssistantState, SpeechPlaybackState, AIAgent } from '../types';

interface FloatingNotificationBubbleProps {
  isOpen: boolean;
  assistantState: AssistantState;
  playbackState: SpeechPlaybackState;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  activeAgent: AIAgent;
  onToggleListening: () => void;
  onExpand: () => void;
  onClose: () => void;
  onPauseSpeaking: () => void;
  onResumeSpeaking: () => void;
}

export const FloatingNotificationBubble: React.FC<FloatingNotificationBubbleProps> = ({
  isOpen,
  assistantState,
  playbackState,
  transcript,
  interimTranscript,
  audioLevel,
  activeAgent,
  onToggleListening,
  onExpand,
  onClose,
  onPauseSpeaking,
  onResumeSpeaking,
}) => {
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);

  if (!isOpen) return null;

  const isListening = assistantState === 'listening';
  const isSpeaking = assistantState === 'speaking' || playbackState === 'speaking';
  const isPaused = playbackState === 'paused';
  const isProcessing = assistantState === 'processing';

  const displayedText = interimTranscript || transcript || (isListening ? 'Escuchando tu voz en segundo plano...' : `${activeAgent.name} en espera`);

  return (
    <>
      {/* Top Persistent Android Notification Banner (Simulating Android Foreground Service) */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md pointer-events-auto animate-bounce-short">
        <div className="flex items-center justify-between rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
              <span className="text-xs">{activeAgent.avatar}</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-ping" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-white tracking-wide">ZANNA AI</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 font-semibold px-1.5 py-0.2 rounded border border-emerald-800/60">
                  Segundo Plano
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate max-w-[200px]">
                {displayedText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onToggleListening}
              className={`p-1.5 rounded-xl border transition ${
                isListening
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title={isListening ? 'Pausar micrófono' : 'Activar micrófono'}
            >
              {isListening ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <MicOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onExpand}
              className="p-1.5 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-600/30 transition"
              title="Abrir ventana completa"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition"
              title="Cerrar burbuja flotante"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Draggable Bubble Widget on Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 select-none">
        {/* Expanded Transcript Pill */}
        {isExpandedPreview && (
          <div className="w-64 rounded-2xl border border-cyan-500/50 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-md text-left transition animate-fade-in">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {activeAgent.name} Escuchando
              </span>
              <button
                onClick={() => setIsExpandedPreview(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-slate-200 italic">"{displayedText}"</p>

            {/* Quick action bar */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={onToggleListening}
                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Mic className="w-3 h-3" />
                {isListening ? 'Silenciar Mic' : 'Hablar'}
              </button>

              <button
                onClick={onExpand}
                className="text-[10px] font-semibold text-slate-300 hover:text-white flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                Pantalla Completa
              </button>
            </div>
          </div>
        )}

        {/* The Floating Circular Bubble */}
        <div className="relative group">
          {/* Pulsing ring animation */}
          <div
            className={`absolute -inset-1.5 rounded-full transition-all duration-300 pointer-events-none ${
              isListening
                ? 'bg-cyan-500/30 blur-md animate-ping'
                : isSpeaking
                ? 'bg-emerald-500/30 blur-md animate-pulse'
                : 'bg-transparent'
            }`}
          />

          <button
            onClick={() => {
              if (!isExpandedPreview) setIsExpandedPreview(true);
              else onToggleListening();
            }}
            onDoubleClick={onExpand}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl border-2 transition-all duration-200 active:scale-95 focus:outline-none ${
              isListening
                ? 'bg-gradient-to-tr from-cyan-600 to-emerald-400 border-cyan-300 shadow-cyan-500/40'
                : isSpeaking
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 border-emerald-300 shadow-emerald-500/40 animate-pulse'
                : isProcessing
                ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 border-amber-300 shadow-amber-500/40'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500'
            }`}
            title="Burbuja de ZANNA AI en segundo plano (Toca para ver / Doble toque para maximizar)"
          >
            <div className="flex flex-col items-center justify-center">
              {isListening ? (
                <Mic className="w-6 h-6 text-slate-950 animate-bounce" />
              ) : isSpeaking ? (
                <Volume2 className="w-6 h-6 text-slate-950 animate-pulse" />
              ) : isProcessing ? (
                <Sparkles className="w-6 h-6 text-slate-950 animate-spin" />
              ) : (
                <span className="text-lg">{activeAgent.avatar}</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </>
  );
};
