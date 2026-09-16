package com.vinxocompanion

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.location.LocationManager
import android.media.AudioManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.BatteryManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.provider.ContactsContract
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class DeviceControlModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "DeviceControl"

    @ReactMethod
    fun setTorch(isEnabled: Boolean, promise: Promise) {
        try {
            val cameraManager = reactContext.getSystemService(CameraManager::class.java)
            val cameraId = cameraManager.cameraIdList.firstOrNull { id ->
                val characteristics = cameraManager.getCameraCharacteristics(id)
                characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true &&
                    characteristics.get(CameraCharacteristics.LENS_FACING) ==
                    CameraCharacteristics.LENS_FACING_BACK
            } ?: throw IllegalStateException("This device has no controllable torch")

            cameraManager.setTorchMode(cameraId, isEnabled)
            promise.resolve(isEnabled)
        } catch (error: Exception) {
            promise.reject("TORCH_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun launchApp(appName: String, promise: Promise) {
        try {
            val requestedName = appName.trim()
            if (requestedName.isEmpty()) {
                promise.reject("APP_NAME_REQUIRED", "Provide an app name or package name")
                return
            }

            val packageManager = reactContext.packageManager
            val launcherQuery = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val launchIntent = packageManager.queryIntentActivities(launcherQuery, 0)
                .asSequence()
                .filter { resolveInfo ->
                    resolveInfo.activityInfo?.packageName != reactContext.packageName
                }
                .mapNotNull { resolveInfo ->
                    val activityInfo = resolveInfo.activityInfo ?: return@mapNotNull null
                    val label = resolveInfo.loadLabel(packageManager).toString()
                    val normalizedName = requestedName.lowercase(Locale.ROOT)
                    val matches = label.equals(requestedName, ignoreCase = true) ||
                        activityInfo.packageName.equals(requestedName, ignoreCase = true) ||
                        label.lowercase(Locale.ROOT).contains(normalizedName) ||
                        activityInfo.packageName.lowercase(Locale.ROOT).contains(normalizedName)

                    if (!matches) return@mapNotNull null

                    Intent(launcherQuery).apply {
                        setClassName(activityInfo.packageName, activityInfo.name)
                    }
                }
                .firstOrNull()
                ?: throw IllegalArgumentException("No launchable app found for '$requestedName'")

            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(launchIntent)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("APP_LAUNCH_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun callContact(contactName: String, promise: Promise) {
        try {
            val requestedName = contactName.trim()
            if (requestedName.isEmpty()) {
                promise.reject("CONTACT_NAME_REQUIRED", "Provide a contact name")
                return
            }

            if (reactContext.checkSelfPermission(Manifest.permission.READ_CONTACTS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("CONTACT_PERMISSION_REQUIRED", "Contacts permission is required")
                return
            }

            if (reactContext.checkSelfPermission(Manifest.permission.CALL_PHONE) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("CALL_PERMISSION_REQUIRED", "Phone permission is required")
                return
            }

            val normalizedName = requestedName.lowercase(Locale.ROOT)
            val projection = arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
            )
            var matchedNumber: String? = null

            reactContext.contentResolver.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                projection,
                null,
                null,
                null,
            )?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                )
                val numberIndex = cursor.getColumnIndex(
                    ContactsContract.CommonDataKinds.Phone.NUMBER,
                )

                while (cursor.moveToNext() && matchedNumber == null) {
                    val displayName = cursor.getString(nameIndex) ?: continue
                    val matches = displayName.equals(requestedName, ignoreCase = true) ||
                        displayName.lowercase(Locale.ROOT).contains(normalizedName)

                    if (matches) {
                        matchedNumber = cursor.getString(numberIndex)
                    }
                }
            }

            val phoneNumber = matchedNumber?.trim()
                ?: throw IllegalArgumentException("No contact found for '$requestedName'")
            if (phoneNumber.isEmpty()) {
                throw IllegalArgumentException("Contact '$requestedName' has no phone number")
            }

            val callIntent = Intent(Intent.ACTION_CALL).apply {
                data = Uri.parse("tel:${Uri.encode(phoneNumber)}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(callIntent)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("CONTACT_CALL_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun readContacts(promise: Promise) {
        try {
            if (reactContext.checkSelfPermission(Manifest.permission.READ_CONTACTS) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("CONTACT_PERMISSION_REQUIRED", "Contacts permission is required")
                return
            }

            val contacts = Arguments.createArray()
            val projection = arrayOf(
                ContactsContract.Contacts.DISPLAY_NAME,
                ContactsContract.Contacts.HAS_PHONE_NUMBER,
            )
            reactContext.contentResolver.query(
                ContactsContract.Contacts.CONTENT_URI,
                projection,
                null,
                null,
                ContactsContract.Contacts.DISPLAY_NAME + " ASC",
            )?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)
                while (cursor.moveToNext()) {
                    val name = cursor.getString(nameIndex) ?: continue
                    contacts.pushString(name)
                }
            }
            promise.resolve(contacts)
        } catch (error: Exception) {
            promise.reject("CONTACTS_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun readBattery(promise: Promise) {
        try {
            val batteryManager = reactContext.getSystemService(BatteryManager::class.java)
            val result = Arguments.createMap()
            result.putInt("level", batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY))
            result.putBoolean("charging", batteryManager.isCharging)
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("BATTERY_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun adjustVolume(direction: String, promise: Promise) {
        try {
            val action = when (direction.uppercase(Locale.ROOT)) {
                "DOWN" -> AudioManager.ADJUST_LOWER
                "MUTE" -> AudioManager.ADJUST_MUTE
                else -> AudioManager.ADJUST_RAISE
            }
            val audioManager = reactContext.getSystemService(AudioManager::class.java)
            audioManager.adjustStreamVolume(
                AudioManager.STREAM_MUSIC,
                action,
                AudioManager.FLAG_SHOW_UI,
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("VOLUME_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun toggleMedia(promise: Promise) {
        try {
            val audioManager = reactContext.getSystemService(AudioManager::class.java)
            audioManager.dispatchMediaKeyEvent(
                android.view.KeyEvent(
                    android.view.KeyEvent.ACTION_DOWN,
                    android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                ),
            )
            audioManager.dispatchMediaKeyEvent(
                android.view.KeyEvent(
                    android.view.KeyEvent.ACTION_UP,
                    android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
                ),
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("MEDIA_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun setBrightness(value: Int, promise: Promise) {
        try {
            if (!Settings.System.canWrite(reactContext)) {
                val settingsIntent = Intent(
                    Settings.ACTION_MANAGE_WRITE_SETTINGS,
                    Uri.parse("package:${reactContext.packageName}"),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactContext.startActivity(settingsIntent)
                promise.reject("BRIGHTNESS_PERMISSION_REQUIRED", "Allow modify system settings")
                return
            }

            Settings.System.putInt(
                reactContext.contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
                value.coerceIn(1, 255),
            )
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("BRIGHTNESS_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun readLocationStatus(promise: Promise) {
        try {
            if (reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("LOCATION_PERMISSION_REQUIRED", "Location permission is required")
                return
            }

            val locationManager = reactContext.getSystemService(LocationManager::class.java)
            val result = Arguments.createMap()
            result.putBoolean("enabled", locationManager.isLocationEnabled)
            result.putString("status", if (locationManager.isLocationEnabled) "enabled" else "disabled")
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("LOCATION_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun readBluetoothStatus(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                reactContext.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) !=
                PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("BLUETOOTH_PERMISSION_REQUIRED", "Bluetooth permission is required")
                return
            }

            val bluetoothManager = reactContext.getSystemService(BluetoothManager::class.java)
            val result = Arguments.createMap()
            result.putBoolean("available", bluetoothManager.adapter != null)
            result.putBoolean("enabled", bluetoothManager.adapter?.isEnabled == true)
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("BLUETOOTH_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun readWifiStatus(promise: Promise) {
        try {
            val wifiManager = reactContext.applicationContext
                .getSystemService(WifiManager::class.java)
            val result = Arguments.createMap()
            result.putBoolean("enabled", wifiManager.isWifiEnabled)
            promise.resolve(result)
        } catch (error: Exception) {
            promise.reject("WIFI_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun setAlarm(promise: Promise) = launchIntent(
        Intent(android.provider.AlarmClock.ACTION_SET_ALARM).apply {
            putExtra(android.provider.AlarmClock.EXTRA_HOUR, 8)
            putExtra(android.provider.AlarmClock.EXTRA_MINUTES, 0)
            putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, "VINXO alarm")
        },
        "ALARM",
        promise,
    )

    @ReactMethod
    fun setTimer(promise: Promise) = launchIntent(
        Intent(android.provider.AlarmClock.ACTION_SET_TIMER).apply {
            putExtra(android.provider.AlarmClock.EXTRA_LENGTH, 60)
            putExtra(android.provider.AlarmClock.EXTRA_MESSAGE, "VINXO timer")
        },
        "TIMER",
        promise,
    )

    @ReactMethod
    fun vibrate(promise: Promise) {
        try {
            val vibrator = reactContext.getSystemService(Vibrator::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(300)
            }
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("VIBRATION_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun openCamera(promise: Promise) = launchIntent(
        Intent("android.media.action.IMAGE_CAPTURE"),
        "CAMERA",
        promise,
    )

    @ReactMethod
    fun openAudioRecorder(promise: Promise) = launchIntent(
        Intent("android.provider.MediaStore.RECORD_SOUND"),
        "AUDIO_RECORDER",
        promise,
    )

    @ReactMethod
    fun openSmsComposer(promise: Promise) = launchIntent(
        Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")),
        "SMS",
        promise,
    )

    @ReactMethod
    fun openNotificationSettings(promise: Promise) = launchIntent(
        Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS"),
        "NOTIFICATION_SETTINGS",
        promise,
    )

    @ReactMethod
    fun openScreenCapturePrompt(promise: Promise) {
        try {
            val projectionManager = reactContext.getSystemService(
                android.media.projection.MediaProjectionManager::class.java,
            )
            launchIntent(
                projectionManager.createScreenCaptureIntent(),
                "SCREEN_CAPTURE",
                promise,
            )
        } catch (error: Exception) {
            promise.reject("SCREEN_CAPTURE_ERROR", error.message, error)
        }
    }

    @ReactMethod
    fun openAppSettings(promise: Promise) = launchIntent(
        Intent(Settings.ACTION_SETTINGS),
        "SETTINGS",
        promise,
    )

    private fun launchIntent(intent: Intent, actionName: String, promise: Promise) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(reactContext.packageManager) == null) {
                throw IllegalStateException("No Android activity supports $actionName")
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("${actionName}_ERROR", error.message, error)
        }
    }
}
