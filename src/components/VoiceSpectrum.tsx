import React, { useState, useEffect } from 'react';
import {
  Mic,
  Activity,
  AlertCircle,
  RefreshCw,
  Volume2,
  Globe,
  Shield,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Bug,
  Info,
} from 'lucide-react';
import { AssistantState } from '../types';
import {
  voiceService,
  VoiceLogEntry,
  VoiceLogCategory,
  ErrorOriginReport,
  VoiceDiagnosticInfo,
} from '../services/voice';

interface VoiceSpectrumProps {
  assistantState: AssistantState;
  audioLevel: number;
  freqData: Uint8Array | null;
  peakDb: number;
  lastError: string | null;
  activeLanguage: string;
  onResetVoiceEngine: () => void;
  onRetryListening: () => void;
}

const SPANISH_VARIANTS = [
  { code: 'es-ES', label: 'es-ES (España)' },
  { code: 'es-419', label: 'es-419 (Latinoamérica)' },
  { code: 'es-MX', label: 'es-MX (México)' },
  { code: 'es-US', label: 'es-US (EE.UU.)' },
  { code: 'es', label: 'es (Genérico)' },
];

export const VoiceSpectrum: React.FC<VoiceSpectrumProps> = ({
  assistantState,
  audioLevel,
  freqData,
  peakDb,
  lastError,
  activeLanguage,
  onResetVoiceEngine,
  onRetryListening,
}) => {
  const isListening = assistantState === 'listening';
  const isProcessing = assistantState === 'processing';
  const isSpeaking = assistantState === 'speaking';
  const isVoiceActive = audioLevel > 0.08 || peakDb > 25;

  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [logs, setLogs] = useState<VoiceLogEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | VoiceLogCategory>('All');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [diagInfo, setDiagInfo] = useState<VoiceDiagnosticInfo>(voiceService.getDiagnosticInfo());
  const [permissionCheckResult, setPermissionCheckResult] = useState<string | null>(null);

  // Subscribe to voiceService live event logs
  useEffect(() => {
    const unsubscribe = voiceService.subscribeLogs((updatedLogs) => {
      setLogs(updatedLogs);
      setDiagInfo(voiceService.getDiagnosticInfo());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Update diagnostic info when error changes
  useEffect(() => {
    setDiagInfo(voiceService.getDiagnosticInfo());
  }, [lastError, isListening, activeLanguage]);

  // 24 frequency bars for visual clarity and balanced aesthetics
  const barCount = 24;
  const bars = Array.from({ length: barCount }, (_, index) => {
    if (!freqData || freqData.length === 0) {
      if (isListening) {
        const offset = Math.sin(Date.now() / 300 + index * 0.4) * 8 + 12;
        return Math.max(8, Math.min(60, offset));
      }
      return 6; // Minimal line in idle
    }
    const freqIndex = Math.min(
      freqData.length - 1,
      Math.floor((index / barCount) * freqData.length)
    );
    const rawVal = freqData[freqIndex] || 0;
    return Math.max(10, Math.min(100, Math.round((rawVal / 255) * 100)));
  });

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.category}] [${l.level.toUpperCase()}] ${l.message}${
            l.details ? ` | ${JSON.stringify(l.details)}` : ''
          }`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleTestPermission = async () => {
    const state = await voiceService.checkMicrophonePermission();
    setPermissionCheckResult(state);
    setTimeout(() => setPermissionCheckResult(null), 3000);
  };

  const handleChangeLanguage = (newLang: string) => {
    voiceService.setLanguage(newLang);
    setDiagInfo(voiceService.getDiagnosticInfo());
  };

  const filteredLogs = logs.filter(
    (l) => activeFilter === 'All' || l.category === activeFilter
  );

  const errorReport: ErrorOriginReport = diagInfo.errorOriginReport || voiceService.diagnoseErrorOrigin();

  return (
    <div className="w-full rounded-2xl border border-slate-800/90 bg-slate-950/60 p-3.5 backdrop-blur-md shadow-lg transition-all text-left">
      {/* Top Status & Audio Activity Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
              isVoiceActive && isListening
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 shadow-xs shadow-emerald-500/20'
                : isListening
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isVoiceActive ? 'animate-pulse' : ''}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold tracking-tight text-white">
                Espectro de Frecuencia y Diagnóstico
              </span>
              {isListening && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border transition ${
                    isVoiceActive
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 animate-pulse'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  }`}
                >
                  {isVoiceActive ? 'VOZ DETECTADA' : 'MIC ACTIVO'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isVoiceActive
                ? `Capturando armónicos de voz • Pico: ${peakDb}%`
                : isListening
                ? 'Micrófono abierto en escucha continua • Esperando tu voz'
                : isProcessing
                ? 'Procesando comando con IA local'
                : isSpeaking
                ? 'Asistente respondiendo por voz'
                : 'En reposo • Pulsa el orbe para hablar'}
            </p>
          </div>
        </div>

        {/* Level Meter Badge & Language indicator */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-300 font-mono hidden sm:inline bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
            {diagInfo.activeLanguage}
          </span>
          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-400">
            <Volume2 className="w-3 h-3 text-slate-400" />
            <span>{Math.round(audioLevel * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Real-time Frequency Spectrum Bars Graphic */}
      <div className="relative flex h-14 w-full items-end justify-between gap-1 rounded-xl bg-slate-950/90 px-3 py-2 border border-slate-900/80 overflow-hidden mb-3">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col justify-end items-center h-full group"
          >
            <div
              style={{ height: `${height}%` }}
              className={`w-full max-w-[8px] rounded-t-sm transition-all duration-75 ${
                isVoiceActive && isListening
                  ? 'bg-gradient-to-t from-emerald-600 via-cyan-400 to-teal-200 shadow-xs shadow-cyan-400/40'
                  : isListening
                  ? 'bg-gradient-to-t from-cyan-900/80 via-cyan-500/70 to-sky-400/80'
                  : isSpeaking
                  ? 'bg-gradient-to-t from-emerald-900/60 to-emerald-400/80'
                  : 'bg-slate-800/80'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Error Origin Diagnostic Banner (Explicitly identifies Permissions vs Engine vs Language) */}
      {(lastError || errorReport.origin !== 'none') && (
        <div
          className={`mb-3 rounded-2xl border p-3.5 text-xs transition ${
            errorReport.origin === 'permissions'
              ? 'border-amber-700/70 bg-amber-950/40 text-amber-200'
              : errorReport.origin === 'language'
              ? 'border-emerald-700/70 bg-emerald-950/40 text-emerald-200'
              : errorReport.origin === 'engine'
              ? 'border-purple-700/70 bg-purple-950/40 text-purple-200'
              : 'border-rose-800/70 bg-rose-950/40 text-rose-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  errorReport.origin === 'permissions'
                    ? 'text-amber-400'
                    : errorReport.origin === 'language'
                    ? 'text-emerald-400'
                    : errorReport.origin === 'engine'
                    ? 'text-purple-400'
                    : 'text-rose-400'
                }`}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      errorReport.origin === 'permissions'
                        ? 'bg-amber-900/80 border-amber-600 text-amber-200'
                        : errorReport.origin === 'language'
                        ? 'bg-emerald-900/80 border-emerald-600 text-emerald-200'
                        : errorReport.origin === 'engine'
                        ? 'bg-purple-900/80 border-purple-600 text-purple-200'
                        : 'bg-rose-900/80 border-rose-600 text-rose-200'
                    }`}
                  >
                    {errorReport.badge}
                  </span>
                  <span className="font-bold text-white text-xs">{errorReport.title}</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {errorReport.description}
                </p>
                <div className="text-[10px] opacity-75 font-mono pt-0.5">
                  {errorReport.technicalDetails}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onResetVoiceEngine();
                onRetryListening();
              }}
              className="shrink-0 flex items-center gap-1 rounded-xl bg-slate-900/80 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition active:scale-95"
              title="Reiniciar motor de voz"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>

          {/* Actionable recommendations */}
          {errorReport.recommendations && errorReport.recommendations.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                Pasos recomendados para solucionarlo:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                {errorReport.recommendations.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Language Dialect Quick Switcher */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5 mb-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configuración de Idioma de Reconocimiento (Web Speech API)</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Sistema: <strong className="text-slate-200">{diagInfo.systemLanguage}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SPANISH_VARIANTS.map((v) => (
            <button
              key={v.code}
              onClick={() => handleChangeLanguage(v.code)}
              className={`px-2 py-1 text-[11px] font-medium rounded-lg border transition active:scale-95 ${
                diagInfo.activeLanguage === v.code
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-xs'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTestPermission}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-800 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <Shield className="w-3 h-3 text-amber-400" />
            <span>
              {permissionCheckResult
                ? `Permiso: ${permissionCheckResult.toUpperCase()}`
                : 'Verificar Permisos de Micrófono'}
            </span>
          </button>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border transition active:scale-95 ${
              showLogs
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>Logs de Web Speech API ({logs.length})</span>
            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {showLogs && (
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-800 hover:text-white transition active:scale-95"
              title="Copiar registro de logs al portapapeles"
            >
              {copiedLogs ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copiar Logs</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => {
              voiceService.clearLogs();
              setLogs([]);
            }}
            className="text-[10px] text-slate-500 hover:text-slate-300 transition"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Live Web Speech API Event Logger Console */}
      {showLogs && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] space-y-2">
          {/* Filter Pills */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-900">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Consola de Eventos en Tiempo Real
            </span>
            <div className="flex items-center gap-1">
              {(['All', 'Permissions', 'Engine', 'Language', 'Audio'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition ${
                    activeFilter === cat
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'All' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Stream */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 font-mono">
            {filteredLogs.length === 0 ? (
              <p className="text-slate-500 text-[10px] py-3 text-center">
                No hay eventos registrados en esta categoría aún.
              </p>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-1.5 py-0.5 border-b border-slate-900/60 leading-tight ${
                    entry.level === 'error'
                      ? 'text-rose-400 font-semibold'
                      : entry.level === 'warn'
                      ? 'text-amber-300'
                      : entry.level === 'success'
                      ? 'text-emerald-400 font-medium'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 text-[10px] select-none">
                    {entry.timestamp}
                  </span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                      entry.category === 'Permissions'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : entry.category === 'Language'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        : entry.category === 'Engine'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                        : entry.category === 'Audio'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800/60'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {entry.category}
                  </span>
                  <span className="break-all">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
