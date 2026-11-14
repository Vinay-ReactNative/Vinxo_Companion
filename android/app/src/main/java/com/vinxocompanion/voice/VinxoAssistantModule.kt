package com.vinxocompanion.voice

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class VinxoAssistantModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQUEST_ASSISTANT_ROLE = 1001
    }

    private var assistantRolePromise: Promise? = null

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {

            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                if (requestCode == REQUEST_ASSISTANT_ROLE) {
                    val promise = assistantRolePromise ?: return

                    try {
                        val roleHeld = hasAssistantRole()
                        Log.d(
                            "VINXO_ASSISTANT",
                            "Returned from assistant settings; role held=$roleHeld"
                        )
                        assistantRolePromise = null
                        promise.resolve(roleHeld)
                    } catch (e: Exception) {
                        assistantRolePromise = null
                        promise.reject(
                            "ASSISTANT_ROLE_RESULT_ERROR",
                            "Could not check the assistant role after returning from settings.",
                            e
                        )
                    }
                }
            }
        }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "VinxoAssistant"

    private fun hasAssistantRole(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return false
        }

        val roleManager =
            reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager

        return roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT) &&
            roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)
    }

    @ReactMethod
    fun isAssistantRoleHeld(promise: Promise) {
        try {
            promise.resolve(hasAssistantRole())
        } catch (e: Exception) {
            promise.reject("ASSISTANT_ROLE_CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun requestAssistantRole(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                promise.reject(
                    "UNSUPPORTED_ANDROID_VERSION",
                    "Assistant role requires Android 10 or above."
                )
                return
            }

            val activity = reactContext.currentActivity

            if (activity == null) {
                promise.reject(
                    "ACTIVITY_NOT_AVAILABLE",
                    "No active activity found."
                )
                return
            }

            val roleManager =
                reactContext.getSystemService(Context.ROLE_SERVICE) as RoleManager

            if (!roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
                promise.reject(
                    "ASSISTANT_ROLE_UNAVAILABLE",
                    "Assistant role is not available on this device."
                )
                return
            }

            if (roleManager.isRoleHeld(RoleManager.ROLE_ASSISTANT)) {
                promise.resolve(true)
                return
            }

            if (assistantRolePromise != null) {
                promise.reject(
                    "REQUEST_IN_PROGRESS",
                    "An assistant role request is already in progress."
                )
                return
            }

            assistantRolePromise = promise

            Log.d(
                "VINXO_ASSISTANT",
                "Opening Assist & voice input settings from ${activity.javaClass.simpleName}"
            )

            activity.runOnUiThread {
                try {
                    activity.startActivityForResult(
                        Intent(Settings.ACTION_VOICE_INPUT_SETTINGS),
                        REQUEST_ASSISTANT_ROLE
                    )
                } catch (e: Exception) {
                    try {
                        Log.w(
                            "VINXO_ASSISTANT",
                            "Assist & voice input settings unavailable; opening Default Apps settings.",
                            e
                        )
                        activity.startActivityForResult(
                            Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS),
                            REQUEST_ASSISTANT_ROLE
                        )
                    } catch (fallbackError: Exception) {
                        assistantRolePromise = null
                        promise.reject(
                            "ASSISTANT_ROLE_SETTINGS_ERROR",
                            fallbackError.message
                                ?: "Could not open assistant selection settings.",
                            fallbackError
                        )
                    }
                }
            }

        } catch (e: Exception) {
            assistantRolePromise = null
            promise.reject("ASSISTANT_ROLE_REQUEST_ERROR", e.message, e)
        }
    }

    override fun invalidate() {
        reactContext.removeActivityEventListener(activityEventListener)
        assistantRolePromise?.reject(
            "MODULE_DESTROYED",
            "Assistant module was destroyed."
        )
        assistantRolePromise = null
        super.invalidate()
    }
}