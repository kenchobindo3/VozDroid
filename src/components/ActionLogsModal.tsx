import React from 'react';
import {
  X,
  Terminal,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  HardDrive,
  Cpu
} from 'lucide-react';
import { AndroidAction } from '../types';

interface ActionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AndroidAction[];
  onClearLogs: () => void;
}

export const ActionLogsModal: React.FC<ActionLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Terminal de Ejecución de Android
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {logs.length} eventos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Registro de comandos de hardware y tareas enviadas al sistema.
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

        {/* Content Body */}
        <div className="mt-4 flex items-center justify-between pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Línea de Comandos y Eventos
          </span>
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar registros</span>
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 font-mono">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No se han registrado comandos aún.
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'success';
              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-bold text-slate-200">{log.title}</span>
                      <span className="text-[10px] bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">
                        {log.type}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">{log.description}</p>

                  {log.params && Object.keys(log.params).length > 0 && (
                    <div className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/60 overflow-x-auto">
                      <span className="text-cyan-400">params: </span>
                      {JSON.stringify(log.params)}
                    </div>
                  )}

                  {log.resultMessage && (
                    <span className="text-[10px] text-emerald-400/90 italic">
                      ➜ {log.resultMessage}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
