package com.vinxocompanion

/** Android controls that can be exposed to the VINXO command layer. */
enum class DeviceControlCapability {
    TORCH,
    LAUNCH_APP,
    CALL_CONTACT,
    SEND_MESSAGE,
    READ_CONTACTS,
    CONTROL_VOLUME,
    CONTROL_MEDIA,
    READ_BATTERY,
    CONTROL_BRIGHTNESS,
    READ_LOCATION,
    CONTROL_WIFI,
    CONTROL_BLUETOOTH,
    READ_NOTIFICATIONS,
    SET_ALARM,
    SET_TIMER,
    VIBRATE,
    TAKE_PHOTO,
    RECORD_AUDIO,
    TAKE_SCREENSHOT,
    OPEN_SETTINGS,
}

enum class DeviceControlAvailability {
    READY,
    PERMISSION_REQUIRED,
    USER_CONFIRMATION_REQUIRED,
    SYSTEM_RESTRICTED,
    NOT_IMPLEMENTED,
}

data class DeviceControlDescriptor(
    val capability: DeviceControlCapability,
    val commandExamples: List<String>,
    val availability: DeviceControlAvailability,
    val requiredPermissions: List<String> = emptyList(),
)
