import React, { useState, useEffect } from 'react';
import {
  Brain,
  Zap,
  Activity,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Gauge,
  Terminal,
} from 'lucide-react';

interface AiThinkingVisualizerProps {
  engineType?: 'vozdroid' | 'jev';
}

export const AiThinkingVisualizer: React.FC<AiThinkingVisualizerProps> = ({
  engineType = 'jev',
}) => {
  const [pulseActive, setPulseActive] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [telemetry, setTelemetry] = useState({
    tokensPerSecond: 42.8,
    activeNeurons: 1024,
    attentionWeights: 98.4,
    memoryPressure: '14.2 MB',
    confidenceScore: 99.1,
    latencyMs: 18,
    safetyScore: 100,
  });

  const steps = [
    {
      num: 1,
      title: 'Acondicionamiento y Tokenización',
      desc: 'Normalización de fonemas, supresión de ruido y segmentación de tokens en memoria local.',
      status: 'Procesado',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/60',
      borderColor: 'border-cyan-800/60',
    },
    {
      num: 2,
      title: 'Inferencia Semántica & Desacoplamiento',
      desc: 'Separación inteligente entre charla conversacional (JARVIS) y órdenes explícitas de hardware.',
      status: 'Validado',
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/60',
      borderColor: 'border-purple-800/60',
    },
    {
      num: 3,
      title: 'Árbitro de Seguridad y Permisos',
      desc: 'Comprobación de acceso a hardware, linterna, multimedia, llamadas y reglas de no-invasión.',
      status: 'Seguro',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/60',
      borderColor: 'border-emerald-800/60',
    },
    {
      num: 4,
      title: 'Síntesis Cognitiva y Despacho Android',
      desc: 'Generación de respuesta por voz natural offline y ejecución asíncrona de intents nativos.',
      status: 'Listo',
      color: 'text-blue-400',
      bgColor: 'bg-blue-950/60',
      borderColor: 'border-blue-800/60',
    },
  ];

  const triggerSimulation = () => {
    setPulseActive(true);
    setActiveStep(1);
    const s2 = setTimeout(() => setActiveStep(2), 600);
    const s3 = setTimeout(() => setActiveStep(3), 1200);
    const s4 = setTimeout(() => {
      setActiveStep(4);
      setTelemetry((prev) => ({
        ...prev,
        latencyMs: Math.floor(Math.random() * 8 + 14),
        tokensPerSecond: +(Math.random() * 5 + 40).toFixed(1),
        attentionWeights: +(Math.random() * 2 + 97).toFixed(1),
      }));
    }, 1800);
    const sEnd = setTimeout(() => {
      setPulseActive(false);
      setActiveStep(0);
    }, 3000);

    return () => {
      clearTimeout(s2);
      clearTimeout(s3);
      clearTimeout(s4);
      clearTimeout(sEnd);
    };
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        tokensPerSecond: +(40 + Math.sin(Date.now() / 2000) * 4).toFixed(1),
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-6 text-left">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 shadow-lg shadow-indigo-950/50">
            <Brain className={`w-6 h-6 ${pulseActive ? 'animate-pulse text-cyan-300' : ''}`} />
            {pulseActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Visualizador del Proceso Neuronal
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                {engineType === 'jev' ? 'JEV Engine v3.2 (Open-Source)' : 'VozDroid Core Engine'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Desglose en tiempo real de cómo la IA analiza la voz, razona y decide si ejecutar comandos o dialogar
            </p>
          </div>
        </div>

        <button
          onClick={triggerSimulation}
          disabled={pulseActive}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-white">
            {pulseActive ? 'Analizando Pulso...' : 'Simular Pensamiento'}
          </span>
        </button>
      </div>

      {/* Live Telemetry Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Velocidad Inferencia</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {telemetry.tokensPerSecond} <span className="text-xs text-slate-500 font-normal">t/s</span>
          </div>
          <span className="text-[10px] text-emerald-400">100% en dispositivo</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Latencia de Decisión</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {telemetry.latencyMs} <span className="text-xs text-slate-500 font-normal">ms</span>
          </div>
          <span className="text-[10px] text-cyan-400">Tiempo real sin lag</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Confianza Semántica</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {telemetry.confidenceScore}%
          </div>
          <span className="text-[10px] text-slate-400">Cero falsos positivos</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>Presión en RAM</span>
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white font-mono">
            {telemetry.memoryPressure}
          </div>
          <span className="text-[10px] text-purple-400">Consumo ultraligero</span>
        </div>
      </div>

      {/* Interactive Thinking Pipeline Stages */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Fases de Razonamiento del Núcleo ZANNA
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((step) => {
            const isCurrent = activeStep === step.num;
            return (
              <div
                key={step.num}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-cyan-500 bg-slate-900 shadow-lg shadow-cyan-500/15 scale-[1.01]'
                    : `${step.borderColor} ${step.bgColor}`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold font-mono text-white border border-slate-700">
                      {step.num}
                    </span>
                    <span className={`text-xs font-bold ${step.color}`}>{step.title}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      isCurrent
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isCurrent ? '⚡ Ejecutando' : step.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Neural Signal Flow */}
      <div className="p-4 rounded-3xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Flujo de Decisión: Conversación Libre vs Órdenes de Teléfono
          </span>
          <span className="text-[10px] text-emerald-400">Modo Jarvis Activo</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="text-slate-600">01</span>
            <span>Entrada del usuario recibida por reconocimiento nativo continuo.</span>
          </div>
          <div className="flex items-center gap-2 text-purple-300">
            <span className="text-slate-600">02</span>
            <span>¿Contiene verbos de acción ("enciende", "pausa", "llama", "sube")?</span>
          </div>
          <div className="pl-6 border-l border-slate-800 space-y-1.5 text-[10px]">
            <p className="text-amber-300">
              ➜ <span className="font-bold">SI:</span> Enruta a NativeBridge (Bluetooth/Linterna/Música/Llamada). Cero demora.
            </p>
            <p className="text-emerald-300">
              ➜ <span className="font-bold">NO:</span> Enruta a Diálogo Jarvis (Razonamiento, respuestas inteligentes, compañía y análisis).
            </p>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="text-slate-600">03</span>
            <span>Resultado emitido por voz TTS nativa y registrado limpiamente en el historial.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
