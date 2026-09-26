import React, { useState, useRef } from 'react';
import {
  X,
  Users,
  Upload,
  Sparkles,
  Check,
  Plus,
  Trash2,
  HardDrive,
  Globe,
  Bot,
  UserCheck,
  Shield,
  FileCode,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { AIAgent, VoiceGender } from '../types';
import { PRESET_AGENTS, OPEN_SOURCE_REPO_AGENTS, parseAgentFile } from '../services/agentManager';

interface AgentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: AIAgent;
  customAgents: AIAgent[];
  onSelectAgent: (agent: AIAgent) => void;
  onSaveCustomAgent: (agent: AIAgent) => Promise<void>;
  onDeleteCustomAgent: (id: string) => Promise<void>;
  onTestVoice: (gender: VoiceGender) => void;
}

export const AgentManagerModal: React.FC<AgentManagerModalProps> = ({
  isOpen,
  onClose,
  activeAgent,
  customAgents,
  onSelectAgent,
  onSaveCustomAgent,
  onDeleteCustomAgent,
  onTestVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'repo' | 'upload' | 'create'>('presets');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Agent Form State
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentGender, setNewAgentGender] = useState<VoiceGender>('female');
  const [newAgentAvatar, setNewAgentAvatar] = useState('🤖');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const text = await file.text();
      const parsedAgent = parseAgentFile(text, file.name);
      if (!parsedAgent) {
        throw new Error('El archivo no contiene un formato de agente válido (debe incluir "name" y "role").');
      }
      await onSaveCustomAgent(parsedAgent);
      onSelectAgent(parsedAgent);
      setActiveTab('presets');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Error al procesar el archivo del agente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentPrompt.trim()) return;

    const custom: AIAgent = {
      id: 'custom-' + Math.random().toString(36).substring(2, 9),
      name: newAgentName.trim(),
      avatar: newAgentAvatar || '🤖',
      role: newAgentRole.trim() || 'Asistente Personalizado de Android',
      description: 'Agente local creado por el usuario en el dispositivo.',
      systemPrompt: newAgentPrompt.trim(),
      personality: 'Definida por el usuario.',
      voiceGender: newAgentGender,
      source: 'custom_upload',
      isCustom: true,
      tags: ['Personalizado', 'Local'],
      allowedTools: [
        'SET_TORCH',
        'GET_BATTERY',
        'SET_VOLUME',
        'VIBRATE',
        'SET_ALARM',
        'SET_TIMER',
      ],
      createdAt: Date.now(),
    };

    await onSaveCustomAgent(custom);
    onSelectAgent(custom);
    setNewAgentName('');
    setNewAgentRole('');
    setNewAgentPrompt('');
    setActiveTab('presets');
  };

  const allPresetAndCustom = [...PRESET_AGENTS, ...customAgents];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Gestor y Repositorio de Agentes de IA
                <span className="text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">
                  Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Cambia de agente, carga modelos de código abierto o sube tu propio archivo de agente.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 mt-4 overflow-x-auto gap-1 pb-1">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 ${
              activeTab === 'presets'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mis Agentes ({allPresetAndCustom.length})
          </button>
          <button
            onClick={() => setActiveTab('repo')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'repo'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Repositorio Open Source</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Subir desde Teléfono</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>Crear Agente</span>
          </button>
        </div>

        {/* Tab 1: Presets & Custom List */}
        {activeTab === 'presets' && (
          <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allPresetAndCustom.map((agent) => {
                const isActive = activeAgent.id === agent.id;
                return (
                  <div
                    key={agent.id}
                    className={`flex flex-col justify-between rounded-2xl p-3.5 border transition text-left ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-500/10'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{agent.avatar}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {agent.name}
                              {agent.isCustom && (
                                <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-1.5 py-0.2 rounded">
                                  Usuario
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] text-cyan-400">{agent.role}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${agent.voiceGender === 'female' ? 'bg-pink-950/70 text-pink-300 border border-pink-800/40' : 'bg-blue-950/70 text-blue-300 border border-blue-800/40'}`}>
                          {agent.voiceGender === 'female' ? 'Voz Femenina' : 'Voz Masculina'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2 line-clamp-2">
                        {agent.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() => onTestVoice(agent.voiceGender)}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                        title="Escuchar tono de voz"
                      >
                        <Volume2 className="w-3 h-3 text-cyan-400" />
                        <span>Probar voz</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {agent.isCustom && (
                          <button
                            onClick={() => onDeleteCustomAgent(agent.id)}
                            title="Eliminar este agente"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectAgent(agent)}
                          disabled={isActive}
                          className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition active:scale-95 ${
                            isActive
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 cursor-default'
                              : 'bg-cyan-600 text-white hover:bg-cyan-500'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <span>Activar</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Open Source Repository */}
        {activeTab === 'repo' && (
          <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <p className="text-xs text-slate-400">
              Agentes comunitarios de código abierto disponibles sin internet. Puedes cargarlos de inmediato con 1 solo toque.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OPEN_SOURCE_REPO_AGENTS.map((agent) => {
                const isActive = activeAgent.id === agent.id;
                return (
                  <div
                    key={agent.id}
                    className="flex flex-col justify-between rounded-2xl p-3.5 border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{agent.avatar}</span>
                          <div>
                            <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                            <span className="text-[10px] text-emerald-400">{agent.role}</span>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                          Open Source
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2 line-clamp-2">
                        {agent.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {agent.voiceGender === 'female' ? 'Voz Femenina' : 'Voz Masculina'}
                      </span>
                      <button
                        onClick={() => {
                          onSelectAgent(agent);
                          setActiveTab('presets');
                        }}
                        disabled={isActive}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition active:scale-95 ${
                          isActive
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Cargado</span>
                          </>
                        ) : (
                          <span>Cargar Agente</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Upload from Phone Storage */}
        {activeTab === 'upload' && (
          <div className="mt-4 space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            <div className="rounded-2xl border border-dashed border-cyan-700/60 bg-cyan-950/20 p-5 text-center">
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Selecciona tu archivo de Agente desde tu Teléfono
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Admite archivos con extensión <code className="text-cyan-300">.json</code>, <code className="text-cyan-300">.agent</code>, <code className="text-cyan-300">.yaml</code>, <code className="text-cyan-300">.txt</code> o <code className="text-cyan-300">.gguf</code> guardados en la memoria interna o SD.
              </p>

              <div className="mt-4 flex justify-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,.agent,.yaml,.yml,.txt,.prompt,.gguf"
                  className="hidden"
                  id="agent-file-picker"
                />
                <label
                  htmlFor="agent-file-picker"
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white cursor-pointer transition active:scale-95 ${
                    isUploading
                      ? 'bg-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/20'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  <span>{isUploading ? 'Leyendo archivo...' : 'Examinar almacenamiento del teléfono'}</span>
                </label>
              </div>

              {uploadError && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2 rounded-xl text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
              <span className="font-bold text-slate-200 block mb-1">Formato soportado del archivo:</span>
              <p>
                Puedes subir un archivo JSON con campos como <code>name</code>, <code>role</code>, <code>systemPrompt</code>, <code>voiceGender</code> ("female" o "male"), o un archivo de texto plano con las instrucciones del sistema que debe seguir la IA.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Create Custom Agent in App */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateAgent} className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Nombre del Agente
                </label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="ej: GuardiánDroid"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Rol o Especialidad
                </label>
                <input
                  type="text"
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value)}
                  placeholder="ej: Asistente Nocturno de Ahorro de Energía"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Género de la Voz (TTS)
                </label>
                <select
                  value={newAgentGender}
                  onChange={(e) => setNewAgentGender(e.target.value as VoiceGender)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="female">Voz Femenina (Aguda / Clara)</option>
                  <option value="male">Voz Masculina (Grave / Resonante)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Emoji / Avatar
                </label>
                <input
                  type="text"
                  value={newAgentAvatar}
                  onChange={(e) => setNewAgentAvatar(e.target.value)}
                  placeholder="🤖"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 text-center focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Instrucciones del Sistema (System Prompt)
              </label>
              <textarea
                required
                rows={3}
                value={newAgentPrompt}
                onChange={(e) => setNewAgentPrompt(e.target.value)}
                placeholder="Describe cómo debe comportarse, qué tono debe usar y qué prioridad darle a las tareas de Android..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition active:scale-95"
              >
                Guardar y Activar Agente
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Agente activo actual: <strong className="text-cyan-400">{activeAgent.name}</strong> ({activeAgent.role})
          </span>
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
