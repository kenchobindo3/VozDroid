import React from 'react';
import {
  Flashlight,
  Battery,
  BatteryCharging,
  Volume2,
  VolumeX,
  BellOff,
  Bell,
  Sun,
  Camera,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Vibrate,
  FileText,
  Sparkles,
  Shield,
  Activity,
  Trash2,
  Eye,
  Hand
} from 'lucide-react';
import { AndroidSystemState, ActiveTimer } from '../types';

interface AndroidPhoneCardProps {
  systemState: AndroidSystemState;
  onToggleTorch: () => void;
  onToggleDND: () => void;
  onChangeVolume: (volume: number) => void;
  onTestVibration: () => void;
  onTriggerAction: (command: string) => void;
  onDeleteTimer: (id: string) => void;
  onDeleteNote: (index: number) => void;
}

export const AndroidPhoneCard: React.FC<AndroidPhoneCardProps> = ({
  systemState,
  onToggleTorch,
  onToggleDND,
  onChangeVolume,
  onTestVibration,
  onTriggerAction,
  onDeleteTimer,
  onDeleteNote,
}) => {
  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 sm:p-6 backdrop-blur-xl shadow-2xl text-left">
      {/* Title & Android system indicator */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 shadow-md shadow-emerald-950/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Panel de Control de Hardware</h2>
            <p className="text-xs text-slate-400">Sensores y Dispositivos de Android</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Conectado</span>
        </div>
      </div>

      {/* Grid of Quick Toggles - Modern Squircles & Spacious */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Flashlight Toggle */}
        <button
          onClick={onToggleTorch}
          className={`flex flex-col items-start justify-between rounded-3xl p-4 border transition-all duration-200 active:scale-95 text-left group ${
            systemState.torchOn
              ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/60 to-slate-900 text-amber-200 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30'
              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all shadow-md ${
              systemState.torchOn
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/40 animate-pulse'
                : 'bg-slate-900 border border-slate-700 text-slate-300 group-hover:text-amber-400'
            }`}>
              <Flashlight className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold ${systemState.torchOn ? 'text-amber-300' : 'text-slate-500'}`}>
              {systemState.torchOn ? 'Activa' : 'Apagada'}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold block text-white">Linterna Flash</span>
            <span className="text-[11px] text-slate-400">LED posterior</span>
          </div>
        </button>

        {/* Battery Info */}
        <div className="flex flex-col items-start justify-between rounded-3xl p-4 border border-slate-800 bg-slate-950/60 text-slate-300">
          <div className="flex items-center justify-between w-full">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-md ${
              systemState.isCharging
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
            }`}>
              {systemState.isCharging ? (
                <BatteryCharging className="w-5 h-5 animate-pulse" />
              ) : (
                <Battery className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-black text-white tabular-nums">{systemState.batteryLevel}%</span>
          </div>
          <div className="mt-3 text-left">
            <span className="text-xs font-bold block text-white">Batería</span>
            <span className="text-[11px] text-slate-400">{systemState.isCharging ? 'Cargando energía' : 'Uso normal'}</span>
          </div>
        </div>

        {/* Do Not Disturb Toggle */}
        <button
          onClick={onToggleDND}
          className={`flex flex-col items-start justify-between rounded-3xl p-4 border transition-all duration-200 active:scale-95 text-left group ${
            systemState.doNotDisturb
              ? 'border-purple-500/80 bg-gradient-to-br from-purple-950/60 to-slate-900 text-purple-200 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/30'
              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all shadow-md ${
              systemState.doNotDisturb
                ? 'bg-purple-500 text-white shadow-purple-500/40'
                : 'bg-slate-900 border border-slate-700 text-slate-300 group-hover:text-purple-400'
            }`}>
              {systemState.doNotDisturb ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <span className={`text-[11px] font-bold ${systemState.doNotDisturb ? 'text-purple-300' : 'text-slate-500'}`}>
              {systemState.doNotDisturb ? 'Activo' : 'Normal'}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold block text-white">No Molestar</span>
            <span className="text-[11px] text-slate-400">Silencio total</span>
          </div>
        </button>

        {/* Vibration Test */}
        <button
          onClick={onTestVibration}
          className="flex flex-col items-start justify-between rounded-3xl p-4 border border-slate-800 bg-slate-950/60 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-900/60 transition-all duration-200 active:scale-95 text-left group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-md group-hover:scale-105 transition-transform">
              <Vibrate className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-cyan-400">Probar</span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold block text-white">Motor Háptico</span>
            <span className="text-[11px] text-slate-400">Pulso vibratorio</span>
          </div>
        </button>
      </div>

      {/* Volume Slider Card */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-950/70 border border-cyan-800/50 text-cyan-400">
              {systemState.volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </div>
            <span>Volumen de Salida Android</span>
          </span>
          <span className="font-bold text-cyan-300 font-mono">{systemState.volume}%</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onChangeVolume(0)}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition active:scale-95"
          >
            Silencio
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={systemState.volume}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <button
            onClick={() => onChangeVolume(100)}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition active:scale-95"
          >
            100%
          </button>
        </div>
      </div>

      {/* Quick Voice Automation Triggers */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Acciones Frecuentes
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => onTriggerAction('Leer pantalla')}
            className="flex items-center gap-3 rounded-2xl border border-purple-800/50 bg-purple-950/25 p-3 text-xs text-purple-200 hover:border-purple-500 hover:bg-purple-900/30 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950 border border-purple-800 text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Leer Pantalla</span>
              <span className="text-[10px] text-purple-300/70">Visión asistida</span>
            </div>
          </button>

          <button
            onClick={() => onTriggerAction('Activa talkback')}
            className="flex items-center gap-3 rounded-2xl border border-cyan-800/50 bg-cyan-950/25 p-3 text-xs text-cyan-200 hover:border-cyan-500 hover:bg-cyan-900/30 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
              <Hand className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">TalkBack</span>
              <span className="text-[10px] text-cyan-300/70">Accesibilidad</span>
            </div>
          </button>

          <button
            onClick={() => onTriggerAction('Abre la cámara')}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200 hover:border-pink-500/50 hover:bg-pink-950/20 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-pink-400 shrink-0 group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Cámara</span>
              <span className="text-[10px] text-slate-400">Captura local</span>
            </div>
          </button>

          <button
            onClick={() => onTriggerAction('Llama a Mamá')}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200 hover:border-emerald-500/50 hover:bg-emerald-950/20 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Llamar</span>
              <span className="text-[10px] text-slate-400">Marcador rápido</span>
            </div>
          </button>

          <button
            onClick={() => onTriggerAction('Envía un WhatsApp a Contacto diciendo hola')}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200 hover:border-green-500/50 hover:bg-green-950/20 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-green-400 shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">WhatsApp</span>
              <span className="text-[10px] text-slate-400">Mensaje directo</span>
            </div>
          </button>

          <button
            onClick={() => onTriggerAction('Abre el mapa hacia farmacia cercana')}
            className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition active:scale-95 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold block text-white">Navegación</span>
              <span className="text-[10px] text-slate-400">GPS offline</span>
            </div>
          </button>
        </div>
      </div>

      {/* Active Timers List (if any) */}
      {systemState.activeTimers && systemState.activeTimers.length > 0 && (
        <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-2">
            <Clock className="w-4 h-4 animate-spin-slow" />
            <span>Temporizadores en Segundo Plano</span>
          </div>
          <div className="space-y-2">
            {systemState.activeTimers.map((timer) => (
              <div key={timer.id} className="flex items-center justify-between bg-slate-900/90 rounded-xl px-3 py-2 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{timer.label}</span>
                  <span className="text-[10px] text-slate-400 ml-2">({timer.remainingSeconds}s restantes)</span>
                </div>
                <button
                  onClick={() => onDeleteTimer(timer.id)}
                  className="text-slate-400 hover:text-rose-400 transition"
                  title="Cancelar temporizador"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Voice Notes (if any) */}
      {systemState.notes && systemState.notes.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Notas Dictadas por Voz ({systemState.notes.length})</span>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {systemState.notes.map((note, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 border border-slate-800">
                <span className="truncate max-w-[85%]">"{note}"</span>
                <button
                  onClick={() => onDeleteNote(idx)}
                  className="text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
