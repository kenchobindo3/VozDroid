package com.zanna.ai;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.KeyEvent;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.widget.Toast;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "ZannaNative")
public class ZannaNativePlugin extends Plugin {

    private TextToSpeech textToSpeech;
    private boolean isTtsInitialized = false;
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private CameraManager cameraManager;
    private String rearCameraId = null;

    @Override
    public void load() {
        super.load();
        initTts();
        initCamera();
    }

    private void initTts() {
        Context ctx = getContext();
        textToSpeech = new TextToSpeech(ctx, status -> {
            if (status == TextToSpeech.SUCCESS) {
                isTtsInitialized = true;
                textToSpeech.setLanguage(new Locale("es", "ES"));
            }
        });
    }

    private void initCamera() {
        try {
            Context ctx = getContext();
            cameraManager = (CameraManager) ctx.getSystemService(Context.CAMERA_SERVICE);
            if (cameraManager != null) {
                String[] cameraIds = cameraManager.getCameraIdList();
                for (String id : cameraIds) {
                    CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(id);
                    Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                    Boolean hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE);
                    if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK && Boolean.TRUE.equals(hasFlash)) {
                        rearCameraId = id;
                        break;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // --- 1. NATIVE FLASHLIGHT ---
    @PluginMethod
    public void setTorch(PluginCall call) {
        boolean enable = Boolean.TRUE.equals(call.getBoolean("enable", false));
        if (cameraManager == null || rearCameraId == null) {
            initCamera();
        }

        if (cameraManager != null && rearCameraId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                cameraManager.setTorchMode(rearCameraId, enable);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("enabled", enable);
                call.resolve(ret);
                return;
            } catch (CameraAccessException e) {
                call.reject("CameraAccessException: " + e.getMessage());
                return;
            } catch (Exception e) {
                call.reject("Error setting torch: " + e.getMessage());
                return;
            }
        }
        call.reject("Flashlight hardware not available on this Android device");
    }

    // --- 2. NATIVE HAPTIC VIBRATION ---
    @PluginMethod
    public void vibrate(PluginCall call) {
        int durationMs = call.getInt("duration", 200);
        Context ctx = getContext();
        Vibrator vibrator = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(durationMs);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Vibrator not available");
        }
    }

    // --- 3. NATIVE AUDIO & VOLUME CONTROL ---
    @PluginMethod
    public void setVolume(PluginCall call) {
        int percent = call.getInt("percent", 80);
        Context ctx = getContext();
        AudioManager audioManager = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
        if (audioManager != null) {
            int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int targetVol = (int) Math.round((percent / 100.0) * maxVol);
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, targetVol, AudioManager.FLAG_SHOW_UI);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("volumePercent", percent);
            ret.put("rawVolume", targetVol);
            ret.put("maxVolume", maxVol);
            call.resolve(ret);
        } else {
            call.reject("AudioManager unavailable");
        }
    }

