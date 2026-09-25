import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AssistantState,
  SpeechPlaybackState,
  VoiceMessage,
  AndroidAction,
  AndroidSystemState,
  LocalModelConfig,
  PermissionStatusMap,
  AssistantSettings,
  ActiveTimer,
  AIAgent,
  VoiceGender,
  ListeningMode,
  IncomingMessage,
} from './types';
import {
  getAllMessages,
  saveMessage,
  clearAllMessages,
  getAllActionLogs,
  saveActionLog,
  clearAllActionLogs,
  getSettings,
  saveSettings,
  getSavedModels,
  saveModelFile,
  deleteCustomModel,
  getCustomAgents,
  saveCustomAgent,
  deleteCustomAgent
} from './services/db';
import { hardwareService } from './services/hardware';
import { voiceService } from './services/voice';
import { localAiService, PRESET_MODELS } from './services/localAi';
import { PRESET_AGENTS } from './services/agentManager';
import { communicationSkillsService } from './services/communicationSkills';
import { autoRefactorEngine } from './services/autoRefactorEngine';
import { Header } from './components/Header';
import { VoiceOrb } from './components/VoiceOrb';
import { AndroidPhoneCard } from './components/AndroidPhoneCard';
import { ChatHistory } from './components/ChatHistory';
import { LocalAiModelModal } from './components/LocalAiModelModal';
import { PermissionsModal } from './components/PermissionsModal';
import { ActionLogsModal } from './components/ActionLogsModal';
import { AgentManagerModal } from './components/AgentManagerModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { CommunicationSkillsModal } from './components/CommunicationSkillsModal';
import { DataManagerModal } from './components/DataManagerModal';
import { AiObservationSpaceModal } from './components/AiObservationSpaceModal';
import { FloatingNotificationBubble } from './components/FloatingNotificationBubble';
import { TalkBackHud } from './components/TalkBackHud';
import { screenVisionTalkbackService } from './services/screenVisionTalkback';
import {
  MessageSquare,
  Smartphone,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Calculator,
  Terminal,
  Globe,
  Trash2,
  Download,
  Sliders,
  Sparkles,
  Info,
  Flashlight,
  Hand,
  Eye,
  Brain,
  MessageCircle,
} from 'lucide-react';

