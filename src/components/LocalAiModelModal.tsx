import React, { useState, useRef } from 'react';
import {
  X,
  Cpu,
  Upload,
  Check,
  HardDrive,
  Sliders,
  Sparkles,
  Zap,
  AlertCircle,
  FileCode,
  Trash2,
  CheckCircle2,
  Loader2,
  DownloadCloud,
  Globe,
  Radio,
  Server,
  StopCircle,
  ArrowDownCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { LocalModelConfig, AssistantSettings, ModelDownloadProgress } from '../types';
import { localAiService, PRESET_MODELS } from '../services/localAi';

interface LocalAiModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableModels: LocalModelConfig[];
  activeModel: LocalModelConfig;
  settings: AssistantSettings;
  onSelectModel: (model: LocalModelConfig) => void;
  onUploadCustomModel: (file: File, name: string) => Promise<void>;
  onDeleteCustomModel: (id: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<AssistantSettings>) => void;
  onRefreshModels?: () => Promise<void>;
}

export const LocalAiModelModal: React.FC<LocalAiModelModalProps> = ({
  isOpen,
  onClose,
  availableModels,
  activeModel,
  settings,
  onSelectModel,
  onUploadCustomModel,
  onDeleteCustomModel,
  onUpdateSettings,
  onRefreshModels,
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'download_hub' | 'upload_file' | 'settings'>('installed');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [modelNameInput, setModelNameInput] = useState('');
  const [customDownloadUrl, setCustomDownloadUrl] = useState('');
  const [customModelName, setCustomModelName] = useState('');
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState(settings.externalApi.url || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(settings.externalApi.modelName || 'llama3.2');
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const name = modelNameInput.trim() || file.name.replace(/\.[^/.]+$/, '');
      await onUploadCustomModel(file, name);
      setModelNameInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('installed');
    } catch (err: any) {
      setUploadError(err?.message || 'Error al cargar el archivo de modelo local');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelect = async (model: LocalModelConfig) => {
    setLoadingModelId(model.id);
    try {
      onSelectModel(model);
    } finally {
      setTimeout(() => {
        setLoadingModelId(null);
      }, 400);
    }
  };

  const handleStartDownload = async (model: LocalModelConfig) => {
    setDownloadingModelId(model.id);
    setUploadError(null);

    try {
      await localAiService.downloadModel(model, (prog) => {
        setDownloadProgress(prog);
      });
      await onRefreshModels?.();
      setDownloadingModelId(null);
      setDownloadProgress(null);
      onSelectModel({ ...model, isDownloaded: true, isLoaded: true });
      setActiveTab('installed');
    } catch (err: any) {
      setUploadError(err?.message || 'Error al descargar modelo');
      setDownloadingModelId(null);
    }
  };

  const handleCancelDownload = (modelId: string) => {
    localAiService.cancelModelDownload(modelId);
    setDownloadingModelId(null);
    setDownloadProgress(null);
  };

  const handleCustomUrlDownload = async () => {
    if (!customDownloadUrl.trim()) return;
    const modelId = 'custom-dl-' + Math.random().toString(36).substring(2, 8);
    const customConfig: LocalModelConfig = {
      id: modelId,
      name: customModelName.trim() || 'Modelo Descargado GGUF',
      size: 'Personalizado',
      description: `Descargado desde ${customDownloadUrl.substring(0, 40)}...`,
      type: 'gguf_wasm',
      isLoaded: false,
      isDownloaded: false,
      isCustom: true,
      downloadUrl: customDownloadUrl.trim(),
    };

    await handleStartDownload(customConfig);
    setCustomDownloadUrl('');
    setCustomModelName('');
  };

  const testOllamaConnection = async () => {
    setOllamaConnected(null);
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`, { method: 'GET' });
      if (res.ok) {
        setOllamaConnected(true);
        onUpdateSettings({
          externalApi: {
            enabled: true,
            type: 'ollama_local',
            url: `${ollamaUrl}/api/generate`,
            apiKey: '',
            modelName: ollamaModel,
          },
        });
      } else {
        setOllamaConnected(false);
      }
    } catch (e) {
      setOllamaConnected(false);
    }
  };

  // Merge presets with available custom models
  const hubModels = PRESET_MODELS.filter((m) => m.id !== 'vozdroid-neural-v2');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-6 shadow-2xl text-left my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Gestor y Administrador de IA Local
                <span className="text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded-full">
                  100% Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Controla modelos GGUF, Gemma, Ollama y ejecuta razonamiento directo en tu teléfono Android.
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
        <div className="mt-4 flex items-center gap-1 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('installed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'installed'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Modelos Instalados</span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              {availableModels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('download_hub')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'download_hub'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Hub de Descarga (Gemma / Ollama)</span>
            <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-1.5 py-0.2 rounded-full">Nuevo</span>
          </button>

          <button
            onClick={() => setActiveTab('upload_file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'upload_file'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Archivo Local (.gguf)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustes de Motor</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Active Model Status Card */}
          <div className="rounded-2xl border border-cyan-800/60 bg-cyan-950/20 p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Modelo en RAM de Android
                </span>
                <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                  {activeModel.name}
                  <span className="text-[10px] bg-cyan-900/80 text-cyan-300 px-2 py-0.5 rounded-md font-mono">
                    {activeModel.quantization || 'Local'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">{activeModel.description}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Listo en Memoria
              </span>
            </div>
          </div>

          {/* TAB 1: INSTALLED MODELS */}
          {activeTab === 'installed' && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Modelos Listos para Usar Offline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableModels.map((model) => {
                  const isActive = activeModel.id === model.id;
                  const isLoading = loadingModelId === model.id;
                  return (
                    <div
                      key={model.id}
                      className={`relative flex flex-col justify-between rounded-2xl p-3.5 border transition ${
                        isActive
                          ? 'border-cyan-500 bg-slate-900 shadow-md shadow-cyan-500/10'
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1.5">
                            <Zap className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <h5 className="text-xs font-bold text-slate-100">{model.name}</h5>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {model.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{model.description}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          {model.isCustom ? 'Subido por usuario' : 'Optimizado para Android'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {model.isCustom && (
                            <button
                              onClick={() => onDeleteCustomModel(model.id)}
                              title="Eliminar modelo personalizado"
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleSelect(model)}
                            disabled={isActive || isLoading}
                            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition active:scale-95 ${
                              isActive
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 cursor-default'
                                : 'bg-cyan-600 text-white hover:bg-cyan-500'
                            }`}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Cargando...</span>
                              </>
                            ) : isActive ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>En uso</span>
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

          {/* TAB 2: DOWNLOAD HUB (GEMMA / OLLAMA / QWEN / LLAMA) */}
          {activeTab === 'download_hub' && (
            <div className="space-y-4">
              {/* Active Download Progress Card */}
              {downloadProgress && (
                <div className="rounded-2xl border border-cyan-500 bg-cyan-950/40 p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <DownloadCloud className="w-4 h-4 animate-bounce" />
                      Descargando Modelo a Almacenamiento Local...
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {downloadProgress.progress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden my-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${downloadProgress.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} MB /{' '}
                      {(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <span>Velocidad: {downloadProgress.speedMBs} MB/s</span>
                    <button
                      onClick={() => handleCancelDownload(downloadProgress.modelId)}
                      className="text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Models Catalog for 1-Click Download */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Modelos de Código Abierto Listos para Descarga
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {hubModels.map((model) => {
                    const isDownloading = downloadingModelId === model.id;
                    const isAlreadyInstalled = availableModels.some((m) => m.id === model.id);

                    return (
                      <div
                        key={model.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {model.name}
                            </h5>
                            <span className="text-[10px] bg-slate-950 text-cyan-300 px-2 py-0.5 rounded-md border border-slate-800 font-mono">
                              {model.size}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5">{model.description}</p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-mono">
                            {model.quantization || 'GGUF'}
                          </span>

                          <button
                            onClick={() => handleStartDownload(model)}
                            disabled={isDownloading || isAlreadyInstalled}
                            className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition active:scale-95 ${
                              isAlreadyInstalled
                                ? 'bg-slate-800 text-slate-400 cursor-default'
                                : isDownloading
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
                            }`}
                          >
                            {isAlreadyInstalled ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Descargado</span>
                              </>
                            ) : isDownloading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Descargando...</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownCircle className="w-3.5 h-3.5" />
                                <span>Descargar al Teléfono</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Model Download URL */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Descargar desde URL de Internet (Hugging Face / Repositorio GGUF)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Pega un enlace directo a un archivo `.gguf` o `.bin`. La app lo descargará directamente a la memoria de tu dispositivo.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    placeholder="Nombre para el modelo (ej: Mi Gemma 2B Español)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={customDownloadUrl}
                      onChange={(e) => setCustomDownloadUrl(e.target.value)}
                      placeholder="https://huggingface.co/.../model-q4.gguf"
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={handleCustomUrlDownload}
                      disabled={!customDownloadUrl.trim() || !!downloadingModelId}
                      className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-40 transition"
                    >
                      <DownloadCloud className="w-4 h-4" />
                      <span>Bajar Modelo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Ollama Local Integration */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Conectar con Servidor Ollama Local (Opcional)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Si tienes Ollama corriendo en tu teléfono (Termux), PC o red local, conéctalo aquí. No requiere conexión a internet externa.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434 o http://192.168.1.50:11434"
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="Modelo (ej: llama3.2, gemma2, qwen2.5)"
                      className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={testOllamaConnection}
                      className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                    >
                      Probar
                    </button>
                  </div>
                </div>

                {ollamaConnected === true && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 p-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>¡Conexión exitosa con Ollama! El modelo {ollamaModel} está vinculado.</span>
                  </div>
                )}
                {ollamaConnected === false && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-900/50 p-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No se pudo conectar con Ollama en esa dirección. Usando el motor 100% offline nativo.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD LOCAL FILE FROM PHONE */}
          {activeTab === 'upload_file' && (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Cargar Archivo de IA Local desde el Almacenamiento del Teléfono
                </h4>
              </div>
              <p className="text-xs text-slate-400">
                Selecciona cualquier modelo descargado en tu teléfono Android (como Gemma, Llama o Qwen en formato `.gguf`, `.bin`, `.onnx`, `.tflite`).
                Se almacena en IndexedDB local sin gastar datos ni depender de la nube.
              </p>

              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={modelNameInput}
                  onChange={(e) => setModelNameInput(e.target.value)}
                  placeholder="Nombre identificador (ej: Mi Gemma 2B Local)"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".gguf,.bin,.onnx,.json,.safetensors,.tflite"
                  className="hidden"
                  id="custom-model-file-upload-tab"
                />

                <label
                  htmlFor="custom-model-file-upload-tab"
                  className={`flex items-center justify-center gap-2.5 w-full rounded-2xl py-3.5 text-xs font-semibold text-white cursor-pointer transition active:scale-95 ${
                    isUploading
                      ? 'bg-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/25'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Almacenando pesos en memoria local...</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-4 h-4" />
                      <span>Elegir archivo del teléfono Android (.gguf / .bin)</span>
                    </>
                  )}
                </label>
              </div>

              {uploadError && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENGINE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Parámetros de Ejecución del Asistente
                  </h4>
                </div>

                {/* Autonomous execution switch */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Ejecución Autónoma Inmediata
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Ejecuta comandos de linterna, volumen, llamadas y alarmas al instante sin pedir confirmación.
                    </span>
                  </div>
                  <button
                    onClick={() => onUpdateSettings({ autonomousExecution: !settings.autonomousExecution })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.autonomousExecution ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.autonomousExecution ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto speak response switch */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Respuesta por Voz (TTS Offline)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      El asistente leerá la confirmación en voz alta con sintetizador local de Android.
                    </span>
                  </div>
                  <button
                    onClick={() => onUpdateSettings({ autoSpeakResponse: !settings.autoSpeakResponse })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.autoSpeakResponse ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        settings.autoSpeakResponse ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Privacidad total • Ningún dato sale de tu dispositivo
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
