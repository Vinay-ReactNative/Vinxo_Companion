import { NativeModules, PermissionsAndroid, Platform } from "react-native";


const {DeviceControl} = NativeModules;
type PendingAction = 'ENABLE_BLUETOOTH' | null;

console.log(DeviceControl,'DeviceControlDeviceControl')
let pendingAction: PendingAction = null;

export const handleCommand = async (
  text: string,
): Promise<string | null> => {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.,!?]/g, '');

  console.log('🧠 COMMAND INPUT:', normalized);





  // -------------------------
  // PENDING CONFIRMATION
  // -------------------------
  if (pendingAction) {
    if (
      normalized === 'yes' ||
      normalized === 'yeah' ||
      normalized === 'sure' ||
      normalized === 'go ahead' ||
      normalized === 'do it'
    ) {
      const action = pendingAction;
      pendingAction = null;

      if (action === 'ENABLE_BLUETOOTH') {
        try {
          await DeviceControl.requestBluetoothEnable();

          return 'I have requested Bluetooth activation, Sir. Please confirm on the Android system dialog.';
        } catch (error) {
          console.error('❌ BLUETOOTH ENABLE ERROR:', error);
          return 'Sorry, Sir. I could not request Bluetooth activation.';
        }
      }
    }
    if (
      normalized === 'no' ||
      normalized === 'nope' ||
      normalized === 'cancel' ||
      normalized === 'never mind'
    ) {
      pendingAction = null;
      return 'Understood, Sir. I cancelled the Bluetooth request.';
    }

    return 'Sir, should I turn Bluetooth on? Please say yes or no.';
  }


  // -------------------------
  // BLUETOOTH CONTROL
  // -------------------------
  if (
    normalized.includes('bluetooth') &&
    (
      normalized.includes('turn on') ||
      normalized.includes('switch on') ||
      normalized.includes('enable') ||
      normalized.includes('turn off') ||
      normalized.includes('switch off') ||
      normalized.includes('disable')
    )
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Bluetooth control is available on Android only, Sir.';
    }

    try {
      const permissionResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      );

      if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
        return 'Sir, Bluetooth permission was denied.';
      }

      const bluetooth = await DeviceControl.readBluetoothStatus();

      const wantsOn =
        normalized.includes('turn on') ||
        normalized.includes('switch on') ||
        normalized.includes('enable');

      if (wantsOn) {
        if (!bluetooth.available) {
          return 'Sir, Bluetooth is not available on this device.';
        }

        if (bluetooth.enabled) {
          return 'Bluetooth is already on, Sir.';
        }

        pendingAction = 'ENABLE_BLUETOOTH';
        return 'Bluetooth is off, Sir. Shall I turn it on?';
      }

      if (!bluetooth.enabled) {
        return 'Bluetooth is already off, Sir.';
      }

      await DeviceControl.openBluetoothSettings();

      return 'Bluetooth settings are open, Sir. Please turn Bluetooth off there.';
    } catch (error) {
      console.error('❌ BLUETOOTH CONTROL ERROR:', error);
      return 'Sorry, Sir. I could not check or control Bluetooth.';
    }
  }


