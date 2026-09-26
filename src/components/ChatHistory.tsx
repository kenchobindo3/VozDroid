import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  User,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Cpu,
  MessageSquareOff,
  Bug,
  Send,
  Mic,
  Copy,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { VoiceMessage, ListeningMode } from '../types';

interface ChatHistoryProps {
  messages: VoiceMessage[];
  onPlayVoice: (text: string) => void;
  onClearChat: () => void;
  onSendMessage?: (text: string) => void;
  onToggleVoice?: () => void;
  isListening?: boolean;
  debugMode?: boolean;
  onToggleDebug?: () => void;
  listeningMode?: ListeningMode;
  onOpenVoiceSettings?: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  onPlayVoice,
  onClearChat,
  onSendMessage,
  onToggleVoice,
  isListening = false,
  debugMode = false,
  onToggleDebug,
  listeningMode = 'push_to_talk',
  onOpenVoiceSettings,
}) => {
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage?.(inputText.trim());
    setInputText('');
  };

  const exportChat = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `zanna-chat-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:p-5 shadow-2xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Conversación Inteligente
              <span className="text-[10px] font-bold bg-cyan-950 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded-full">
                ZANNA
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Motor de voz y comandos en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Debug Toggle Button */}
          {onToggleDebug && (
            <button
              onClick={onToggleDebug}
              title={debugMode ? 'Desactivar modo debug' : 'Activar modo debug'}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                debugMode
                  ? 'border-amber-600/70 bg-amber-950/50 text-amber-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold">{debugMode ? 'Debug: ON' : 'Debug: OFF'}</span>
            </button>
          )}

          {messages.length > 0 && (
            <>
              <button
                onClick={onClearChat}
                title="Limpiar conversación"
                className="flex items-center gap-1 rounded-xl border border-rose-900/50 bg-rose-950/30 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Limpiar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 py-4 min-h-[280px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center p-6 text-slate-500">
            <MessageSquareOff className="w-12 h-12 mb-3 stroke-1 text-slate-600 animate-pulse" />
            <p className="text-xs font-bold text-slate-200">ZANNA AI está lista</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              Puedes hablarle libremente en español de forma offline. Di comandos como "activa la linterna", "reproduce música en YouTube" o pídele que redacte tus mensajes.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isCopied = copiedId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender badge & time */}
                <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-500">
                  {isUser ? (
                    <>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-bold text-cyan-400 uppercase tracking-wider">Tú</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                      <span className="font-bold text-emerald-400 uppercase tracking-wider">{msg.agentUsed || 'ZANNA AI'}</span>
                      {debugMode && msg.modelUsed && (
                        <span className="text-[9px] bg-slate-900 px-1.5 py-0.2 rounded text-slate-400 border border-slate-800">
                          {msg.modelUsed.split(' ')[0]}
                        </span>
                      )}
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative group max-w-[88%] sm:max-w-[78%] rounded-2xl p-4 shadow-lg text-[13px] leading-relaxed transition-all duration-150 ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                  {/* Actions Executed List: ONLY VISIBLE IF DEBUG MODE IS ON OR NOT EMPTY */}
                  {debugMode && msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Acciones Ejecutadas ({msg.actionsExecuted.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.actionsExecuted.map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center gap-1 bg-amber-950/40 border border-amber-800/50 rounded-lg px-2 py-0.5 text-[10px] text-amber-300 font-medium"
                          >
                            <span>{act.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant Toolbar */}
                  {!isUser && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPlayVoice(msg.text)}
                          title="Repetir audio por voz nativa"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Escuchar</span>
                        </button>
                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          title="Copiar texto"
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>

                      {debugMode && msg.executionTimeMs !== undefined && (
                        <div className="flex items-center gap-1 text-slate-500 font-mono text-[9px]">
                          <Clock className="w-3 h-3" />
                          <span>{msg.executionTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* In-Chat Interactive Input Bar */}
      {onSendMessage && (
        <form onSubmit={handleSend} className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
          {onToggleVoice && (
            <button
              type="button"
              onClick={onToggleVoice}
              title={isListening ? 'Detener escucha' : 'Hablar por micrófono'}
              className={`p-2.5 rounded-2xl border transition active:scale-95 shrink-0 ${
                isListening
                  ? 'border-rose-500 bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {onOpenVoiceSettings && (
            <button
              type="button"
              onClick={onOpenVoiceSettings}
              title="Cambiar modo de escucha"
              className="px-2.5 py-2.5 rounded-2xl border border-slate-800 bg-slate-900 text-cyan-400 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {listeningMode === 'always_on_gemini' ? 'Continuo' : listeningMode === 'timed' ? 'Temporal' : 'Pulsar'}
              </span>
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje o comando a ZANNA..."
            className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition shadow-inner"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold hover:brightness-110 transition active:scale-95 disabled:opacity-40 disabled:scale-100 shrink-0 shadow-md shadow-cyan-500/20"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      )}
    </div>
  );
};
