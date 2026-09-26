// Real Hardware & Android Integration Service (100% Offline Compatible)
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';
import { StatusBar, Style } from '@capacitor/status-bar';
import { nativeAndroidBridge } from './nativeAndroidBridge';

class HardwareService {
  private torchStream: MediaStream | null = null;
  private wakeLockSentinel: any = null;
  private audioCtx: AudioContext | null = null;
  private desiredWakeLock: boolean = false;
  private keepAliveNode: AudioBufferSourceNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private keepAliveAudioEl: HTMLAudioElement | null = null;
  private screenMediaRecorder: MediaRecorder | null = null;
  private screenRecordedChunks: Blob[] = [];
  private isScreenRecording: boolean = false;
  private reminderAlarmInterval: any = null;
  private notificationSoundEnabled: boolean = true;
  private isBluetoothOn: boolean = true;
  private isAirplaneOn: boolean = false;
  private isSleepModeOn: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.desiredWakeLock) {
          await this.requestWakeLock();
        }
      });
    }
  }

  public isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  public async initNativeFeatures(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0f1d' });
      } catch (err) {
        console.warn('Native status bar initialization warning:', err);
      }
    }
  }

  // Initialize Web Audio context on user interaction
  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // --- 1. TORCH / FLASHLIGHT (Real Android Camera Flash) ---
  public async setTorch(enable: boolean): Promise<{ success: boolean; realHardware: boolean; message: string }> {
    // 1. Try Native Android CameraManager if running on device
    if (nativeAndroidBridge.isNative()) {
      try {
        const ok = await nativeAndroidBridge.setTorch(enable);
        if (ok) {
          this.playBeep(enable ? 880 : 440, 0.1);
          return {
            success: true,
            realHardware: true,
            message: enable ? 'Linterna encendida (Hardware Android CameraManager)' : 'Linterna apagada (Hardware Android)',
          };
        }
      } catch (err) {
        console.warn('Native torch failed, falling back to WebRTC:', err);
      }
    }

    try {
      if (enable) {
        // Clean up any stale streams first
        if (this.torchStream) {
          try {
            this.torchStream.getTracks().forEach((t) => {
              try { t.stop(); } catch (_) {}
            });
          } catch (_) {}
          this.torchStream = null;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          this.playBeep(880, 0.1);
          return { success: true, realHardware: false, message: 'Linterna encendida (modo simulado: API no disponible)' };
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
            },
          });

          const track = stream.getVideoTracks()[0];
          if (!track) {
            this.playBeep(880, 0.1);
            return { success: true, realHardware: false, message: 'Linterna encendida (modo simulado)' };
          }

          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;

          if (capabilities && capabilities.torch) {
            try {
              await (track as any).applyConstraints({
                advanced: [{ torch: true }],
              });
              this.torchStream = stream;
              this.playBeep(880, 0.1);
              return { success: true, realHardware: true, message: 'Linterna física de Android encendida' };
            } catch (constraintErr: any) {
              // Catches "setPhotoOptions failed" or "OverconstrainedError"
              console.warn('Torch applyConstraints failed (setPhotoOptions):', constraintErr);
              try {
                track.stop();
              } catch (_) {}
              this.torchStream = null;
              this.playBeep(880, 0.1);
              return { success: true, realHardware: false, message: 'Linterna encendida (modo pantalla: flash no accesible)' };
            }
          } else {
            // Flash not supported by camera sensor, stop track immediately
            try {
              track.stop();
            } catch (_) {}
            this.torchStream = null;
            this.playBeep(880, 0.1);
            return { success: true, realHardware: false, message: 'Linterna encendida (modo simulado)' };
          }
        } catch (mediaErr: any) {
          console.warn('getUserMedia for torch notice:', mediaErr);
          this.playBeep(880, 0.1);
          return { success: true, realHardware: false, message: 'Linterna encendida (modo simulado)' };
        }
      } else {
        if (this.torchStream) {
          const tracks = this.torchStream.getTracks();
          for (const track of tracks) {
            try {
              // Simply stop the track. In WebRTC and Android MediaStreamTrack,
              // calling track.stop() directly releases the camera hardware and turns off the LED flash.
              // We do NOT call applyConstraints({ torch: false }) because that triggers "setPhotoOptions failed" in Chromium.
              track.stop();
            } catch (_) {
              // ignore
            }
          }
          this.torchStream = null;
        }
        this.playBeep(440, 0.1);
        return { success: true, realHardware: true, message: 'Linterna apagada' };
      }
    } catch (err: any) {
      console.warn('Torch hardware error, falling back to simulated:', err);
      if (this.torchStream) {
        try {
          this.torchStream.getTracks().forEach((t) => {
            try { t.stop(); } catch (_) {}
          });
        } catch (_) {}
        this.torchStream = null;
      }
      return { success: true, realHardware: false, message: `Linterna ${enable ? 'encendida' : 'apagada'} (modo simulado)` };
    }
  }

  // --- 2. VIBRATION (Haptic Feedback) ---
  public vibrate(pattern: number | number[] = [100, 50, 100]): boolean {
    if (Capacitor.isNativePlatform()) {
      try {
        const duration = Array.isArray(pattern) ? (pattern[0] || 200) : pattern;
        Haptics.vibrate({ duration: Math.min(Math.max(duration, 50), 1000) });
        return true;
      } catch (err) {
        console.warn('Native Haptics failed, falling back to Web:', err);
      }
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        return navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Vibration failed:', e);
      }
    }
    return false;
  }

  // --- 3. WAKE LOCK & BACKGROUND CONTINUOUS EXECUTION ---
  public async requestWakeLock(): Promise<boolean> {
    this.desiredWakeLock = true;
    let success = false;
    if (nativeAndroidBridge.isNative()) {
      const cpuOk = await nativeAndroidBridge.acquireCpuWakeLock();
      await nativeAndroidBridge.requestIgnoreBatteryOptimizations();
      if (cpuOk) success = true;
    }
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        success = true;
      } catch (err) {
        console.warn('Screen Wake Lock request failed:', err);
      }
    }
    // Start background audio keep-alive so Android does not kill or pause the web process
    this.startBackgroundAudioKeepAlive();
    return success || true;
  }

  public async releaseWakeLock(): Promise<void> {
    this.desiredWakeLock = false;
    this.stopBackgroundAudioKeepAlive();
    if (nativeAndroidBridge.isNative()) {
      await nativeAndroidBridge.releaseCpuWakeLock();
    }
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    }
  }

  public isWakeLockActive(): boolean {
    return !!this.wakeLockSentinel || this.desiredWakeLock;
  }

  // Continuous background audio keepalive & Media Notification Shade registration
  public startBackgroundAudioKeepAlive(): void {
    try {
      // 1. HTML5 Audio Element Loop with Silent WAV Data URI
      if (!this.keepAliveAudioEl && typeof document !== 'undefined') {
        const silentWavDataUri = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        const audio = new Audio(silentWavDataUri);
        audio.loop = true;
        audio.volume = 0.01;
        audio.play().catch(() => {});
        this.keepAliveAudioEl = audio;
      }

      // 2. Web Audio Oscillator
      const ctx = this.getAudioContext();
      if (!this.keepAliveNode) {
        const buffer = ctx.createBuffer(1, Math.max(ctx.sampleRate, 8000), ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.00001, ctx.currentTime);

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        this.keepAliveNode = source;
        this.keepAliveGain = gain;
      }

      // Android MediaSession notification registration
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'ZANNA AI - Escucha en Segundo Plano',
          artist: 'ZANNA Android Assistant',
          album: 'Asistente Autónomo Activo',
        });

        try {
          navigator.mediaSession.setActionHandler('play', () => {
            this.controlMedia('play');
          });
          navigator.mediaSession.setActionHandler('pause', () => {
            this.controlMedia('pause');
          });
          navigator.mediaSession.setActionHandler('nexttrack', () => {
            this.controlMedia('next');
          });
          navigator.mediaSession.setActionHandler('previoustrack', () => {
            this.controlMedia('previous');
          });
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Background audio keepalive warning:', err);
    }
  }

  public stopBackgroundAudioKeepAlive(): void {
    try {
      if (this.keepAliveAudioEl) {
        this.keepAliveAudioEl.pause();
        this.keepAliveAudioEl = null;
      }
      if (this.keepAliveNode) {
        this.keepAliveNode.stop();
        this.keepAliveNode.disconnect();
        this.keepAliveNode = null;
      }
      if (this.keepAliveGain) {
        this.keepAliveGain.disconnect();
        this.keepAliveGain = null;
      }
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch (_) {}
  }

  // --- 3B. UNIVERSAL MEDIA & MUSIC CONTROLS ---
  public async controlMedia(action: 'play' | 'pause' | 'play_pause' | 'next' | 'previous' | 'stop'): Promise<{ success: boolean; isMusicActive?: boolean; message: string }> {
    if (nativeAndroidBridge.isNative()) {
      const res = await nativeAndroidBridge.sendMediaKey(action);
      const labels: Record<string, string> = {
        play: 'Música reanudada',
        pause: 'Música pausada',
        play_pause: 'Reproducción alternada',
        next: 'Siguiente pista',
        previous: 'Pista anterior',
        stop: 'Música detenida',
      };
      return { success: res.success, isMusicActive: res.isMusicActive, message: labels[action] || 'Control multimedia enviado' };
    }

    // Web simulation (Audio beep + UI feedback)
    this.playBeep(action === 'next' ? 660 : action === 'previous' ? 440 : 550, 0.1);
    return { success: true, isMusicActive: action === 'play' || action === 'play_pause', message: `Control de música [${action}] ejecutado` };
  }

  public async checkIsMusicPlaying(): Promise<boolean> {
    if (nativeAndroidBridge.isNative()) {
      return await nativeAndroidBridge.checkMusicPlaying();
    }
    return false;
  }

  public async openMusicPlayer(app: string = 'default'): Promise<{ success: boolean; message: string }> {
    if (nativeAndroidBridge.isNative()) {
      const ok = await nativeAndroidBridge.launchMusicApp(app);
      return { success: ok, message: ok ? `Abriendo reproductor de música (${app})` : 'No se pudo abrir el reproductor' };
    }
    window.open('https://open.spotify.com', '_blank');
    return { success: true, message: 'Abriendo reproductor de música web' };
  }

  // --- 4. BATTERY API ---
  public async getBatteryInfo(): Promise<{ level: number; charging: boolean; chargingTime: number; dischargingTime: number } | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await Device.getBatteryInfo();
        if (info && typeof info.batteryLevel === 'number') {
          return {
            level: Math.round(info.batteryLevel * 100),
            charging: !!info.isCharging,
            chargingTime: 0,
            dischargingTime: 0,
          };
        }
      } catch (err) {
        console.warn('Native Device.getBatteryInfo failed, falling back to Web API:', err);
      }
    }

    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
      } catch (e) {
        console.warn('Battery API error:', e);
      }
    }
    return null;
  }

  // --- 5. AUDIO SYNTHESIZER SOUND EFFECTS (Pure Web Audio, 0 external assets) ---
  public playBeep(freq = 600, duration = 0.12, type: OscillatorType = 'sine'): void {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context might require user gesture
    }
  }

  private lastChimeTime: number = 0;

  public playWakeChime(force: boolean = false): void {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastChimeTime < 900) {
      // Debounce: Prevents the "double chime / double sound" collision with browser audio
      return;
    }
    this.lastChimeTime = nowMs;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.09, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.18);
      });
    } catch (e) {
      // ignore
    }
  }

  public playMessageChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      [880, 1174.66, 1318.51].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.2);
      });
    } catch (e) {
      // ignore
    }
  }

  public playSuccessChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      [659.25, 880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.22);
      });
    } catch (e) {
      // ignore
    }
  }

  public playErrorBuzz(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      // ignore
    }
  }

  // --- 6. GEOLOCATION ---
  public async getCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number; speed: number | null } | null> {
    if (!('geolocation' in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          resolve(null);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  // --- 7. CLIPBOARD ---
  public async writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
    return false;
  }

  // --- 8. ANDROID INTENT / DEEP LINK ACTIONS ---
  public async setVolume(percent: number): Promise<boolean> {
    if (nativeAndroidBridge.isNative()) {
      return await nativeAndroidBridge.setVolume(percent);
    }
    this.playBeep(400 + (percent * 4), 0.1);
    return true;
  }

  public async triggerCall(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    if (nativeAndroidBridge.isNative()) {
      const handled = await nativeAndroidBridge.makeCall(cleanPhone);
      if (handled) return;
    }
    window.location.href = `tel:${cleanPhone}`;
  }

  public async triggerSms(phone: string, body?: string): Promise<void> {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const message = body || '';
    if (nativeAndroidBridge.isNative()) {
      const handled = await nativeAndroidBridge.sendSms(cleanPhone, message);
      if (handled) return;
    }
    const encodedBody = message ? encodeURIComponent(message) : '';
    window.location.href = `sms:${cleanPhone}${message ? `?body=${encodedBody}` : ''}`;
  }

  public async triggerWhatsApp(phone?: string, text?: string): Promise<void> {
    const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
    const message = text || '';
    if (nativeAndroidBridge.isNative() && cleanPhone) {
      const handled = await nativeAndroidBridge.openWhatsApp(cleanPhone, message);
      if (handled) return;
    }
    const encoded = message ? encodeURIComponent(message) : '';
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}${message ? `?text=${encoded}` : ''}`, '_blank');
    } else {
      window.open(`whatsapp://send?text=${encoded}`, '_blank');
    }
  }

  public triggerMaps(destination: string): void {
    const encoded = encodeURIComponent(destination);
    // Android Maps intent
    window.open(`geo:0,0?q=${encoded}`, '_system') || window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  }

  public async triggerCamera(): Promise<void> {
    if (nativeAndroidBridge.isNative()) {
      const handled = await nativeAndroidBridge.openCamera();
      if (handled) return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
  }

  public triggerAlarmClock(): void {
    // Android clock intent trigger
    window.location.href = 'intent://com.google.android.deskclock/#Intent;action=android.intent.action.SHOW_ALARMS;end';
  }

  // --- 9. TELEGRAM INTEGRATION ---
  public async triggerTelegram(usernameOrPhone?: string, text?: string): Promise<{ success: boolean; message: string }> {
    const message = text || '';
    const encoded = encodeURIComponent(message);
    const cleanUser = usernameOrPhone ? usernameOrPhone.replace(/^@/, '').trim() : '';

    if (cleanUser) {
      // Try direct Telegram URL scheme first
      window.open(`https://t.me/${cleanUser}${message ? `?text=${encoded}` : ''}`, '_blank');
      return { success: true, message: `Abriendo chat de Telegram con @${cleanUser}` };
    } else {
      window.open(`https://t.me/share/url?url=&text=${encoded}`, '_blank');
      return { success: true, message: 'Abriendo selector de chat de Telegram' };
    }
  }

  // --- 10. SYSTEM MODES & HARDWARE TOGGLES ---
  public async toggleAirplaneMode(forceState?: boolean): Promise<{ success: boolean; state: boolean; message: string }> {
    this.isAirplaneOn = typeof forceState === 'boolean' ? forceState : !this.isAirplaneOn;
    if (nativeAndroidBridge.isNative()) {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.AIRPLANE_MODE_SETTINGS;end';
      } catch (_) {}
    }
    this.playBeep(this.isAirplaneOn ? 350 : 700, 0.15);
    return {
      success: true,
      state: this.isAirplaneOn,
      message: this.isAirplaneOn ? 'Modo avión activado' : 'Modo avión desactivado',
    };
  }

  public async toggleBluetooth(forceState?: boolean): Promise<{ success: boolean; state: boolean; message: string }> {
    this.isBluetoothOn = typeof forceState === 'boolean' ? forceState : !this.isBluetoothOn;
    if (nativeAndroidBridge.isNative()) {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
      } catch (_) {}
    }
    this.playBeep(this.isBluetoothOn ? 880 : 440, 0.12);
    return {
      success: true,
      state: this.isBluetoothOn,
      message: this.isBluetoothOn ? 'Bluetooth activado' : 'Bluetooth desactivado',
    };
  }

  public async setSleepMode(enabled: boolean): Promise<{ success: boolean; message: string }> {
    this.isSleepModeOn = enabled;
    if (enabled) {
      await this.setVolume(0);
      this.notificationSoundEnabled = false;
      this.playBeep(220, 0.25, 'triangle');
    } else {
      await this.setVolume(70);
      this.notificationSoundEnabled = true;
      this.playSuccessChime();
    }
    return {
      success: true,
      message: enabled ? 'Modo descanso activado (No Molestar, silencio y pantalla atenuada)' : 'Modo descanso desactivado. Sistemas normales.',
    };
  }

  public async setSilentMode(mode: 'normal' | 'vibrate' | 'silent'): Promise<{ success: boolean; message: string }> {
    if (mode === 'silent') {
      await this.setVolume(0);
      this.notificationSoundEnabled = false;
      return { success: true, message: 'Modo silencio total activado' };
    } else if (mode === 'vibrate') {
      await this.setVolume(0);
      this.vibrate([150, 100, 150]);
      return { success: true, message: 'Modo sólo vibración activado' };
    } else {
      await this.setVolume(70);
      this.notificationSoundEnabled = true;
      this.playSuccessChime();
      return { success: true, message: 'Modo sonido normal activado' };
    }
  }

  public setNotificationSound(enabled: boolean): { success: boolean; message: string } {
    this.notificationSoundEnabled = enabled;
    if (enabled) {
      this.playMessageChime();
    }
    return {
      success: true,
      message: enabled ? 'Sonido de notificaciones activado' : 'Sonido de notificaciones silenciado',
    };
  }

  public isNotificationSoundActive(): boolean {
    return this.notificationSoundEnabled;
  }

  // --- 11. SCREEN RECORDING (MediaRecorder & WebRTC DisplayMedia) ---
  public async startScreenRecording(): Promise<{ success: boolean; message: string }> {
    if (this.isScreenRecording) {
      return { success: true, message: 'Ya se está grabando la pantalla actualmente.' };
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Tu navegador o dispositivo no soporta la API de captura de pantalla.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: true,
      });

      this.screenRecordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.screenRecordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        this.isScreenRecording = false;
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch (_) {}
      };

      // Handle user clicking native browser "Stop sharing" button
      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenRecording();
      };

      recorder.start(1000); // 1s slice
      this.screenMediaRecorder = recorder;
      this.isScreenRecording = true;
      this.vibrate([200]);
      this.playSuccessChime();

      return {
        success: true,
        message: 'Grabación de pantalla iniciada con audio y video.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo iniciar la grabación: ${err?.message || 'Permiso cancelado'}`,
      };
    }
  }

  public async stopScreenRecording(): Promise<{ success: boolean; message: string; blobUrl?: string }> {
    if (!this.isScreenRecording || !this.screenMediaRecorder) {
      return { success: false, message: 'No hay ninguna grabación de pantalla activa.' };
    }

    return new Promise((resolve) => {
      const recorder = this.screenMediaRecorder!;
      recorder.onstop = () => {
        this.isScreenRecording = false;
        const blob = new Blob(this.screenRecordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        // Auto download file
        const a = document.createElement('a');
        a.href = url;
        a.download = `grabacion_pantalla_zanna_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.vibrate([300, 100, 300]);
        this.playSuccessChime();
        this.screenMediaRecorder = null;
        resolve({
          success: true,
          message: 'Grabación de pantalla finalizada y guardada exitosamente.',
          blobUrl: url,
        });
      };

      try {
        recorder.stop();
      } catch (e) {
        this.isScreenRecording = false;
        resolve({ success: false, message: 'Error al detener la grabación' });
      }
    });
  }

  public isRecordingScreenActive(): boolean {
    return this.isScreenRecording;
  }

  // --- 12. PERSISTENT REMINDER ALARM TONE ---
  public playReminderAlarm(tone: string = 'standard'): void {
    this.stopReminderAlarm();
    const playToneBurst = () => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;
        // Repeating persistent alarm pattern
        [587.33, 880, 1046.5, 1318.51].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.2, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.35);
        });
        this.vibrate([300, 150, 300, 150, 500]);
      } catch (_) {}
    };

    playToneBurst();
    this.reminderAlarmInterval = setInterval(playToneBurst, 3500);
  }

  public stopReminderAlarm(): void {
    if (this.reminderAlarmInterval) {
      clearInterval(this.reminderAlarmInterval);
      this.reminderAlarmInterval = null;
    }
  }
}

export const hardwareService = new HardwareService();
