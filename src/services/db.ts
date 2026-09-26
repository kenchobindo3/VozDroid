import {
  VoiceMessage,
  AndroidAction,
  LocalModelConfig,
  AssistantSettings,
  AIAgent,
  ContactInfo,
  IncomingMessage,
  AutoRefactorPatch,
  SystemBackupSnapshot,
  AiKnowledgeItem,
  AiKnowledgeCategory,
  ReminderItem,
  AiTrainingSession,
} from '../types';

const DB_NAME = 'VozDroidDB';
const DB_VERSION = 6;

const STORE_KEY_PATHS: Record<string, string> = {
  messages: 'id',
  actions: 'id',
  models: 'id',
  settings: 'key',
  modelFiles: 'id',
  agents: 'id',
  contacts: 'id',
  incomingMessages: 'id',
  backups: 'id',
  patches: 'id',
  aiKnowledge: 'id',
  reminders: 'id',
  trainingSessions: 'id',
};

// --- ROBUST IN-MEMORY & LOCALSTORAGE FALLBACK STORE ---
const STORAGE_PREFIX = 'vozdroid_store_';

class FallbackStore {
  private memoryCache: Map<string, Map<string, any>> = new Map();

  private getKey(table: string, item: any): string {
    if (!item) return '';
    const keyPath = STORE_KEY_PATHS[table] || 'id';
    return String(item[keyPath] ?? item.id ?? item.key ?? '');
  }

  private initTable(table: string): Map<string, any> {
    if (this.memoryCache.has(table)) {
      return this.memoryCache.get(table)!;
    }

    const tableMap = new Map<string, any>();
    this.memoryCache.set(table, tableMap);

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + table);
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            for (const it of items) {
              const k = this.getKey(table, it);
              if (k) tableMap.set(k, it);
            }
          }
        }
      } catch {
        // Local storage not accessible or JSON invalid
      }
    }

    return tableMap;
  }

  private persistTable(table: string) {
    if (typeof localStorage === 'undefined') return;
    try {
      // Avoid writing massive binary objects to localStorage to prevent quota exhaustion
      if (table === 'modelFiles') return;
      const tableMap = this.initTable(table);
      const items = Array.from(tableMap.values());
      localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(items));
    } catch {
      // LocalStorage quota or access error; data remains in memoryCache safely
    }
  }

  public getAll(table: string): any[] {
    const tableMap = this.initTable(table);
    return Array.from(tableMap.values());
  }

  public get(table: string, key: string): any | null {
    const tableMap = this.initTable(table);
    return tableMap.get(String(key)) || null;
  }

  public put(table: string, item: any): void {
    const tableMap = this.initTable(table);
    const key = this.getKey(table, item);
    if (key) {
      tableMap.set(key, item);
      this.persistTable(table);
    }
  }

  public delete(table: string, key: string): void {
    const tableMap = this.initTable(table);
    tableMap.delete(String(key));
    this.persistTable(table);
  }

  public clear(table: string): void {
    const tableMap = this.initTable(table);
    tableMap.clear();
    this.persistTable(table);
  }
}

const fallbackStore = new FallbackStore();

// --- SINGLETON INDEXEDDB CONNECTION MANAGER ---
let cachedDb: IDBDatabase | null = null;
let openPromise: Promise<IDBDatabase | null> | null = null;
let idbDisabled = false;

async function openDB(): Promise<IDBDatabase | null> {
  if (idbDisabled) return null;
  if (cachedDb) return cachedDb;
  if (openPromise) return openPromise;

  openPromise = new Promise<IDBDatabase | null>((resolve) => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      idbDisabled = true;
      resolve(null);
      return;
    }

    let isDone = false;
    let timerId: any = null;

    const finish = (result: IDBDatabase | null, disableIdb = false) => {
      if (isDone) return;
      isDone = true;
      if (timerId) clearTimeout(timerId);
      if (disableIdb) idbDisabled = true;
      cachedDb = result;
      resolve(result);
    };

    // Safety timeout in case browser hangs on IndexedDB open
    timerId = setTimeout(() => {
      finish(null, true);
    }, 2000);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = () => {
        finish(null, true);
      };

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          for (const [storeName, keyPath] of Object.entries(STORE_KEY_PATHS)) {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath });
            }
          }
        } catch {
          finish(null, true);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          try {
            db.close();
          } catch {}
          cachedDb = null;
        };
        db.onerror = () => {
          cachedDb = null;
        };
        db.onclose = () => {
          cachedDb = null;
        };
        finish(db, false);
      };

      request.onerror = () => {
        finish(null, true);
      };
    } catch {
      finish(null, true);
    }
  }).finally(() => {
    openPromise = null;
  });

  return openPromise;
}