    // --- 4. NATIVE BATTERY STATUS ---
    @PluginMethod
    public void getBatteryStatus(PluginCall call) {
        Context ctx = getContext();
        BatteryManager bm = (BatteryManager) ctx.getSystemService(Context.BATTERY_SERVICE);
        if (bm != null) {
            int level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY);
            boolean isCharging = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int status = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_STATUS);
                isCharging = (status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL);
            }
            JSObject ret = new JSObject();
            ret.put("level", level);
            ret.put("isCharging", isCharging);
            call.resolve(ret);
        } else {
            call.reject("BatteryManager unavailable");
        }
    }

    // --- 5. NATIVE SPEECH RECOGNITION (OFFLINE CAPABLE) ---
    @PluginMethod
    public void startSpeechRecognition(PluginCall call) {
        String lang = call.getString("language", "es-ES");
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (speechRecognizer != null) {
                    speechRecognizer.destroy();
                }

                Context ctx = getContext();
                if (!SpeechRecognizer.isRecognitionAvailable(ctx)) {
                    call.reject("Android SpeechRecognizer not available on this device");
                    return;
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(ctx);
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        isListening = true;
                        JSObject data = new JSObject();
                        data.put("status", "ready");
                        notifyListeners("speechStateChange", data);
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        JSObject data = new JSObject();
                        data.put("status", "speaking_started");
                        notifyListeners("speechStateChange", data);
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        JSObject data = new JSObject();
                        data.put("rmsdB", rmsdB);
                        notifyListeners("speechRms", data);
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {
                        isListening = false;
                        JSObject data = new JSObject();
                        data.put("status", "speaking_ended");
                        notifyListeners("speechStateChange", data);
                    }

                    @Override
                    public void onError(int error) {
                        isListening = false;
                        JSObject data = new JSObject();
                        data.put("errorCode", error);
                        data.put("errorMessage", "Speech recognition error code: " + error);
                        notifyListeners("speechError", data);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        isListening = false;
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                        JSObject data = new JSObject();
                        data.put("text", text);
                        data.put("isFinal", true);
                        notifyListeners("speechResult", data);
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                        JSObject data = new JSObject();
                        data.put("text", text);
                        data.put("isFinal", false);
                        notifyListeners("speechResult", data);
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                speechRecognizer.startListening(intent);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("listening", true);
                call.resolve(ret);

            } catch (Exception e) {
                call.reject("Speech recognition start failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopSpeechRecognition(PluginCall call) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                if (speechRecognizer != null) {
                    speechRecognizer.stopListening();
                }
                isListening = false;
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error stopping speech recognition: " + e.getMessage());
            }
        });
    }

    // --- 6. NATIVE TEXT TO SPEECH (OFFLINE VOICES) ---
    @PluginMethod
    public void speakNative(PluginCall call) {
        String text = call.getString("text", "");
        Double pVal = call.getDouble("pitch");
        float pitch = pVal != null ? pVal.floatValue() : 1.0f;
        Double rVal = call.getDouble("rate");
        float rate = rVal != null ? rVal.floatValue() : 1.0f;

        if (text.isEmpty()) {
            call.reject("Text cannot be empty");
            return;
        }

        if (textToSpeech == null || !isTtsInitialized) {
            initTts();
        }

        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                textToSpeech.setPitch(pitch);
                textToSpeech.setSpeechRate(rate);
                String utteranceId = "zanna_" + System.currentTimeMillis();

                textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String id) {
                        JSObject data = new JSObject();
                        data.put("utteranceId", id);
                        notifyListeners("ttsStarted", data);
                    }

                    @Override
                    public void onDone(String id) {
                        JSObject data = new JSObject();
                        data.put("utteranceId", id);
                        notifyListeners("ttsFinished", data);
                    }

                    @Override
                    public void onError(String id) {
                        JSObject data = new JSObject();
                        data.put("utteranceId", id);
                        notifyListeners("ttsError", data);
                    }
                });

                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("TTS speak failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (textToSpeech != null) {
            textToSpeech.stop();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    // --- 7. NATIVE INTENTS: CALL, SMS, WHATSAPP, CAMERA ---
    @PluginMethod
    public void makePhoneCall(PluginCall call) {
        String number = call.getString("number", "");
        try {
            Intent intent = new Intent(Intent.ACTION_DIAL);
            intent.setData(Uri.parse("tel:" + number));
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Call failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        String number = call.getString("number", "");
        String body = call.getString("message", "");
        try {
            Intent intent = new Intent(Intent.ACTION_SENDTO);
            intent.setData(Uri.parse("smsto:" + number));
            intent.putExtra("sms_body", body);
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("SMS failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        String number = call.getString("number", "").replaceAll("[^0-9]", "");
        String message = call.getString("message", "");
        try {
            Uri uri = Uri.parse("https://api.whatsapp.com/send?phone=" + number + "&text=" + Uri.encode(message));
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WhatsApp launch failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openCamera(PluginCall call) {
        try {
            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            getActivity().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Camera launch failed: " + e.getMessage());
        }
    }

    // --- 8. NATIVE SYSTEM DIAGNOSTICS ---
    @PluginMethod
    public void getNativeDiagnostics(PluginCall call) {
        try {
            Context ctx = getContext();
            ActivityManager actManager = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo memInfo = new ActivityManager.MemoryInfo();
            if (actManager != null) {
                actManager.getMemoryInfo(memInfo);
            }

            JSObject ret = new JSObject();
            ret.put("model", Build.MODEL);
            ret.put("manufacturer", Build.MANUFACTURER);
            ret.put("androidVersion", Build.VERSION.RELEASE);
            ret.put("sdkInt", Build.VERSION.SDK_INT);
            ret.put("totalRamMb", memInfo.totalMem / (1024 * 1024));
            ret.put("availRamMb", memInfo.availMem / (1024 * 1024));
            ret.put("isLowRam", memInfo.lowMemory);
            ret.put("isNativeAndroid", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Diagnostics failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showToast(PluginCall call) {
        String msg = call.getString("message", "");
        new Handler(Looper.getMainLooper()).post(() -> {
            Toast.makeText(getContext(), msg, Toast.LENGTH_SHORT).show();
        });
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    // --- 9. UNIVERSAL MEDIA & MUSIC CONTROLS ---
    @PluginMethod
    public void dispatchMediaKey(PluginCall call) {
        String key = call.getString("key", "play_pause").toLowerCase();
        try {
            Context ctx = getContext();
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) {
                call.reject("Audio manager not available");
                return;
            }

            int keyCode = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            if ("play".equals(key)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PLAY;
            } else if ("pause".equals(key)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PAUSE;
            } else if ("next".equals(key) || "skip".equals(key)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_NEXT;
            } else if ("previous".equals(key) || "prev".equals(key) || "back".equals(key)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_PREVIOUS;
            } else if ("stop".equals(key)) {
                keyCode = KeyEvent.KEYCODE_MEDIA_STOP;
            }

            long eventTime = SystemClock.uptimeMillis();
            KeyEvent downEvent = new KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN, keyCode, 0);
            am.dispatchMediaKeyEvent(downEvent);
            KeyEvent upEvent = new KeyEvent(eventTime, eventTime, KeyEvent.ACTION_UP, keyCode, 0);
            am.dispatchMediaKeyEvent(upEvent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("key", key);
            ret.put("isMusicActive", am.isMusicActive());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Media dispatch failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void isMusicActive(PluginCall call) {
        try {
            Context ctx = getContext();
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            boolean active = am != null && am.isMusicActive();
            JSObject ret = new JSObject();
            ret.put("isMusicActive", active);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Check music active error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openMusicApp(PluginCall call) {
        String app = call.getString("app", "default").toLowerCase();
        try {
            Context ctx = getContext();
            Intent intent = null;

            if ("spotify".equals(app)) {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse("spotify:"));
            } else if ("youtube_music".equals(app) || "ytmusic".equals(app)) {
                intent = new Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube.music:"));
            }

            if (intent == null || intent.resolveActivity(ctx.getPackageManager()) == null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ICE_CREAM_SANDWICH_MR1) {
                    intent = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_MUSIC);
                } else {
                    intent = new Intent(Intent.ACTION_MAIN);
                    intent.addCategory(Intent.CATEGORY_APP_MUSIC);
                }
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Launch music app failed: " + e.getMessage());
        }
    }

    // --- 10. BACKGROUND CPU WAKE LOCK & ACCESSIBILITY CONTINUITY ---
    private PowerManager.WakeLock cpuWakeLock = null;

    @PluginMethod
    public void acquireCpuWakeLock(PluginCall call) {
        try {
            Context ctx = getContext();
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                if (cpuWakeLock == null) {
                    cpuWakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zanna:CpuWakeLock");
                    cpuWakeLock.setReferenceCounted(false);
                }
                if (!cpuWakeLock.isHeld()) {
                    cpuWakeLock.acquire(120 * 60 * 1000L); // 2 hours max safe timeout
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("held", cpuWakeLock != null && cpuWakeLock.isHeld());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WakeLock request failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void releaseCpuWakeLock(PluginCall call) {
        try {
            if (cpuWakeLock != null && cpuWakeLock.isHeld()) {
                cpuWakeLock.release();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("held", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("WakeLock release failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Context ctx = getContext();
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                String packageName = ctx.getPackageName();
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Battery optimization request failed: " + e.getMessage());
        }
    }
}
