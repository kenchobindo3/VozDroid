// Screen Vision, Visual Inspector & TalkBack Accessibility Engine
// Allows the assistant to "see the screen", read what is displayed,
// analyze UI context, navigate elements like Android TalkBack,
// and execute spoken UI actions via local AI & intent routing.

import { ScreenAnalysisResult, ScreenElementInfo, TalkBackState } from '../types';
import { voiceService } from './voice';
import { hardwareService } from './hardware';

class ScreenVisionTalkbackService {
  private talkBackEnabled: boolean = false;
  private focusedIndex: number = -1;
  private cachedElements: ScreenElementInfo[] = [];
  private lastAnalysis: ScreenAnalysisResult | null = null;
  private stateSubscribers: Set<(state: TalkBackState) => void> = new Set();
  private highlightOverlay: HTMLDivElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-scan when DOM changes
      window.addEventListener('resize', () => {
        if (this.talkBackEnabled) {
          this.refreshFocusHighlight();
        }
      });
    }
  }

  // --- 1. SCREEN DOM INSPECTION & VISION ANALYSIS ---
  public inspectScreen(): ScreenAnalysisResult {
    if (typeof document === 'undefined') {
      return {
        timestamp: Date.now(),
        title: 'Entorno no disponible',
        summary: 'No se puede inspeccionar la pantalla en este entorno.',
        detailedDescription: '',
        visibleCards: [],
        systemStatusText: '',
        activeConversationSnippet: '',
        elements: [],
      };
    }

    const elements: ScreenElementInfo[] = [];
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      '[role="button"]',
      '[role="switch"]',
      '[role="tab"]',
    ];

    const foundDomElements = document.querySelectorAll(interactiveSelectors.join(','));
    let idx = 0;

    foundDomElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      // Filter visible elements
      const rect = htmlEl.getBoundingClientRect();
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top >= 0 &&
        rect.top <= window.innerHeight &&
        window.getComputedStyle(htmlEl).display !== 'none' &&
        window.getComputedStyle(htmlEl).visibility !== 'hidden';

      if (isVisible) {
        let label =
          htmlEl.getAttribute('aria-label') ||
          htmlEl.getAttribute('title') ||
          htmlEl.innerText ||
          htmlEl.getAttribute('placeholder') ||
          '';

        label = label.replace(/\s+/g, ' ').trim();
        if (label.length > 50) label = label.substring(0, 50) + '...';

        const role = htmlEl.getAttribute('role') || htmlEl.tagName.toLowerCase();
        const id = htmlEl.id || `el-${idx}-${htmlEl.tagName.toLowerCase()}`;

        elements.push({
          id,
          tagName: htmlEl.tagName.toLowerCase(),
          role,
          label: label || `Elemento ${htmlEl.tagName}`,
          text: (htmlEl.innerText || '').slice(0, 80).trim(),
          isClickable: true,
          rect: {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          selector: this.getElementSelector(htmlEl),
        });
        idx++;
      }
    });

    this.cachedElements = elements;

    // Detect visible cards and panels
    const visibleCards: string[] = [];
    if (document.querySelector('[data-card="phone"]')) visibleCards.push('Panel de Hardware Android');
    if (document.querySelector('[data-card="chat"]')) visibleCards.push('Historial de Conversación');
    if (document.querySelector('[data-card="spectrum"]')) visibleCards.push('Espectro de Frecuencia y Micrófono');

    // Extract conversation messages snippet
    const messageElements = document.querySelectorAll('[data-chat-message]');
    const messagesText: string[] = [];
    messageElements.forEach((m) => {
      const text = (m as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
      if (text) messagesText.push(text);
    });
    const activeConversationSnippet = messagesText.slice(-3).join(' | ');

    // Extract system status info (battery, torch, DND)
    const statusTextParts: string[] = [];
    const batteryBadge = document.querySelector('[data-status="battery"]');
    if (batteryBadge) statusTextParts.push(`Batería: ${(batteryBadge as HTMLElement).innerText.trim()}`);
    const torchBadge = document.querySelector('[data-status="torch"]');
    if (torchBadge) statusTextParts.push('Linterna encendida');
    const systemStatusText = statusTextParts.join(', ') || 'Sistema nominal';

    const summary = `En pantalla se encuentran ${elements.length} elementos interactivos. Paneles visibles: ${
      visibleCards.length > 0 ? visibleCards.join(', ') : 'Conversación principal y orbe de voz'
    }. ${systemStatusText}.`;

    const detailedDescription = `Pantalla del Asistente Android: ${summary} Mensajes recientes: ${
      activeConversationSnippet || 'Sin mensajes nuevos'
    }. Botones principales: ${elements
      .slice(0, 6)
      .map((e) => `"${e.label}"`)
      .join(', ')}.`;

    const result: ScreenAnalysisResult = {
      timestamp: Date.now(),
      title: document.title || 'Asistente Android',
      summary,
      detailedDescription,
      visibleCards,
      systemStatusText,
      activeConversationSnippet,
      elements,
    };

    this.lastAnalysis = result;
    return result;
  }

  // --- 2. SCREEN MEDIA CAPTURE (OPTIONAL SYSTEM SCREENSHOT) ---
  public async captureScreenMedia(): Promise<{ success: boolean; dataUrl?: string; message: string }> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        return {
          success: false,
          message: 'La captura de pantalla por getDisplayMedia no está disponible en este navegador.',
        };
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Stop stream tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      return {
        success: true,
        dataUrl,
        message: 'Captura visual de pantalla obtenida con éxito.',
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Aviso al capturar pantalla: ${e.message || e}`,
      };
    }
  }

  // --- 3. ANALYZE & READ SCREEN ALOUD ---
  public async readScreenAloud(): Promise<string> {
    const analysis = this.inspectScreen();
    const narration = `Leyendo pantalla: ${analysis.summary}. ${
      analysis.activeConversationSnippet
        ? `Última interacción: ${analysis.activeConversationSnippet}.`
        : ''
    } ¿Deseas que ejecute alguna acción o toque algún botón?`;

    voiceService.speak(narration);
    return narration;
  }

  // --- 4. TALKBACK ACCESSIBILITY ENGINE ---
  public isTalkBackActive(): boolean {
    return this.talkBackEnabled;
  }

  public enableTalkBack(speakAnnouncement: boolean = true): void {
    this.talkBackEnabled = true;
    this.inspectScreen();
    this.focusedIndex = 0;
    this.createHighlightOverlay();
    this.focusCurrentElement(speakAnnouncement);
    this.notifySubscribers();

    if (speakAnnouncement) {
      voiceService.speak('TalkBack activado. Modo de accesibilidad y lector de pantalla encendido.', {
        rate: 1.0,
      });
    }
  }

  public disableTalkBack(speakAnnouncement: boolean = true): void {
    this.talkBackEnabled = false;
    this.focusedIndex = -1;
    this.removeHighlightOverlay();
    this.notifySubscribers();

    if (speakAnnouncement) {
      voiceService.speak('TalkBack desactivado.', { rate: 1.0 });
    }
  }

  public toggleTalkBack(): boolean {
    if (this.talkBackEnabled) {
      this.disableTalkBack(true);
      return false;
    } else {
      this.enableTalkBack(true);
      return true;
    }
  }

  public nextElement(): void {
    if (!this.talkBackEnabled) {
      this.enableTalkBack(false);
      return;
    }

    this.inspectScreen();
    if (this.cachedElements.length === 0) return;

    this.focusedIndex = (this.focusedIndex + 1) % this.cachedElements.length;
    this.focusCurrentElement(true);
    hardwareService.vibrate(30);
  }

  public previousElement(): void {
    if (!this.talkBackEnabled) {
      this.enableTalkBack(false);
      return;
    }

    this.inspectScreen();
    if (this.cachedElements.length === 0) return;

    this.focusedIndex =
      (this.focusedIndex - 1 + this.cachedElements.length) % this.cachedElements.length;
    this.focusCurrentElement(true);
    hardwareService.vibrate(30);
  }

  public activateFocusedElement(): boolean {
    if (!this.talkBackEnabled || this.focusedIndex < 0 || !this.cachedElements[this.focusedIndex]) {
      return false;
    }

    const elInfo = this.cachedElements[this.focusedIndex];
    const domEl = document.querySelector(elInfo.selector) as HTMLElement;

    if (domEl) {
      hardwareService.vibrate([40, 30, 40]);
      voiceService.speak(`Activando ${elInfo.label}`);
      domEl.click();
      setTimeout(() => {
        this.inspectScreen();
        this.refreshFocusHighlight();
      }, 300);
      return true;
    }
    return false;
  }

  private focusCurrentElement(speak: boolean) {
    if (this.focusedIndex < 0 || this.focusedIndex >= this.cachedElements.length) {
      return;
    }

    const el = this.cachedElements[this.focusedIndex];
    this.refreshFocusHighlight();

    if (speak) {
      const typeText = el.role === 'button' ? 'Botón' : el.role === 'switch' ? 'Interruptor' : 'Elemento';
      const announcement = `${typeText}: ${el.label}. Toca para activar.`;
      voiceService.speak(announcement, { rate: 1.05 });
    }
    this.notifySubscribers();
  }

  private createHighlightOverlay() {
    if (typeof document === 'undefined') return;
    if (this.highlightOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'talkback-highlighter';
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '99999';
    overlay.style.border = '3px solid #06b6d4';
    overlay.style.borderRadius = '12px';
    overlay.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), inset 0 0 10px rgba(6, 182, 212, 0.2)';
    overlay.style.transition = 'all 0.15s ease-out';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    this.highlightOverlay = overlay;
  }

  private removeHighlightOverlay() {
    if (this.highlightOverlay) {
      try {
        this.highlightOverlay.remove();
      } catch (_) {}
      this.highlightOverlay = null;
    }
  }

  private refreshFocusHighlight() {
    if (!this.highlightOverlay) {
      this.createHighlightOverlay();
    }
    if (!this.highlightOverlay) return;

    if (this.focusedIndex < 0 || this.focusedIndex >= this.cachedElements.length) {
      this.highlightOverlay.style.display = 'none';
      return;
    }

    const elInfo = this.cachedElements[this.focusedIndex];
    const domEl = document.querySelector(elInfo.selector) as HTMLElement;

    if (domEl) {
      const rect = domEl.getBoundingClientRect();
      this.highlightOverlay.style.display = 'block';
      this.highlightOverlay.style.top = `${rect.top - 4}px`;
      this.highlightOverlay.style.left = `${rect.left - 4}px`;
      this.highlightOverlay.style.width = `${rect.width + 8}px`;
      this.highlightOverlay.style.height = `${rect.height + 8}px`;

      // Scroll into view if needed
      domEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      this.highlightOverlay.style.display = 'none';
    }
  }

  private getElementSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    let path = [];
    let current: HTMLElement | null = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const firstClass = current.className.trim().split(/\s+/)[0];
        if (firstClass && !firstClass.includes(':') && !firstClass.includes('/')) {
          selector += `.${firstClass}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
      if (path.length > 3) break;
    }
    return path.join(' > ');
  }

  // --- 5. VOICE COMMAND PROCESSOR & ACTION DISPATCHER ---
  public async handleVoiceCommand(rawText: string): Promise<{
    handled: boolean;
    feedback: string;
  }> {
    const text = rawText.toLowerCase().trim();

    // A. Vision / Screen Reading Commands
    if (
      text.includes('ver pantalla') ||
      text.includes('mira la pantalla') ||
      text.includes('qué hay en mi pantalla') ||
      text.includes('qué hay en la pantalla') ||
      text.includes('analiza la pantalla') ||
      text.includes('lee la pantalla') ||
      text.includes('léeme la pantalla') ||
      text.includes('leer pantalla') ||
      text.includes('qué ves')
    ) {
      const analysis = this.inspectScreen();
      const feedback = `Veo tu pantalla: ${analysis.summary} Hay ${analysis.elements.length} controles disponibles. ${
        analysis.activeConversationSnippet
          ? `Último registro: ${analysis.activeConversationSnippet}.`
          : ''
      }`;
      voiceService.speak(feedback);
      hardwareService.vibrate(60);
      return { handled: true, feedback };
    }

    // B. TalkBack Control Commands
    if (
      text.includes('activa talkback') ||
      text.includes('inicia talkback') ||
      text.includes('activar talkback') ||
      text.includes('modo accesibilidad')
    ) {
      this.enableTalkBack(true);
      return { handled: true, feedback: 'TalkBack activado.' };
    }

    if (
      text.includes('desactiva talkback') ||
      text.includes('apaga talkback') ||
      text.includes('desactivar talkback') ||
      text.includes('cerrar talkback')
    ) {
      this.disableTalkBack(true);
      return { handled: true, feedback: 'TalkBack desactivado.' };
    }

    if (text.includes('siguiente elemento') || text === 'siguiente') {
      this.nextElement();
      return { handled: true, feedback: 'Siguiente elemento enfocado.' };
    }

    if (text.includes('elemento anterior') || text === 'anterior') {
      this.previousElement();
      return { handled: true, feedback: 'Elemento anterior enfocado.' };
    }

    if (
      text === 'toca esto' ||
      text === 'haz clic' ||
      text === 'presiona esto' ||
      text === 'seleccionar'
    ) {
      const ok = this.activateFocusedElement();
      return {
        handled: true,
        feedback: ok ? 'Elemento activado.' : 'No hay elemento enfocado para activar.',
      };
    }

    // C. Click / Press Named UI Element ("toca el botón X", "presiona X", "haz clic en X")
    const clickMatch = text.match(/(?:toca|presiona|haz clic en|pulsa|abrir)\s+(?:el\s+bot[oó]n\s+|el\s+|la\s+)?(.+)/i);
    if (clickMatch && clickMatch[1]) {
      const targetQuery = clickMatch[1].trim();
      const analysis = this.inspectScreen();
      const candidate = analysis.elements.find(
        (el) =>
          el.label.toLowerCase().includes(targetQuery) ||
          el.text.toLowerCase().includes(targetQuery) ||
          targetQuery.includes(el.label.toLowerCase())
      );

      if (candidate) {
        const domEl = document.querySelector(candidate.selector) as HTMLElement;
        if (domEl) {
          hardwareService.vibrate([40, 30, 40]);
          voiceService.speak(`Tocando ${candidate.label}`);
          domEl.click();
          return { handled: true, feedback: `Se presionó "${candidate.label}".` };
        }
      }
    }

    return { handled: false, feedback: '' };
  }

  // --- 6. STATE SUBSCRIPTION ---
  public subscribe(listener: (state: TalkBackState) => void): () => void {
    this.stateSubscribers.add(listener);
    listener(this.getState());
    return () => {
      this.stateSubscribers.delete(listener);
    };
  }

  public getState(): TalkBackState {
    return {
      enabled: this.talkBackEnabled,
      focusedIndex: this.focusedIndex,
      focusedElement:
        this.focusedIndex >= 0 && this.cachedElements[this.focusedIndex]
          ? this.cachedElements[this.focusedIndex]
          : null,
      speechMuted: false,
      lastAnnouncement:
        this.focusedIndex >= 0 && this.cachedElements[this.focusedIndex]
          ? this.cachedElements[this.focusedIndex].label
          : '',
    };
  }

  private notifySubscribers() {
    const s = this.getState();
    this.stateSubscribers.forEach((listener) => {
      try {
        listener(s);
      } catch (_) {}
    });
  }
}

export const screenVisionTalkbackService = new ScreenVisionTalkbackService();
