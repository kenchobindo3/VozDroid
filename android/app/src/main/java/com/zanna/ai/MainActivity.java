package com.zanna.ai;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZannaNativePlugin.class);
        super.onCreate(savedInstanceState);

        // Native Android Window & Immersive System Bars Configuration
        configureWindowAndSystemBars();

        // Native WebView optimizations (remove all browser behaviors)
        configureNativeWebView();

        // Native Android Back Button Handler
        configureBackButton();
    }

    private void configureWindowAndSystemBars() {
        Window window = getWindow();
        if (window != null) {
            // Enable hardware acceleration
            window.setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
            );

            // Dark system status bar and navigation bar (matching ZANNA's dark palette #0a0f1d)
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0a0f1d"));
            window.setNavigationBarColor(Color.parseColor("#030712"));

            WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsController != null) {
                // False means light text/icons on dark background
                insetsController.setAppearanceLightStatusBars(false);
                insetsController.setAppearanceLightNavigationBars(false);
            }
        }
    }

    private void configureNativeWebView() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();

            // Hardware layer for silky smooth 60/120fps animations
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // Disable Android overscroll glow/bounce to feel like a compiled Android native app
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            // Disable long-click context menu (copy, select all, browser popups)
            webView.setOnLongClickListener(v -> true);
            webView.setHapticFeedbackEnabled(true);

            WebSettings settings = webView.getSettings();
            if (settings != null) {
                settings.setSupportZoom(false);
                settings.setBuiltInZoomControls(false);
                settings.setDisplayZoomControls(false);
                settings.setUseWideViewPort(true);
                settings.setLoadWithOverviewMode(true);
                // Aggressive cache for instant offline startup
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
        }
    }

    private void configureBackButton() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    // Send custom native back event to Javascript / ZANNA UI
                    getBridge().getWebView().evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('androidhardwareback'));",
                        null
                    );
                } else {
                    setEnabled(false);
                    onBackPressed();
                }
            }
        });
    }
}
