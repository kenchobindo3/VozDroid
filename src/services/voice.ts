// Resilient Offline-First Voice & Audio Spectrum Service for Android & Web
// Features: Real-time FFT Audio Spectrum, Conflict-Free Mic Management,
// Fresh SpeechRecognition instantiation, Barge-In, Gender Selection & Natural TTS

import { VoiceGender, ListeningMode, SpeechPlaybackState } from '../types';

export interface SpeechRecognitionResultCallback {
  (transcript: string, isFinal: boolean): void;
}

export type VoiceLogCategory = 'Init' | 'Permissions' | 'Engine' | 'Language' | 'Audio';
export type VoiceLogLevel = 'info' | 'warn' | 'error' | 'success';

export interface VoiceLogEntry {
  id: string;
  timestamp: string;
  category: VoiceLogCategory;
  level: VoiceLogLevel;
  message: string;
  details?: any;
}

export type ErrorOrigin = 'permissions' | 'engine' | 'language' | 'audio_hardware' | 'network' | 'none';

export interface ErrorOriginReport {
  origin: ErrorOrigin;
  badge: string;
  title: string;
  description: string;
  technicalDetails: string;
  recommendations: string[];
  rawError?: any;
}

export interface VoiceDiagnosticInfo {
  speechRecognitionSupported: boolean;
  speechSynthesisSupported: boolean;
  recognitionEngineName: string;
  micPermission: 'granted' | 'prompt' | 'denied' | 'unknown';
  availableVoicesCount: number;
  isListening: boolean;
  lastError: string | null;
  activeLanguage: string;
  systemLanguage: string;
  systemLanguages: string[];
  errorOriginReport: ErrorOriginReport | null;
  logsCount: number;
}

export type SpectrumDataCallback = (volume: number, freqArray: Uint8Array, peakDb: number) => void;

class VoiceService {
  private recognition: any = null;
  private isRecognizing: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private spectrumCallback: SpectrumDataCallback | null = null;
  private animationFrameId: number | null = null;
  private listeningMode: ListeningMode = 'push_to_talk';
  private listeningTimerId: any = null;
  private currentLanguage: string = 'es-ES';
  private playbackState: SpeechPlaybackState = 'idle';
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private onPlaybackStateChange: ((state: SpeechPlaybackState) => void) | null = null;
  private bargeInCallback: (() => void) | null = null;
  private bargeInEnabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeResultCallback: SpeechRecognitionResultCallback | null = null;
  private activeErrorCallback: ((err: any) => void) | null = null;
  private activeEndCallback: (() => void) | null = null;
  private lastError: string | null = null;
  private lastRawError: any = null;
  private lastErrorOrigin: ErrorOrigin = 'none';
  private silenceTimer: any = null;
  private lastInterimText: string = '';
  private pendingTranscript: string = '';
  private lastDispatchedFinalText: string = '';
  private isMobileAndroid: boolean = false;
  private speechDataReceivedInSession: boolean = false;
  private micPermissionState: 'granted' | 'prompt' | 'denied' | 'unknown' = 'unknown';
  private isSoundActive: boolean = false;
  private isSpeechActive: boolean = false;
  private lastSpeechActivityTimestamp: number = 0;

  // Rolling diagnostic in-memory logs
  private logs: VoiceLogEntry[] = [];
  private logListeners: Set<(logs: VoiceLogEntry[]) => void> = new Set();

  constructor() {
    this.addLog('Init', 'info', 'Iniciando VoiceService para Android & Web...');
    this.detectEnvironment();
    this.initMicrophonePermissions();
    this.initVoices();
  }

