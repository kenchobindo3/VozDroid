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
} from 'lucide-react';
import { VoiceMessage } from '../types';

interface ChatHistoryProps {
  messages: VoiceMessage[];
  onPlayVoice: (text: string) => void;
  onClearChat: () => void;
  onSendMessage?: (text: string) => void;
  onToggleVoice?: () => void;
  isListening?: boolean;
  debugMode?: boolean;
  onToggleDebug?: () => void;
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
    <div className="flex flex-col h-full rounded-3xl border border-slate-800/90 bg-slate-900/80 p-4 sm:p-5 backdrop-blur-xl shadow-2xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-md shadow-cyan-950/40">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Chat Inteligente
              <span className="text-[10px] font-semibold bg-cyan-950 border border-cyan-800/70 text-cyan-300 px-2 py-0.5 rounded-full">
                ZANNA
              </span>
            </h2>
            <p className="text-xs text-slate-400">Conversación y Comandos de Android</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Debug Toggle Button */}
          {onToggleDebug && (
            <button
              onClick={onToggleDebug}
              title={debugMode ? 'Desactivar modo debug (Chat limpio)' : 'Activar modo debug (Ver acciones y telemetría)'}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                debugMode
                  ? 'border-amber-600/70 bg-amber-950/50 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Debug:</span>
              <span className="text-[11px] font-bold">{debugMode ? 'ON' : 'OFF'}</span>
            </button>
          )}

          {messages.length > 0 && (
            <>
              <button
                onClick={exportChat}
                title="Exportar chat"
                className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Exportar</span>
              </button>
              <button
                onClick={onClearChat}
                title="Borrar historial"
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
      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 py-3 min-h-[260px] max-h-[480px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 text-slate-500">
            <MessageSquareOff className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs font-medium text-slate-300">Comienza a conversar con ZANNA</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              Puedes hablarle como a un asistente inteligente (hacer preguntas, reflexionar) o darle órdenes directas de tu teléfono Android.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isCopied = copiedId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Sender badge & time */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  {isUser ? (
                    <>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-semibold text-cyan-400">Tú</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">{msg.agentUsed || 'ZANNA'}</span>
                      {debugMode && msg.modelUsed && (
                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 border border-slate-700/60">
                          {msg.modelUsed.split(' ')[0]}
                        </span>
                      )}
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative group max-w-[92%] sm:max-w-[82%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed transition ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-950/90 border border-slate-800/90 text-slate-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Actions Executed List: ONLY VISIBLE IF DEBUG MODE IS ON OR NOT EMPTY */}
                  {debugMode && msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Acciones de Android Ejecutadas ({msg.actionsExecuted.length}):
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
                    <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
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
