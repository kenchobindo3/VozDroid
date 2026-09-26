import React from 'react';
import {
  X,
  ShieldCheck,
  Mic,
  Camera,
  Battery,
  Vibrate,
  Bell,
  Sun,
  MapPin,
  Clipboard,
  Eye,
  Hand,
  CheckCircle2,
  Sparkles,
  Users,
} from 'lucide-react';
import { PermissionStatusMap } from '../types';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: PermissionStatusMap;
  onRequestAllPermissions: () => Promise<void>;
  onRequestPermission: (key: keyof PermissionStatusMap) => Promise<void>;
  isFirstLaunch?: boolean;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onRequestAllPermissions,
  onRequestPermission,
  isFirstLaunch = false,
}) => {
  if (!isOpen) return null;

  const items: {
    key: keyof PermissionStatusMap;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      key: 'microphone',
      name: 'Micrófono de Voz en Tiempo Real',
      description: 'Permite capturar tus comandos por voz y alimentar el espectro de frecuencia.',
      icon: Mic,
    },
    {
      key: 'screenVision',
      name: 'Control Total de Vista y Lectura de Pantalla',
      description: 'Permite al asistente ver la pantalla, analizar elementos visuales y leer lo que se muestra.',
      icon: Eye,
    },
    {
      key: 'accessibilityTalkBack',
      name: 'Accesibilidad TalkBack y Ejecutor de Acciones',
      description: 'Lector de pantalla por voz, navegación asistida y ejecución de procesos por comandos.',
      icon: Hand,
    },
    {
      key: 'torch',
      name: 'Cámara y Linterna LED de Android',
      description: 'Permite encender y apagar el flash físico del teléfono.',
      icon: Camera,
    },
    {
      key: 'wakeLock',
      name: 'Bloqueo de Suspensión (Wake Lock)',
      description: 'Evita que el teléfono se suspenda o apague la pantalla durante la escucha continua.',
      icon: Sun,
    },
    {
      key: 'vibration',
      name: 'Motor de Vibración Háptica',
      description: 'Genera respuestas físicas al confirmar acciones, alarmas y toques en pantalla.',
      icon: Vibrate,
    },
    {
      key: 'battery',
      name: 'Sensor de Batería y Energía',
      description: 'Monitorea el porcentaje y estado de carga para optimizar el rendimiento.',
      icon: Battery,
    },
    {
      key: 'notifications',
      name: 'Notificaciones del Sistema',
      description: 'Avisos sonoros y visuales de temporizadores, recordatorios y respuestas.',
      icon: Bell,
    },
    {
      key: 'geolocation',
      name: 'Ubicación GPS de Android',
      description: 'Permite saber tu ubicación y abrir rutas de navegación en Google Maps.',
      icon: MapPin,
    },
    {
      key: 'clipboard',
      name: 'Portapapeles del Teléfono',
      description: 'Permite copiar textos, respuestas y datos dictados por voz.',
      icon: Clipboard,
    },
    {
      key: 'contacts',
      name: 'Agenda de Contactos del Teléfono',
      description: 'Acceso a tu lista de contactos para llamadas, SMS y WhatsApp dirigidos por voz.',
      icon: Users,
    },
  ];

  const grantedCount = Object.values(permissions).filter((s) => s === 'granted').length;
  const totalCount = items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Centro de Activación y Permisos de Android
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {grantedCount}/{totalCount} Activos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isFirstLaunch
                  ? 'Configuración inicial: Activa los permisos para otorgar control total de hardware, voz, vista y accesibilidad TalkBack.'
                  : 'Administra los accesos de hardware, visión de pantalla y ejecución que el asistente gestiona.'}
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

        {/* Global Action Banner */}
        <div className="mt-4 rounded-2xl border border-emerald-800/50 bg-emerald-950/40 p-3.5 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Conceder Todos los Permisos del Sistema</span>
            </span>
            <span className="text-slate-300 text-[11px]">
              Autoriza micrófono, vista de pantalla, accesibilidad y hardware (Notificación y GPS se mantienen opcionales).
            </span>
          </div>
          <button
            onClick={onRequestAllPermissions}
            className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition active:scale-95 shadow-md shadow-emerald-500/20"
          >
            Conceder Todos
          </button>
        </div>

        {/* Permissions List */}
        <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {items.map((item) => {
            const status = permissions[item.key];
            const Icon = item.icon;
            const isGranted = status === 'granted';

            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl border ${
                      isGranted
                        ? 'border-emerald-800 bg-emerald-950/60 text-emerald-400'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{item.name}</span>
                    <span className="text-[11px] text-slate-400 leading-tight block">
                      {item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isGranted ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Activo
                    </span>
                  ) : (
                    <button
                      onClick={() => onRequestPermission(item.key)}
                      className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-1 rounded-xl hover:bg-cyan-900/60 transition active:scale-95"
                    >
                      Permitir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            {grantedCount === totalCount
              ? 'Todos los componentes están autorizados para funcionamiento total.'
              : `Faltan ${totalCount - grantedCount} permisos por autorizar.`}
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            {isFirstLaunch ? 'Comenzar a Usar' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