  // --- LOGGING ENGINE WITH STYLED DEVTOOLS OUTPUT ---
  private addLog(category: VoiceLogCategory, level: VoiceLogLevel, message: string, details?: any) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    
    const entry: VoiceLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      category,
      level,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > 100) {
      this.logs.pop();
    }

    // Color-coded console logging for instant developer insight
    const colorMap: Record<VoiceLogCategory, string> = {
      Init: '#0284c7', // Sky
      Permissions: '#f59e0b', // Amber
      Engine: '#9333ea', // Purple
      Language: '#059669', // Emerald
      Audio: '#2563eb', // Blue
    };

    const stylePrefix = `color: #ffffff; background: ${colorMap[category] || '#475569'}; padding: 2px 6px; border-radius: 4px; font-weight: bold;`;
    const styleMsg =
      level === 'error'
        ? 'color: #ef4444; font-weight: bold;'
        : level === 'warn'
        ? 'color: #f59e0b; font-weight: 500;'
        : level === 'success'
        ? 'color: #10b981; font-weight: 500;'
        : 'color: #94a3b8;';

    const logPrefix = `%c[VoiceService:${category}]%c ${message}`;
    if (level === 'error') {
      console.error(logPrefix, stylePrefix, styleMsg, details !== undefined ? details : '');
    } else if (level === 'warn') {
      console.warn(logPrefix, stylePrefix, styleMsg, details !== undefined ? details : '');
    } else {
      console.log(logPrefix, stylePrefix, styleMsg, details !== undefined ? details : '');
    }

    // Notify UI subscribers
    this.logListeners.forEach((listener) => {
      try {
        listener([...this.logs]);
      } catch (_) {}
    });
  }

  public getLogs(): VoiceLogEntry[] {
    return [...this.logs];
  }

  public subscribeLogs(listener: (logs: VoiceLogEntry[]) => void): () => void {
    this.logListeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.logListeners.delete(listener);
    };
  }

  public clearLogs(): void {
    this.logs = [];
    this.addLog('Init', 'info', 'Historial de logs de voz reiniciado.');
  }

  // --- ENVIRONMENT & PERMISSIONS PROBING ---
  private detectEnvironment() {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    this.isMobileAndroid = /android/i.test(ua);

    this.addLog('Init', 'info', `Entorno detectado: ${this.isMobileAndroid ? 'Android Móvil' : 'Escritorio / Web'} | Online: ${navigator.onLine}`, {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isOnline: navigator.onLine,
    });

    // Detect browser Speech Recognition availability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const engineName = (window as any).SpeechRecognition
        ? 'window.SpeechRecognition (W3C Standard)'
        : 'window.webkitSpeechRecognition (Blink/Chromium)';
      this.addLog('Engine', 'success', `Motor de reconocimiento disponible: ${engineName}`);
    } else {
      this.addLog(
        'Engine',
        'error',
        '❌ ORIGEN MOTOR: Web Speech API no está soportada por este navegador (requiere Chromium / Chrome en Android).',
        { userAgent: navigator.userAgent }
      );
    }

    // Auto-detect & log language configuration for Spanish (es-ES and variants)
    const sysLang = navigator.language || 'es-ES';
    const sysLangs = navigator.languages ? Array.from(navigator.languages) : [sysLang];

    this.addLog(
      'Language',
      'info',
      `Configuración de idioma detectada: Idioma primario="${sysLang}", Lista aceptada=[${sysLangs.join(', ')}]`,
      { systemLanguage: sysLang, acceptedLanguages: sysLangs }
    );

    // Initial preference: If device is in Spanish dialect (e.g. es-419, es-MX, es-AR), keep it, otherwise default to es-ES
    if (sysLang.toLowerCase().startsWith('es')) {
      this.currentLanguage = sysLang;
    } else {
      this.currentLanguage = 'es-ES';
    }

    this.addLog(
      'Language',
      'info',
      `Idioma activo seleccionado para reconocimiento de voz: "${this.currentLanguage}"`
    );
  }

  private async initMicrophonePermissions() {
    if (typeof window === 'undefined' || !navigator.permissions?.query) {
      this.addLog('Permissions', 'info', 'API navigator.permissions.query no disponible; verificación se hará en getUserMedia.');
      return;
    }

    try {
      this.addLog('Permissions', 'info', 'Consultando estado de permisos de micrófono con Permissions API...');
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      this.micPermissionState = status.state as any;

      if (status.state === 'granted') {
        this.addLog('Permissions', 'success', 'Permiso de micrófono: CONCEDIDO (granted).');
      } else if (status.state === 'prompt') {
        this.addLog('Permissions', 'info', 'Permiso de micrófono: PENDIENTE DE SOLICITUD (prompt). El navegador pedirá confirmación al pulsar hablar.');
      } else if (status.state === 'denied') {
        this.addLog('Permissions', 'error', '❌ ORIGEN PERMISOS: Permiso de micrófono DENEGADO (denied). El usuario o el sistema bloquearon el acceso.');
        this.lastErrorOrigin = 'permissions';
      }

      status.onchange = () => {
        this.micPermissionState = status.state as any;
        this.addLog(
          'Permissions',
          status.state === 'granted' ? 'success' : status.state === 'denied' ? 'error' : 'info',
          `Cambio en el estado del permiso de micrófono: ${status.state}`
        );
      };
    } catch (e: any) {
      this.addLog('Permissions', 'warn', `No se pudo consultar el permiso vía Permissions API: ${e.message || e}`);
    }
  }

  public async checkMicrophonePermission(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
    if (typeof window === 'undefined') return 'unknown';

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.micPermissionState = status.state as any;
        this.addLog('Permissions', 'info', `Verificación directa de permisos: ${status.state}`);
        return status.state as any;
      } catch (_) {}
    }

    if (this.micStream && this.micStream.active) {
      return 'granted';
    }

    return this.micPermissionState;
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.addLog('Init', 'warn', 'SpeechSynthesis (TTS) no está disponible en este navegador.');
      return;
    }

    const loadVoices = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          this.cachedVoices = v;
          const spanishVoices = v.filter(
            (item) => item.lang.toLowerCase().startsWith('es') || item.lang.toLowerCase().startsWith('spa')
          );
          this.addLog(
            'Init',
            'info',
            `Voces TTS cargadas: ${v.length} en total (${spanishVoices.length} en español).`
          );
        }
      } catch (e) {
        console.warn('Error loading speech voices:', e);
      }
    };

    loadVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  public setPlaybackStateListener(cb: (state: SpeechPlaybackState) => void) {
    this.onPlaybackStateChange = cb;
  }

  public setBargeInListener(cb: () => void) {
    this.bargeInCallback = cb;
  }

  public setBargeInEnabled(enabled: boolean) {
    this.bargeInEnabled = enabled;
  }

  private updatePlaybackState(state: SpeechPlaybackState) {
    this.playbackState = state;
    this.onPlaybackStateChange?.(state);
  }

  public getPlaybackState(): SpeechPlaybackState {
    return this.playbackState;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public clearLastError() {
    this.lastError = null;
    this.lastRawError = null;
    this.lastErrorOrigin = 'none';
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public setLanguage(lang: string) {
    const prevLang = this.currentLanguage;
    this.currentLanguage = lang;
    this.addLog(
      'Language',
      'info',
      `Idioma de reconocimiento cambiado de "${prevLang}" a "${lang}".`
    );
    if (this.recognition) {
      try {
        this.recognition.lang = lang;
      } catch (_) {}
    }
  }

  public isSpeechSupported(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  // --- AUDIO SPECTRUM ENGINE (Conflict-Free Reactive Spectrum for Android & Web) ---
  public async startAudioVisualizer(onData: SpectrumDataCallback): Promise<boolean> {
    this.spectrumCallback = onData;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const bufferLength = 32;
    const dataArray = new Uint8Array(bufferLength);

    const renderLoop = () => {
      if (!this.spectrumCallback) return;

      const now = performance.now();
      const t = now / 220;
      const recentSpeechDelta = Date.now() - this.lastSpeechActivityTimestamp;
      const isActivelySpeaking = this.isSpeechActive || recentSpeechDelta < 850;

      let volume = 0.06;
      let peakDb = 12;

      if (this.playbackState === 'speaking') {
        // Speech synthesis playback visualization wave
        volume = 0.45 + Math.sin(t * 1.5) * 0.22 + Math.cos(t * 0.8) * 0.14;
        peakDb = Math.round(volume * 100);
        for (let i = 0; i < bufferLength; i++) {
          const form = Math.sin(t * 2 + i * 0.35) * 0.5 + 0.5;
          dataArray[i] = Math.max(10, Math.min(255, Math.floor(form * volume * 240 + 20)));
        }
      } else if (isActivelySpeaking) {
        // Active human speech detected in input
        const vocalFlutter = Math.sin(t * 3.2) * 0.14 + Math.cos(t * 1.7) * 0.12;
        volume = Math.max(0.32, Math.min(0.95, 0.56 + vocalFlutter));
        peakDb = Math.round(volume * 95);
        for (let i = 0; i < bufferLength; i++) {
          const formantPeak = 1 - Math.abs(i - 12) / 16;
          const harmonic = Math.sin(t * 2.8 + i * 0.42) * 0.4 + 0.6;
          dataArray[i] = Math.max(15, Math.min(255, Math.floor(harmonic * formantPeak * volume * 255 + 25)));
        }
      } else if (this.isSoundActive) {
        // Ambient room sound detected
        volume = 0.18 + Math.sin(t) * 0.08;
        peakDb = Math.round(volume * 80);
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(8, Math.min(100, Math.floor(Math.sin(t + i * 0.5) * 30 + 35)));
        }
      } else if (this.isRecognizing) {
        // Listening for wake word or voice command (gentle ripple)
        volume = 0.08 + Math.sin(t * 0.8) * 0.03;
        peakDb = Math.round(volume * 70);
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(6, Math.min(60, Math.floor(Math.sin(t * 0.6 + i * 0.3) * 16 + 18)));
        }
      } else {
        // Idle floor
        for (let i = 0; i < bufferLength; i++) dataArray[i] = 4;
        volume = 0.04;
        peakDb = 8;
      }

      this.spectrumCallback(volume, dataArray, peakDb);
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = requestAnimationFrame(renderLoop);
    return true;
  }

  public stopAudioVisualizer(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.spectrumCallback = null;
  }

  public releaseMicStream(): void {
    this.stopAudioVisualizer();
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (_) {}
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // --- RECOGNITION CREATION & FULL EVENT LISTENERS INSTRUMENTATION ---
  private createFreshRecognition(): any {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.lastError = 'Web Speech API no está soportada por este navegador. Requiere Chrome en Android o Chromium.';
      this.lastErrorOrigin = 'engine';
      this.addLog(
        'Engine',
        'error',
        '❌ ORIGEN MOTOR: SpeechRecognition / webkitSpeechRecognition no existe en este navegador.'
      );
      return null;
    }

    // Clean up previous instance cleanly
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onaudiostart = null;
        this.recognition.onsoundstart = null;
        this.recognition.onspeechstart = null;
        this.recognition.onspeechend = null;
        this.recognition.onsoundend = null;
        this.recognition.onaudioend = null;
        this.recognition.onnomatch = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (_) {}
      this.recognition = null;
    }

    try {
      const rec = new SpeechRecognition();
      // On mobile Android, continuous = false prevents audio pipeline freeze
      rec.continuous = !this.isMobileAndroid;
      rec.interimResults = true;
      rec.lang = this.currentLanguage;
      rec.maxAlternatives = 1;

      this.addLog(
        'Engine',
        'info',
        `Nueva instancia SpeechRecognition creada. Configuración: lang="${rec.lang}", continuous=${rec.continuous}, interimResults=${rec.interimResults}`
      );

      // --- 1. rec.onstart ---
      rec.onstart = () => {
        this.isRecognizing = true;
        this.lastError = null;
        this.lastErrorOrigin = 'none';
        this.speechDataReceivedInSession = false;
        this.addLog('Engine', 'success', '▶ Evento onstart: Sesión de reconocimiento iniciada correctamente.');
      };

      // --- 2. rec.onaudiostart ---
      rec.onaudiostart = () => {
        this.addLog('Audio', 'info', '▶ Evento onaudiostart: El motor del navegador comenzó a capturar audio del micrófono.');
      };

      // --- 3. rec.onsoundstart ---
      rec.onsoundstart = () => {
        this.isSoundActive = true;
        this.lastSpeechActivityTimestamp = Date.now();
        this.addLog('Audio', 'info', '▶ Evento onsoundstart: Sonido detectado en la línea de entrada.');
      };

      // --- 4. rec.onspeechstart ---
      rec.onspeechstart = () => {
        this.isSpeechActive = true;
        this.isSoundActive = true;
        this.lastSpeechActivityTimestamp = Date.now();
        this.addLog('Engine', 'success', '🎤 Evento onspeechstart: ¡Voz humana identificada por el motor de reconocimiento!');

        // Barge-In: If user speaks while assistant is talking, immediately interrupt TTS
        if (this.bargeInEnabled && this.playbackState === 'speaking') {
          this.addLog('Audio', 'info', 'Barge-In detectado: voz del usuario identificada. Deteniendo síntesis.');
          this.stopSpeaking();
          this.bargeInCallback?.();
        }
      };

      // --- 5. rec.onspeechend ---
      rec.onspeechend = () => {
        this.isSpeechActive = false;
        this.addLog('Engine', 'info', '⏹ Evento onspeechend: La voz humana detectada ha terminado.');
        // If speech was captured in interim, auto-flush it after a brief pause so command is emitted
        if (this.pendingTranscript) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            this.flushPendingTranscript();
          }, 350);
        }
      };

      // --- 6. rec.onsoundend ---
      rec.onsoundend = () => {
        this.isSoundActive = false;
        this.addLog('Audio', 'info', '⏹ Evento onsoundend: Sonido cesado en la línea de entrada.');
      };

      // --- 7. rec.onaudioend ---
      rec.onaudioend = () => {
        this.isSoundActive = false;
        this.isSpeechActive = false;
        this.addLog('Audio', 'info', '⏹ Evento onaudioend: Captura de audio finalizada por el motor.');
      };

      // --- 8. rec.onnomatch ---
      rec.onnomatch = () => {
        this.addLog(
          'Engine',
          'warn',
          '⚠️ Evento onnomatch: El motor captó sonido/habla pero no pudo asociarlo a palabras en el vocabulario.'
        );
      };

      // --- 9. rec.onresult ---
      rec.onresult = (event: any) => {
        this.speechDataReceivedInSession = true;
        this.lastSpeechActivityTimestamp = Date.now();

        // Barge-In check on text arrival
        if (this.bargeInEnabled && this.playbackState === 'speaking') {
          this.stopSpeaking();
          this.bargeInCallback?.();
        }

        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result[0].confidence) {
            confidence = Math.round(result[0].confidence * 100);
          }
          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const trimmedFinal = finalTranscript.trim();
        const trimmedInterim = interimTranscript.trim();

        if (trimmedFinal) {
          this.addLog(
            'Engine',
            'success',
            `💬 Evento onresult [FINAL]: "${trimmedFinal}" (Confianza: ${confidence > 0 ? `${confidence}%` : 'N/A'})`
          );
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
          this.pendingTranscript = '';
          this.lastInterimText = '';
          this.lastDispatchedFinalText = trimmedFinal;
          this.activeResultCallback?.(trimmedFinal, true);
        } else if (trimmedInterim) {
          this.lastInterimText = trimmedInterim;
          this.pendingTranscript = trimmedInterim;
          this.addLog(
            'Engine',
            'info',
            `💬 Evento onresult [INTERIM]: "${trimmedInterim}"`
          );
          this.activeResultCallback?.(trimmedInterim, false);

          // Android safeguard & natural voice pause:
          // In Android Chrome, isFinal is often never sent. After 700ms of silence, auto-flush and emit!
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            this.flushPendingTranscript();
          }, 700);
        }
      };

      // --- 10. rec.onerror (DEEP DIAGNOSTICS & ORIGIN IDENTIFICATION) ---
      rec.onerror = (event: any) => {
        const errType = event?.error;
        const errMsg = event?.message || '';
        this.lastRawError = event;

        this.addLog('Engine', 'warn', `Evento onerror emitido por SpeechRecognition: error="${errType}" message="${errMsg}"`, event);

        if (errType === 'no-speech') {
          // Normal pause in speaking, do not count as fatal system error
          this.addLog('Engine', 'info', 'Aviso no-speech: No se detectó habla durante la ventana de tiempo.');
          return;
        }

        if (errType === 'aborted') {
          this.addLog('Engine', 'info', 'Aviso aborted: Reconocimiento detenido por el usuario o ciclo del sistema.');
          return;
        }

        // --- ORIGIN 1: MICROPHONE PERMISSIONS ---
        if (errType === 'not-allowed') {
          this.lastErrorOrigin = 'permissions';
          this.micPermissionState = 'denied';
          this.lastError = 'Permiso de micrófono bloqueado. Debes habilitar el permiso de micrófono en tu navegador o ajustes del teléfono.';
          this.addLog(
            'Permissions',
            'error',
            '❌ ORIGEN PERMISOS IDENTIFICADO: error="not-allowed". El usuario o el navegador denegaron el acceso al micrófono para Web Speech API.'
          );
        }
        // --- ORIGIN 2: BROWSER'S SPEECH RECOGNITION ENGINE ---
        else if (errType === 'service-not-allowed') {
          this.lastErrorOrigin = 'engine';
          this.lastError = 'El servicio de reconocimiento de voz del navegador está deshabilitado por política o no está instalado en este sistema.';
          this.addLog(
            'Engine',
            'error',
            '❌ ORIGEN MOTOR IDENTIFICADO: error="service-not-allowed". La plataforma deshabilitó el servicio de voz (ej. política corporativa o Android sin servicios de Google).'
          );
        } else if (errType === 'audio-capture') {
          this.lastErrorOrigin = 'audio_hardware';
          this.lastError = 'Conflicto de captura de audio. El micrófono no puede ser compartido o está bloqueado por el sistema.';
          this.addLog(
            'Audio',
            'error',
            '❌ ORIGEN AUDIO/HARDWARE IDENTIFICADO: error="audio-capture". Conflicto de hardware en la captura de audio.'
          );
          this.releaseMicStream();
        }
        // --- ORIGIN 3: LANGUAGE CONFIGURATION FOR SPANISH (es-ES) ---
        else if (errType === 'language-not-supported') {
          this.lastErrorOrigin = 'language';
          this.lastError = `El idioma configurado "${this.currentLanguage}" no está soportado por el motor de voz de tu dispositivo.`;
          this.addLog(
            'Language',
            'error',
            `❌ ORIGEN IDIOMA IDENTIFICADO: error="language-not-supported". El motor de voz no soporta "${this.currentLanguage}".`,
            { targetLang: this.currentLanguage, systemLang: navigator.language }
          );

          // Graceful fallback: If es-ES is not supported, try system language or es-419
          this.attemptLanguageFallback();
        } else if (errType === 'network') {
          // On Android Chrome, error: "network" is frequently caused by Google Speech Services
          // attempting to download the "es-ES" pack when the device is set to "es-419" or offline!
          if (this.currentLanguage === 'es-ES' && navigator.language && !navigator.language.toLowerCase().includes('es-es')) {
            this.lastErrorOrigin = 'language';
            this.lastError = `Error de red con "es-ES". Tu teléfono usa "${navigator.language}". Android necesita internet para descargar es-ES si no tienes el paquete de voz offline.`;
            this.addLog(
              'Language',
              'warn',
              `⚠️ ORIGEN IDIOMA / RED: Dispositivo en "${navigator.language}" intentando reconocimiento con "es-ES". En Android offline esto provoca error "network".`,
              { currentLanguage: this.currentLanguage, systemLang: navigator.language }
            );
            // Attempt fallback to system dialect
            this.attemptLanguageFallback();
          } else {
            this.lastErrorOrigin = 'network';
            this.lastError = 'Error de red: El motor de voz de Google necesita conexión o paquete de idioma offline en Android.';
            this.addLog(
              'Engine',
              'error',
              '❌ ORIGEN RED/MOTOR IDENTIFICADO: error="network". Google Speech Recognition requiere conexión o descarga de modelo offline.'
            );
          }
        } else {
          this.lastErrorOrigin = 'engine';
          this.lastError = `Aviso del motor de voz: ${errType}`;
          this.addLog('Engine', 'warn', `Aviso de reconocimiento no tipificado: "${errType}"`);
        }

        this.activeErrorCallback?.(event);
      };

      // --- 11. rec.onend ---
      rec.onend = () => {
        this.isRecognizing = false;
        this.addLog(
          'Engine',
          'info',
          `⏹ Evento onend: Sesión de reconocimiento finalizada. (Datos de voz recibidos en sesión: ${this.speechDataReceivedInSession})`
        );

        // ZERO-LOSS SAFEGUARD: If speech was captured in interim but Android/Google closed session without isFinal,
        // auto-flush immediately so the voice command is emitted and executed!
        this.flushPendingTranscript();

        // If in Always-On mode, restart loop
        if (this.listeningMode === 'always_on_gemini') {
          setTimeout(() => {
            if (this.listeningMode === 'always_on_gemini') {
              this.safeStartRecognition();
            } else {
              this.activeEndCallback?.();
            }
          }, 250);
        } else {
          this.activeEndCallback?.();
        }
      };

      this.recognition = rec;
      return rec;
    } catch (e: any) {
      this.lastError = 'No se pudo inicializar el motor de voz del sistema.';
      this.lastErrorOrigin = 'engine';
      this.addLog('Engine', 'error', `Excepción al instanciar SpeechRecognition: ${e.message || e}`, e);
      return null;
    }
  }

  // --- LANGUAGE FALLBACK ENGINE ---
  private attemptLanguageFallback() {
    const candidates = [navigator.language, 'es-419', 'es-MX', 'es-US', 'es'];
    const nextCandidate = candidates.find(
      (c) => c && c.toLowerCase().startsWith('es') && c !== this.currentLanguage
    );

    if (nextCandidate) {
      this.addLog(
        'Language',
        'info',
        `Intentando alternar automáticamente de "${this.currentLanguage}" al dialecto compatible "${nextCandidate}"...`
      );
      this.currentLanguage = nextCandidate;
    }
  }

  private safeStartRecognition(): boolean {
    const rec = this.createFreshRecognition();
    if (!rec) return false;

    try {
      this.addLog('Engine', 'info', `Llamando a rec.start() con idioma="${rec.lang}"...`);
      rec.start();
      this.isRecognizing = true;
      return true;
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        this.addLog('Engine', 'warn', 'rec.start() avisó InvalidStateError (ya estaba escuchando).');
        this.isRecognizing = true;
        return true;
      }
      this.lastError = `No se pudo iniciar la escucha: ${e.message || 'error'}`;
      this.lastErrorOrigin = 'engine';
      this.addLog('Engine', 'error', `Excepción en rec.start(): ${e.message || e}`, e);
      return false;
    }
  }

  // --- FLUSH PENDING INTERIM SPEECH (GUARANTEES NO LOST WORDS) ---
  public flushPendingTranscript(): string | null {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const textToEmit = (this.pendingTranscript || this.lastInterimText || '').trim();
    if (textToEmit && textToEmit !== this.lastDispatchedFinalText) {
      this.addLog(
        'Engine',
        'success',
        `🚀 Emisión forzada/inmediata de comando de voz: "${textToEmit}"`
      );
      this.lastDispatchedFinalText = textToEmit;
      this.pendingTranscript = '';
      this.lastInterimText = '';
      this.activeResultCallback?.(textToEmit, true);
      return textToEmit;
    }
    return null;
  }

  public getLastCapturedText(): string {
    return (this.pendingTranscript || this.lastInterimText || '').trim();
  }

  public resetPermissionStatus() {
    this.micPermissionState = 'prompt';
    this.lastError = null;
    this.lastRawError = null;
    this.lastErrorOrigin = 'none';
  }

  // --- START / STOP LISTENING ---
  public async startListening(
    onResult: SpeechRecognitionResultCallback,
    onError: (err: any) => void,
    onEnd: () => void,
    options: {
      mode?: ListeningMode;
      durationSeconds?: number;
    } = {}
  ): Promise<boolean> {
    this.listeningMode = options.mode || 'push_to_talk';
    this.activeResultCallback = onResult;
    this.activeErrorCallback = onError;
    this.activeEndCallback = onEnd;
    this.lastError = null;
    this.lastErrorOrigin = 'none';
    this.pendingTranscript = '';
    this.lastDispatchedFinalText = '';
    this.lastInterimText = '';

    this.addLog(
      'Engine',
      'info',
      `Iniciando escucha activa en modo="${this.listeningMode}" duración=${options.durationSeconds || 'inf'}s...`
    );

    if (!this.isSpeechSupported()) {
      const err = new Error('El navegador no soporta Web Speech API.');
      this.lastErrorOrigin = 'engine';
      this.addLog('Engine', 'error', 'Intento de escucha abortado: Web Speech API no soportada.');
      onError(err);
      return false;
    }

    // Stop previous timer if any
    if (this.listeningTimerId) {
      clearTimeout(this.listeningTimerId);
      this.listeningTimerId = null;
    }

    // Set timed window if requested
    if (this.listeningMode === 'timed' && options.durationSeconds && options.durationSeconds > 0) {
      this.listeningTimerId = setTimeout(() => {
        this.addLog('Engine', 'info', `Temporizador de ventana (${options.durationSeconds}s) expirado. Deteniendo escucha.`);
        this.stopListening();
      }, options.durationSeconds * 1000);
    }

    return this.safeStartRecognition();
  }

  public stopListening(commitPending: boolean = true): string | null {
    this.addLog('Engine', 'info', `Deteniendo escucha activa (commitPending=${commitPending})...`);
    let flushedText: string | null = null;
    if (commitPending) {
      flushedText = this.flushPendingTranscript();
    }

    if (this.listeningTimerId) {
      clearTimeout(this.listeningTimerId);
      this.listeningTimerId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.isRecognizing = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }

    return flushedText;
  }

  public resetVoiceEngine() {
    this.addLog('Init', 'warn', 'Reiniciando motor de voz, streams de audio y listeners...');
    this.stopListening(false);
    this.releaseMicStream();
    this.lastError = null;
    this.lastRawError = null;
    this.lastErrorOrigin = 'none';
    this.micPermissionState = 'prompt';
    this.speechDataReceivedInSession = false;
  }

  public getIsRecognizing(): boolean {
    return this.isRecognizing;
  }

  public simulateVoiceInput(transcript: string) {
    this.addLog('Engine', 'info', `Simulando entrada de voz: "${transcript}"`);
    if (this.activeResultCallback) {
      this.activeResultCallback(transcript, true);
    }
  }

  // --- ERROR ORIGIN REPORT & DIAGNOSTIC INSPECTOR ---
  public diagnoseErrorOrigin(): ErrorOriginReport {
    const raw = this.lastRawError;
    const errType = raw?.error || '';
    const sysLang = typeof navigator !== 'undefined' ? navigator.language : 'es-ES';

    // 1. Microphone Permissions Origin
    if (this.lastErrorOrigin === 'permissions' || errType === 'not-allowed' || this.micPermissionState === 'denied') {
      return {
        origin: 'permissions',
        badge: 'ORIGEN: PERMISOS DEL MICRÓFONO',
        title: 'Acceso al Micrófono Bloqueado o Denegado',
        description:
          'El navegador o el sistema operativo Android impidieron que la aplicación acceda al micrófono. La API Web Speech no puede capturar audio sin permisos explícitos.',
        technicalDetails: `Código: "${errType || 'NotAllowedError'}". Estado del permiso en navigator.permissions: "${this.micPermissionState}".`,
        recommendations: [
          'Toca el icono del candado o ajustes en la barra de direcciones de tu navegador.',
          'Selecciona "Permisos" o "Configuración del sitio" y cambia el Micrófono a "Permitir".',
          'En Android: Ve a Ajustes del Teléfono > Aplicaciones > Chrome > Permisos > Micrófono > Permitir solo con la app en uso.',
          'Reinicia el motor de voz con el botón Reintentar.',
        ],
        rawError: raw,
      };
    }

    // 2. Language Configuration for Spanish (es-ES) Origin
    if (
      this.lastErrorOrigin === 'language' ||
      errType === 'language-not-supported' ||
      (errType === 'network' && this.currentLanguage === 'es-ES' && !sysLang.toLowerCase().includes('es-es'))
    ) {
      return {
        origin: 'language',
        badge: 'ORIGEN: CONFIGURACIÓN DE IDIOMA (es-ES)',
        title: 'Incompatibilidad o Falta del Paquete de Idioma (es-ES)',
        description:
          `El reconocimiento se configuró para "${this.currentLanguage}", pero tu dispositivo tiene configurado "${sysLang}". En Android, si estás desconectado o tu teléfono no tiene descargado el paquete de voz de España (es-ES), Google Speech Services genera un error de red o de idioma no soportado.`,
        technicalDetails: `Idioma solicitado: "${this.currentLanguage}". Idioma del sistema: "${sysLang}". Idiomas aceptados: ${JSON.stringify(typeof navigator !== 'undefined' ? navigator.languages : [])}. Código error: "${errType}".`,
        recommendations: [
          `Cambia el dialecto a "${sysLang}" o "es-419 (Latinoamérica)" en los selectores de idioma más abajo.`,
          'En Android: Ve a Ajustes > Sistema > Idiomas e introducción de texto > Salida de síntesis de voz > Motor preferido (icono engranaje) > Instalar datos de voz > Español (España o Latinoamérica).',
          'Descarga el paquete "Reconocimiento de voz sin conexión" en los ajustes de la aplicación Google de tu teléfono.',
        ],
        rawError: raw,
      };
    }

    // 3. Audio Hardware / Conflict Origin
    if (this.lastErrorOrigin === 'audio_hardware' || errType === 'audio-capture') {
      return {
        origin: 'audio_hardware',
        badge: 'ORIGEN: HARDWARE / CONFLICTO DE AUDIO',
        title: 'El Micrófono está Ocupado o no Responde',
        description:
          'El hardware de audio del dispositivo no pudo abrir el canal de entrada. Ocurre cuando otra app (ej. WhatsApp, llamada telefónica, grabadora) tiene tomado el micrófono.',
        technicalDetails: `Código: "${errType || 'audio-capture'}". Pistas de stream activas: ${this.micStream ? this.micStream.getAudioTracks().length : 0}.`,
        recommendations: [
          'Cierra aplicaciones en segundo plano que puedan estar utilizando el micrófono (grabadoras, llamadas, etc.).',
          'Pulsa "Reiniciar motor de voz" para cerrar y recrear el canal de audio.',
          'Comprueba que ningún auricular Bluetooth esté en modo llamada con el micrófono congelado.',
        ],
        rawError: raw,
      };
    }

    // 4. Browser's Speech Recognition Engine Origin
    if (this.lastErrorOrigin === 'engine' || errType === 'service-not-allowed' || !this.isSpeechSupported()) {
      return {
        origin: 'engine',
        badge: 'ORIGEN: MOTOR DEL NAVEGADOR (SpeechRecognition)',
        title: 'Limitación en el Motor de Voz del Navegador',
        description:
          !this.isSpeechSupported()
            ? 'Este navegador no incluye el motor Web Speech API (típico en navegadores como Firefox estándar o webviews de terceros).'
            : 'El servicio de reconocimiento de voz del navegador no fue permitido por la plataforma o requiere la app de Google en Android.',
        technicalDetails: `SpeechRecognition disponible: ${this.isSpeechSupported()}. Error: "${errType || 'unsupported'}". Navegador: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}.`,
        recommendations: [
          'Abre esta aplicación en Google Chrome oficial o Microsoft Edge en Android/Escritorio.',
          'Verifica que la app "Servicios de voz de Google" (Speech Services by Google) esté activada y actualizada en Google Play Store.',
          'Puedes usar la entrada de texto o los accesos directos de hardware si tu navegador no soporta voz.',
        ],
        rawError: raw,
      };
    }

    // 5. General Network / Google Server Origin
    if (errType === 'network') {
      return {
        origin: 'network',
        badge: 'ORIGEN: RED / SERVICIOS DE VOZ DE GOOGLE',
        title: 'Servidores de Voz No Accesibles sin Paquete Offline',
        description:
          'El motor de voz de Chrome intentó contactar con los servidores de Google para transcribir el audio pero falló la conexión y el dispositivo no cuenta con reconocimiento de voz offline.',
        technicalDetails: `Código: "network". Estado de red: ${typeof navigator !== 'undefined' && navigator.onLine ? 'Conectado a Internet' : 'Desconectado / Modo Avión'}.`,
        recommendations: [
          'Comprueba tu conexión a Wi-Fi o datos móviles si no tienes el paquete offline instalado.',
          'Para usar reconocimiento 100% sin internet: En tu teléfono Android abre Ajustes > Google > Ajustes de aplicaciones de Google > Búsqueda, Asistente y Voice > Voz > Reconocimiento de voz sin conexión > Pestaña "Todos" > Descarga "Español".',
        ],
        rawError: raw,
      };
    }

    // None
    return {
      origin: 'none',
      badge: 'SISTEMA NOMINAL',
      title: 'Motor de Voz Operativo',
      description: 'No se detectaron fallos críticos. El motor Web Speech API está preparado para recibir comandos.',
      technicalDetails: `Motor: Activo. Idioma: "${this.currentLanguage}". Permiso: "${this.micPermissionState}".`,
      recommendations: [
        'Pulsa el orbe o micrófono para hablar.',
        'Di con claridad cualquier comando, cálculo o instrucción.',
      ],
      rawError: null,
    };
  }

  public getDiagnosticInfo(): VoiceDiagnosticInfo {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    const engineName = SpeechRecognition
      ? (window as any).SpeechRecognition
        ? 'SpeechRecognition (W3C Standard)'
        : 'webkitSpeechRecognition (Blink/Chromium)'
      : 'No disponible';

    return {
      speechRecognitionSupported: this.isSpeechSupported(),
      speechSynthesisSupported: this.isSynthesisSupported(),
      recognitionEngineName: engineName,
      micPermission: this.micPermissionState,
      availableVoicesCount: this.getAvailableVoices().length,
      isListening: this.isRecognizing,
      lastError: this.lastError,
      activeLanguage: this.currentLanguage,
      systemLanguage: typeof navigator !== 'undefined' ? navigator.language : 'es-ES',
      systemLanguages: typeof navigator !== 'undefined' && navigator.languages ? Array.from(navigator.languages) : [],
      errorOriginReport: this.diagnoseErrorOrigin(),
      logsCount: this.logs.length,
    };
  }

  // --- OFFLINE SPEECH SYNTHESIS (TTS) ---
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSynthesisSupported()) return [];
    if (this.cachedVoices.length > 0) return this.cachedVoices;
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) {
      this.cachedVoices = v;
    }
    return this.cachedVoices;
  }

  public findVoiceByGender(gender: VoiceGender): {
    voice: SpeechSynthesisVoice | null;
    pitchAdjustment: number;
    rateAdjustment: number;
  } {
    const allVoices = this.getAvailableVoices();
    if (allVoices.length === 0) {
      return { voice: null, pitchAdjustment: 1.0, rateAdjustment: 1.0 };
    }

    const spanishVoices = allVoices.filter(
      (v) =>
        v.lang.toLowerCase().startsWith('es') ||
        v.lang.toLowerCase().startsWith('spa') ||
        v.name.toLowerCase().includes('spanish') ||
        v.name.toLowerCase().includes('español')
    );
    const candidateList = spanishVoices.length > 0 ? spanishVoices : allVoices;

    const femaleKeywords = [
      'sabina', 'dalia', 'monica', 'mónica', 'paulina', 'lucia', 'lucía',
      'helena', 'elena', 'laura', 'sofia', 'maría', 'maria', 'carmen', 'paloma',
      'camila', 'jimena', 'elvira', 'ana', 'female', 'mujer', 'zira',
    ];

    const maleKeywords = [
      'jorge', 'alvaro', 'álvaro', 'diego', 'carlos', 'enrique', 'pablo',
      'raul', 'raúl', 'david', 'alberto', 'miguel', 'gonzalo', 'mateo', 'male', 'hombre',
    ];

    const targetKeywords = gender === 'female' ? femaleKeywords : maleKeywords;

    // Advanced Neural & Natural Voice Scoring Engine:
    // Ranks voices to pick online natural/neural voices over old robotic synth voices
    const scoreVoice = (v: SpeechSynthesisVoice): number => {
      let score = 0;
      const name = v.name.toLowerCase();
      const uri = (v.voiceURI || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();

      // Highest quality: Natural / Neural online voices
      if (name.includes('natural') || uri.includes('natural')) score += 150;
      if (name.includes('neural') || uri.includes('neural')) score += 150;
      if (name.includes('online (natural)')) score += 80;
      if (name.includes('google')) score += 60;
      if (name.includes('mejorada') || name.includes('enhanced') || name.includes('premium')) score += 60;

      // Gender keyword match
      for (const kw of targetKeywords) {
        if (name.includes(kw) || uri.includes(kw)) {
          score += 45;
          break;
        }
      }

      // Spanish dialect priority
      if (lang.includes('es-es') || lang.includes('es-419') || lang.includes('es-mx') || lang.includes('es-us')) {
        score += 30;
      }

      // Heavily penalize robotic / harsh synthesizers
      if (name.includes('espeak') || uri.includes('espeak')) score -= 120;
      if (name.includes('compact') || uri.includes('compact')) score -= 50;
      if (name.includes('desktop') && !name.includes('natural')) score -= 30;

      return score;
    };

    const sortedCandidates = [...candidateList].sort((a, b) => scoreVoice(b) - scoreVoice(a));
    const selectedVoice = sortedCandidates[0] || null;

    // Human-like vocal prosody: Subtle pitch and rate tuning for natural cadence
    // avoiding the robotic "chipmunk" or mechanical monotone effect
    const pitchAdjustment = gender === 'female' ? 1.01 : 0.97;
    const rateAdjustment = 1.0;

    return {
      voice: selectedVoice,
      pitchAdjustment,
      rateAdjustment,
    };
  }

  public cleanTextForSpeech(text: string): string {
    return text
      // Code blocks & markdown
      .replace(/```[\s\S]*?```/g, 'Bloque de código.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/[*_~#]/g, '')
      .replace(/https?:\/\/\S+/g, 'enlace web')
      // Natural math & symbol pronunciation
      .replace(/\s*\+\s*/g, ' más ')
      .replace(/\s*-\s*/g, ' menos ')
      .replace(/\s*\*\s*/g, ' por ')
      .replace(/\s*\/\s*/g, ' entre ')
      .replace(/(\d+)%/g, '$1 por ciento')
      .replace(/°C/g, ' grados centígrados')
      .replace(/\bkm\/h\b/gi, ' kilómetros por hora')
      .replace(/\bmin\b/gi, ' minutos')
      .replace(/\bseg\b/gi, ' segundos')
      // Clean extra spaces & punctuation artifacts
      .replace(/[•▪▫▶►]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private speechQueue: SpeechSynthesisUtterance[] = [];

  public speak(
    text: string,
    options: {
      gender?: VoiceGender;
      rate?: number;
      pitch?: number;
      voiceURI?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): boolean {
    if (!this.isSynthesisSupported()) {
      options.onEnd?.();
      return false;
    }

    this.stopSpeaking();

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      options.onEnd?.();
      return false;
    }

    try {
      const voiceConfig = this.findVoiceByGender(options.gender || 'female');
      let targetVoice: SpeechSynthesisVoice | null = null;

      if (options.voiceURI) {
        const found = this.getAvailableVoices().find((v) => v.voiceURI === options.voiceURI);
        if (found) targetVoice = found;
      }
      if (!targetVoice && voiceConfig.voice) {
        targetVoice = voiceConfig.voice;
      }

      // Sentence prosody splitting:
      // Breaks long paragraphs into natural conversational phrases with punctuation pauses
      // This produces human cadence instead of endless monotone robotic speech
      const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
      const rawSentences = cleanText.match(sentenceRegex);
      const sentences: string[] = rawSentences
        ? rawSentences.map((s) => s.trim()).filter((s) => s.length > 0)
        : [cleanText];

      if (sentences.length === 0) sentences.push(cleanText);

      this.speechQueue = sentences.map((sentenceText, index) => {
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        if (targetVoice) {
          utterance.voice = targetVoice;
          utterance.lang = targetVoice.lang;
        } else {
          utterance.lang = this.currentLanguage;
        }

        utterance.pitch = (options.pitch || 1.0) * voiceConfig.pitchAdjustment;
        utterance.rate = (options.rate || 1.0) * voiceConfig.rateAdjustment;

        if (index === 0) {
          utterance.onstart = () => {
            this.updatePlaybackState('speaking');
            options.onStart?.();
          };
        }

        if (index === sentences.length - 1) {
          utterance.onend = () => {
            this.updatePlaybackState('idle');
            this.currentUtterance = null;
            this.speechQueue = [];
            options.onEnd?.();
          };
        }

        utterance.onerror = (e) => {
          this.updatePlaybackState('idle');
          this.currentUtterance = null;
          this.speechQueue = [];
          options.onError?.(e);
        };

        return utterance;
      });

      // Speak sentences sequentially through window.speechSynthesis
      this.currentUtterance = this.speechQueue[0] || null;
      this.speechQueue.forEach((utt) => window.speechSynthesis.speak(utt));
      return true;
    } catch (e) {
      console.warn('Speech synthesis exception:', e);
      this.updatePlaybackState('idle');
      options.onEnd?.();
      return false;
    }
  }

  public pauseSpeaking(): void {
    if (this.isSynthesisSupported() && this.playbackState === 'speaking') {
      window.speechSynthesis.pause();
      this.updatePlaybackState('paused');
    }
  }

  public resumeSpeaking(): void {
    if (this.isSynthesisSupported() && this.playbackState === 'paused') {
      window.speechSynthesis.resume();
      this.updatePlaybackState('speaking');
    }
  }

  public isSpeaking(): boolean {
    return this.playbackState === 'speaking' || (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking);
  }

  public cancelSpeaking(): void {
    this.stopSpeaking();
  }

  public stopSpeaking(): void {
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
      this.updatePlaybackState('idle');
      this.currentUtterance = null;
      this.speechQueue = [];
    }
  }
}

export const voiceService = new VoiceService();

