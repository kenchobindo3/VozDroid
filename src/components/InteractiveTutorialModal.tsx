import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Mic,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  Zap,
  Play,
  ArrowRight,
  ArrowLeft,
  Sun,
  Flame
} from 'lucide-react';
import { AssistantSettings, PermissionStatusMap } from '../types';
import { voiceService } from '../services/voice';
import { hardwareService } from '../services/hardware';
import { ZannaAvatar } from './ZannaAvatar';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionStatusMap;
  onRequestAllPermissions: () => Promise<void>;
  onRequestPermission: (key: keyof PermissionStatusMap) => Promise<void>;
  settings: AssistantSettings;
  onUpdateSettings: (settings: Partial<AssistantSettings>) => void;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onRequestAllPermissions,
  onRequestPermission,
  settings,
  onUpdateSettings,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [guidedPracticeSuccess, setGuidedPracticeSuccess] = useState(false);
  const [isGrantingPermissions, setIsGrantingPermissions] = useState(false);

  if (!isOpen) return null;

  const wakeWord = settings.wakeWord || 'Zanna';

  const handleGrantPermissions = async () => {
    setIsGrantingPermissions(true);
    await onRequestAllPermissions();
    setIsGrantingPermissions(false);
    hardwareService.playSuccessChime();
    voiceService.speak('Permisos concedidos correctamente. Continuemos con el tutorial.', { rate: 1.0 });
  };

  const handleTestWakeWordAudio = () => {
    voiceService.speak(`Hola, soy ${wakeWord}. Di ${wakeWord} antes de tus comandos para activarme.`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      gender: settings.voiceGender,
    });
  };

  const handleTestGuidedCommand = async () => {
    // Test guided torch command
    hardwareService.playSuccessChime();
    await hardwareService.setTorch(true);
    setGuidedPracticeSuccess(true);
    voiceService.speak(`¡Excelente! El comando de linterna fue probado con éxito.`, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
    });
  };

  const totalSteps = 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto animate-in fade-in zoom-in-95">
        
        {/* Header & Skip Button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ZannaAvatar size="sm" />
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Guía de Inicio Guiada
              </span>
              <h3 className="text-base font-extrabold text-white">
                Bienvenido a ZANNA AI
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              localStorage.setItem('zanna_tutorial_completed', 'true');
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Omitir Tutorial
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="py-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
            <span>Paso {currentStep + 1} de {totalSteps}</span>
            <span className="text-cyan-400">
              {currentStep === 0 && 'Permisos de Sistema'}
              {currentStep === 1 && 'Palabra de Activación'}
              {currentStep === 2 && 'Práctica Guiada'}
              {currentStep === 3 && 'Segundo Plano & Listo'}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 0: Permissions First */}
        {currentStep === 0 && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">1. Autorización de Permisos del Sistema</h4>
                  <p className="text-xs text-slate-400">
                    Para capturar tus comandos por voz y controlar el hardware, ZANNA requiere tu permiso.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  permissions.microphone === 'granted' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}>
                  <span className="font-semibold">Micrófono</span>
                  {permissions.microphone === 'granted' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Mic className="w-4 h-4" />}
                </div>

                <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  permissions.notifications === 'granted' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}>
                  <span className="font-semibold">Notificaciones</span>
                  {permissions.notifications === 'granted' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Zap className="w-4 h-4" />}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGrantPermissions}
                disabled={isGrantingPermissions}
                className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGrantingPermissions ? 'Otorgando permisos...' : 'Conceder Todos los Permisos Recomendados'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Precommand / Wake Word */}
        {currentStep === 1 && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-cyan-800/80 bg-cyan-950/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-900 border border-cyan-700 text-cyan-300">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">2. Tu Palabra de Activación (Precomando)</h4>
                  <p className="text-xs text-slate-300">
                    Di el nombre del precomando antes de tu orden por voz.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase">
                  Nombre del Precomando Personalizable:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.wakeWord || 'Zanna'}
                    onChange={(e) => onUpdateSettings({ wakeWord: e.target.value, hotword: e.target.value })}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestWakeWordAudio}
                    className="px-3 py-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-bold hover:bg-cyan-900 transition flex items-center gap-1.5"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Escuchar</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-cyan-400 block mb-1">Ejemplo en la vida real:</span>
                <span className="font-mono text-cyan-200 block">"{wakeWord}, activa la linterna"</span>
                <span className="font-mono text-cyan-200 block">"{wakeWord}, pon la música"</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Guided Practice */}
        {currentStep === 2 && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-950 border border-amber-800 text-amber-400">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">3. Práctica Guiada en Vivo</h4>
                  <p className="text-xs text-slate-400">
                    Prueba ejecutar tu primer comando directamente en el dispositivo.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-cyan-800/80 bg-slate-950 text-center space-y-3">
                <p className="text-xs font-bold text-slate-200">
                  Toca el botón a continuación para simular o ejecutar:
                </p>
                <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-200 font-mono text-xs">
                  "{wakeWord}, activa la linterna"
                </div>

                <button
                  type="button"
                  onClick={handleTestGuidedCommand}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Probar Comando de Linterna Ahora</span>
                </button>

                {guidedPracticeSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-bounce-short">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Práctica completada con éxito!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Background & Finish */}
        {currentStep === 3 && (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 border border-emerald-700 text-emerald-300">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">4. ¡Todo Listo! Escucha en Segundo Plano</h4>
                  <p className="text-xs text-slate-300">
                    Puedes minimizar la aplicación o apagar la pantalla y ZANNA continuará activa.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-white">Escucha Activa Continua</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Al salir de la app, verás la notificación en la barra superior. Di "{wakeWord}" en cualquier momento para tomar el control.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('zanna_tutorial_completed', 'true');
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              ¡Comenzar a Usar ZANNA!
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