// -------------------------
// CALL CONTACT
// -------------------------
if (
  normalized.includes('call') &&
  !normalized.includes('callback')
) {
  console.log('📞 COMMAND MATCHED: CALL_CONTACT');

  if (Platform.OS !== 'android' || !DeviceControl) {
    return 'Calling contacts is available on Android only.';
  }

  const callMatch = normalized.match(
    /call\s+(?:my\s+)?(.+)/,
  );

  if (!callMatch) {
    return 'Who should I call, Sir?';
  }

  const contactName = callMatch[1]
    .trim()
    .replace(/\bplease\b/g, '')
    .trim();

  if (!contactName) {
    return 'Who should I call, Sir?';
  }

  try {
    const permissionResult =
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ]);

    const hasPermissions =
      permissionResult[
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      ] === PermissionsAndroid.RESULTS.GRANTED &&
      permissionResult[
        PermissionsAndroid.PERMISSIONS.CALL_PHONE
      ] === PermissionsAndroid.RESULTS.GRANTED;

    if (!hasPermissions) {
      return 'I need contacts and phone permission to make the call, Sir.';
    }

    console.log(
      '📞 Calling contact:',
      contactName,
    );

    await DeviceControl.callContact(
      contactName,
    );

    console.log(
      '📞 CALL STARTED:',
      contactName,
    );

    return `Calling ${contactName}, Sir.`;
  } catch (error) {
    console.error(
      '❌ CALL ERROR:',
      error,
    );

    return `I could not call ${contactName}, Sir.`;
  }
}

  // -------------------------
  // TORCH ON
  // -------------------------
  if (
    normalized.includes('torch') &&
    (normalized.includes('turn on') ||
      normalized.includes('switch on') ||
      normalized.includes('enable'))
  ) {
    console.log('🔦 COMMAND MATCHED: TORCH_ON');

    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Torch control is available on Android only.';
    }

    try {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera permission required',
          message:
            'VINXO needs camera access to control the device torch.',
          buttonPositive: 'Allow',
        },
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        return 'I need camera permission to turn on the torch.';
      }

      await DeviceControl.setTorch(true);

      console.log('🔦 TORCH: ON');

      return 'Torch is on, Sir.';
    } catch (error) {
      console.error('❌ TORCH ON ERROR:', error);

      return 'I could not turn on the torch, Sir.';
    }
  }

  // -------------------------
  // TORCH OFF
  // -------------------------
  if (
    normalized.includes('torch') &&
    (normalized.includes('turn off') ||
      normalized.includes('switch off') ||
      normalized.includes('disable'))
  ) {
    console.log('🔦 COMMAND MATCHED: TORCH_OFF');

    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Torch control is available on Android only.';
    }

    try {
      await DeviceControl.setTorch(false);

      console.log('🔦 TORCH: OFF');

      return 'Torch is off, Sir.';
    } catch (error) {
      console.error('❌ TORCH OFF ERROR:', error);

      return 'I could not turn off the torch, Sir.';
    }
  }

  // -------------------------
  // SIMPLE GREETING
  // -------------------------
  if (
    normalized === 'hi vinxo' ||
    normalized.includes('hi vinxo') ||
    normalized.includes('hi vinzo')
  ) {
    console.log('✅ COMMAND MATCHED: HI_VINXO');

    return 'Hello Sir, how are you?';
  }


  // -------------------------
  // BLUETOOTH STATUS
  // -------------------------
  if (
    normalized.includes('bluetooth') &&
    (
      normalized.includes('status') ||
      normalized.includes('check') ||
      normalized.includes('enabled') ||
      normalized.includes('is on') ||
      normalized.includes('is off') ||
      normalized.includes('turned on') ||
      normalized.includes('turned off')
    )
  ) {
    console.log('🔵 COMMAND MATCHED: BLUETOOTH_STATUS');

    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Bluetooth status is available on Android only, Sir.';
    }

    try {
      const permissionResult =
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);

      const hasPermissions =
        permissionResult[
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ] === PermissionsAndroid.RESULTS.GRANTED &&
        permissionResult[
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
        ] === PermissionsAndroid.RESULTS.GRANTED;

      if (!hasPermissions) {
        return 'Sir, I need Bluetooth permission to check its status.';
      }

      const bluetooth =
        await DeviceControl.readBluetoothStatus();

      if (!bluetooth.available) {
        return 'Sir, Bluetooth is not available on this device.';
      }

      if (bluetooth.enabled) {
        return 'Sir, Bluetooth is enabled. You are ready to connect your devices.';
      }

      return 'Sir, Bluetooth is currently turned off. Would you like to enable it?';
    } catch (error) {
      console.error('❌ BLUETOOTH STATUS ERROR:', error);
      return 'Sorry, Sir. I could not check Bluetooth status.';
    }
  }


  // -------------------------
  // WI-FI STATUS
  // -------------------------
  if (
    normalized.includes('wifi') ||
    normalized.includes('wi-fi')
  ) {
    const isStatusQuery =
      normalized.includes('status') ||
      normalized.includes('check') ||
      normalized.includes('enabled') ||
      normalized.includes('is on') ||
      normalized.includes('is off') ||
      normalized.includes('connected') ||
      normalized.includes('connection');

    const isToggleRequest =
      normalized.includes('turn on') ||
      normalized.includes('turn off') ||
      normalized.includes('switch on') ||
      normalized.includes('switch off') ||
      normalized.includes('enable') ||
      normalized.includes('disable');

    if (isToggleRequest) {
      return 'Sir, I can check Wi-Fi status, but direct Wi-Fi control needs further Android integration.';
    }

    if (isStatusQuery) {
      console.log('📶 COMMAND MATCHED: WIFI_STATUS');

      if (Platform.OS !== 'android' || !DeviceControl) {
        return 'Wi-Fi status is available on Android only, Sir.';
      }

      try {
        const wifi = await DeviceControl.readWifiStatus();

        return wifi.enabled
          ? 'Sir, Wi-Fi is turned on.'
          : 'Sir, Wi-Fi is currently turned off.';

      } catch (error) {
        console.error('❌ WIFI STATUS ERROR:', error);
        return 'Sorry, Sir. I could not check Wi-Fi status.';
      }
    }
  }




  // -------------------------
  // BATTERY STATUS
  // -------------------------
  if (
    normalized.includes('battery') &&
    (
      normalized.includes('status') ||
      normalized.includes('level') ||
      normalized.includes('charge') ||
      normalized.includes('how much') ||
      normalized.includes('percentage') ||
      normalized.includes('percent') ||
      normalized.includes('left')
    )
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Battery status is available on Android only, Sir.';
    }

    try {
      const battery = await DeviceControl.readBattery();

      const chargingMessage = battery.charging
        ? ' The phone is currently charging.'
        : '';

      return `Sir, your battery is at ${battery.level} percent.${chargingMessage}`;
    } catch (error) {
      console.error('❌ BATTERY STATUS ERROR:', error);
      return 'Sorry, Sir. I could not read the battery status.';
    }
  }





  // -------------------------
  // BRIGHTNESS CONTROL
  // -------------------------
  const brightnessMatch = normalized.match(
    /^(?:(?:hey|hi)\s+)?(?:(?:vinxo|vinzo)[\s,]+)?(?:(?:please|set|change|adjust|make|put)\s+)*(?:(?:the|my)\s+)?brightness(?:\s+level)?(?:\s+(?:to|at))?\s+(\d{1,3})(?:\s*(?:percent|per cent|%))?$/
  );

  if (brightnessMatch) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Brightness control is available on Android only, Sir.';
    }

    const percent = Number(brightnessMatch[1]);

    if (percent < 1 || percent > 100) {
      return 'Please choose a brightness between 1 and 100 percent, Sir.';
    }

    const brightnessValue = Math.round((percent / 100) * 255);

    try {
      await DeviceControl.setBrightness(brightnessValue);
      return `Screen brightness set to ${percent} percent, Sir.`;
    } catch (error) {
      console.error('❌ BRIGHTNESS CONTROL ERROR:', error);
      return 'Sir, please enable Modify system settings for VINXO in Android settings, then try again.';
    }
  }


    // -------------------------
  // VOLUME PERCENTAGE
  // -------------------------


  // -------------------------
  // VOLUME PERCENTAGE & NATURAL SPEECH
  // -------------------------



