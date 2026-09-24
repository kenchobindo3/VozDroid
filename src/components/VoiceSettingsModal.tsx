import React from 'react';
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Radio,
  Clock,
  Sparkles,
  Globe,
  Wifi,
  WifiOff,
  Play,
  RotateCcw,
  Zap,
  VolumeX,
  HelpCircle
} from 'lucide-react';
import { AssistantSettings, VoiceGender, ListeningMode, ExternalApiConfig } from '../types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  availableVoices: SpeechSynthesisVoice[];
  onUpdateSettings: (settings: Partial<AssistantSettings>) => void;
  onTestVoice: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  availableVoices,
  onUpdateSettings,
  onTestVoice,
}) => {
  if (!isOpen) return null;

  const handleGenderChange = (gender: VoiceGender) => {
    onUpdateSettings({
      voiceGender: gender,
      speechPitch: gender === 'female' ? 1.15 : (gender === 'male' ? 0.85 : 1.0),
    });
  };

  const handleModeChange = (mode: ListeningMode) => {
    onUpdateSettings({ listeningMode: mode });
  };

  const handleExternalApiToggle = (enabled: boolean) => {
    onUpdateSettings({
      externalApi: {
        ...settings.externalApi,
        enabled,
      },
    });
  };

  const handleExternalApiChange = (field: keyof ExternalApiConfig, value: any) => {
    onUpdateSettings({
      externalApi: {
        ...settings.externalApi,
        [field]: value,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Ajustes de Voz, Escucha y Conexión
                <span className="text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">
                  Configuración Local
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza el género de voz, el tiempo de escucha activa y APIs externas opcionales.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {/* Section: Customizable Precommand / Wake Word ("Zanna", "Comando", etc.) */}
          <div className="rounded-2xl border border-cyan-800/80 bg-gradient-to-b from-cyan-950/40 to-slate-900/60 p-4 space-y-3.5 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    Precomando de Activación de Comandos
                    <span className="text-[10px] bg-cyan-950 border border-cyan-700 text-cyan-300 px-2 py-0.5 rounded-full font-mono">
                      Personalizable
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Evita que los comandos de hardware se confundan con el razonamiento o conversación de la IA.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Wake Word Input & Preset Buttons */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase">
                Nombre o Palabra Clave del Precomando
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={settings.wakeWord || 'Zanna'}
                    onChange={(e) => onUpdateSettings({ wakeWord: e.target.value, hotword: e.target.value })}
                    placeholder="Ej: Zanna, ZANNA..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-cyan-300 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['Zanna', 'ZANNA', 'VozDroid', 'Comando'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onUpdateSettings({ wakeWord: name, hotword: name })}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                        (settings.wakeWord || 'Zanna').toLowerCase() === name.toLowerCase()
                          ? 'border-cyan-400 bg-cyan-900/60 text-cyan-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Examples of Precommand Activation */}
            <div className="rounded-xl border border-cyan-900/50 bg-slate-950/70 p-2.5 text-[11px] text-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Ejemplos de comandos con tu precomando:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 font-mono text-[10px]">
                  "{settings.wakeWord || 'Zanna'}, activa la linterna"
                </div>
                <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 font-mono text-[10px]">
                  "{settings.wakeWord || 'Zanna'}, desactiva la linterna"
                </div>
                <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 font-mono text-[10px]">
                  "{settings.wakeWord || 'Zanna'}, activa la cámara"
                </div>
              </div>
            </div>

            {/* Optional Strict Precommand Mode */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Exigir precomando obligatorio para comandos de hardware
                </span>
                <span className="text-[11px] text-slate-400">
                  Si se activa, el hardware solo responderá cuando digas "{settings.wakeWord || 'Zanna'}, activa...". El resto irá a la IA conversacional.
                </span>
              </div>
              <button
                onClick={() => onUpdateSettings({ requireWakeWordForCommands: !settings.requireWakeWordForCommands })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.requireWakeWordForCommands ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.requireWakeWordForCommands ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 1: Voice Gender Selection (Femenino / Masculino) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-pink-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Género de la Voz (TTS en Español)
                </h4>
              </div>
              <button
                onClick={onTestVoice}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-950 border border-cyan-800 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 transition active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Probar Voz</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleGenderChange('female')}
                className={`flex items-center justify-between p-3 rounded-2xl border transition active:scale-95 ${
                  settings.voiceGender === 'female'
                    ? 'border-pink-500 bg-pink-950/30 text-pink-200 shadow-md shadow-pink-500/10'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-left">
                  <span className="text-xs font-bold block text-white">Voz Femenina</span>
                  <span className="text-[10px] text-pink-400">Tono claro y melódico</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${settings.voiceGender === 'female' ? 'border-pink-400 bg-pink-500' : 'border-slate-600'}`}>
                  {settings.voiceGender === 'female' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>

              <button
                onClick={() => handleGenderChange('male')}
                className={`flex items-center justify-between p-3 rounded-2xl border transition active:scale-95 ${
                  settings.voiceGender === 'male'
                    ? 'border-blue-500 bg-blue-950/30 text-blue-200 shadow-md shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-left">
                  <span className="text-xs font-bold block text-white">Voz Masculina</span>
                  <span className="text-[10px] text-blue-400">Tono grave y resonante</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${settings.voiceGender === 'male' ? 'border-blue-400 bg-blue-500' : 'border-slate-600'}`}>
                  {settings.voiceGender === 'male' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            {/* Speech rate and pitch fine-tuning sliders */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Velocidad de habla</span>
                  <span className="text-cyan-400 font-bold">{settings.speechRate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={settings.speechRate}
                  onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Tono vocal (Pitch)</span>
                  <span className="text-cyan-400 font-bold">{settings.speechPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.05"
                  value={settings.speechPitch}
                  onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Listening Mode & Gemini Style Always-On with Barge-In */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Modalidad y Tiempo de Escucha
              </h4>
            </div>

            <div className="space-y-2">
              {/* Option A: Push-to-Talk */}
              <div
                onClick={() => handleModeChange('push_to_talk')}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  settings.listeningMode === 'push_to_talk'
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Pulsar una vez (Push-to-Talk)</span>
                    <span className="text-[11px] text-slate-400">
                      Tocas el micrófono una vez, hablas tu orden y el asistente se apaga automáticamente al terminar.
                    </span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${settings.listeningMode === 'push_to_talk' ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'}`}>
                    {settings.listeningMode === 'push_to_talk' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              {/* Option B: Timed Window */}
              <div
                onClick={() => handleModeChange('timed')}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  settings.listeningMode === 'timed'
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-white block">Escucha Abierta por Tiempo Decidido</span>
                    <span className="text-[11px] text-slate-400">
                      El micrófono queda abierto durante el tiempo exacto que tú decidas.
                    </span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${settings.listeningMode === 'timed' ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'}`}>
                    {settings.listeningMode === 'timed' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>

                {settings.listeningMode === 'timed' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] text-slate-300">Duración de la ventana:</span>
                    {[5, 10, 30, 60].map((sec) => (
                      <button
                        key={sec}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSettings({ listeningDurationSeconds: sec });
                        }}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition ${
                          settings.listeningDurationSeconds === sec
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option C: Gemini Always-On with Barge-In */}
              <div
                onClick={() => handleModeChange('always_on_gemini')}
                className={`p-3 rounded-2xl border cursor-pointer transition ${
                  settings.listeningMode === 'always_on_gemini'
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-md shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Modo Gemini en Segundo Plano (Siempre Activo)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Escucha continua permanente sin apagarse. <strong>Si tú hablas mientras la IA responde, la IA se detiene en seco de inmediato para escucharte</strong> (Barge-in).
                    </span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${settings.listeningMode === 'always_on_gemini' ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                    {settings.listeningMode === 'always_on_gemini' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Barge-In Switch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Interrupción por Voz (Barge-In)
                </span>
                <span className="text-[11px] text-slate-400">
                  Pausa o silencia la respuesta de la IA instantáneamente si empiezas a hablar.
                </span>
              </div>
              <button
                onClick={() => onUpdateSettings({ bargeInEnabled: !settings.bargeInEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.bargeInEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.bargeInEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Optional External API / URL for Voice or LLM */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Conectar API o URL Externa (Opcional)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Para cuando tengas internet o servidor Ollama en tu red Wi-Fi local.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleExternalApiToggle(!settings.externalApi?.enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.externalApi?.enabled ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.externalApi?.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.externalApi?.enabled ? (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Tipo de API
                    </label>
                    <select
                      value={settings.externalApi.type}
                      onChange={(e) => handleExternalApiChange('type', e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="ollama_local">Ollama Local (Wi-Fi / LAN)</option>
                      <option value="openai_compatible">OpenAI Compatible / Whisper</option>
                      <option value="custom_webhook">URL Webhook Personalizada</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Nombre del Modelo
                    </label>
                    <input
                      type="text"
                      value={settings.externalApi.modelName || ''}
                      onChange={(e) => handleExternalApiChange('modelName', e.target.value)}
                      placeholder="ej: llama3.2 o whisper-1"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    URL del Endpoint
                  </label>
                  <input
                    type="url"
                    value={settings.externalApi.url || ''}
                    onChange={(e) => handleExternalApiChange('url', e.target.value)}
                    placeholder="ej: http://192.168.1.50:11434/api/generate o https://api.openai.com/v1/chat/completions"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    API Key (Opcional si es servidor local)
                  </label>
                  <input
                    type="password"
                    value={settings.externalApi.apiKey || ''}
                    onChange={(e) => handleExternalApiChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl bg-purple-950/30 border border-purple-900/40 p-2.5 text-[11px] text-purple-300 flex items-center gap-2">
                  <Wifi className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>
                    Si no hay internet o el servidor no responde, el asistente conmuta al <strong>motor 100% offline</strong> de inmediato.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-emerald-400/90 pt-1">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Modo 100% Offline activo (Cero llamadas a internet, privacidad total).</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