export default function App() {
  // Assistant states
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [playbackState, setPlaybackState] = useState<SpeechPlaybackState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [freqData, setFreqData] = useState<Uint8Array | null>(null);
  const [peakDb, setPeakDb] = useState<number>(0);
  const [voiceLastError, setVoiceLastError] = useState<string | null>(null);

  // Collapsible non-invasive section drawers
  const [openSection, setOpenSection] = useState<'none' | 'shortcuts' | 'hardware' | 'history'>('none');

  // Messages & Action Logs
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [actionLogs, setActionLogs] = useState<AndroidAction[]>([]);

  // Agents
  const [customAgents, setCustomAgents] = useState<AIAgent[]>([]);
  const [activeAgent, setActiveAgent] = useState<AIAgent>(PRESET_AGENTS[0]);

  // Android System State
  const [systemState, setSystemState] = useState<AndroidSystemState>({
    torchOn: false,
    batteryLevel: 85,
    isCharging: false,
    volume: 70,
    brightness: 80,
    doNotDisturb: false,
    wakeLockActive: false,
    wifiEnabled: true,
    bluetoothEnabled: true,
    airplaneMode: false,
    floatingBubbleActive: false,
    activeTimers: [],
    notes: [
      'Reunión de proyecto a las 4:00 PM',
      'Recordar comprar repuesto de batería',
    ],
  });

  // Local AI Models & Settings
  const [availableModels, setAvailableModels] = useState<LocalModelConfig[]>(PRESET_MODELS);
  const [activeModel, setActiveModel] = useState<LocalModelConfig>(PRESET_MODELS[0]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [settings, setSettings] = useState<AssistantSettings>({
    hotwordEnabled: true,
    hotword: 'Zanna',
    wakeWord: 'Zanna',
    requireWakeWordForCommands: false,
    listeningMode: 'push_to_talk',
    listeningDurationSeconds: 10,
    bargeInEnabled: true,
    speechRate: 1.0,
    speechPitch: 1.15,
    voiceGender: 'female',
    selectedVoiceURI: '',
    soundEffectsEnabled: true,
    hapticFeedbackEnabled: true,
    autonomousExecution: true,
    autoSpeakResponse: true,
    language: 'es-ES',
    activeAgentId: PRESET_AGENTS[0].id,
    floatingBubbleEnabled: false,
    alwaysOnWatchdog: true,
    externalApi: {
      enabled: false,
      type: 'ollama_local',
      url: 'http://localhost:11434/api/generate',
      apiKey: '',
      modelName: 'llama3.2',
    },
  });

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionStatusMap>({
    microphone: 'prompt',
    torch: 'prompt',
    battery: 'prompt',
    vibration: 'granted',
    notifications: 'prompt',
    wakeLock: 'prompt',
    geolocation: 'prompt',
    clipboard: 'granted',
    screenVision: 'granted',
    accessibilityTalkBack: 'granted',
  });

  const [isTalkBackActive, setIsTalkBackActive] = useState<boolean>(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(false);

  // Mobile View Tab
  const [activeTab, setActiveTab] = useState<'both' | 'dashboard' | 'chat'>('both');

  // Modals
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isVoiceSettingsModalOpen, setIsVoiceSettingsModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isDataManagerModalOpen, setIsDataManagerModalOpen] = useState(false);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [incomingAlertMsg, setIncomingAlertMsg] = useState<IncomingMessage | null>(null);

  // References to avoid stale closures in callbacks
  const systemStateRef = useRef(systemState);
  systemStateRef.current = systemState;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeAgentRef = useRef(activeAgent);
  activeAgentRef.current = activeAgent;

  const interimTranscriptRef = useRef<string>('');

  // --- INITIALIZATION ---
  useEffect(() => {
    const initData = async () => {
      try {
        await hardwareService.initNativeFeatures();
        const savedMsgs = await getAllMessages();
        setMessages(savedMsgs);

        const savedLogs = await getAllActionLogs();
        setActionLogs(savedLogs);

        const savedAgents = await getCustomAgents();
        if (savedAgents && savedAgents.length > 0) {
          setCustomAgents(savedAgents);
        }

        const savedSettings = await getSettings();
        if (savedSettings) {
          // Normalize legacy names to ZANNA
          let updatedSettings = { ...savedSettings };
          let changed = false;

          if (updatedSettings.activeAgentId === 'agent-aura' || !updatedSettings.activeAgentId) {
            updatedSettings.activeAgentId = 'agent-zanna';
            changed = true;
          }
          if (!updatedSettings.wakeWord || updatedSettings.wakeWord.toLowerCase() === 'sana' || updatedSettings.wakeWord.toLowerCase() === 'aura') {
            updatedSettings.wakeWord = 'Zanna';
            changed = true;
          }
          if (!updatedSettings.hotword || updatedSettings.hotword.toLowerCase() === 'sana' || updatedSettings.hotword.toLowerCase() === 'aura') {
            updatedSettings.hotword = 'Zanna';
            changed = true;
          }

          if (changed) {
            await saveSettings(updatedSettings);
          }

          setSettings(updatedSettings);

          // Find active agent from savedSettings
          const allAgents = [...PRESET_AGENTS, ...savedAgents];
          const found = allAgents.find((a) => a.id === updatedSettings.activeAgentId);
          if (found) {
            setActiveAgent(found);
          } else {
            setActiveAgent(PRESET_AGENTS[0]);
          }
        }

        const customModels = await getSavedModels();
        if (customModels && customModels.length > 0) {
          setAvailableModels([...PRESET_MODELS, ...customModels]);
          localAiService.setCustomModels(customModels);
        }

        // Available voices
        const voices = voiceService.getAvailableVoices();
        setAvailableVoices(voices);

        // Real Battery Info
        const batteryInfo = await hardwareService.getBatteryInfo();
        if (batteryInfo) {
          setSystemState((prev) => ({
            ...prev,
            batteryLevel: batteryInfo.level,
            isCharging: batteryInfo.charging,
          }));
          setPermissions((prev) => ({ ...prev, battery: 'granted' }));
        }

        // Check Permissions
        if ('Notification' in window) {
          setPermissions((prev) => ({
            ...prev,
            notifications: Notification.permission === 'granted' ? 'granted' : 'prompt',
          }));
        }

        // Permissions status check (do not block UI with modal)
        localStorage.setItem('vozdroid_permissions_requested_v1', 'true');
        setIsFirstLaunch(false);
        setIsPermissionsModalOpen(false);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };

    initData();

    // Subscribe to TalkBack accessibility state
    const unsubscribeTalkback = screenVisionTalkbackService.subscribe((tbState) => {
      setIsTalkBackActive(tbState.enabled);
    });

    // Listen to voice synthesis playback state changes
    voiceService.setPlaybackStateListener((state) => {
      setPlaybackState(state);
      if (state === 'speaking') {
        setAssistantState('speaking');
      } else if (state === 'idle' && assistantState === 'speaking') {
        setAssistantState('idle');
      }
    });

    // Configure Barge-in (interrupt when user speaks)
    voiceService.setBargeInListener(() => {
      hardwareService.vibrate([100]);
      setAssistantState('listening');
      setPlaybackState('idle');
    });

    // Subscribe to incoming messages for smart communication skills
    const unsubscribeMessages = communicationSkillsService.subscribe((msgs) => {
      const unread = msgs.find((m) => m.status === 'unread');
      if (unread) {
        setIncomingAlertMsg(unread);
      }
    });

    return () => {
      unsubscribeTalkback();
      unsubscribeMessages();
    };
  }, []);

  // Update barge-in status when setting changes
  useEffect(() => {
    voiceService.setBargeInEnabled(settings.bargeInEnabled);
  }, [settings.bargeInEnabled]);

  // If Gemini Always-On is selected, automatically activate WakeLock
  useEffect(() => {
    if (settings.listeningMode === 'always_on_gemini') {
      hardwareService.requestWakeLock().then((ok) => {
        setSystemState((prev) => ({ ...prev, wakeLockActive: ok }));
      });
    }
  }, [settings.listeningMode]);

  // --- BACKGROUND TIMERS TICKER ---
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSystemState((prev) => {
        if (!prev.activeTimers || prev.activeTimers.length === 0) return prev;

        const updatedTimers: ActiveTimer[] = [];
        let timerCompleted = false;
        let completedLabel = '';

        for (const t of prev.activeTimers) {
          const rem = t.remainingSeconds - 1;
          if (rem <= 0) {
            timerCompleted = true;
            completedLabel = t.label;
          } else {
            updatedTimers.push({ ...t, remainingSeconds: rem });
          }
        }

        if (timerCompleted) {
          hardwareService.vibrate([300, 150, 300, 150, 600]);
          hardwareService.playSuccessChime();

          if (settingsRef.current.autoSpeakResponse) {
            voiceService.speak(`¡Atención! Tu temporizador de ${completedLabel} ha finalizado.`, {
              rate: settingsRef.current.speechRate,
              pitch: settingsRef.current.speechPitch,
              gender: settingsRef.current.voiceGender,
            });
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ZANNA AI - Temporizador', {
              body: `El temporizador de ${completedLabel} ha terminado.`,
              icon: '/pwa-192x192.png',
            });
          }
        }

        return { ...prev, activeTimers: updatedTimers };
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // --- EXECUTE DISPATCHED ANDROID ACTIONS ---
  const executeActions = useCallback(async (actions: AndroidAction[]): Promise<AndroidAction[]> => {
    const executedActions: AndroidAction[] = [];

    for (const act of actions) {
      try {
        switch (act.type) {
          case 'SET_TORCH': {
            const shouldEnable = !!act.params?.enabled;
            const res = await hardwareService.setTorch(shouldEnable);
            setSystemState((prev) => ({ ...prev, torchOn: shouldEnable }));
            act.status = 'success';
            act.resultMessage = res.message;
            break;
          }
          case 'GET_BATTERY': {
            const bat = await hardwareService.getBatteryInfo();
            const level = bat ? bat.level : systemStateRef.current.batteryLevel;
            const charging = bat ? bat.charging : systemStateRef.current.isCharging;
            setSystemState((prev) => ({ ...prev, batteryLevel: level, isCharging: charging }));
            act.status = 'success';
            act.resultMessage = `Batería: ${level}% (${charging ? 'Cargando' : 'Descarga'})`;
            break;
          }
          case 'VIBRATE': {
            const pattern = act.params?.pattern || [200, 100, 200];
            hardwareService.vibrate(pattern);
            act.status = 'success';
            act.resultMessage = `Vibración emitida (${act.params?.count || 1} pulsos)`;
            break;
          }
          case 'SET_VOLUME': {
            const newVol = act.params?.volume ?? 50;
            setSystemState((prev) => ({ ...prev, volume: newVol }));
            hardwareService.playBeep(600, 0.1);
            act.status = 'success';
            act.resultMessage = `Volumen de Android fijado al ${newVol}%`;
            break;
          }
          case 'TOGGLE_DND': {
            const enabled = !!act.params?.enabled;
            setSystemState((prev) => ({ ...prev, doNotDisturb: enabled }));
            act.status = 'success';
            act.resultMessage = enabled ? 'Modo No Molestar Activado' : 'Modo No Molestar Desactivado';
            break;
          }
          case 'TOGGLE_WIFI': {
            const enabled = act.params?.enabled ?? !systemStateRef.current.wifiEnabled;
            setSystemState((prev) => ({ ...prev, wifiEnabled: enabled }));
            act.status = 'success';
            act.resultMessage = enabled ? 'Wi-Fi activado' : 'Wi-Fi desactivado';
            break;
          }
          case 'TOGGLE_BLUETOOTH': {
            const enabled = act.params?.enabled ?? !systemStateRef.current.bluetoothEnabled;
            setSystemState((prev) => ({ ...prev, bluetoothEnabled: enabled }));
            act.status = 'success';
            act.resultMessage = enabled ? 'Bluetooth activado' : 'Bluetooth desactivado';
            break;
          }
          case 'SET_BRIGHTNESS': {
            const brightness = act.params?.brightness ?? 80;
            setSystemState((prev) => ({ ...prev, brightness }));
            act.status = 'success';
            act.resultMessage = `Brillo de pantalla ajustado al ${brightness}%`;
            break;
          }
          case 'MAKE_CALL': {
            const contact = act.params?.contact || 'Contacto';
            hardwareService.triggerCall(act.params?.phone || '555-0199');
            act.status = 'success';
            act.resultMessage = `Llamada iniciada hacia ${contact}`;
            break;
          }
          case 'SEND_SMS': {
            hardwareService.triggerSms(act.params?.phone || '555-0143', act.params?.messageBody);
            act.status = 'success';
            act.resultMessage = `SMS preparado para ${act.params?.recipient}`;
            break;
          }
          case 'SEND_WHATSAPP': {
            hardwareService.triggerWhatsApp(act.params?.phone, act.params?.message);
            act.status = 'success';
            act.resultMessage = `WhatsApp abierto para ${act.params?.contact}`;
            break;
          }
          case 'SET_ALARM': {
            hardwareService.triggerAlarmClock();
            act.status = 'success';
            act.resultMessage = `Alarma programada a las ${act.params?.time}`;
            break;
          }
          case 'SET_TIMER': {
            const newTimer: ActiveTimer = {
              id: 'timer-' + Math.random().toString(36).substring(2, 9),
              label: act.params?.label || 'Temporizador',
              durationSeconds: act.params?.durationSeconds || 300,
              remainingSeconds: act.params?.durationSeconds || 300,
              createdAt: Date.now(),
            };
            setSystemState((prev) => ({
              ...prev,
              activeTimers: [...prev.activeTimers, newTimer],
            }));
            hardwareService.playWakeChime();
            act.status = 'success';
            act.resultMessage = `Temporizador de ${newTimer.label} activo en segundo plano`;
            break;
          }
          case 'OPEN_CAMERA': {
            hardwareService.triggerCamera();
            act.status = 'success';
            act.resultMessage = 'Obturador de cámara iniciado';
            break;
          }
          case 'OPEN_MAPS': {
            hardwareService.triggerMaps(act.params?.destination || 'cerca de mí');
            act.status = 'success';
            act.resultMessage = `Ruta abierta hacia ${act.params?.destination}`;
            break;
          }
          case 'GET_LOCATION': {
            const pos = await hardwareService.getCoordinates();
            act.status = 'success';
            act.resultMessage = pos
              ? `GPS: Lat ${pos.latitude.toFixed(4)}, Lon ${pos.longitude.toFixed(4)}`
              : 'GPS no disponible';
            break;
          }
          case 'TAKE_NOTE': {
            const noteText = act.params?.text || 'Nueva nota';
            setSystemState((prev) => ({
              ...prev,
              notes: [noteText, ...prev.notes],
            }));
            act.status = 'success';
            act.resultMessage = `Nota guardada: "${noteText}"`;
            break;
          }
          case 'TOGGLE_WAKELOCK': {
            const success = await hardwareService.requestWakeLock();
            setSystemState((prev) => ({ ...prev, wakeLockActive: success }));
            act.status = success ? 'success' : 'failed';
            act.resultMessage = success ? 'Segundo plano activo (Wake Lock concedido)' : 'Wake Lock no soportado';
            break;
          }
          case 'SYSTEM_DIAGNOSTIC': {
            const bat = await hardwareService.getBatteryInfo();
            hardwareService.vibrate([100, 50, 100]);
            act.status = 'success';
            act.resultMessage = `Batería: ${bat?.level ?? systemStateRef.current.batteryLevel}%, Audio: ${systemStateRef.current.volume}%, Sensores: OK`;
            break;
          }
          case 'SCREEN_VISION': {
            const analysis = screenVisionTalkbackService.inspectScreen();
            screenVisionTalkbackService.readScreenAloud().catch(() => {});
            act.status = 'success';
            act.resultMessage = `Pantalla analizada: ${analysis.elements.length} controles interactivos detectados.`;
            break;
          }
          case 'TALKBACK_ACTION': {
            const sub = act.params?.subAction;
            if (sub === 'enable') {
              screenVisionTalkbackService.enableTalkBack(true);
            } else if (sub === 'disable') {
              screenVisionTalkbackService.disableTalkBack(true);
            } else if (sub === 'next') {
              screenVisionTalkbackService.nextElement();
            } else if (sub === 'previous') {
              screenVisionTalkbackService.previousElement();
            } else if (sub === 'click_focused') {
              screenVisionTalkbackService.activateFocusedElement();
            } else if (sub === 'click_named') {
              const target = act.params?.targetElement;
              if (target) {
                const analysis = screenVisionTalkbackService.inspectScreen();
                const found = analysis.elements.find(
                  (el) =>
                    el.label.toLowerCase().includes(target.toLowerCase()) ||
                    el.text.toLowerCase().includes(target.toLowerCase())
                );
                if (found) {
                  const domEl = document.querySelector(found.selector) as HTMLElement;
                  if (domEl) {
                    domEl.click();
                    act.status = 'success';
                    act.resultMessage = `Elemento presionado: "${found.label}"`;
                    break;
                  }
                }
              }
            }
            act.status = 'success';
            act.resultMessage = 'Comando TalkBack ejecutado';
            break;
          }
          case 'REPLY_MESSAGE': {
            const replyText = act.params?.replyText || act.description || '';
            const res = await communicationSkillsService.replyToMessage('', replyText);
            act.status = 'success';
            act.resultMessage = res.message;
            break;
          }
          case 'READ_NOTIFICATIONS': {
            const msgs = communicationSkillsService.getIncomingMessages();
            const unread = msgs.filter((m) => m.status === 'unread');
            if (unread.length > 0) {
              const summary = unread
                .map((m) => `${m.sender} por ${m.app}: "${m.content}"`)
                .join('. ');
              act.resultMessage = `Tienes ${unread.length} mensajes pendientes: ${summary}`;
            } else {
              act.resultMessage = 'No tienes notificaciones ni mensajes pendientes.';
            }
            act.status = 'success';
            break;
          }
          case 'SEND_EMAIL': {
            const { to, subject, body } = act.params || {};
            communicationSkillsService.sendEmail(to || '', subject || 'Mensaje', body || '');
            act.status = 'success';
            act.resultMessage = `Cliente de correo abierto para ${to || 'destinatario'}`;
            break;
          }
          case 'AUTO_REFACTOR': {
            await autoRefactorEngine.triggerAutoHealingCycle(settingsRef.current, availableModels);
            act.status = 'success';
            act.resultMessage = 'Módulo de auto-refacción ejecutado. Arquitectura optimizada y snapshot creado.';
            setIsObservationModalOpen(true);
            break;
          }
          case 'DATA_MANAGEMENT': {
            act.status = 'success';
            act.resultMessage = 'Abriendo motor de gestión de bases de datos.';
            setIsDataManagerModalOpen(true);
            break;
          }
          default:
            act.status = 'success';
            act.resultMessage = 'Comando ejecutado';
        }
      } catch (err: any) {
        console.error('Error executing action:', err);
        act.status = 'failed';
        act.resultMessage = err?.message || 'Fallo de hardware';
      }

      executedActions.push(act);
      saveActionLog(act);
    }

    setActionLogs((prev) => [...executedActions, ...prev]);
    return executedActions;
  }, []);

  // --- PROCESS VOICE OR TEXT INPUT ---
  const handleProcessInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setTranscript(text);
    setInterimTranscript('');
    setAssistantState('processing');

    // 1. Create User Message
    const userMsg: VoiceMessage = {
      id: 'msg-usr-' + Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    saveMessage(userMsg);

    try {
      // 2. Local AI Inference with Active Agent and Optional External API
      const response = await localAiService.processVoiceCommand(
        text,
        systemStateRef.current,
        activeAgentRef.current,
        settingsRef.current.externalApi,
        {
          wakeWord: settingsRef.current.wakeWord || settingsRef.current.hotword || 'Zanna',
          requireWakeWordForCommands: settingsRef.current.requireWakeWordForCommands ?? false,
        }
      );

      setAssistantState('executing');

      // 3. Execute Android Actions
      let executedActions: AndroidAction[] = [];
      if (response.actions.length > 0) {
        executedActions = await executeActions(response.actions);
      }

      // 4. Create Assistant Response Message
      const assistantMsg: VoiceMessage = {
        id: 'msg-ast-' + Math.random().toString(36).substring(2, 9),
        sender: 'assistant',
        text: response.spokenResponse,
        timestamp: Date.now(),
        actionsExecuted: executedActions,
        modelUsed: response.modelUsed,
        agentUsed: response.agentUsed,
        executionTimeMs: response.executionTimeMs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      saveMessage(assistantMsg);

      // 5. Offline Speech Synthesis with Gender Selection & Playback Controls
      if (settingsRef.current.autoSpeakResponse && response.spokenResponse) {
        setAssistantState('speaking');
        setPlaybackState('speaking');

        voiceService.speak(response.spokenResponse, {
          rate: settingsRef.current.speechRate,
          pitch: settingsRef.current.speechPitch,
          gender: settingsRef.current.voiceGender,
          voiceURI: settingsRef.current.selectedVoiceURI,
          onStart: () => {
            setAssistantState('speaking');
            setPlaybackState('speaking');
          },
          onEnd: () => {
            setAssistantState('idle');
            setPlaybackState('idle');
            // If Gemini always-on mode is active, resume listening loop
            if (settingsRef.current.listeningMode === 'always_on_gemini') {
              startListeningLoop();
            }
          },
          onError: () => {
            setAssistantState('idle');
            setPlaybackState('idle');
            if (settingsRef.current.listeningMode === 'always_on_gemini') {
              startListeningLoop();
            }
          },
        });
      } else {
        setAssistantState('idle');
        setPlaybackState('idle');
        if (settingsRef.current.listeningMode === 'always_on_gemini') {
          startListeningLoop();
        }
      }
    } catch (err) {
      console.error('Local AI processing error:', err);
      hardwareService.playErrorBuzz();
      setAssistantState('idle');
      setPlaybackState('idle');
    }
  }, [executeActions]);

  // --- REFRESH SAVED MODELS FROM DB ---
  const refreshSavedModels = useCallback(async () => {
    try {
      const saved = await getSavedModels();
      if (saved && saved.length > 0) {
        localAiService.setCustomModels(saved);
        setAvailableModels([...PRESET_MODELS, ...saved]);
      }
    } catch (e) {
      console.warn('Error refreshing models:', e);
    }
  }, []);

  // --- FLOATING BUBBLE TOGGLE ---
  const handleToggleFloatingBubble = useCallback(() => {
    setSystemState((prev) => ({
      ...prev,
      floatingBubbleActive: !prev.floatingBubbleActive,
    }));
  }, []);

  // --- START / STOP VOICE RECOGNITION LOOP ---
  const startListeningLoop = useCallback(async () => {
    // Stop any active speech synthesis so audio does not collide or echo
    if (voiceService.isSpeaking()) {
      voiceService.cancelSpeaking();
      setPlaybackState('idle');
    }

    setAssistantState('listening');
    setVoiceLastError(null);

    // Only play chime if enabled, debounced inside hardwareService
    if (settingsRef.current.soundEffectsEnabled) {
      hardwareService.playWakeChime();
    }

    // Start Audio Waveform Spectrum visualizer & Barge-in detector safely
    voiceService.startAudioVisualizer((volume, freqArray, peak) => {
      setAudioLevel(volume);
      setFreqData(freqArray);
      setPeakDb(peak);
    });

    voiceService.startListening(
      (text, isFinal) => {
        setVoiceLastError(null);
        if (isFinal) {
          interimTranscriptRef.current = '';
          setInterimTranscript('');
          if (settingsRef.current.listeningMode !== 'always_on_gemini') {
            voiceService.stopListening(false);
            voiceService.stopAudioVisualizer();
          }
          handleProcessInput(text);
        } else {
          interimTranscriptRef.current = text;
          setInterimTranscript(text);
        }
      },
      (err) => {
        const errType = err?.error;
        if (errType === 'no-speech') {
          if (settingsRef.current.listeningMode !== 'always_on_gemini') {
            voiceService.stopAudioVisualizer();
            setAssistantState('idle');
          }
          return;
        }
        if (errType === 'aborted') {
          return;
        }
        const msg = voiceService.getLastError() || (typeof err === 'string' ? err : err?.message || errType || 'Error de reconocimiento');
        setVoiceLastError(msg);
        console.warn('Speech recognition notice:', errType);
        if (settingsRef.current.listeningMode !== 'always_on_gemini') {
          voiceService.stopAudioVisualizer();
          setAssistantState('idle');
        }
      },
      () => {
        // When session ends, if any speech was captured in interim, auto-emit it!
        const pending = interimTranscriptRef.current.trim() || voiceService.getLastCapturedText();
        if (pending) {
          interimTranscriptRef.current = '';
          setInterimTranscript('');
          handleProcessInput(pending);
        }

        if (settingsRef.current.listeningMode !== 'always_on_gemini') {
          voiceService.stopAudioVisualizer();
          setAssistantState('idle');
        }
      },
      {
        mode: settingsRef.current.listeningMode,
        durationSeconds: settingsRef.current.listeningDurationSeconds,
      }
    );
  }, [handleProcessInput]);

  // --- ALWAYS-ON GEMINI MODE WATCHDOG ---
  useEffect(() => {
    if (settings.listeningMode === 'always_on_gemini') {
      const watchdog = setInterval(() => {
        if (assistantState === 'idle' && playbackState === 'idle') {
          startListeningLoop();
        }
      }, 1500);
      return () => clearInterval(watchdog);
    }
  }, [settings.listeningMode, assistantState, playbackState, startListeningLoop]);

  const stopListeningLoop = useCallback(() => {
    // If the user spoke and tapped to stop, execute the captured speech immediately!
    const pending = interimTranscriptRef.current.trim() || voiceService.flushPendingTranscript() || voiceService.getLastCapturedText();
    interimTranscriptRef.current = '';
    voiceService.stopListening(false);
    voiceService.stopAudioVisualizer();
    setAssistantState('idle');
    setAudioLevel(0);
    setFreqData(null);
    setPeakDb(0);
    setInterimTranscript('');

    if (pending) {
      handleProcessInput(pending);
    }
  }, [handleProcessInput]);

  const handleForceEmitCurrentVoice = useCallback(() => {
    const textToEmit = interimTranscriptRef.current.trim() || voiceService.flushPendingTranscript() || voiceService.getLastCapturedText();
    if (textToEmit) {
      interimTranscriptRef.current = '';
      setInterimTranscript('');
      voiceService.stopListening(false);
      voiceService.stopAudioVisualizer();
      setAssistantState('idle');
      handleProcessInput(textToEmit);
    }
  }, [handleProcessInput]);

  const handleResetVoiceEngine = useCallback(() => {
    voiceService.resetVoiceEngine();
    setVoiceLastError(null);
    setAudioLevel(0);
    setFreqData(null);
    setPeakDb(0);
    setAssistantState('idle');
  }, []);

  const handleToggleListening = () => {
    // If speaking, stop speaking immediately
    if (voiceService.isSpeaking()) {
      voiceService.cancelSpeaking();
      setPlaybackState('idle');
      setAssistantState('idle');
      return;
    }

    if (assistantState === 'listening') {
      stopListeningLoop();
    } else {
      startListeningLoop();
    }
  };

  // --- PLAYBACK CONTROLS (PAUSE, RESUME, STOP) ---
  const handlePauseSpeaking = () => {
    voiceService.pauseSpeaking();
    setPlaybackState('paused');
    setAssistantState('idle');
  };

  const handleResumeSpeaking = () => {
    voiceService.resumeSpeaking();
    setPlaybackState('speaking');
    setAssistantState('speaking');
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
    setPlaybackState('idle');
    setAssistantState('idle');
  };

  const handleReplayVoice = (text: string) => {
    setAssistantState('speaking');
    setPlaybackState('speaking');
    voiceService.speak(text, {
      rate: settings.speechRate,
      pitch: settings.speechPitch,
      gender: settings.voiceGender,
      voiceURI: settings.selectedVoiceURI,
      onStart: () => {
        setAssistantState('speaking');
        setPlaybackState('speaking');
      },
      onEnd: () => {
        setAssistantState('idle');
        setPlaybackState('idle');
      },
      onError: () => {
        setAssistantState('idle');
        setPlaybackState('idle');
      },
    });
  };

  const handleTestVoice = (customGender?: VoiceGender) => {
    const gender = customGender || settings.voiceGender;
    voiceService.speak(
      `Hola, soy ${activeAgent.name}. Estoy lista para controlar todas las funciones de tu teléfono Android sin conexión a internet.`,
      {
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        gender,
        voiceURI: settings.selectedVoiceURI,
      }
    );
  };

  // --- HARDWARE QUICK HANDLERS ---
  const handleToggleTorch = async () => {
    const next = !systemState.torchOn;
    const res = await hardwareService.setTorch(next);
    setSystemState((prev) => ({ ...prev, torchOn: next }));
    const log: AndroidAction = {
      id: 'act-' + Math.random().toString(36).substring(2, 9),
      type: 'SET_TORCH',
      title: next ? 'Linterna Encendida' : 'Linterna Apagada',
      description: res.message,
      params: { enabled: next },
      status: 'success',
      timestamp: Date.now(),
      resultMessage: res.message,
    };
    saveActionLog(log);
    setActionLogs((prev) => [log, ...prev]);
  };

  const handleToggleDND = () => {
    const next = !systemState.doNotDisturb;
    setSystemState((prev) => ({ ...prev, doNotDisturb: next }));
    hardwareService.vibrate(next ? [150, 100, 150] : [100]);
  };

  const handleChangeVolume = (volume: number) => {
    setSystemState((prev) => ({ ...prev, volume }));
    hardwareService.playBeep(400 + volume * 4, 0.08);
  };

  const handleTestVibration = () => {
    hardwareService.vibrate([200, 100, 200, 100, 400]);
    hardwareService.playBeep(880, 0.1);
  };

  const handleToggleWakeLock = async () => {
    if (systemState.wakeLockActive) {
      await hardwareService.releaseWakeLock();
      setSystemState((prev) => ({ ...prev, wakeLockActive: false }));
    } else {
      const ok = await hardwareService.requestWakeLock();
      setSystemState((prev) => ({ ...prev, wakeLockActive: ok }));
      if (ok) hardwareService.playSuccessChime();
    }
  };

  const handleDeleteTimer = (id: string) => {
    setSystemState((prev) => ({
      ...prev,
      activeTimers: prev.activeTimers.filter((t) => t.id !== id),
    }));
  };

  const handleDeleteNote = (idx: number) => {
    setSystemState((prev) => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== idx),
    }));
  };

  const handleClearChat = async () => {
    await clearAllMessages();
    setMessages([]);
  };

  const handleClearLogs = async () => {
    await clearAllActionLogs();
    setActionLogs([]);
  };

  // --- AGENT MANAGEMENT ---
  const handleSelectAgent = (agent: AIAgent) => {
    setActiveAgent(agent);
    // Sync voice gender with agent's voice configuration
    const updatedSettings = {
      ...settings,
      activeAgentId: agent.id,
      voiceGender: agent.voiceGender,
      speechPitch: agent.voiceGender === 'female' ? 1.15 : 0.85,
    };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    hardwareService.playSuccessChime();
    voiceService.speak(`Agente ${agent.name} cargado y listo para administrar tu teléfono.`, {
      gender: agent.voiceGender,
      rate: settings.speechRate,
      pitch: agent.voiceGender === 'female' ? 1.15 : 0.85,
    });
  };

  const handleSaveCustomAgent = async (agent: AIAgent) => {
    await saveCustomAgent(agent);
    setCustomAgents((prev) => [...prev.filter((a) => a.id !== agent.id), agent]);
  };

  const handleDeleteCustomAgent = async (id: string) => {
    await deleteCustomAgent(id);
    setCustomAgents((prev) => prev.filter((a) => a.id !== id));
    if (activeAgent.id === id) {
      handleSelectAgent(PRESET_AGENTS[0]);
    }
  };

  // --- LOCAL MODEL SELECTION & CUSTOM UPLOAD ---
  const handleSelectModel = async (model: LocalModelConfig) => {
    await localAiService.loadModel(model);
    setActiveModel(model);
    setAvailableModels((prev) =>
      prev.map((m) => ({ ...m, isLoaded: m.id === model.id }))
    );
  };

  const handleUploadCustomModel = async (file: File, name: string) => {
    const customConfig: LocalModelConfig = {
      id: 'custom-' + Math.random().toString(36).substring(2, 9),
      name: name || file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      description: `Modelo local cargado por el usuario desde el teléfono (${file.name}).`,
      isCustom: true,
      isLoaded: true,
      type: 'gguf_wasm',
      quantization: file.name.toUpperCase().includes('Q4') ? 'Q4_K_M' : 'Custom',
      fileName: file.name,
      fileSizeBytes: file.size,
      loadedAt: Date.now(),
    };

    await saveModelFile(customConfig.id, file, customConfig);
    const updatedModels = [...availableModels, customConfig];
    setAvailableModels(updatedModels);
    localAiService.setCustomModels(updatedModels.filter((m) => m.isCustom));
    await handleSelectModel(customConfig);
  };

  const handleDeleteCustomModel = async (id: string) => {
    await deleteCustomModel(id);
    const filtered = availableModels.filter((m) => m.id !== id);
    setAvailableModels(filtered);
    if (activeModel.id === id) {
      handleSelectModel(PRESET_MODELS[0]);
    }
  };

  // --- PERMISSIONS HANDLERS ---
  const handleRequestPermission = async (key: keyof PermissionStatusMap) => {
    try {
      if (key === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setPermissions((prev) => ({ ...prev, microphone: 'granted' }));
      } else if (key === 'torch') {
        await hardwareService.setTorch(true);
        setTimeout(() => {
          hardwareService.setTorch(false).catch(() => {});
        }, 500);
        setPermissions((prev) => ({ ...prev, torch: 'granted' }));
      } else if (key === 'notifications') {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          setPermissions((prev) => ({ ...prev, notifications: perm === 'granted' ? 'granted' : 'denied' }));
        }
      } else if (key === 'wakeLock') {
        const ok = await hardwareService.requestWakeLock();
        setPermissions((prev) => ({ ...prev, wakeLock: ok ? 'granted' : 'unsupported' }));
      } else if (key === 'geolocation') {
        const pos = await hardwareService.getCoordinates();
        setPermissions((prev) => ({ ...prev, geolocation: pos ? 'granted' : 'denied' }));
      } else if (key === 'screenVision') {
        screenVisionTalkbackService.inspectScreen();
        setPermissions((prev) => ({ ...prev, screenVision: 'granted' }));
      } else if (key === 'accessibilityTalkBack') {
        setPermissions((prev) => ({ ...prev, accessibilityTalkBack: 'granted' }));
      } else if (key === 'vibration') {
        hardwareService.vibrate([150]);
        setPermissions((prev) => ({ ...prev, vibration: 'granted' }));
      } else if (key === 'battery') {
        const bat = await hardwareService.getBatteryInfo();
        if (bat) setPermissions((prev) => ({ ...prev, battery: 'granted' }));
      } else if (key === 'clipboard') {
        setPermissions((prev) => ({ ...prev, clipboard: 'granted' }));
      }
    } catch (e) {
      console.warn('Permission request error:', e);
    }
  };

  const handleRequestAllPermissions = async () => {
    await handleRequestPermission('microphone');
    await handleRequestPermission('screenVision');
    await handleRequestPermission('accessibilityTalkBack');
    await handleRequestPermission('torch');
    await handleRequestPermission('notifications');
    await handleRequestPermission('wakeLock');
    await handleRequestPermission('vibration');
    await handleRequestPermission('battery');
    await handleRequestPermission('geolocation');
    await handleRequestPermission('clipboard');

    localStorage.setItem('vozdroid_permissions_requested_v1', 'true');
    setIsFirstLaunch(false);
    hardwareService.playSuccessChime();
    voiceService.speak('Permisos de Android, visión de pantalla y accesibilidad TalkBack concedidos exitosamente.', {
      gender: settings.voiceGender,
      rate: settings.speechRate,
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Top Application Header */}
      <Header
        activeModel={activeModel}
        activeAgent={activeAgent}
        systemState={systemState}
        onOpenModelModal={() => setIsModelModalOpen(true)}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        onOpenVoiceSettingsModal={() => setIsVoiceSettingsModalOpen(true)}
        onOpenPermissionsModal={() => setIsPermissionsModalOpen(true)}
        onOpenLogsModal={() => setIsLogsModalOpen(true)}
        onOpenSkillsModal={() => setIsSkillsModalOpen(true)}
        onOpenDataManagerModal={() => setIsDataManagerModalOpen(true)}
        onOpenObservationModal={() => setIsObservationModalOpen(true)}
        onToggleWakeLock={handleToggleWakeLock}
        onToggleFloatingBubble={handleToggleFloatingBubble}
        isTalkBackActive={isTalkBackActive}
        onToggleTalkBack={() => {
          if (isTalkBackActive) {
            screenVisionTalkbackService.disableTalkBack(true);
          } else {
            screenVisionTalkbackService.enableTalkBack(true);
          }
        }}
        onReadScreen={() => {
          screenVisionTalkbackService.readScreenAloud();
        }}
      />

      {/* Floating Incoming Communication Alert Banner */}
      {incomingAlertMsg && (
        <div className="w-full max-w-4xl mx-auto px-4 mt-2 animate-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/80 border border-emerald-500/40 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-bold">
                {incomingAlertMsg.app === 'whatsapp' ? 'WA' : incomingAlertMsg.app === 'sms' ? 'SMS' : 'MSG'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">
                    Mensaje de {incomingAlertMsg.sender}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold uppercase border border-emerald-500/30">
                    {incomingAlertMsg.app}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 truncate font-medium mt-0.5">
                  "{incomingAlertMsg.content}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  const toReply = incomingAlertMsg;
                  setIncomingAlertMsg(null);
                  communicationSkillsService.markAsRead(toReply.id);
                  handleProcessInput(`responder el mensaje de ${toReply.sender}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition active:scale-95"
              >
                Responder por Voz
              </button>
              <button
                onClick={() => {
                  setIncomingAlertMsg(null);
                  setIsSkillsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Ver Todo
              </button>
              <button
                onClick={() => {
                  if (incomingAlertMsg) communicationSkillsService.markAsRead(incomingAlertMsg.id);
                  setIncomingAlertMsg(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
        {/* Central Voice Orb & Audio Wave Command Interface */}
        <section className="w-full flex justify-center">
          <VoiceOrb
            assistantState={assistantState}
            playbackState={playbackState}
            transcript={transcript}
            interimTranscript={interimTranscript}
            audioLevel={audioLevel}
            freqData={freqData}
            peakDb={peakDb}
            listeningMode={settings.listeningMode}
            listeningDurationSeconds={settings.listeningDurationSeconds}
            activeAgent={activeAgent}
            onToggleListening={handleToggleListening}
            onForceEmitVoiceCommand={handleForceEmitCurrentVoice}
            onSubmitTextCommand={handleProcessInput}
            onPauseSpeaking={handlePauseSpeaking}
            onResumeSpeaking={handleResumeSpeaking}
            onStopSpeaking={handleStopSpeaking}
            onOpenVoiceSettings={() => setIsVoiceSettingsModalOpen(true)}
            onOpenAgentModal={() => setIsAgentModalOpen(true)}
          />
        </section>

        {/* Modern Quick Tools Dock: Squircles con espacio amplio y feedback táctil (Anti-Amontonado) */}
        <section className="w-full max-w-2xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3 p-3 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            {/* 1. Flashlight */}
            <button
              onClick={handleToggleTorch}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="Linterna rápida"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 shadow-md ${
                systemState.torchOn
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/40 ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 group-hover:scale-105 group-hover:bg-amber-500/25'
              }`}>
                <Flashlight className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Linterna</span>
            </button>

            {/* 2. TalkBack / Screen Vision */}
            <button
              onClick={() => {
                if (isTalkBackActive) {
                  screenVisionTalkbackService.disableTalkBack(true);
                } else {
                  screenVisionTalkbackService.enableTalkBack(true);
                }
              }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="TalkBack / Accesibilidad"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 shadow-md ${
                isTalkBackActive
                  ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/40 ring-2 ring-cyan-400/40 animate-pulse'
                  : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 group-hover:bg-cyan-500/25'
              }`}>
                <Hand className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">TalkBack</span>
            </button>

            {/* 3. Communication Skills */}
            <button
              onClick={() => setIsSkillsModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="Mensajes y Llamadas"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md group-hover:scale-105 group-hover:bg-emerald-500/25 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Mensajes</span>
            </button>

            {/* 4. AI Observation Space */}
            <button
              onClick={() => setIsObservationModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="Espacio de Observación y Telemetría de IA"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-md group-hover:scale-105 group-hover:bg-indigo-500/25 transition-transform">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Espacio IA</span>
            </button>

            {/* 5. Database Nexus */}
            <button
              onClick={() => setIsDataManagerModalOpen(true)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="Base de Datos y Memoria"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-md group-hover:scale-105 group-hover:bg-purple-500/25 transition-transform">
                <Brain className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Memoria BD</span>
            </button>

            {/* 6. Floating Bubble */}
            <button
              onClick={handleToggleFloatingBubble}
              className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-800/50 transition-all duration-200 active:scale-95 group text-center"
              title="Burbuja flotante de ZANNA"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 shadow-md ${
                systemState.floatingBubbleActive
                  ? 'bg-sky-500 text-slate-950 shadow-sky-500/40 ring-2 ring-sky-400/40 animate-pulse'
                  : 'bg-sky-500/15 border border-sky-500/30 text-sky-400 group-hover:scale-105 group-hover:bg-sky-500/25'
              }`}>
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white">Burbuja</span>
            </button>
          </div>
        </section>

        {/* Collapsible Drawers Bar: Sleek Segmented Controller */}
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-md">
            <button
              onClick={() => setOpenSection(openSection === 'shortcuts' ? 'none' : 'shortcuts')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                openSection === 'shortcuts'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>Accesos Directos</span>
              {openSection === 'shortcuts' ? (
                <ChevronUp className="w-3.5 h-3.5 text-cyan-200" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            <button
              onClick={() => setOpenSection(openSection === 'hardware' ? 'none' : 'hardware')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                openSection === 'hardware'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Smartphone className="w-4 h-4 text-cyan-300" />
              <span>Panel de Control</span>
              {systemState.torchOn && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              {openSection === 'hardware' ? (
                <ChevronUp className="w-3.5 h-3.5 text-cyan-200" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            <button
              onClick={() => setOpenSection(openSection === 'history' ? 'none' : 'history')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                openSection === 'history'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <FileText className="w-4 h-4 text-purple-300" />
              <span>Opciones Historial</span>
              {messages.length > 0 && (
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                  {messages.length}
                </span>
              )}
              {openSection === 'history' ? (
                <ChevronUp className="w-3.5 h-3.5 text-cyan-200" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>

          {/* Active Collapsible Section Drawer (Opens & Closes Smoothly) */}
          {openSection !== 'none' && (
            <div className="mt-3 relative rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  {openSection === 'shortcuts' && <Zap className="w-4 h-4 text-cyan-400" />}
                  {openSection === 'hardware' && <Smartphone className="w-4 h-4 text-cyan-400" />}
                  {openSection === 'history' && <FileText className="w-4 h-4 text-purple-400" />}
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {openSection === 'shortcuts' && 'Accesos Directos y Comandos Rápidos'}
                    {openSection === 'hardware' && 'Panel de Control de Hardware Android'}
                    {openSection === 'history' && 'Gestión y Opciones de Conversación'}
                  </h3>
                </div>
                <button
                  onClick={() => setOpenSection('none')}
                  className="rounded-xl p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content 1: Shortcuts */}
              {openSection === 'shortcuts' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-cyan-300 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span>Hardware del Teléfono</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        `${settings.wakeWord || 'Zanna'}, activa la linterna`,
                        `${settings.wakeWord || 'Zanna'}, desactiva la linterna`,
                        `${settings.wakeWord || 'Zanna'}, activa la cámara`,
                        `${settings.wakeWord || 'Zanna'}, ¿cuánta batería tengo?`,
                        `${settings.wakeWord || 'Zanna'}, vibra 3 veces`,
                        `${settings.wakeWord || 'Zanna'}, pon temporizador de 5 minutos`,
                        `${settings.wakeWord || 'Zanna'}, diagnóstico del sistema`,
                        `${settings.wakeWord || 'Zanna'}, consulta la base de datos`,
                      ].map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleProcessInput(cmd)}
                          className="rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-500/50 hover:text-white hover:bg-cyan-950/30 transition-all active:scale-95 shadow-sm"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-300 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
                        <Calculator className="w-4 h-4" />
                      </div>
                      <span>Matemáticas y Razonamiento</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Cuánto es 45 por 18',
                        'Calcula el 15% de 800',
                        'Raíz cuadrada de 144',
                        'Calcula 2 elevado a la 10',
                        'Convierte 100 USD a EUR',
                      ].map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleProcessInput(cmd)}
                          className="rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-500/50 hover:text-white hover:bg-emerald-950/30 transition-all active:scale-95 shadow-sm"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-purple-300 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-950 border border-purple-800 text-purple-400">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <span>Programación y Código</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Código Python para invertir lista',
                        'Función async en TypeScript',
                        'Regex para validar email',
                        'Ejemplo de debounce en JS',
                      ].map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleProcessInput(cmd)}
                          className="rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 hover:border-purple-500/50 hover:text-white hover:bg-purple-950/30 transition-all active:scale-95 shadow-sm"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800/90 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-blue-300 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-950 border border-blue-800 text-blue-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span>Búsqueda e Información</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Busca en internet últimas noticias',
                        '¿Qué es la computación cuántica?',
                        '¿Cómo funciona la memoria RAM?',
                      ].map((cmd, i) => (
                        <button
                          key={i}
                          onClick={() => handleProcessInput(cmd)}
                          className="rounded-xl border border-slate-800/90 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 hover:border-blue-500/50 hover:text-white hover:bg-blue-950/30 transition-all active:scale-95 shadow-sm"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Content 2: Hardware Control Panel */}
              {openSection === 'hardware' && (
                <div className="w-full">
                  <AndroidPhoneCard
                    systemState={systemState}
                    onToggleTorch={handleToggleTorch}
                    onToggleDND={handleToggleDND}
                    onChangeVolume={handleChangeVolume}
                    onTestVibration={handleTestVibration}
                    onTriggerAction={handleProcessInput}
                    onDeleteTimer={handleDeleteTimer}
                    onDeleteNote={handleDeleteNote}
                  />
                </div>
              )}

              {/* Drawer Content 3: History Management */}
              {openSection === 'history' && (
                <div className="space-y-3 text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[11px] text-slate-400">Mensajes grabados</p>
                      <p className="text-xl font-bold text-cyan-400">{messages.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[11px] text-slate-400">Agente activo</p>
                      <p className="text-sm font-semibold text-white truncate">{activeAgent.name}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="text-[11px] text-slate-400">Modelo de IA</p>
                      <p className="text-sm font-semibold text-emerald-400 truncate">{activeModel.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(messages, null, 2));
                        const a = document.createElement('a');
                        a.href = dataStr;
                        a.download = `vozdroid-chat-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                      }}
                      disabled={messages.length === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar Conversación (.json)</span>
                    </button>

                    <button
                      onClick={handleClearChat}
                      disabled={messages.length === 0}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 disabled:opacity-40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar Historial</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRIMARY WINDOW: The Live Conversation Text Window (Always Main & Visible) */}
        <section className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
          <ChatHistory
            messages={messages}
            onPlayVoice={handleReplayVoice}
            onClearChat={handleClearChat}
          />
        </section>

      </main>

      {/* Footer Offline Notice */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 px-4 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Agente Activo: <strong className="text-cyan-400">{activeAgent.name}</strong> • Voz: {settings.voiceGender === 'female' ? 'Femenina' : 'Masculina'} • Modelo: {activeModel.name}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Privacidad total • Procesamiento 100% en el dispositivo • Sin conexión requerida
          </span>
        </div>
      </footer>

      {/* Modal: Agent Manager & Open Source Repository */}
      <AgentManagerModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        activeAgent={activeAgent}
        customAgents={customAgents}
        onSelectAgent={handleSelectAgent}
        onSaveCustomAgent={handleSaveCustomAgent}
        onDeleteCustomAgent={handleDeleteCustomAgent}
        onTestVoice={handleTestVoice}
      />

      {/* Modal: Voice Settings, Listening Modes (Push/Timed/Gemini) & Optional External API */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsModalOpen}
        onClose={() => setIsVoiceSettingsModalOpen(false)}
        settings={settings}
        availableVoices={availableVoices}
        onUpdateSettings={(newSettings) => {
          setSettings((prev) => {
            const updated = { ...prev, ...newSettings };
            saveSettings(updated);
            return updated;
          });
        }}
        onTestVoice={() => handleTestVoice()}
      />

      {/* Modal: Local AI Model Manager & File Loader (.gguf / weights) */}
      <LocalAiModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        availableModels={availableModels}
        activeModel={activeModel}
        settings={settings}
        onSelectModel={handleSelectModel}
        onUploadCustomModel={handleUploadCustomModel}
        onDeleteCustomModel={handleDeleteCustomModel}
        onRefreshModels={refreshSavedModels}
        onUpdateSettings={(newSettings) => {
          setSettings((prev) => {
            const updated = { ...prev, ...newSettings };
            saveSettings(updated);
            return updated;
          });
        }}
      />

      {/* Floating Notification Bubble (Background Mode Widget) */}
      <FloatingNotificationBubble
        isOpen={systemState.floatingBubbleActive}
        assistantState={assistantState}
        playbackState={playbackState}
        transcript={transcript}
        interimTranscript={interimTranscript}
        audioLevel={audioLevel}
        activeAgent={activeAgent}
        onToggleListening={handleToggleListening}
        onExpand={() => setSystemState((prev) => ({ ...prev, floatingBubbleActive: false }))}
        onClose={() => setSystemState((prev) => ({ ...prev, floatingBubbleActive: false }))}
        onPauseSpeaking={handlePauseSpeaking}
        onResumeSpeaking={handleResumeSpeaking}
      />

      {/* Modal: Android Permissions & Diagnostic Center */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          setIsFirstLaunch(false);
        }}
        permissions={permissions}
        onRequestAllPermissions={handleRequestAllPermissions}
        onRequestPermission={handleRequestPermission}
        isFirstLaunch={isFirstLaunch}
      />

      {/* Modal: Android Command Execution Terminal Logs */}
      <ActionLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        logs={actionLogs}
        onClearLogs={handleClearLogs}
      />

      {/* Modal: Communication Skills (WhatsApp, SMS, Email, Calls) */}
      <CommunicationSkillsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        onAnnounceVoice={(text) =>
          voiceService.speak(text, {
            gender: settings.voiceGender,
            rate: settings.speechRate,
            pitch: settings.speechPitch,
            voiceURI: settings.selectedVoiceURI,
          })
        }
        onExecuteCommand={handleProcessInput}
      />

      {/* Modal: Integrated Database Management Engine (IndexedDB) */}
      <DataManagerModal
        isOpen={isDataManagerModalOpen}
        onClose={() => setIsDataManagerModalOpen(false)}
        onDataModified={() => {
          refreshSavedModels();
        }}
      />

      {/* Modal: AI Observation Space & Real-time Auto-Refactoring Engine */}
      <AiObservationSpaceModal
        isOpen={isObservationModalOpen}
        onClose={() => setIsObservationModalOpen(false)}
        activeModel={activeModel}
        settings={settings}
        availableModels={availableModels}
      />

      {/* TalkBack Accessibility Navigation HUD */}
      <TalkBackHud />
    </div>
  );
}
