import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Loader2,
  Volume2,
  Pause,
  Play,
  Square,
  Send,
  Sparkles,
  SlidersHorizontal,
  Activity,
  Zap,
  Check,
  RotateCcw,
  Keyboard,
  AudioLines,
} from 'lucide-react';
import { AssistantState, SpeechPlaybackState, ListeningMode, AIAgent } from '../types';
import { voiceService } from '../services/voice';

interface VoiceOrbProps {
  assistantState: AssistantState;
  playbackState: SpeechPlaybackState;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  freqData?: Uint8Array | null;
  peakDb?: number;
  listeningMode: ListeningMode;
  listeningDurationSeconds: number;
  activeAgent: AIAgent;
  wakeWord?: string;
  onToggleListening: () => void;
  onForceEmitVoiceCommand?: () => void;
  onSubmitTextCommand: (text: string) => void;
  onPauseSpeaking: () => void;
  onResumeSpeaking: () => void;
  onStopSpeaking: () => void;
  onOpenVoiceSettings: () => void;
  onOpenAgentModal: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  assistantState,
  playbackState,
  transcript,
  interimTranscript,
  audioLevel,
  freqData,
  peakDb = 0,
  listeningMode,
  listeningDurationSeconds,
  activeAgent,
  wakeWord = 'Zanna',
  onToggleListening,
  onForceEmitVoiceCommand,
  onSubmitTextCommand,
  onPauseSpeaking,
  onResumeSpeaking,
  onStopSpeaking,
  onOpenVoiceSettings,
  onOpenAgentModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [isDictatingToInput, setIsDictatingToInput] = useState(false);
  const [dictationBuffer, setDictationBuffer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const toSend = inputText.trim() || dictationBuffer.trim();
    if (!toSend) return;

    if (isDictatingToInput) {
      voiceService.stopListening(false);
      setIsDictatingToInput(false);
    }

    onSubmitTextCommand(toSend);
    setInputText('');
    setDictationBuffer('');
  };

  // Toggle Gboard / Google Voice Keyboard Dictation mode directly into the input field
  const handleToggleDictation = async () => {
    if (isDictatingToInput) {
      voiceService.stopListening(true);
      setIsDictatingToInput(false);
      if (inputText.trim()) {
        onSubmitTextCommand(inputText.trim());
        setInputText('');
      }
      return;
    }

    // Stop assistant listening loop if active
    if (assistantState === 'listening') {
      onToggleListening();
    }

    setIsDictatingToInput(true);
    setDictationBuffer('');

    const started = await voiceService.startListening(
      (text, isFinal) => {
        if (text) {
          setInputText(text);
          setDictationBuffer(text);
        }
        if (isFinal && text.trim()) {
          setIsDictatingToInput(false);
          voiceService.stopListening(false);
          onSubmitTextCommand(text.trim());
          setInputText('');
          setDictationBuffer('');
        }
      },
      (err) => {
        console.warn('Dictation error:', err);
        setIsDictatingToInput(false);
      },
      () => {
        setIsDictatingToInput(false);
      },
      { mode: 'push_to_talk' }
    );

    if (!started) {
      setIsDictatingToInput(false);
    }
  };

  // Handle instant emit from the transcription preview box
  const handleExecuteCurrentVoice = () => {
    const speech = interimTranscript.trim() || transcript.trim();
    if (onForceEmitVoiceCommand) {
      onForceEmitVoiceCommand();
    } else if (speech) {
      onSubmitTextCommand(speech);
    }
  };

  const isListening = assistantState === 'listening';
  const isProcessing = assistantState === 'processing';
  const isSpeaking = assistantState === 'speaking' || playbackState === 'speaking';
  const isPaused = playbackState === 'paused';
  const isExecuting = assistantState === 'executing';
  const isVoiceActive = audioLevel > 0.08 || peakDb > 25;

  const orbScale = isListening ? Math.min(1.3, 1 + audioLevel * 1.2) : 1;