// Store transaction helper with automatic fallback
async function withStore<T>(
  table: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T>,
  fallbackOperation: () => T | Promise<T>
): Promise<T> {
  if (!idbDisabled) {
    try {
      const db = await openDB();
      if (db && !idbDisabled) {
        const tx = db.transaction(table, mode);
        const store = tx.objectStore(table);
        const result = await operation(store);
        if (mode === 'readwrite') {
          await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
            tx.onabort = () => rej(tx.error);
          });
        }
        return result;
      }
    } catch {
      idbDisabled = true;
    }
  }
  return await fallbackOperation();
}

// ==========================================
// MESSAGES API
// ==========================================
export async function getAllMessages(): Promise<VoiceMessage[]> {
  try {
    const list = await withStore<VoiceMessage[]>(
      'messages',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('messages')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('messages');
    list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return list;
  }
}

export async function saveMessage(msg: VoiceMessage): Promise<void> {
  try {
    await withStore<void>(
      'messages',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(msg);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('messages', msg);
      }
    );
  } catch {
    fallbackStore.put('messages', msg);
  }
}

export async function clearAllMessages(): Promise<void> {
  try {
    await withStore<void>(
      'messages',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.clear('messages');
      }
    );
  } catch {
    fallbackStore.clear('messages');
  }
}

// ==========================================
// ACTION LOGS API
// ==========================================
export async function saveActionLog(action: AndroidAction): Promise<void> {
  try {
    await withStore<void>(
      'actions',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(action);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('actions', action);
      }
    );
  } catch {
    fallbackStore.put('actions', action);
  }
}

export async function getAllActionLogs(): Promise<AndroidAction[]> {
  try {
    const list = await withStore<AndroidAction[]>(
      'actions',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('actions')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('actions');
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  }
}

export async function clearAllActionLogs(): Promise<void> {
  try {
    await withStore<void>(
      'actions',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.clear('actions');
      }
    );
  } catch {
    fallbackStore.clear('actions');
  }
}

// ==========================================
// SETTINGS API
// ==========================================
export async function getSettings(): Promise<AssistantSettings | null> {
  try {
    const res = await withStore<{ key: string; value: AssistantSettings } | null>(
      'settings',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.get('assistantSettings');
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.get('settings', 'assistantSettings')
    );
    return res?.value || null;
  } catch {
    const item = fallbackStore.get('settings', 'assistantSettings');
    return item?.value || null;
  }
}

export async function saveSettings(settings: AssistantSettings): Promise<void> {
  const item = { key: 'assistantSettings', value: settings };
  try {
    await withStore<void>(
      'settings',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('settings', item);
      }
    );
  } catch {
    fallbackStore.put('settings', item);
  }
}

// ==========================================
// LOCAL MODELS & FILES API
// ==========================================
export async function saveModelFile(id: string, file: File | Blob, metadata: LocalModelConfig): Promise<void> {
  if (!idbDisabled) {
    try {
      const db = await openDB();
      if (db && !idbDisabled) {
        const tx = db.transaction(['models', 'modelFiles'], 'readwrite');
        tx.objectStore('models').put(metadata);
        tx.objectStore('modelFiles').put({ id, file, name: metadata.name, updatedAt: Date.now() });
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        return;
      }
    } catch {
      idbDisabled = true;
    }
  }

  fallbackStore.put('models', metadata);
  fallbackStore.put('modelFiles', { id, file, name: metadata.name, updatedAt: Date.now() });
}

export async function getSavedModels(): Promise<LocalModelConfig[]> {
  try {
    const list = await withStore<LocalModelConfig[]>(
      'models',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('models')
    );
    return Array.isArray(list) ? list : [];
  } catch {
    return fallbackStore.getAll('models');
  }
}