const volumePercentMatch = normalized.match(
  /^(?:(?:hey|hi)\s+)?(?:(?:vinxo|vinzo)[\s,]+)?(?:(?:please|can you|could you|would you|i want you to|i want|set|change|adjust|increase|decrease|raise|lower|put|make|turn)\s+)*(?:(?:the|my)\s+)?(?:(?:media|music|sound|phone)\s+)?volume(?:\s+level)?(?:\s+(?:to|at|up to|down to))?\s+(\d{1,3})(?:\s*(?:percent|per cent|%))?$/i
);

  const naturalVolumeMatch = normalized.match(
    /^(?:(?:hey|hi)\s+)?(?:vinxo[\s,]*)?(?:(?:please|can you|could you|would you)\s+)?(?:make it|set it|put it|make the sound|set the sound|put the sound)\s+(?:to\s+|at\s+)?(\d{1,3})(?:\s*(?:percent|per cent|%))?$/i
  );

  const volumeNumberMatch =
    volumePercentMatch ?? naturalVolumeMatch;

  const volumeExtreme = normalized.match(
    /\b(?:set|change|adjust|put|make)\s+(?:(?:the|my)\s+)?(?:(?:media|music|sound|phone)\s+)?volume\s+(?:to\s+|at\s+)?(maximum|max|minimum|min|zero|mute)\b/
  );

  if (volumeNumberMatch || volumeExtreme) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Volume percentage control is available on Android only, Sir.';
    }

    let percent: number;

    if (volumeNumberMatch) {
      percent = Number(volumeNumberMatch[1]);

      if (percent > 100) {
        return 'Please choose a volume between zero and 100 percent, Sir.';
      }
    } else {
      const extreme = volumeExtreme?.[1];

      if (extreme === 'maximum' || extreme === 'max') {
        percent = 100;
      } else {
        percent = 0;
      }
    }

    try {
      await DeviceControl.setVolumePercent(percent);

      return `Media volume set to ${percent} percent, Sir.`;
    } catch (error) {
      console.error('❌ VOLUME PERCENT ERROR:', error);

      return 'Sorry, Sir. I could not set the requested volume.';
    }
  }

  // -------------------------
  // VOLUME CONTROL
  // -------------------------
  if (
    normalized.includes('volume') ||
    normalized.includes('mute')
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Volume control is available on Android only, Sir.';
    }

    let direction: 'UP' | 'DOWN' | 'MUTE';

    if (
      normalized.includes('mute') ||
      normalized.includes('silence')
    ) {
      direction = 'MUTE';
    } else if (
      normalized.includes('decrease') ||
      normalized.includes('lower') ||
      normalized.includes('down') ||
      normalized.includes('reduce')
    ) {
      direction = 'DOWN';
    } else if (
      normalized.includes('increase') ||
      normalized.includes('raise') ||
      normalized.includes('up') ||
      normalized.includes('higher') ||
      normalized.includes('louder')
    ) {
      direction = 'UP';
    } else {
      return 'Sir, would you like me to increase, decrease, or mute the volume?';
    }

    try {
      await DeviceControl.adjustVolume(direction);

      if (direction === 'MUTE') {
        return 'Media volume muted, Sir.';
      }

      return direction === 'UP'
        ? 'Volume increased, Sir.'
        : 'Volume decreased, Sir.';
    } catch (error) {
      console.error('❌ VOLUME CONTROL ERROR:', error);
      return 'Sorry, Sir. I could not adjust the volume.';
    }
  }




  // -------------------------
  // VIBRATION
  // -------------------------
  if (
    normalized.includes('vibrate') ||
    normalized.includes('vibration')
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Vibration control is available on Android only, Sir.';
    }

    try {
      await DeviceControl.vibrate();
      return 'Done, Sir. Your phone should vibrate now.';
    } catch (error) {
      console.error('❌ VIBRATION ERROR:', error);
      return 'Sorry, Sir. I could not vibrate the device.';
    }
  }

