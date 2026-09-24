import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  User,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Cpu,
  MessageSquareOff
} from 'lucide-react';
import { VoiceMessage } from '../types';

interface ChatHistoryProps {
  messages: VoiceMessage[];
  onPlayVoice: (text: string) => void;
  onClearChat: () => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  onPlayVoice,
  onClearChat,
}) => {
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  const toggleReasoning = (id: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [id]: !prev[id] }));
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

  return (
    <div className="flex flex-col h-full rounded-3xl border border-slate-800/90 bg-slate-900/70 p-5 sm:p-6 backdrop-blur-xl shadow-2xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shadow-md shadow-cyan-950/40">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Historial de Conversación</h2>
            <p className="text-xs text-slate-400">Transcripciones de Voz y Respuestas de ZANNA</p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportChat}
              title="Exportar chat"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={onClearChat}
              title="Borrar historial"
              className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 py-3 min-h-[260px] max-h-[480px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 text-slate-500">
            <MessageSquareOff className="w-10 h-10 mb-2 stroke-1 text-slate-600" />
            <p className="text-xs font-medium text-slate-400">Sin mensajes aún</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Habla mediante el micrófono o escribe un comando para ver el historial y las tareas de Android.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Sender badge & time */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                  {isUser ? (
                    <>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="font-semibold text-cyan-400">Tú</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">{msg.agentUsed || 'ZANNA'}</span>
                      {msg.modelUsed && (
                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                          {msg.modelUsed.split(' ')[0]}
                        </span>
                      )}
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-950/80 border border-slate-800/90 text-slate-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Executed Android Actions Tag List */}
                  {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Acciones de Android Ejecutadas ({msg.actionsExecuted.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.actionsExecuted.map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center gap-1 bg-emerald-950/50 border border-emerald-800/50 rounded-lg px-2 py-0.5 text-[10px] text-emerald-300 font-medium"
                          >
                            <span>{act.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assistant footer toolbar: replay voice & latency */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPlayVoice(msg.text)}
                          title="Repetir audio por sintetizador local"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Escuchar</span>
                        </button>
                      </div>

                      {msg.executionTimeMs !== undefined && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{msg.executionTimeMs}ms (Local)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