export async function deleteCustomModel(id: string): Promise<void> {
  if (!idbDisabled) {
    try {
      const db = await openDB();
      if (db && !idbDisabled) {
        const tx = db.transaction(['models', 'modelFiles'], 'readwrite');
        tx.objectStore('models').delete(id);
        tx.objectStore('modelFiles').delete(id);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        return;
      }
    } catch {
      idbDisabled = true;
    }
  }

  fallbackStore.delete('models', id);
  fallbackStore.delete('modelFiles', id);
}

// ==========================================
// CUSTOM AGENTS API
// ==========================================
export async function saveCustomAgent(agent: AIAgent): Promise<void> {
  try {
    await withStore<void>(
      'agents',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(agent);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('agents', agent);
      }
    );
  } catch {
    fallbackStore.put('agents', agent);
  }
}

export async function getCustomAgents(): Promise<AIAgent[]> {
  try {
    const list = await withStore<AIAgent[]>(
      'agents',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('agents')
    );
    return Array.isArray(list) ? list : [];
  } catch {
    return fallbackStore.getAll('agents');
  }
}

export async function deleteCustomAgent(id: string): Promise<void> {
  try {
    await withStore<void>(
      'agents',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('agents', id);
      }
    );
  } catch {
    fallbackStore.delete('agents', id);
  }
}

// ==========================================
// CONTACTS API (WITH ALIASES & TELEGRAM)
// ==========================================
export const DEFAULT_CONTACTS: ContactInfo[] = [
  {
    id: 'contact-mama',
    name: 'Carmen Rodríguez',
    alias: 'Mamá',
    phone: '+52 55 1234 5678',
    email: 'mama@familia.com',
    telegramHandle: 'carmen_mama',
    relationship: 'Madre',
    avatarColor: '#ec4899',
    notes: 'Mamá - Reconocimiento por alias prioritario',
  },
  {
    id: 'contact-amor',
    name: 'Sofía Valenzuela',
    alias: 'Amor',
    phone: '+52 55 8765 4321',
    email: 'sofia@ejemplo.com',
    telegramHandle: 'sofi_val',
    relationship: 'Pareja',
    avatarColor: '#f43f5e',
    notes: 'Mi amor / pareja',
  },
  {
    id: 'contact-jefe',
    name: 'Ing. Carlos Mendoza',
    alias: 'Jefe',
    phone: '+52 55 9988 7766',
    email: 'carlos.mendoza@empresa.com',
    telegramHandle: 'cmendoza_tech',
    relationship: 'Trabajo',
    avatarColor: '#3b82f6',
    notes: 'Jefe de proyecto',
  },
  {
    id: 'contact-tia',
    name: 'Tía Elena',
    alias: 'Mi Tía',
    phone: '+52 55 4433 2211',
    email: 'elena@correo.com',
    telegramHandle: 'tia_elena',
    relationship: 'Familia',
    avatarColor: '#8b5cf6',
    notes: 'Tía Elena de Monterrey',
  },
];

export async function getAllContacts(): Promise<ContactInfo[]> {
  try {
    const list = await withStore<ContactInfo[]>(
      'contacts',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('contacts')
    );
    if (!list || list.length === 0) {
      // Seed default contacts
      for (const c of DEFAULT_CONTACTS) {
        await saveContact(c);
      }
      return DEFAULT_CONTACTS;
    }
    return Array.isArray(list) ? list : [];
  } catch {
    const mem = fallbackStore.getAll('contacts');
    if (!mem || mem.length === 0) {
      return DEFAULT_CONTACTS;
    }
    return mem;
  }
}

export async function saveContact(contact: ContactInfo): Promise<void> {
  try {
    await withStore<void>(
      'contacts',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(contact);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('contacts', contact);
      }
    );
  } catch {
    fallbackStore.put('contacts', contact);
  }
}

export async function deleteContact(id: string): Promise<void> {
  try {
    await withStore<void>(
      'contacts',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('contacts', id);
      }
    );
  } catch {
    fallbackStore.delete('contacts', id);
  }
}

