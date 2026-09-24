export type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing';
export type SpeechPlaybackState = 'idle' | 'speaking' | 'paused';
export type ListeningMode = 'push_to_talk' | 'timed' | 'always_on_gemini';
export type VoiceGender = 'female' | 'male' | 'system';

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  audioDuration?: number;
  actionsExecuted?: AndroidAction[];
  modelUsed?: string;
  agentUsed?: string;
  executionTimeMs?: number;
}

export type AndroidActionType =
  | 'TOGGLE_TORCH'
  | 'SET_TORCH'
  | 'TOGGLE_WIFI'
  | 'TOGGLE_BLUETOOTH'
  | 'VIBRATE'
  | 'GET_BATTERY'
  | 'SET_VOLUME'
  | 'TOGGLE_DND'
  | 'SET_BRIGHTNESS'
  | 'MAKE_CALL'
  | 'SEND_SMS'
  | 'SEND_WHATSAPP'
  | 'SET_ALARM'
  | 'SET_TIMER'
  | 'OPEN_CAMERA'
  | 'OPEN_APP'
  | 'OPEN_MAPS'
  | 'GET_LOCATION'
  | 'COPY_CLIPBOARD'
  | 'TAKE_NOTE'
  | 'SYSTEM_DIAGNOSTIC'
  | 'TOGGLE_WAKELOCK'
  | 'CALCULATION'
  | 'CODE_GENERATION'
  | 'WEB_SEARCH'
  | 'SCREEN_VISION'
  | 'TALKBACK_ACTION'
  | 'REPLY_MESSAGE'
  | 'SEND_EMAIL'
  | 'READ_NOTIFICATIONS'
  | 'AUTO_REFACTOR'
  | 'DATA_MANAGEMENT'
  | 'CUSTOM_INTENT';

export interface AndroidAction {
  id: string;
  type: AndroidActionType;
  title: string;
  description: string;
  params?: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  resultMessage?: string;
  timestamp: number;
}

export interface AndroidSystemState {
  torchOn: boolean;
  batteryLevel: number;
  isCharging: boolean;
  volume: number; // 0 to 100
  brightness: number; // 0 to 100
  doNotDisturb: boolean;
  wakeLockActive: boolean;
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  airplaneMode: boolean;
  floatingBubbleActive: boolean;
  activeTimers: ActiveTimer[];
  notes: string[];
}

export interface ActiveTimer {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  createdAt: number;
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number; // 0 to 100
  bytesDownloaded: number;
  totalBytes: number;
  speedMBs: number;
  status: 'downloading' | 'completed' | 'paused' | 'error';
  error?: string;
}

export interface LocalModelConfig {
  id: string;
  name: string;
  size: string;
  description: string;
  isCustom?: boolean;
  isLoaded: boolean;
  type: 'rule_neural' | 'gguf_wasm' | 'webllm' | 'ollama_hub';
  quantization?: string;
  fileName?: string;
  fileSizeBytes?: number;
  loadedAt?: number;
  family?: 'gemma' | 'qwen' | 'smollm' | 'llama' | 'ollama' | 'deepseek' | 'custom';
  downloadUrl?: string;
  isDownloaded?: boolean;
  downloadProgress?: number;
}

export interface AIAgent {
  id: string;
  name: string;
  avatar: string;
  role: string;
  description: string;
  systemPrompt: string;
  personality: string;
  voiceGender: VoiceGender;
  source: 'preset' | 'open_source_repo' | 'custom_upload';
  allowedTools: AndroidActionType[];
  isCustom?: boolean;
  tags: string[];
  createdAt?: number;
}

export interface ExternalApiConfig {
  enabled: boolean;
  type: 'none' | 'openai_compatible' | 'ollama_local' | 'custom_webhook';
  url: string;
  apiKey: string;
  modelName: string;
}

