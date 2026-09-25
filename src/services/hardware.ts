// Real Hardware & Android Integration Service (100% Offline Compatible)
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';
import { StatusBar, Style } from '@capacitor/status-bar';

class HardwareService {
  private torchStream: MediaStream | null = null;
  private wakeLockSentinel: any = null;
  private audioCtx: AudioContext | null = null;

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

  // --- 3. WAKE LOCK (Keep Android Screen & Assistant Awake in Background) ---
  public async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }
    return false;
  }

  public async releaseWakeLock(): Promise<void> {
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
    return !!this.wakeLockSentinel;
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
  public triggerCall(phone: string): void {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  }

  public triggerSms(phone: string, body?: string): void {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const encodedBody = body ? encodeURIComponent(body) : '';
    window.location.href = `sms:${cleanPhone}${body ? `?body=${encodedBody}` : ''}`;
  }

  public triggerWhatsApp(phone?: string, text?: string): void {
    const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : '';
    const encoded = text ? encodeURIComponent(text) : '';
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}${text ? `?text=${encoded}` : ''}`, '_blank');
    } else {
      window.open(`whatsapp://send?text=${encoded}`, '_blank');
    }
  }

  public triggerMaps(destination: string): void {
    const encoded = encodeURIComponent(destination);
    // Android Maps intent
    window.open(`geo:0,0?q=${encoded}`, '_system') || window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
  }

  public triggerCamera(): void {
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
}

export const hardwareService = new HardwareService();