// ==========================================
// REMINDERS API (SMART SLOTS & NOTIFICATIONS)
// ==========================================
export async function getAllReminders(): Promise<ReminderItem[]> {
  try {
    const list = await withStore<ReminderItem[]>(
      'reminders',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('reminders')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (a.targetTime || 0) - (b.targetTime || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('reminders');
    list.sort((a, b) => (a.targetTime || 0) - (b.targetTime || 0));
    return list;
  }
}

export async function saveReminder(item: ReminderItem): Promise<void> {
  try {
    await withStore<void>(
      'reminders',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('reminders', item);
      }
    );
  } catch {
    fallbackStore.put('reminders', item);
  }
}

export async function deleteReminder(id: string): Promise<void> {
  try {
    await withStore<void>(
      'reminders',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('reminders', id);
      }
    );
  } catch {
    fallbackStore.delete('reminders', id);
  }
}

export async function toggleReminderCompleted(id: string): Promise<void> {
  const reminders = await getAllReminders();
  const target = reminders.find((r) => r.id === id);
  if (target) {
    target.completed = !target.completed;
    await saveReminder(target);
  }
}

// ==========================================
// LOCAL AI TRAINING SESSIONS API
// ==========================================
export const DEFAULT_TRAINING_SESSIONS: AiTrainingSession[] = [
  {
    id: 'session-core-commands',
    name: 'Sesión 1: Control Universal Android y Privacidad',
    description: 'Alineación de instrucciones de Zanna para comandos de hardware, cámara, linterna y privacidad total offline.',
    epochCount: 5,
    learningRate: 0.0003,
    status: 'applied',
    trainedAt: Date.now() - 3600000 * 24,
    metrics: {
      loss: 0.021,
      accuracy: 99.4,
      tokensTrained: 8400,
      durationSeconds: 14,
    },
    samples: [
      {
        id: 's1',
        prompt: '¿Quién eres y qué puedes hacer?',
        idealResponse: 'Soy Zanna, tu asistente multimodal para Android inspirada en JARVIS. Controlo el hardware, la música, llamadas, contactos y analizo datos de forma 100% offline.',
        category: 'personality',
        created: Date.now(),
      },
      {
        id: 's2',
        prompt: 'Llama a mi mamá o mándale un mensaje por telegram',
        idealResponse: 'Comprendo. Accedo a los contactos por el alias "Mamá", redacto el texto y abro el canal directo de llamada o Telegram de forma inmediata.',
        category: 'device_control',
        created: Date.now(),
      },
      {
        id: 's3',
        prompt: 'Recuérdame lavar la ropa a las 9 am',
        idealResponse: 'Agendo inmediatamente el recordatorio "lavar la ropa" a las 9:00 AM con alarma persistente, vibración y notificación.',
        category: 'command',
        created: Date.now(),
      },
    ],
  },
  {
    id: 'session-multimodal-reasoning',
    name: 'Sesión 2: Razonamiento Factual y Búsqueda en Segundo Plano',
    description: 'Entrenamiento para responder con base en conocimiento local, admitir cuando no se sabe o buscar en internet en segundo plano.',
    epochCount: 8,
    learningRate: 0.0002,
    status: 'completed',
    trainedAt: Date.now() - 3600000 * 6,
    metrics: {
      loss: 0.018,
      accuracy: 99.7,
      tokensTrained: 12600,
      durationSeconds: 19,
    },
    samples: [
      {
        id: 's4',
        prompt: 'Si no sabes una respuesta, ¿qué debes hacer?',
        idealResponse: 'Si conozco la respuesta, te la explico con precisión. Si requiere datos de la red, realizo una búsqueda en segundo plano. Si no dispongo de los datos, te indico claramente que no lo sé o puedo aprenderlo mediante una nueva sesión de entrenamiento.',
        category: 'reasoning',
        created: Date.now(),
      },
    ],
  },
];

export async function getAllTrainingSessions(): Promise<AiTrainingSession[]> {
  try {
    const list = await withStore<AiTrainingSession[]>(
      'trainingSessions',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('trainingSessions')
    );
    if (!list || list.length === 0) {
      for (const s of DEFAULT_TRAINING_SESSIONS) {
        await saveTrainingSession(s);
      }
      return DEFAULT_TRAINING_SESSIONS;
    }
    return Array.isArray(list) ? list : [];
  } catch {
    const mem = fallbackStore.getAll('trainingSessions');
    if (!mem || mem.length === 0) {
      return DEFAULT_TRAINING_SESSIONS;
    }
    return mem;
  }
}