// -------------------------
  // MEDIA PLAY / PAUSE
  // -------------------------
  if (
    /\b(play|pause|resume|toggle)\b/.test(normalized) &&
    /\b(music|media|playback|song|player|pause|resume|play)\b/.test(normalized)
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Media control is available on Android only, Sir.';
    }

    try {
      await DeviceControl.toggleMedia();
      return 'Media playback command sent, Sir.';
    } catch (error) {
      console.error('❌ MEDIA CONTROL ERROR:', error);
      return 'Sorry, Sir. I could not control media playback.';
    }
  }


  // -------------------------
  // LOCATION STATUS
  // -------------------------
  if (
    normalized.includes('location') &&
    (
      normalized.includes('status') ||
      normalized.includes('check') ||
      normalized.includes('is on') ||
      normalized.includes('is off') ||
      normalized.includes('enabled') ||
      normalized.includes('turned on') ||
      normalized.includes('turned off')
    )
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Location status is available on Android only, Sir.';
    }

    try {
      const location = await DeviceControl.readLocationStatus();

      if (location.enabled) {
        return 'Sir, location services are enabled.';
      }

      return 'Sir, location services are currently turned off.';
    } catch (error) {
      console.error('❌ LOCATION STATUS ERROR:', error);
      return 'Sorry, Sir. I could not check location status.';
    }
  }



  // -------------------------
  // CAMERA CONTROL
  // -------------------------
  if (
    /\b(open|launch|start|take)\b/.test(normalized) &&
    /\b(camera|photo|picture)\b/.test(normalized)
  ) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'Camera control is available on Android only, Sir.';
    }

    try {
      await DeviceControl.openCamera();
      return 'Opening the camera, Sir.';
    } catch (error) {
      console.error('❌ CAMERA ERROR:', error);
      return 'Sorry, Sir. I could not open the camera.';
    }
  }


 
