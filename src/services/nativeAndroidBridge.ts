import { registerPlugin, Capacitor } from '@capacitor/core';

export interface NativeBatteryResult {
  level: number;
  isCharging: boolean;
}

export interface NativeDiagnosticsResult {
  model: string;
  manufacturer: string;
  androidVersion: string;
  sdkInt: number;
  totalRamMb: number;
  availRamMb: number;
  isLowRam: boolean;
  isNativeAndroid: boolean;
}

export interface ZannaNativePluginInterface {
  setTorch(options: { enable: boolean }): Promise<{ success: boolean; enabled: boolean }>;
  vibrate(options: { duration: number }): Promise<{ success: boolean }>;
  setVolume(options: { percent: number }): Promise<{ success: boolean; volumePercent: number }>;
  getBatteryStatus(): Promise<NativeBatteryResult>;
  speakNative(options: { text: string; pitch?: number; rate?: number }): Promise<{ success: boolean }>;
  stopSpeaking(): Promise<{ success: boolean }>;
  startSpeechRecognition(options?: { language?: string }): Promise<{ success: boolean; listening: boolean }>;
  stopSpeechRecognition(): Promise<{ success: boolean }>;
  makePhoneCall(options: { number: string }): Promise<{ success: boolean }>;
  sendSms(options: { number: string; message: string }): Promise<{ success: boolean }>;
  openWhatsApp(options: { number: string; message: string }): Promise<{ success: boolean }>;
  openCamera(): Promise<{ success: boolean }>;
  getNativeDiagnostics(): Promise<NativeDiagnosticsResult>;
  showToast(options: { message: string }): Promise<{ success: boolean }>;
  dispatchMediaKey(options: { key: string }): Promise<{ success: boolean; key: string; isMusicActive: boolean }>;
  isMusicActive(): Promise<{ isMusicActive: boolean }>;
  openMusicApp(options?: { app?: string }): Promise<{ success: boolean }>;
  acquireCpuWakeLock(): Promise<{ success: boolean; held: boolean }>;
  releaseCpuWakeLock(): Promise<{ success: boolean; held: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ success: boolean }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

// Register the native plugin bridge
export const ZannaNative = registerPlugin<ZannaNativePluginInterface>('ZannaNative');

class NativeAndroidBridgeService {
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public async setTorch(enable: boolean): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await ZannaNative.setTorch({ enable });
      return !!res.success;
    } catch (err) {
      console.warn('Native setTorch error:', err);
      return false;
    }
  }

  public async vibrate(durationMs = 200): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.vibrate({ duration: durationMs });
      return true;
    } catch (err) {
      console.warn('Native vibrate error:', err);
      return false;
    }
  }

  public async setVolume(percent: number): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.setVolume({ percent });
      return true;
    } catch (err) {
      console.warn('Native setVolume error:', err);
      return false;
    }
  }

  public async getBattery(): Promise<NativeBatteryResult | null> {
    if (!this.isNative()) return null;
    try {
      return await ZannaNative.getBatteryStatus();
    } catch (err) {
      console.warn('Native getBattery error:', err);
      return null;
    }
  }

  public async speak(text: string, pitch = 1.0, rate = 1.0): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.speakNative({ text, pitch, rate });
      return true;
    } catch (err) {
      console.warn('Native speak error:', err);
      return false;
    }
  }

  public async stopSpeaking(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await ZannaNative.stopSpeaking();
    } catch (_) {}
  }

  public async makeCall(number: string): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.makePhoneCall({ number });
      return true;
    } catch (err) {
      console.warn('Native makeCall error:', err);
      return false;
    }
  }

  public async sendSms(number: string, message: string): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.sendSms({ number, message });
      return true;
    } catch (err) {
      console.warn('Native sendSms error:', err);
      return false;
    }
  }

  public async openWhatsApp(number: string, message: string): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.openWhatsApp({ number, message });
      return true;
    } catch (err) {
      console.warn('Native openWhatsApp error:', err);
      return false;
    }
  }

  public async openCamera(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.openCamera();
      return true;
    } catch (err) {
      console.warn('Native openCamera error:', err);
      return false;
    }
  }

  public async getDiagnostics(): Promise<NativeDiagnosticsResult | null> {
    if (!this.isNative()) return null;
    try {
      return await ZannaNative.getNativeDiagnostics();
    } catch (err) {
      console.warn('Native getDiagnostics error:', err);
      return null;
    }
  }

  public async toast(message: string): Promise<void> {
    if (!this.isNative()) return;
    try {
      await ZannaNative.showToast({ message });
    } catch (_) {}
  }

  public async sendMediaKey(key: 'play' | 'pause' | 'play_pause' | 'next' | 'previous' | 'stop'): Promise<{ success: boolean; isMusicActive?: boolean }> {
    if (!this.isNative()) return { success: false };
    try {
      const res = await ZannaNative.dispatchMediaKey({ key });
      return { success: !!res.success, isMusicActive: res.isMusicActive };
    } catch (err) {
      console.warn('Native dispatchMediaKey error:', err);
      return { success: false };
    }
  }

  public async checkMusicPlaying(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await ZannaNative.isMusicActive();
      return !!res.isMusicActive;
    } catch (err) {
      console.warn('Native isMusicActive error:', err);
      return false;
    }
  }

  public async launchMusicApp(app: string = 'default'): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      await ZannaNative.openMusicApp({ app });
      return true;
    } catch (err) {
      console.warn('Native openMusicApp error:', err);
      return false;
    }
  }

  public async acquireCpuWakeLock(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await ZannaNative.acquireCpuWakeLock();
      return !!res.held;
    } catch (err) {
      console.warn('Native acquireCpuWakeLock error:', err);
      return false;
    }
  }

  public async releaseCpuWakeLock(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await ZannaNative.releaseCpuWakeLock();
    } catch (_) {}
  }

  public async requestIgnoreBatteryOptimizations(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await ZannaNative.requestIgnoreBatteryOptimizations();
    } catch (_) {}
  }
}

export const nativeAndroidBridge = new NativeAndroidBridgeService();
