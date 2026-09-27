package com.zanna.ai;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import java.util.List;

public class ZannaAccessibilityService extends AccessibilityService {

    private static final String TAG = "ZannaAccessibility";
    private static volatile ZannaAccessibilityService sInstance = null;

    public static ZannaAccessibilityService getInstance() {
        return sInstance;
    }

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();
        sInstance = this;
        Log.i(TAG, "Zanna AI Accessibility Service Connected and Active.");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Real-time UI inspection hooks if needed
    }

    @Override
    public void onInterrupt() {
        Log.w(TAG, "Zanna AI Accessibility Service interrupted.");
    }

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        sInstance = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        sInstance = null;
    }

    // =================================================================================
    // GESTURE CONTROLLER (Taps, Swipes/Scrolls)
    // =================================================================================

    /**
     * Executes a tap gesture at specific (x, y) coordinates on the screen.
     */
    public boolean tapAtCoordinates(float x, float y) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            Log.e(TAG, "Tap coordinates gesture requires API level 24+");
            return false;
        }

        Path path = new Path();
        path.moveTo(x, y);

        GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(path, 0L, 80L);
        GestureDescription gesture = new GestureDescription.Builder()
                .addStroke(stroke)
                .build();

        return dispatchGesture(gesture, new GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription gestureDescription) {
                Log.d(TAG, "Simulated Tap completed successfully at: (" + x + ", " + y + ")");
            }

            @Override
            public void onCancelled(GestureDescription gestureDescription) {
                Log.e(TAG, "Simulated Tap was cancelled by the system.");
            }
        }, null);
    }

    /**
     * Executes a swipe/scroll gesture from (startX, startY) to (endX, endY).
     */
    public boolean swipe(float startX, float startY, float endX, float endY, long durationMs) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
            Log.e(TAG, "Swipe gesture requires API level 24+");
            return false;
        }

        Path path = new Path();
        path.moveTo(startX, startY);
        path.lineTo(endX, endY);

        GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(path, 0L, durationMs);
        GestureDescription gesture = new GestureDescription.Builder()
                .addStroke(stroke)
                .build();

        return dispatchGesture(gesture, new GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription gestureDescription) {
                Log.d(TAG, "Simulated Swipe completed from (" + startX + ", " + startY + ") to (" + endX + ", " + endY + ")");
            }

            @Override
            public void onCancelled(GestureDescription gestureDescription) {
                Log.e(TAG, "Simulated Swipe cancelled by the system.");
            }
        }, null);
    }

    // =================================================================================
    // NODE FINDER BY TEXT & SYSTEM INTERACTION
    // =================================================================================

    /**
     * Expands the system notification panel globally.
     */
    public boolean expandNotificationPanel() {
        return performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS);
    }

    /**
     * Expands the quick settings panel globally.
     */
    public boolean expandQuickSettings() {
        return performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS);
    }

    /**
     * Traverses active window node tree looking for specific text/content description and clicks on it.
     */
    public boolean findAndClickElementByText(String targetText) {
        AccessibilityNodeInfo rootNode = getRootInActiveWindow();
        if (rootNode == null) {
            Log.e(TAG, "Cannot retrieve active window root node.");
            return false;
        }

        // 1. Standard API search matching index
        List<AccessibilityNodeInfo> nodes = rootNode.findAccessibilityNodeInfosByText(targetText);
        if (nodes != null && !nodes.isEmpty()) {
            for (AccessibilityNodeInfo node : nodes) {
                if (performClickOnNodeHierarchy(node)) {
                    Log.i(TAG, "Direct match click succeeded for: " + targetText);
                    return true;
                }
            }
        }

        // 2. Recursive deep scan search (supports fuzzy, lower-case, content description matches)
        boolean success = traverseDeepAndClick(rootNode, targetText);
        rootNode.recycle();
        return success;
    }

    private boolean traverseDeepAndClick(AccessibilityNodeInfo node, String targetText) {
        if (node == null) return false;

        CharSequence textChar = node.getText();
        CharSequence descChar = node.getContentDescription();
        String nodeText = textChar != null ? textChar.toString().toLowerCase() : "";
        String nodeDesc = descChar != null ? descChar.toString().toLowerCase() : "";
        String matchText = targetText.toLowerCase();

        if (nodeText.contains(matchText) || nodeDesc.contains(matchText)) {
            if (performClickOnNodeHierarchy(node)) {
                return true;
            }
        }

        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                boolean done = traverseDeepAndClick(child, targetText);
                child.recycle();
                if (done) return true;
            }
        }
        return false;
    }

    private boolean performClickOnNodeHierarchy(AccessibilityNodeInfo node) {
        AccessibilityNodeInfo current = node;
        while (current != null) {
            if (current.isClickable()) {
                boolean success = current.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                if (success) {
                    return true;
                }
            }
            current = current.getParent();
        }
        return false;
    }
}