// -------------------------
// TIMER CONTROL
// -------------------------
if (
  /\b(timer|countdown)\b/.test(normalized) &&
  /\b(set|start|open|create|begin|timer|countdown)\b/.test(normalized)
) {
  if (Platform.OS !== 'android' || !DeviceControl) {
    return 'Timer control is available on Android only, Sir.';
  }

  const durationMatch = normalized.match(
    /\b(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/
  );

  if (!durationMatch) {
    return 'How long should I set the timer for, Sir? Please specify seconds, minutes, or hours.';
  }

  const amount = Number(durationMatch[1]);
  const unit = durationMatch[2];

  const multiplier = /^h/.test(unit)
    ? 3600
    : /^m/.test(unit)
      ? 60
      : 1;

  const seconds = amount * multiplier;

  if (
    !Number.isSafeInteger(seconds) ||
    seconds < 1 ||
    seconds > 86400
  ) {
    return 'Sir, please choose a timer between 1 second and 24 hours.';
  }

  const labelMatch = normalized.match(
    /\b(?:named|called|labelled|labeled|description(?: as)?)\s+(.+)$/
  );

  const timerLabel = labelMatch?.[1]?.trim() || 'VINXO Timer';

  try {
    await DeviceControl.setTimer(seconds, timerLabel);

    return `Timer "${timerLabel}" started for ${amount} ${unit}, Sir.`;
  } catch (error) {
    console.error('❌ TIMER ERROR:', error);
    return 'Sorry, Sir. I could not start the requested timer.';
  }
}



 
// -------------------------
// ALARM CONTROL
// -------------------------
if (
  /\b(alarm|wake me up)\b/.test(normalized) &&
  /\b(set|create|open|start|wake me up|alarm)\b/.test(normalized)
) {
  if (Platform.OS !== 'android' || !DeviceControl) {
    return 'Alarm control is available on Android only, Sir.';
  }

  const alarmMatch = normalized.match(
    /\b(?:at|for)\s+(\d{1,4})(?::(\d{2})|[.](\d{2}))?\s*(am|pm)?\b/
  );

  if (!alarmMatch) {
    return 'What time should I set the alarm for, Sir? Please say a time such as 7:30 PM.';
  }

  let hour: number;
  let minute: number;

  const rawTime = alarmMatch[1];
  const meridiem = alarmMatch[4];

  if (alarmMatch[2] || alarmMatch[3]) {
    hour = Number(rawTime);
    minute = Number(alarmMatch[2] ?? alarmMatch[3]);
  } else if (rawTime.length === 3 || rawTime.length === 4) {
    hour = Number(rawTime.slice(0, -2));
    minute = Number(rawTime.slice(-2));
  } else {
    hour = Number(rawTime);
    minute = 0;
  }

  if (minute > 59 || hour > 23) {
    return 'That time is invalid, Sir. Please specify a valid alarm time.';
  }

  if (meridiem) {
    if (hour < 1 || hour > 12) {
      return 'For AM or PM times, please use an hour from 1 to 12, Sir.';
    }

    if (meridiem === 'am') {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  } else if (hour >= 1 && hour <= 12) {
    return 'Sir, should that alarm be AM or PM?';
  }

  const labelMatch = normalized.match(
    /\b(?:named|called|labelled|labeled|description(?: as)?)\s+(.+)$/
  );

  const alarmLabel = labelMatch?.[1]?.trim() || 'VINXO Alarm';

  try {
    await DeviceControl.setAlarm(hour, minute, alarmLabel);

    const displayHour = hour % 12 || 12;
    const displayMinute = String(minute).padStart(2, '0');
    const displayPeriod = hour < 12 ? 'AM' : 'PM';

    return `Alarm "${alarmLabel}" set for ${displayHour}:${displayMinute} ${displayPeriod}, Sir.`;
  } catch (error) {
    console.error('❌ ALARM ERROR:', error);
    return 'Sorry, Sir. I could not create the requested alarm.';
  }
}





  // -------------------------
  // LAUNCH APP
  // -------------------------
  const launchAppMatch = normalized.match(
    /^(?:please\s+)?(?:open|launch|start)\s+(.+)$/
  );

  if (launchAppMatch) {
    if (Platform.OS !== 'android' || !DeviceControl) {
      return 'App launching is available on Android only, Sir.';
    }

    const appName = launchAppMatch[1]
      .replace(/\s+please$/, '')
      .replace(/\s+for me$/, '')
      .trim();

    if (!appName) {
      return 'Which app should I open, Sir?';
    }

    try {
      await DeviceControl.launchApp(appName);

      return `Opening ${appName}, Sir.`;
    } catch (error) {
      console.error('❌ APP LAUNCH ERROR:', error);
      return `Sorry, Sir. I could not open ${appName}. Please check the app name.`;
    }
  }


  console.log('❌ NO COMMAND MATCH');

  return null;
};