export async function saveTrainingSession(session: AiTrainingSession): Promise<void> {
  try {
    await withStore<void>(
      'trainingSessions',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(session);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('trainingSessions', session);
      }
    );
  } catch {
    fallbackStore.put('trainingSessions', session);
  }
}

export async function deleteTrainingSession(id: string): Promise<void> {
  try {
    await withStore<void>(
      'trainingSessions',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('trainingSessions', id);
      }
    );
  } catch {
    fallbackStore.delete('trainingSessions', id);
  }
}

// ==========================================
// INCOMING MESSAGES API
// ==========================================
export async function getAllIncomingMessages(): Promise<IncomingMessage[]> {
  try {
    const list = await withStore<IncomingMessage[]>(
      'incomingMessages',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('incomingMessages')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('incomingMessages');
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  }
}

export async function saveIncomingMessage(msg: IncomingMessage): Promise<void> {
  try {
    await withStore<void>(
      'incomingMessages',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(msg);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('incomingMessages', msg);
      }
    );
  } catch {
    fallbackStore.put('incomingMessages', msg);
  }
}

export async function deleteIncomingMessage(id: string): Promise<void> {
  try {
    await withStore<void>(
      'incomingMessages',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('incomingMessages', id);
      }
    );
  } catch {
    fallbackStore.delete('incomingMessages', id);
  }
}

// ==========================================
// BACKUPS API
// ==========================================
export async function getAllBackups(): Promise<SystemBackupSnapshot[]> {
  try {
    const list = await withStore<SystemBackupSnapshot[]>(
      'backups',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('backups')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('backups');
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list;
  }
}

export async function saveBackup(backup: SystemBackupSnapshot): Promise<void> {
  try {
    await withStore<void>(
      'backups',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(backup);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('backups', backup);
      }
    );
  } catch {
    fallbackStore.put('backups', backup);
  }
}

export async function deleteBackup(id: string): Promise<void> {
  try {
    await withStore<void>(
      'backups',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('backups', id);
      }
    );
  } catch {
    fallbackStore.delete('backups', id);
  }
}

// ==========================================
// PATCHES API
// ==========================================
export async function getAllPatches(): Promise<AutoRefactorPatch[]> {
  try {
    const list = await withStore<AutoRefactorPatch[]>(
      'patches',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        }),
      () => fallbackStore.getAll('patches')
    );
    const sorted = Array.isArray(list) ? [...list] : [];
    sorted.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
    return sorted;
  } catch {
    const list = fallbackStore.getAll('patches');
    list.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
    return list;
  }
}

export async function savePatch(patch: AutoRefactorPatch): Promise<void> {
  try {
    await withStore<void>(
      'patches',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(patch);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('patches', patch);
      }
    );
  } catch {
    fallbackStore.put('patches', patch);
  }
}

