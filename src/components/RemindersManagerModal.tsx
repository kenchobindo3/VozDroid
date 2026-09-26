import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  CheckCircle,
  Circle,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles,
  Calendar,
  Vibrate,
} from 'lucide-react';
import { ReminderItem } from '../types';
import { getAllReminders, saveReminder, deleteReminder, toggleReminderCompleted } from '../services/db';
import { hardwareService } from '../services/hardware';

interface RemindersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReminderScheduled?: () => void;
}

export const RemindersManagerModal: React.FC<RemindersManagerModalProps> = ({
  isOpen,
  onClose,
  onReminderScheduled,
}) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [soundTone, setSoundTone] = useState('standard');
  const [isAlarmTesting, setIsAlarmTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReminders();
    } else {
      hardwareService.stopReminderAlarm();
      setIsAlarmTesting(false);
    }
  }, [isOpen]);

  const loadReminders = async () => {
    const list = await getAllReminders();
    setReminders(list);
  };

  if (!isOpen) return null;

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let targetHour = parseInt(hour, 10);
    if (period === 'PM' && targetHour < 12) targetHour += 12;
    if (period === 'AM' && targetHour === 12) targetHour = 0;

    const targetDate = new Date();
    targetDate.setHours(targetHour, parseInt(minute, 10), 0, 0);
    if (targetDate.getTime() <= Date.now()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const timeStr = `${hour}:${minute} ${period}`;

    const item: ReminderItem = {
      id: 'rem-' + Date.now(),
      title: newTitle.trim(),
      timeString: timeStr,
      targetTime: targetDate.getTime(),
      completed: false,
      createdAt: Date.now(),
      soundTone,
      vibrate: true,
    };

    await saveReminder(item);
    setNewTitle('');
    hardwareService.playSuccessChime();
    await loadReminders();
    onReminderScheduled?.();
  };

  const handleToggle = async (id: string) => {
    await toggleReminderCompleted(id);
    await loadReminders();
  };

  const handleDelete = async (id: string) => {
    await deleteReminder(id);
    await loadReminders();
  };

  const toggleTestAlarm = () => {
    if (isAlarmTesting) {
      hardwareService.stopReminderAlarm();
      setIsAlarmTesting(false);
    } else {
      hardwareService.playReminderAlarm(soundTone);
      setIsAlarmTesting(true);
    }
  };

  const activeCount = reminders.filter((r) => !r.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-950/80 border border-amber-800/60 text-amber-400">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Historial de Recordatorios y Alarmas
                <span className="text-[10px] font-semibold bg-amber-950 border border-amber-800 text-amber-300 px-2 py-0.5 rounded-full">
                  {activeCount} Activo{activeCount !== 1 ? 's' : ''}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Alerta persistente en pantalla, vibración continua y notificación en Android.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              hardwareService.stopReminderAlarm();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Command Hint Card */}
        <div className="mt-4 rounded-2xl border border-amber-900/40 bg-amber-950/20 p-3.5 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-amber-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comandos de voz directos con Zanna:</span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-400">
            <p>• <span className="text-amber-200">"Recuérdame lavar la ropa a las 9 am"</span> → Agenda automáticamente.</p>
            <p>• <span className="text-amber-200">"Recuérdame sacar la basura a las 8"</span> → Zanna te pregunta si en la mañana o en la tarde.</p>
            <p>• <span className="text-amber-200">"Recuérdame el cumpleaños de mi tía"</span> → Zanna te pregunta a qué hora programarlo.</p>
          </div>
        </div>

        {/* Create Reminder Form */}
        <form onSubmit={handleAddReminder} className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nuevo Recordatorio Rápido</span>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ej: Lavar la ropa, Comprar medicina, Cita médica..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white">
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-1" />
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                  <option key={h} value={h} className="bg-slate-900 text-white">
                    {h}
                  </option>
                ))}
              </select>
              <span>:</span>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer"
              >
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPeriod('AM')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  period === 'AM' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setPeriod('PM')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  period === 'PM' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                PM
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTestAlarm}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isAlarmTesting
                  ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                  : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isAlarmTesting ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAlarmTesting ? 'Detener Tono' : 'Probar Tono Alerta'}</span>
            </button>

            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </div>
        </form>

        {/* Reminders List */}
        <div className="mt-4 max-h-[40vh] overflow-y-auto space-y-2 pr-1">
          {reminders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No tienes recordatorios guardados. Crea uno o pídeselo a Zanna por voz.
            </div>
          ) : (
            reminders.map((rem) => {
              const isPast = rem.targetTime <= Date.now() && !rem.completed;
              return (
                <div
                  key={rem.id}
                  className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                    rem.completed
                      ? 'border-slate-800/60 bg-slate-900/30 opacity-60'
                      : isPast
                      ? 'border-rose-800/80 bg-rose-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggle(rem.id)}
                      className="text-slate-400 hover:text-amber-400 transition"
                    >
                      {rem.completed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold truncate ${
                            rem.completed ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {rem.title}
                        </span>
                        {isPast && (
                          <span className="text-[10px] bg-rose-950 border border-rose-800 text-rose-300 px-1.5 py-0.2 rounded-full font-bold">
                            ¡Pendiente!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>{rem.timeString}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Vibrate className="w-2.5 h-2.5 text-cyan-400" />
                          Vibración & Alarma
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(rem.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Eliminar recordatorio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