  // Real-time animation loop for continuous, fluid sound waveform visualization
  const [animTick, setAnimTick] = useState(0);
  useEffect(() => {
    let animId: number;
    const loop = () => {
      setAnimTick((prev) => (prev + 1) % 1000);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Real-time voice spectrum bars (24 frequency bars always active for immediate voice recognition feedback)
  const barCount = 24;
  const spectrumBars = Array.from({ length: barCount }, (_, idx) => {
    const centerFactor = 1 - Math.pow((idx - (barCount - 1) / 2) / (barCount / 2), 2) * 0.42;

    if (!freqData || freqData.length === 0) {
      if (isVoiceActive) {
        const dynamicLevel = Math.max(12, Math.min(48, Math.round(audioLevel * 65 * centerFactor)));
        return dynamicLevel;
      }
      if (isListening) {
        // Continuous wave ripple indicating microphone pipeline is active and listening
        const ripple = Math.sin(animTick * 0.15 + idx * 0.45) * 8 + 14;
        return Math.max(6, Math.min(30, Math.round(ripple * centerFactor)));
      }
      if (isSpeaking) {
        const speechWave = Math.sin(animTick * 0.18 + idx * 0.5) * 9 + 15;
        return Math.max(8, Math.min(32, Math.round(speechWave * centerFactor)));
      }
      return 6;
    }

    const freqIdx = Math.min(freqData.length - 1, Math.floor((idx / barCount) * freqData.length));
    const val = freqData[freqIdx] || 0;
    const baseHeight = Math.round((val / 255) * 44 * centerFactor);
    const boost = isVoiceActive ? Math.round(audioLevel * 22) : 0;
    return Math.max(6, Math.min(52, baseHeight + boost));
  });

  return (
    <div className="relative flex flex-col items-center justify-center py-4 px-3 w-full max-w-lg mx-auto">
      {/* Background ambient glow */}
      <div
        className={`absolute -top-10 h-72 w-72 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
          isListening
            ? 'bg-cyan-500/20 scale-125'
            : isProcessing || isExecuting
            ? 'bg-amber-500/15 scale-110'
            : isSpeaking
            ? 'bg-emerald-500/20 scale-115'
            : isPaused
            ? 'bg-purple-500/15 scale-100'
            : 'bg-blue-600/10 scale-95'
        }`}
      />

      {/* Top Header: Active Agent & Mode */}
      <div className="mb-4 flex items-center justify-between w-full max-w-sm gap-3">
        <button
          onClick={onOpenAgentModal}
          className="flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/80 px-3.5 py-2 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-white hover:bg-slate-850 transition-all active:scale-95 shadow-sm"
          title="Cambiar agente de IA"
        >
          <span className="text-base">{activeAgent.avatar}</span>
          <span className="font-bold text-cyan-300">{activeAgent.name}</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline truncate max-w-[100px]">· {activeAgent.role.split(' ')[0]}</span>
        </button>

        <button
          onClick={onOpenVoiceSettings}
          className="flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-500/50 hover:text-white hover:bg-slate-850 transition-all active:scale-95 shadow-sm"
          title="Ajustes de voz y escucha"
        >
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <span>
            {listeningMode === 'always_on_gemini'
              ? 'Siempre activo'
              : listeningMode === 'timed'
              ? `${listeningDurationSeconds}s`
              : 'Pulsar'}
          </span>
        </button>
      </div>

      {/* Main Status Pill */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center gap-2.5 rounded-full px-5 py-1.5 text-xs font-semibold tracking-wide border transition-all shadow-md ${
            isListening
              ? isVoiceActive
                ? 'border-emerald-500/70 bg-emerald-950/80 text-emerald-200 shadow-emerald-500/25 ring-1 ring-emerald-400/30'
                : 'border-cyan-500/60 bg-cyan-950/75 text-cyan-200 shadow-cyan-500/25 ring-1 ring-cyan-400/30'
              : isProcessing
              ? 'border-amber-500/60 bg-amber-950/70 text-amber-200 animate-pulse'
              : isExecuting
              ? 'border-purple-500/60 bg-purple-950/70 text-purple-200'
              : isSpeaking
              ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-200 shadow-emerald-500/25 ring-1 ring-emerald-400/30'
              : isPaused
              ? 'border-purple-500/60 bg-purple-950/70 text-purple-200'
              : 'border-slate-800 bg-slate-900/70 text-slate-400'
          }`}
        >
          {isListening && (
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isVoiceActive ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400 animate-pulse'
              }`}
            />
          )}
          {isProcessing && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
          {isExecuting && <Sparkles className="w-4 h-4 text-purple-400" />}
          {isSpeaking && <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />}
          {isPaused && <Pause className="w-4 h-4 text-purple-400" />}
          {!isListening && !isProcessing && !isExecuting && !isSpeaking && !isPaused && (
            <span className="h-2 w-2 rounded-full bg-slate-500" />
          )}

          <span>
            {isListening
              ? isVoiceActive
                ? '¡Voz detectada! Transcribiendo...'
                : 'Escuchando... Di un comando'
              : isProcessing
              ? `${activeAgent.name} razonando...`
              : isExecuting
              ? 'Ejecutando en Android...'
              : isSpeaking
              ? `${activeAgent.name} respondiendo...`
              : isPaused
              ? 'Respuesta en pausa'
              : 'Toca el orbe para hablar'}
          </span>
        </span>
      </div>

      {/* The Central Hero Voice Orb */}
      <div className="relative flex items-center justify-center my-2">
        {/* Pulsing rings */}
        <div
          className={`absolute rounded-full border transition-all duration-300 pointer-events-none ${
            isListening
              ? isVoiceActive
                ? 'h-48 w-48 border-emerald-400/50 animate-ping'
                : 'h-48 w-48 border-cyan-400/40 animate-pulse'
              : isSpeaking
              ? 'h-44 w-44 border-emerald-400/40 animate-pulse'
              : 'h-36 w-36 border-slate-800/40'
          }`}
        />

        <div
          className={`absolute rounded-full border-2 transition-all duration-300 pointer-events-none ${
            isListening
              ? isVoiceActive
                ? 'h-40 w-40 border-emerald-400/40'
                : 'h-40 w-40 border-cyan-400/30'
              : isSpeaking
              ? 'h-36 w-36 border-emerald-400/30'
              : 'h-32 w-32 border-slate-800/20'
          }`}
          style={{ transform: `scale(${orbScale})` }}
        />

        {/* Central Orb Button */}
        <button
          onClick={onToggleListening}
          style={{ transform: `scale(${orbScale})` }}
          className={`group relative flex h-28 w-28 items-center justify-center rounded-full shadow-2xl transition-all duration-200 active:scale-95 focus:outline-none ${
            isListening
              ? isVoiceActive
                ? 'bg-gradient-to-tr from-emerald-600 via-cyan-500 to-teal-300 shadow-emerald-500/50 ring-4 ring-emerald-400/40'
                : 'bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 shadow-cyan-500/50 ring-4 ring-cyan-400/40'
              : isProcessing || isExecuting
              ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-amber-500/40 ring-4 ring-amber-400/30 animate-pulse'
              : isSpeaking
              ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 shadow-emerald-500/40 ring-4 ring-emerald-400/30'
              : isPaused
              ? 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-slate-800 shadow-purple-500/30 ring-4 ring-purple-400/30'
              : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700/80 shadow-slate-950/80 hover:border-cyan-500/60 hover:shadow-cyan-500/20'
          }`}
        >
          <div className="absolute inset-1.5 rounded-full bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
            {isListening ? (
              <Mic className={`h-11 w-11 ${isVoiceActive ? 'text-emerald-200 animate-pulse' : 'text-cyan-200'}`} />
            ) : isProcessing ? (
              <Loader2 className="h-10 w-10 text-amber-300 animate-spin" />
            ) : isExecuting ? (
              <Sparkles className="h-10 w-10 text-purple-200" />
            ) : isSpeaking ? (
              <Volume2 className="h-10 w-10 text-emerald-200 animate-pulse" />
            ) : isPaused ? (
              <Pause className="h-10 w-10 text-purple-300" />
            ) : (
              <Mic className="h-10 w-10 text-slate-300 group-hover:text-cyan-400 transition" />
            )}
          </div>
        </button>
      </div>

      {/* ALWAYS-ACTIVE REAL-TIME VOICE SPECTRUM & RECOGNITION MONITOR */}
      <div className="mt-2.5 w-full max-w-sm sm:max-w-md flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-950/85 border border-slate-800/80 shadow-lg backdrop-blur-sm">
        {/* Animated Spectrum Waveform Bars */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 h-11 w-full px-1">
          {spectrumBars.map((height, i) => (
            <div
              key={i}
              style={{ height: `${height}px` }}
              className={`w-1 sm:w-1.5 rounded-full transition-all duration-75 ${
                isVoiceActive
                  ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 shadow-sm shadow-emerald-500/50 animate-pulse'
                  : isListening
                  ? 'bg-gradient-to-t from-cyan-600 to-sky-400 shadow-sm shadow-cyan-500/30'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                  : isPaused
                  ? 'bg-gradient-to-t from-purple-500 to-indigo-400'
                  : 'bg-slate-800/80'
              }`}
            />
          ))}
        </div>

        {/* Live Audio Status & Recognition Decibel Badge */}
        <div className="flex items-center justify-between w-full px-1 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {isVoiceActive ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold truncate animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="truncate">Reconociendo voz en vivo</span>
              </span>
            ) : isListening ? (
              <span className="flex items-center gap-1 text-cyan-400 font-medium truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">Micrófono activo • Escuchando...</span>
              </span>
            ) : isSpeaking ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">Síntesis de voz activa</span>
              </span>
            ) : isPaused ? (
              <span className="flex items-center gap-1 text-purple-400 font-medium truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="truncate">Respuesta en pausa</span>
              </span>
            ) : (
              <span className="text-slate-500 flex items-center gap-1 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />
                <span className="truncate">Listo para escuchar</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] shrink-0">
            {isListening && (
              <span
                className={`px-1.5 py-0.5 rounded-md font-semibold transition ${
                  isVoiceActive
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                {isVoiceActive
                  ? `${Math.max(peakDb, Math.round(audioLevel * 100))}% dB`
                  : 'Silencio'}
              </span>
            )}
            <span className="hidden xs:inline text-slate-500">
              Precomando: <strong className="text-cyan-400">{wakeWord}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Audio Playback Controls */}
      {(isSpeaking || isPaused) && (
        <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-1 shadow-xl animate-fade-in">
          {isSpeaking ? (
            <button
              onClick={onPauseSpeaking}
              title="Pausar respuesta de voz"
              className="flex items-center gap-1 rounded-xl bg-purple-950/80 border border-purple-800/60 px-2.5 py-1 text-xs font-semibold text-purple-300 hover:bg-purple-900/80 transition active:scale-95"
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>Pausar</span>
            </button>
          ) : (
            <button
              onClick={onResumeSpeaking}
              title="Reanudar respuesta de voz"
              className="flex items-center gap-1 rounded-xl bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/80 transition active:scale-95"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Reanudar</span>
            </button>
          )}

          <button
            onClick={onStopSpeaking}
            title="Detener voz completamente"
            className="flex items-center gap-1 rounded-xl bg-rose-950/80 border border-rose-800/60 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-900/80 transition active:scale-95"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Detener</span>
          </button>
        </div>
      )}

      {/* Real-time Transcription Feedback Box with Instant Execution Button */}
      <div className="mt-3 min-h-[56px] w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 text-center backdrop-blur-sm shadow-inner flex flex-col items-center justify-center gap-2">
        {interimTranscript ? (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-left flex-1 min-w-0">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-cyan-300 italic truncate">
                "{interimTranscript}"
              </p>
            </div>
            <button
              onClick={handleExecuteCurrentVoice}
              title="Emitir este comando ahora mismo sin esperar pausa"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-500/20 active:scale-95 transition shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
              <span>Ejecutar Ahora</span>
            </button>
          </div>
        ) : transcript ? (
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-medium text-slate-200 text-left flex-1 min-w-0 truncate">
              "{transcript}"
            </p>
            <button
              onClick={handleExecuteCurrentVoice}
              title="Re-ejecutar este comando"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold rounded-xl border border-slate-700 active:scale-95 transition shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Re-emitir</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
            <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Di <strong className="text-slate-300 font-semibold">"{wakeWord}, activa la linterna"</strong> o <strong className="text-slate-300 font-semibold">"{wakeWord}, activa la cámara"</strong></span>
          </p>
        )}
      </div>

      {/* Text Command & Google Keyboard / Gboard Voice Dictation Bar */}
      <div className="w-full mt-4 flex flex-col gap-2">
        <form onSubmit={handleTextSubmit} className="flex w-full items-center gap-2.5">
          {/* Direct Input Field - Optimized for Android Mobile & Gboard Voice Typing */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isDictatingToInput
                  ? '🎙️ Dictado activo... Habla ahora'
                  : 'Escribe o dicta un comando a ZANNA...'
              }
              className={`w-full h-11 sm:h-12 rounded-2xl border px-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all shadow-inner ${
                isDictatingToInput
                  ? 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/40 text-emerald-200'
                  : 'border-slate-800/90 bg-slate-900/90 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
              }`}
            />

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
                title="Limpiar texto"
              >
                ✕
              </button>
            )}
          </div>

          {/* Gboard / Voice Dictation Direct Toggle Button */}
          <button
            type="button"
            onClick={handleToggleDictation}
            title={
              isDictatingToInput
                ? 'Detener dictado por voz'
                : 'Dictado a voz directo (como micrófono de Teclado Google)'
            }
            className={`flex h-11 sm:h-12 items-center gap-1.5 px-3.5 shrink-0 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-md ${
              isDictatingToInput
                ? 'bg-rose-600 text-white shadow-rose-600/30 animate-pulse'
                : 'border border-slate-700/80 bg-slate-800/90 text-cyan-300 hover:bg-slate-750 hover:border-cyan-400 hover:text-white'
            }`}
          >
            {isDictatingToInput ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="hidden sm:inline">Listo</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-cyan-400" />
                <span className="hidden sm:inline">Dictar</span>
              </>
            )}
          </button>

          {/* Send / Execute Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Enviar comando a ejecutar"
            className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/25 disabled:opacity-40 disabled:hover:bg-cyan-600 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        {/* Tip for Google Keyboard Users */}
        <div className="flex items-center justify-between px-2 text-[10px] text-slate-500">
          <span>
            💡 Puedes usar el micrófono de tu <strong>teclado de Google (Gboard)</strong> directamente.
          </span>
          {isDictatingToInput && (
            <span className="text-emerald-400 font-medium animate-pulse">
              ● Grabando dictado a texto
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