// ==========================================
// AI LEARNING & KNOWLEDGE BASE
// ==========================================
export const SEED_AI_KNOWLEDGE: AiKnowledgeItem[] = [
  {
    id: 'learn-precommand-1',
    topic: 'Precomando de Activación de Hardware',
    content: 'Para evitar confusiones con la IA conversacional, las acciones directas de hardware responden prioritariamente al precomando "Zanna" o al nombre configurado por el usuario (ej: "Zanna, activa la linterna", "Zanna, activa la cámara").',
    category: 'command_pattern',
    learnedBy: 'ZANNA Core',
    confidence: 100,
    source: 'autonomous_voice',
    tags: ['precomando', 'zanna', 'hardware', 'linterna', 'camara'],
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now(),
    accessCount: 42,
  },
  {
    id: 'learn-hardware-control-2',
    topic: 'Control Físico Autónomo sin Internet',
    content: 'La linterna, cámara, temporizadores de cuenta regresiva, niveles de batería y vibración háptica se gestionan directamente a través de las APIs del navegador y sensores locales del dispositivo Android sin requerir datos móviles ni Wi-Fi.',
    category: 'hardware',
    learnedBy: 'ZANNA AI',
    confidence: 98,
    source: 'autonomous_voice',
    tags: ['offline', 'sensores', 'bateria', 'linterna', 'hardware'],
    createdAt: Date.now() - 3600000 * 20,
    updatedAt: Date.now(),
    accessCount: 38,
  },
  {
    id: 'learn-db-management-3',
    topic: 'Administración Autónoma de Datos con Nexus DB',
    content: 'El agente local Nexus DB supervisa la integridad de las tablas IndexedDB, ejecuta censos automáticos de registros, purga logs antiguos y emite respaldos JSON para evitar pérdida de datos del usuario o del aprendizaje de las IAs.',
    category: 'reasoning',
    learnedBy: 'Nexus DB',
    confidence: 96,
    source: 'autonomous_voice',
    tags: ['nexus-db', 'indexeddb', 'respaldo', 'censo', 'persistencia'],
    createdAt: Date.now() - 3600000 * 15,
    updatedAt: Date.now(),
    accessCount: 29,
  },
  {
    id: 'learn-accessibility-talkback-4',
    topic: 'Accesibilidad TalkBack y Visión de Pantalla',
    content: 'El motor local inspecciona elementos DOM en tiempo real, genera un mapa de controles interactivos (botones, campos de texto, switches) y permite su pulsación mediante voz o lectura audible asistida.',
    category: 'context',
    learnedBy: 'VozDroid Core',
    confidence: 95,
    source: 'interaction',
    tags: ['accesibilidad', 'talkback', 'pantalla', 'vision'],
    createdAt: Date.now() - 3600000 * 10,
    updatedAt: Date.now(),
    accessCount: 19,
  },
  {
    id: 'learn-voice-synthesis-5',
    topic: 'Doble Síntesis Vocal Femenina / Masculina',
    content: 'El motor TTS local prioriza voces fluidas en español detectadas en el sistema (es-ES, es-419, es-MX), adaptando pitch y velocidad para naturalidad sin ecos ni solapamientos de audio.',
    category: 'preference',
    learnedBy: 'ZANNA AI',
    confidence: 99,
    source: 'user_defined',
    tags: ['tts', 'voces', 'femenina', 'masculina', 'audio'],
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now(),
    accessCount: 31,
  },
];

export async function getAllAiKnowledge(): Promise<AiKnowledgeItem[]> {
  try {
    const list = await withStore<AiKnowledgeItem[]>(
      'aiKnowledge',
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        }),
      () => fallbackStore.getAll('aiKnowledge')
    );

    let items = Array.isArray(list) ? [...list] : [];
    if (items.length === 0) {
      for (const seed of SEED_AI_KNOWLEDGE) {
        await saveAiKnowledge(seed);
      }
      items = [...SEED_AI_KNOWLEDGE];
    }
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return items;
  } catch {
    let items = fallbackStore.getAll('aiKnowledge');
    if (items.length === 0) {
      items = [...SEED_AI_KNOWLEDGE];
      for (const seed of SEED_AI_KNOWLEDGE) {
        fallbackStore.put('aiKnowledge', seed);
      }
    }
    items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return items;
  }
}

export const getAllKnowledge = getAllAiKnowledge;
export const saveKnowledge = saveAiKnowledge;

export async function saveAiKnowledge(item: AiKnowledgeItem): Promise<void> {
  try {
    await withStore<void>(
      'aiKnowledge',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put('aiKnowledge', item);
      }
    );
  } catch {
    fallbackStore.put('aiKnowledge', item);
  }
}

export async function deleteAiKnowledge(id: string): Promise<void> {
  try {
    await withStore<void>(
      'aiKnowledge',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete('aiKnowledge', id);
      }
    );
  } catch {
    fallbackStore.delete('aiKnowledge', id);
  }
}

export async function clearAllAiKnowledge(): Promise<void> {
  try {
    await withStore<void>(
      'aiKnowledge',
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.clear('aiKnowledge');
      }
    );
  } catch {
    fallbackStore.clear('aiKnowledge');
  }
}

