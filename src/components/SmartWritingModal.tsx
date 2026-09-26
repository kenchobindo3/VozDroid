import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Send,
  RefreshCw,
  FileText,
  MessageSquare,
  Mail,
  Zap,
} from 'lucide-react';
import { AssistantSettings } from '../types';
import { localAiService } from '../services/localAi';
import { voiceService } from '../services/voice';
import { ZannaAvatar } from './ZannaAvatar';

interface SmartWritingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
}

export const SmartWritingModal: React.FC<SmartWritingModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'whatsapp' | 'email' | 'persuasive'>('whatsapp');
  const [draftResult, setDraftResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateDraft = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setDraftResult('');

    try {
      const prompt = `Redacta un texto basado en el siguiente tema o idea: "${topic.trim()}". El tono debe ser: ${tone}. Proporciona únicamente el texto redactado listo para usar, limpio y natural.`;

      const res = await localAiService.processVoiceCommand(prompt, { batteryLevel: 100, isCharging: false } as any);
      const cleanDraft = res.spokenResponse.trim();
      setDraftResult(cleanDraft);
      voiceService.speak('Texto redactado con éxito.', { rate: settings.speechRate, pitch: settings.speechPitch });
    } catch (err: any) {
      setDraftResult('Error al generar la redacción con la IA local.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(draftResult);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto animate-in fade-in zoom-in-95 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <ZannaAvatar size="sm" />
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                Asistente Offline
              </span>
              <h3 className="text-base font-extrabold text-white">
                Redacción Guiada Inteligente
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

        {/* Topic Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300 uppercase">
            ¿Qué deseas redactar o comunicar?
          </label>
          <textarea
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Pedir disculpas por llegar 15 minutos tarde a la reunión, o felicitar a mi mamá por su cumpleaños..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Tone Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-300 uppercase">
            Selecciona el Tono y Estilo
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
              { id: 'formal', name: 'Formal', icon: FileText },
              { id: 'casual', name: 'Casual', icon: Sparkles },
              { id: 'email', name: 'Correo', icon: Mail },
              { id: 'persuasive', name: 'Persuasivo', icon: Zap },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = tone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as any)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 font-bold shadow-md shadow-cyan-950/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerateDraft}
          disabled={isGenerating || !topic.trim()}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Redactando con IA Local...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Redactar Texto Inteligente</span>
            </>
          )}
        </button>

        {/* Result Area */}
        {draftResult && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
              Resultado Redactado:
            </span>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-100 whitespace-pre-wrap font-sans">
              {draftResult}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