export interface PermissionStatusMap {
  microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
  torch: 'granted' | 'denied' | 'prompt' | 'unsupported';
  battery: 'granted' | 'denied' | 'prompt' | 'unsupported';
  vibration: 'granted' | 'denied' | 'prompt' | 'unsupported';
  notifications: 'granted' | 'denied' | 'prompt' | 'unsupported';
  wakeLock: 'granted' | 'denied' | 'prompt' | 'unsupported';
  geolocation: 'granted' | 'denied' | 'prompt' | 'unsupported';
  clipboard: 'granted' | 'denied' | 'prompt' | 'unsupported';
  screenVision: 'granted' | 'denied' | 'prompt' | 'unsupported';
  accessibilityTalkBack: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

export interface ScreenElementInfo {
  id: string;
  tagName: string;
  role: string;
  label: string;
  text: string;
  isClickable: boolean;
  rect: { top: number; left: number; width: number; height: number };
  selector: string;
}

export interface ScreenAnalysisResult {
  timestamp: number;
  title: string;
  summary: string;
  detailedDescription: string;
  visibleCards: string[];
  systemStatusText: string;
  activeConversationSnippet: string;
  elements: ScreenElementInfo[];
  screenshotDataUrl?: string;
}

export interface TalkBackState {
  enabled: boolean;
  focusedIndex: number;
  focusedElement: ScreenElementInfo | null;
  speechMuted: boolean;
  lastAnnouncement: string;
}

export interface AssistantSettings {
  hotwordEnabled: boolean;
  hotword: string;
  wakeWord?: string; // Customizable precommand (e.g. "Zanna", "Comando")
  requireWakeWordForCommands?: boolean; // If enabled, system commands require the precommand to avoid confusing AI reasoning
  listeningMode: ListeningMode;
  listeningDurationSeconds: number; // 0 = unlimited / continuous
  bargeInEnabled: boolean; // interrupt TTS if user starts speaking
  speechRate: number;
  speechPitch: number;
  voiceGender: VoiceGender;
  selectedVoiceURI: string;
  soundEffectsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
  autonomousExecution: boolean;
  autoSpeakResponse: boolean;
  language: string;
  activeAgentId: string;
  externalApi: ExternalApiConfig;
  floatingBubbleEnabled: boolean;
  alwaysOnWatchdog: boolean;
}

export interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship?: string;
  avatarColor?: string;
  notes?: string;
}

export interface IncomingMessage {
  id: string;
  sender: string;
  senderPhone?: string;
  senderEmail?: string;
  app: 'whatsapp' | 'sms' | 'email';
  content: string;
  timestamp: number;
  status: 'unread' | 'read' | 'replied';
  replyText?: string;
}

export interface AutoRefactorPatch {
  id: string;
  title: string;
  targetModule: string;
  detectedIssue: string;
  resolutionCode: string;
  appliedAt: number;
  rollbackAvailable: boolean;
  metricsBefore: { latencyMs: number; memoryMB: number; errorRate: number };
  metricsAfter: { latencyMs: number; memoryMB: number; errorRate: number };
}

export interface SystemBackupSnapshot {
  id: string;
  version: string;
  timestamp: number;
  label: string;
  components?: {
    settings: AssistantSettings;
    contacts: ContactInfo[];
    models: LocalModelConfig[];
    systemState: Partial<AndroidSystemState>;
    patches: AutoRefactorPatch[];
  };
  snapshotData?: string;
  integrityHash: string;
}

export interface DatabaseTableMeta {
  name: string;
  count: number;
  sizeBytes: number;
  lastModified: number;
}

export type AiKnowledgeCategory =
  | 'preference'
  | 'command_pattern'
  | 'hardware'
  | 'context'
  | 'reasoning'
  | 'memory';

export interface AiKnowledgeItem {
  id: string;
  topic: string;
  content: string;
  category: AiKnowledgeCategory;
  learnedBy: string; // e.g. "ZANNA AI", "Nexus DB", "Coder Local"
  confidence: number; // 0 to 100
  source: 'autonomous_voice' | 'interaction' | 'user_defined' | 'imported_pack';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  accessCount: number;
}