export async function recordLearnedFact(
  topic: string,
  content: string,
  category: AiKnowledgeCategory,
  learnedBy: string = 'VozDroid Core',
  tags: string[] = []
): Promise<AiKnowledgeItem> {
  const newItem: AiKnowledgeItem = {
    id: 'learn-' + Math.random().toString(36).substring(2, 9),
    topic,
    content,
    category,
    learnedBy,
    confidence: 96,
    source: 'autonomous_voice',
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    accessCount: 1,
  };
  await saveAiKnowledge(newItem);
  return newItem;
}

export async function exportAiKnowledgeDump(): Promise<string> {
  const items = await getAllAiKnowledge();
  return JSON.stringify(
    {
      exportType: 'VozDroid_LocalAI_KnowledgeBase',
      version: '1.0',
      exportedAt: Date.now(),
      totalItems: items.length,
      knowledge: items,
    },
    null,
    2
  );
}

export async function importAiKnowledgeDump(
  jsonString: string
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    const list: AiKnowledgeItem[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.knowledge)
      ? parsed.knowledge
      : null;

    if (!list || !Array.isArray(list)) {
      return {
        success: false,
        importedCount: 0,
        error: 'Formato inválido. Se esperaba una lista de conocimientos o {"knowledge": [...]}.',
      };
    }

    let count = 0;
    for (const item of list) {
      if (item && item.topic && item.content) {
        const validated: AiKnowledgeItem = {
          id: item.id || 'learn-' + Math.random().toString(36).substring(2, 9),
          topic: String(item.topic),
          content: String(item.content),
          category: item.category || 'reasoning',
          learnedBy: item.learnedBy || 'Imported Knowledge',
          confidence: Number(item.confidence) || 90,
          source: 'imported_pack',
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now(),
          accessCount: item.accessCount || 0,
        };
        await saveAiKnowledge(validated);
        count++;
      }
    }
    return { success: true, importedCount: count };
  } catch (err: any) {
    return { success: false, importedCount: 0, error: err?.message || 'Error al importar base de aprendizaje' };
  }
}

// ==========================================
// DATABASE MANAGEMENT ENGINE HELPERS
// ==========================================
export const DB_TABLE_NAMES = [
  'messages',
  'actions',
  'models',
  'agents',
  'contacts',
  'incomingMessages',
  'settings',
  'backups',
  'patches',
  'aiKnowledge',
] as const;

export type DbTableName = (typeof DB_TABLE_NAMES)[number];

export async function getTableRecords(table: DbTableName): Promise<any[]> {
  try {
    return await withStore<any[]>(
      table,
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        }),
      () => fallbackStore.getAll(table)
    );
  } catch {
    return fallbackStore.getAll(table);
  }
}

export async function putTableRecord(table: DbTableName, record: any): Promise<void> {
  try {
    await withStore<void>(
      table,
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.put(table, record);
      }
    );
  } catch {
    fallbackStore.put(table, record);
  }
}

export async function deleteTableRecord(table: DbTableName, key: any): Promise<void> {
  try {
    await withStore<void>(
      table,
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.delete(table, key);
      }
    );
  } catch {
    fallbackStore.delete(table, key);
  }
}

export async function clearTableRecords(table: DbTableName): Promise<void> {
  try {
    await withStore<void>(
      table,
      'readwrite',
      (store) =>
        new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
      () => {
        fallbackStore.clear(table);
      }
    );
  } catch {
    fallbackStore.clear(table);
  }
}

export async function exportDatabaseDump(): Promise<string> {
  const dump: Record<string, any[]> = {};
  for (const table of DB_TABLE_NAMES) {
    dump[table] = await getTableRecords(table);
  }
  return JSON.stringify(dump, null, 2);
}

export async function importDatabaseDump(
  jsonString: string
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, importedCount: 0, error: 'Formato JSON inválido.' };
    }

    let count = 0;
    for (const table of DB_TABLE_NAMES) {
      if (Array.isArray(parsed[table])) {
        const items = parsed[table];
        for (const item of items) {
          if (item) {
            await putTableRecord(table, item);
            count++;
          }
        }
      }
    }
    return { success: true, importedCount: count };
  } catch (err: any) {
    return { success: false, importedCount: 0, error: err?.message || 'Error al importar datos' };
  }
}
