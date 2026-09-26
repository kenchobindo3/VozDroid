import React, { useState } from 'react';
import {
  X,
  Eye,
  Camera,
  Play,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  MousePointer,
  Keyboard,
  ArrowUpDown,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { voiceService } from '../services/voice';

interface ScreenCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenCopilotModal: React.FC<ScreenCopilotModalProps> = ({ isOpen, onClose }) => {
  const [userPrompt, setUserPrompt] = useState('Abre WhatsApp y haz clic en el primer chat');
  const [isCapturing, setIsCapturing] = useState(false);
  const [simulatedScreenshot, setSimulatedScreenshot] = useState<string | null>(
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'
  );
  const [jsonOutput, setJsonOutput] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleSimulateAnalysis = async () => {
    if (!userPrompt.trim()) return;
    setIsRunning(true);
    setJsonOutput(null);

    // Simulate analysis using local GGUF / MLM processing coordinates on 0-1000 normalized scale
    await new Promise((r) => setTimeout(r, 1200));

    const promptLower = userPrompt.toLowerCase();
    let action: 'tap' | 'type' | 'scroll' | 'none' = 'tap';
    let target_name = 'WhatsApp Icon';
    let x = 250;
    let y = 350;
    let thought = 'Detected WhatsApp application icon in the app grid based on the user request to open the app.';

    if (promptLower.includes('primer chat') || promptLower.includes('chat')) {
      action = 'tap';
      target_name = 'First Conversation Item';
      x = 500;
      y = 180;
      thought = 'Identified the top conversation item in the list layout to tap on.';
    } else if (promptLower.includes('escribe') || promptLower.includes('redacta') || promptLower.includes('busca')) {
      action = 'type';
      target_name = 'Search Input Field';
      x = 500;
      y = 80;
      thought = 'Focused on the search text input area to enter the user query.';
    } else if (promptLower.includes('baja') || promptLower.includes('sube') || promptLower.includes('scroll')) {
      action = 'scroll';
      target_name = 'Main Scrollable Container';
      x = 500;
      y = 500;
      thought = 'Detected scrollable list container. Performing a scroll-down gesture to reveal more content.';
    }

    const outputObj = {
      thought,
      action,
      target_name,
      normalized_location: { x, y },
    };

    setJsonOutput(outputObj);
    setIsRunning(false);
    voiceService.speak(`Análisis de pantalla completado. Acción determinada: ${action} en ${target_name}.`, {});
  };

  const handleSimulateScreenshot = () => {
    setIsCapturing(true);
    setTimeout(() => {
      // Simulate taking a screenshot using native MediaProjection
      setIsCapturing(false);
      voiceService.speak('Captura de pantalla de MediaProjection obtenida con éxito.', {});
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-emerald-500/40 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto animate-in fade-in zoom-in-95 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 shadow-md">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                ZANNA Copilot Visual
              </span>
              <h3 className="text-base font-extrabold text-white">
                Agente MLM GGUF & Control de Pantalla
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-200 leading-relaxed flex gap-2.5">
          <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-white">Integración Multimodal Nativa (MediaProjection + AccessibilityServices):</span>
            Zanna captura la pantalla actual en tiempo real, normaliza las coordenadas en una cuadrícula de <strong>0 a 1000</strong>, y el motor GGUF multimodal local decide dónde presionar, escribir o deslizar para automatizar las tareas del usuario.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Virtual Screen View & Coordinates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Captura de Pantalla Activa
              </span>
              <button
                type="button"
                onClick={handleSimulateScreenshot}
                disabled={isCapturing}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isCapturing ? 'Capturando...' : 'Refrescar Pantalla'}</span>
              </button>
            </div>

            <div className="relative aspect-[9/16] w-full max-w-[220px] mx-auto rounded-3xl border-4 border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
              {simulatedScreenshot && (
                <img
                  src={simulatedScreenshot}
                  alt="Virtual Phone View"
                  className="w-full h-full object-cover opacity-80"
                />
              )}

              {/* Simulated Coordinate Crosshair */}
              {jsonOutput && jsonOutput.normalized_location && (
                <div
                  className="absolute flex items-center justify-center animate-ping"
                  style={{
                    left: `${jsonOutput.normalized_location.x / 10}%`,
                    top: `${jsonOutput.normalized_location.y / 10}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="h-6 w-6 rounded-full border-2 border-emerald-400 bg-emerald-500/40 flex items-center justify-center">
                    <MousePointer className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}

              {/* Grid indicators (0-1000 scale overlay) */}
              <div className="absolute inset-0 border border-dashed border-slate-700/30 pointer-events-none flex flex-col justify-between p-1">
                <span className="text-[8px] font-mono text-slate-500">0,0</span>
                <span className="text-[8px] font-mono text-slate-500 self-end">1000,1000</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interaction Form & Output */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Comando de Voz o Texto
                </label>
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Ej: Abre el chat de mamá..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSimulateAnalysis}
                disabled={isRunning}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isRunning ? 'Procesando GGUF Multimodal...' : 'Analizar y Determinar Toque'}</span>
              </button>
            </div>

            {/* Strictly Machine Readable JSON Output */}
            {jsonOutput && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Salida JSON Estricta (Accessibility Bridge):
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(jsonOutput, null, 2)}
                </pre>

                <div className="flex gap-2 text-[10px] font-bold text-slate-400">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Listo para AccessibilityService</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
