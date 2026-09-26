import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  WifiOff,
  Battery,
  BatteryCharging,
  MessageCircle,
  Menu,
  X,
  Cpu,
  Users,
  Sliders,
  ShieldCheck,
  Terminal,
  Sun,
  Eye,
  Hand,
  Download,
  ChevronRight,
  Sparkles,
  Database,
  MessageSquare,
  Brain,
  Bell,
  Clock,
} from 'lucide-react';
import { LocalModelConfig, AndroidSystemState, AIAgent } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { ZannaAvatar } from './ZannaAvatar';

interface HeaderProps {
  activeModel: LocalModelConfig;
  activeAgent: AIAgent;
  systemState: AndroidSystemState;
  onOpenModelModal: () => void;
  onOpenAgentModal: () => void;
  onOpenVoiceSettingsModal: () => void;
  onOpenPermissionsModal: () => void;
  onOpenLogsModal: () => void;
  onOpenSkillsModal?: () => void;
  onOpenDataManagerModal?: () => void;
  onOpenObservationModal?: () => void;
  onOpenContactsModal?: () => void;
  onOpenRemindersModal?: () => void;
  onOpenTutorialModal?: () => void;
  onToggleWakeLock: () => void;
  onToggleFloatingBubble: () => void;
  isTalkBackActive?: boolean;
  onToggleTalkBack?: () => void;
  onReadScreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModel,
  activeAgent,
  systemState,
  onOpenModelModal,
  onOpenAgentModal,
  onOpenVoiceSettingsModal,
  onOpenPermissionsModal,
  onOpenLogsModal,
  onOpenSkillsModal,
  onOpenDataManagerModal,
  onOpenObservationModal,
  onOpenContactsModal,
  onOpenRemindersModal,
  onOpenTutorialModal,
  onToggleWakeLock,
  onToggleFloatingBubble,
  isTalkBackActive = false,
  onToggleTalkBack,
  onReadScreen,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleAction = (callback: () => void) => {
    setIsMenuOpen(false);
    callback();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl px-4 sm:px-8 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {/* Brand & Offline status */}
        <div className="flex items-center gap-3 min-w-0">
          <ZannaAvatar size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent truncate">
                ZANNA
              </h1>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded-full border border-cyan-700/50 uppercase tracking-wide">
                IA Offline
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate mt-0.5">
              <WifiOff className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-emerald-400/90 font-semibold">100% En dispositivo</span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="text-slate-400 hidden sm:inline">{activeAgent.name}</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Quick Status Info (Anti-crowding, peaceful whitespace) */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Motor: <strong className="text-slate-100 font-semibold">{activeModel.name.split(' ')[0]}</strong></span>
          <span className="text-slate-600">·</span>
          <span>Voz: <strong className="text-cyan-300 font-semibold">{activeAgent.name}</strong></span>
        </div>

        {/* Right Section: Clean, Spacious Controls (No more amontonados!) */}
        <div className="flex items-center gap-2.5 sm:gap-3" ref={menuRef}>
          {/* Quick Battery Indicator Pill */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 shadow-sm">
            {systemState.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : systemState.batteryLevel <= 20 ? (
              <Battery className="w-4 h-4 text-rose-400 animate-bounce" />
            ) : (
              <Battery className="w-4 h-4 text-cyan-400" />
            )}
            <span className="font-bold tabular-nums">{systemState.batteryLevel}%</span>
          </div>

          {/* PWA Install Button when applicable */}
          <div className="hidden sm:block">
            <PWAInstallButton />
          </div>

          {/* Clean Modern Dropdown Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold transition-all shadow-md active:scale-95 ${
                isMenuOpen
                  ? 'border-cyan-400 bg-cyan-950 text-cyan-200 ring-2 ring-cyan-500/30 shadow-cyan-950/50'
                  : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-850 hover:text-white'
              }`}
            >
              {isMenuOpen ? <X className="w-4 h-4 text-cyan-400" /> : <Menu className="w-4 h-4 text-slate-300" />}
              <span className="font-semibold">Opciones</span>
            </button>

            {/* Collapsible / Expandable Flyout Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-88 rounded-3xl border border-slate-800/90 bg-slate-950/98 p-3.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 z-50 text-left">
                {/* Header info in menu */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 mb-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ZANNA AI System
                    </span>
                    <p className="text-xs text-slate-200 mt-0.5 font-semibold flex items-center gap-1.5">
                      <span>{activeAgent.avatar}</span>
                      <span className="text-cyan-300">{activeAgent.name}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{activeModel.name.split(' ')[0]}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                    ONLINE
                  </span>
                </div>

                {/* Menu Item Groups with Modern Squircle Icons & Breathing Room */}
                <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                  {/* IA & Models */}
                  <button
                    onClick={() => handleAction(onOpenModelModal)}
                    className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block text-slate-200 group-hover:text-cyan-300">Modelos de IA Local</span>
                        <span className="text-[11px] text-slate-400">Gemma, Qwen, Ollama, Hub</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {/* Agents */}
                  <button
                    onClick={() => handleAction(onOpenAgentModal)}
                    className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-purple-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-950/80 border border-purple-800/60 text-purple-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block text-slate-200 group-hover:text-purple-300">Agentes de IA</span>
                        <span className="text-[11px] text-slate-400">ZANNA, Titan, Kira, Eco, Nexus</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {/* Voice Settings & Modes */}
                  <button
                    onClick={() => handleAction(onOpenVoiceSettingsModal)}
                    className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block text-slate-200 group-hover:text-emerald-300">Ajustes de Voz y Modos</span>
                        <span className="text-[11px] text-slate-400">Voz, velocidad, Always-On</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {/* Guided Tutorial Modal Option */}
                  {onOpenTutorialModal && (
                    <button
                      onClick={() => handleAction(onOpenTutorialModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-amber-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-950/80 border border-amber-800/60 text-amber-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-amber-300">Tutorial Guiado de Inicio</span>
                          <span className="text-[11px] text-slate-400">Paso a paso, palabra de activación y prueba</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Visión y Lectura de Pantalla */}
                  {onReadScreen && (
                    <button
                      onClick={() => handleAction(onReadScreen)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-cyan-300">Ver y Leer Pantalla</span>
                          <span className="text-[11px] text-slate-400">Inspeccionar DOM y leer en voz alta</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Android Permissions */}
                  <button
                    onClick={() => handleAction(onOpenPermissionsModal)}
                    className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-blue-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-950/80 border border-blue-800/60 text-blue-400 shadow-sm group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block text-slate-200 group-hover:text-blue-300">Permisos de Android</span>
                        <span className="text-[11px] text-slate-400">Micrófono, linterna, sensores</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {/* Action Logs Terminal */}
                  <button
                    onClick={() => handleAction(onOpenLogsModal)}
                    className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block text-slate-200 group-hover:text-cyan-300">Terminal de Comandos</span>
                        <span className="text-[11px] text-slate-400">Registro de ejecución</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {/* Habilidades de Comunicación */}
                  {onOpenSkillsModal && (
                    <button
                      onClick={() => handleAction(onOpenSkillsModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shadow-sm group-hover:scale-105 transition-transform">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-emerald-300">Habilidades & Mensajería</span>
                          <span className="text-[11px] text-slate-400">WhatsApp, SMS, Correo, Llamadas</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Espacio de Observación de IA & Auto-Refacción */}
                  {onOpenObservationModal && (
                    <button
                      onClick={() => handleAction(onOpenObservationModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-indigo-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Eye className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-indigo-300">Espacio de Observación IA</span>
                          <span className="text-[11px] text-slate-400">Telemetría y Auto-Refacción</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Recordatorios Inteligentes */}
                  {onOpenRemindersModal && (
                    <button
                      onClick={() => handleAction(onOpenRemindersModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-amber-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-950/80 border border-amber-800/60 text-amber-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-amber-300">Agenda de Recordatorios</span>
                          <span className="text-[11px] text-slate-400">Alarmas persistentes, vibración e historial</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Contactos & Telegram */}
                  {onOpenContactsModal && (
                    <button
                      onClick={() => handleAction(onOpenContactsModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-cyan-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-cyan-300">Contactos, Alias & Telegram</span>
                          <span className="text-[11px] text-slate-400">Reconocimiento por alias, llamadas, mensajes</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}

                  {/* Base de Datos & Aprendizaje de las IAs */}
                  {onOpenDataManagerModal && (
                    <button
                      onClick={() => handleAction(onOpenDataManagerModal)}
                      className="flex w-full items-center justify-between rounded-2xl p-2.5 text-left text-xs font-medium text-slate-200 hover:bg-slate-900 hover:text-purple-300 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-950/80 border border-purple-800/60 text-purple-400 shadow-sm group-hover:scale-105 transition-transform">
                          <Brain className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-slate-200 group-hover:text-purple-300">Base de Datos Nexus DB</span>
                          <span className="text-[11px] text-slate-400">IndexedDB, Censos, Backups</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                    </button>
                  )}
                </div>

                {/* Bottom Quick Toggles Section inside Menu */}
                <div className="mt-3 pt-3 border-t border-slate-800/90 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAction(onToggleFloatingBubble)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-semibold transition active:scale-95 ${
                        systemState.floatingBubbleActive
                          ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300 shadow-sm'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Burbuja</span>
                    </button>

                    {onToggleTalkBack && (
                      <button
                        onClick={() => handleAction(onToggleTalkBack)}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-semibold transition active:scale-95 ${
                          isTalkBackActive
                            ? 'border-cyan-500 bg-cyan-950/80 text-cyan-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Hand className="w-4 h-4" />
                        <span>TalkBack</span>
                      </button>
                    )}
                  </div>

                  {/* Wake Lock Toggle */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Sun className={`w-4 h-4 ${systemState.wakeLockActive ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className="text-xs text-slate-300">Segundo Plano (Wake Lock)</span>
                    </div>
                    <button
                      onClick={onToggleWakeLock}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        systemState.wakeLockActive ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                          systemState.wakeLockActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
