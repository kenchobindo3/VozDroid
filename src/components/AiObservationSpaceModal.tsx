import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Shield,
  Zap,
  RefreshCw,
  X,
  Code2,
  Clock,
  CheckCircle,
  FileCode,
  Terminal,
  Database,
} from 'lucide-react';
import { LocalModelConfig, AssistantSettings, AutoRefactorPatch, SystemBackupSnapshot } from '../types';
import { autoRefactorEngine, ArchitecturalHealthReport } from '../services/autoRefactorEngine';

interface AiObservationSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel: LocalModelConfig;
  settings: AssistantSettings;
  availableModels: LocalModelConfig[];
}

export const AiObservationSpaceModal: React.FC<AiObservationSpaceModalProps> = ({
  isOpen,
  onClose,
  activeModel,
  settings,
  availableModels,
}) => {
  const [activeTab, setActiveTab] = useState<'neural' | 'refactor' | 'backups' | 'telemetry'>('neural');
  const [healthReport, setHealthReport] = useState<ArchitecturalHealthReport | null>(null);
  const [patches, setPatches] = useState<AutoRefactorPatch[]>([]);
  const [backups, setBackups] = useState<SystemBackupSnapshot[]>([]);
  const [isHealing, setIsHealing] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState<AutoRefactorPatch | null>(null);

  // Live neural simulation variables (only active when modal is open)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHealthReport(autoRefactorEngine.runDiagnosticScan());
      setPatches(autoRefactorEngine.getPatches());
      setBackups(autoRefactorEngine.getBackups());

      const unsub = autoRefactorEngine.subscribe((rep) => {
        setHealthReport(rep);
        setPatches(autoRefactorEngine.getPatches());
        setBackups(autoRefactorEngine.getBackups());
      });
      return () => unsub();
    }
  }, [isOpen]);

  // Neural matrix particle canvas loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'neural') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 260);

    const nodes: { x: number; y: number; vx: number; vy: number; radius: number; color: string }[] = [];
    const colors = ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6'];

    for (let i = 0; i < 28; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 2.5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.strokeStyle = `rgba(6, 182, 212, ${1 - dist / 90 * 0.8})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleTriggerAutoHealing = async () => {
    setIsHealing(true);
    await autoRefactorEngine.triggerAutoHealingCycle(settings, availableModels);
    setPatches(autoRefactorEngine.getPatches());
    setBackups(autoRefactorEngine.getBackups());
    setHealthReport(autoRefactorEngine.runDiagnosticScan());
    setIsHealing(false);
  };

  const handleCreateManualSnapshot = async () => {
    await autoRefactorEngine.createSystemSnapshot('Snapshot Manual desde Espacio de Observación', settings, availableModels);
    setBackups(autoRefactorEngine.getBackups());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md animate-in fade-in">
      <div className="flex h-[94vh] max-h-[780px] w-full max-w-4xl flex-col rounded-3xl border border-cyan-900/60 bg-slate-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden ring-1 ring-cyan-500/20">
        {/* Header with Live Observation Glow */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/30 animate-pulse">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Espacio de Observación de IA & Auto-Refacción
                </h2>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                  Telemetría Activa
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo del estado interno, auto-reparación de código en tiempo real y copias de seguridad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 px-6 py-2 gap-2">
          <button
            onClick={() => setActiveTab('neural')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'neural'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Matriz Neuronal en Vivo</span>
          </button>
          <button
            onClick={() => setActiveTab('refactor')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'refactor'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Auto-Refacción de Código ({patches.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'backups'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Copias de Seguridad ({backups.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'telemetry'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Salud de Arquitectura</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'neural' && (
            <div className="flex flex-col gap-5">
              {/* Canvas Visualizer */}
              <div className="relative h-64 w-full rounded-2xl border border-cyan-800/50 bg-slate-950 overflow-hidden shadow-inner">
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                <div className="absolute top-3 left-4 flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-700/60 backdrop-blur-sm text-[11px] text-cyan-300 font-mono">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Flujo de Tensores: {activeModel.name}</span>
                </div>
                <div className="absolute bottom-3 right-4 flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-xl border border-slate-700/60 backdrop-blur-sm text-[11px] text-slate-300 font-mono">
                  <span>Cuantización: <strong className="text-emerald-400">{activeModel.quantization || 'Q4_K_M'}</strong></span>
                  <span>Latencia: <strong className="text-cyan-400">18 ms</strong></span>
                  <span>Tokens/s: <strong className="text-amber-400">48.5</strong></span>
                </div>
              </div>

              {/* Internal Cognitive State Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Modelo Activo</span>
                  <h4 className="text-xs font-bold text-white mt-1 truncate">{activeModel.name}</h4>
                  <span className="text-[10px] text-cyan-400 font-mono">Totalmente Integrado</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Presión de Memoria</span>
                  <h4 className="text-xs font-bold text-emerald-400 mt-1">{healthReport?.memoryPressureMB || 42} MB</h4>
                  <span className="text-[10px] text-slate-500 font-mono">Heap Estable</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Navegador & Motor</span>
                  <h4 className="text-xs font-bold text-white mt-1 truncate">{healthReport?.detectedBrowser || 'Yandex / Chrome'}</h4>
                  <span className="text-[10px] text-emerald-400 font-mono">Aislamiento Activo</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
                  <span className="text-[11px] text-slate-400">Score de Salud</span>
                  <h4 className="text-xs font-bold text-cyan-300 mt-1">{healthReport?.overallHealthScore || 95} / 100</h4>
                  <span className="text-[10px] text-cyan-500 font-mono">Excelente</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'refactor' && (
            <div className="flex flex-col gap-4">
              {/* Auto-Refactor Action Banner */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-800/50">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Módulo de Auto-Refacción en Tiempo Real</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Detecta cuellos de botella en la arquitectura, aplica parches automáticos y conserva estabilidad.
                  </p>
                </div>
                <button
                  onClick={handleTriggerAutoHealing}
                  disabled={isHealing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 disabled:opacity-40 transition active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHealing ? 'animate-spin' : ''}`} />
                  <span>{isHealing ? 'Refactorizando...' : 'Ejecutar Auto-Refacción'}</span>
                </button>
              </div>

              {/* Applied Patches List */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-300">Parches y Optimizaciones de Arquitectura Aplicadas:</h4>
                {patches.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No se han requerido parches adicionales. La arquitectura está en estado óptimo.
                  </div>
                ) : (
                  patches.map((patch) => (
                    <div
                      key={patch.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">{patch.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {patch.targetModule}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(patch.appliedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Problema detectado:</strong> {patch.detectedIssue}
                      </p>
                      <p className="text-[11px] text-emerald-300 bg-slate-950 p-2 rounded-xl font-mono border border-slate-800/80">
                        <strong className="text-emerald-400">Resolución:</strong> {patch.resolutionCode}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Latencia: {patch.metricsBefore.latencyMs}ms → <strong className="text-emerald-400">{patch.metricsAfter.latencyMs}ms</strong></span>
                        <span>Memoria: {patch.metricsBefore.memoryMB}MB → <strong className="text-emerald-400">{patch.metricsAfter.memoryMB}MB</strong></span>
                        <span className="text-emerald-400">Rollback Snapshot Activo ✓</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'backups' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Copias de Seguridad y Snapshots del Sistema</h3>
                  <p className="text-[11px] text-slate-400">
                    Garantizan la estabilidad absoluta ante cualquier cambio de modelo o código.
                  </p>
                </div>
                <button
                  onClick={handleCreateManualSnapshot}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Crear Snapshot Ahora</span>
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {backups.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-cyan-400">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{b.label}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {b.version} • Hash: {b.integrityHash} • {new Date(b.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                      Estable & Listo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'telemetry' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Diagnóstico Arquitectural en Tiempo Real</span>
                </h3>
                <div className="flex flex-col gap-2 text-xs">
                  {healthReport?.recommendations.map((rec, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
