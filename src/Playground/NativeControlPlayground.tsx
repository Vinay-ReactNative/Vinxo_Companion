import React, { useState } from 'react';
import {
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

interface DeviceControlModule {
  setTorch(isEnabled: boolean): Promise<boolean>;
  launchApp(appName: string): Promise<boolean>;
  callContact(contactName: string): Promise<boolean>;
  readContacts(): Promise<string[]>;
  readBattery(): Promise<{ level: number; charging: boolean }>;
  adjustVolume(direction: 'UP' | 'DOWN' | 'MUTE'): Promise<boolean>;
  toggleMedia(): Promise<boolean>;
  setBrightness(value: number): Promise<boolean>;
  readLocationStatus(): Promise<{ enabled: boolean; status: string }>;
  readBluetoothStatus(): Promise<{ available: boolean; enabled: boolean }>;
  readWifiStatus(): Promise<{ enabled: boolean }>;
setTimer(seconds: number): Promise<boolean>;
setAlarm(hour: number, minute: number): Promise<boolean>;
  vibrate(): Promise<boolean>;
  openCamera(): Promise<boolean>;
  openAudioRecorder(): Promise<boolean>;
  openSmsComposer(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
  openScreenCapturePrompt(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
  requestBluetoothEnable(): Promise<boolean>;
  openBluetoothSettings(): Promise<boolean>;
  setVolumePercent(percent: number): Promise<boolean>;
}

type DeviceControlCapability =
  | 'TORCH'
  | 'LAUNCH_APP'
  | 'CALL_CONTACT'
  | 'SEND_MESSAGE'
  | 'READ_CONTACTS'
  | 'CONTROL_VOLUME'
  | 'CONTROL_MEDIA'
  | 'READ_BATTERY'
  | 'CONTROL_BRIGHTNESS'
  | 'READ_LOCATION'
  | 'CONTROL_WIFI'
  | 'CONTROL_BLUETOOTH'
  | 'READ_NOTIFICATIONS'
  | 'SET_ALARM'
  | 'SET_TIMER'
  | 'VIBRATE'
  | 'TAKE_PHOTO'
  | 'RECORD_AUDIO'
  | 'TAKE_SCREENSHOT'
  | 'OPEN_SETTINGS';

type DeviceControlAvailability =
  | 'READY'
  | 'PERMISSION_REQUIRED'
  | 'USER_CONFIRMATION_REQUIRED'
  | 'SYSTEM_RESTRICTED'
  | 'NOT_IMPLEMENTED';

interface DeviceControlDescriptor {
  capability: DeviceControlCapability;
  label: string;
  availability: DeviceControlAvailability;
  permissions?: string[];
}

const CONTROL_CATALOG: DeviceControlDescriptor[] = [
  {
    capability: 'TORCH',
    label: 'Torch',
    availability: 'READY',
    permissions: [PermissionsAndroid.PERMISSIONS.CAMERA],
  },
  { capability: 'LAUNCH_APP', label: 'Launch apps', availability: 'READY' },
  {
    capability: 'CALL_CONTACT',
    label: 'Call contacts',
    availability: 'READY',
    permissions: [
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    ],
  },
  {
    capability: 'SEND_MESSAGE',
    label: 'Send messages',
    availability: 'USER_CONFIRMATION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.SEND_SMS],
  },
  {
    capability: 'READ_CONTACTS',
    label: 'Read contacts',
    availability: 'PERMISSION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.READ_CONTACTS],
  },
  { capability: 'CONTROL_VOLUME', label: 'Control volume', availability: 'NOT_IMPLEMENTED' },
  { capability: 'CONTROL_MEDIA', label: 'Control media', availability: 'NOT_IMPLEMENTED' },
  { capability: 'READ_BATTERY', label: 'Read battery', availability: 'NOT_IMPLEMENTED' },
  {
    capability: 'CONTROL_BRIGHTNESS',
    label: 'Control brightness',
    availability: 'PERMISSION_REQUIRED',
  },
  {
    capability: 'READ_LOCATION',
    label: 'Read location',
    availability: 'PERMISSION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION],
  },
  { capability: 'CONTROL_WIFI', label: 'Control Wi-Fi', availability: 'SYSTEM_RESTRICTED' },
  {
    capability: 'CONTROL_BLUETOOTH',
    label: 'Control Bluetooth',
    availability: 'PERMISSION_REQUIRED',
    permissions: [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ],
  },
  {
    capability: 'READ_NOTIFICATIONS',
    label: 'Read notifications',
    availability: 'PERMISSION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS],
  },
  { capability: 'SET_ALARM', label: 'Set alarms', availability: 'NOT_IMPLEMENTED' },
  { capability: 'SET_TIMER', label: 'Set timers', availability: 'NOT_IMPLEMENTED' },
  { capability: 'VIBRATE', label: 'Vibrate', availability: 'NOT_IMPLEMENTED' },
  {
    capability: 'TAKE_PHOTO',
    label: 'Take photos',
    availability: 'PERMISSION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.CAMERA],
  },
  {
    capability: 'RECORD_AUDIO',
    label: 'Record audio',
    availability: 'PERMISSION_REQUIRED',
    permissions: [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO],
  },
  { capability: 'TAKE_SCREENSHOT', label: 'Take screenshots', availability: 'SYSTEM_RESTRICTED' },
  { capability: 'OPEN_SETTINGS', label: 'Open settings', availability: 'READY' },
];

const { DeviceControl } = NativeModules as {
  DeviceControl?: DeviceControlModule;
};

const NativeControlPlayground = () => {
  const [appName, setAppName] = useState('');
  const [contactName, setContactName] = useState('');
  const [status, setStatus] = useState('Ready');

  const requestControlPermissions = async (control: DeviceControlDescriptor) => {
    if (Platform.OS !== 'android') return false;

    const permissions = (control.permissions ?? []) as Parameters<
      typeof PermissionsAndroid.requestMultiple
    >[0];
    if (permissions.length === 0) return true;

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const deniedPermissions = permissions.filter(
      (permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED,
    );

    if (deniedPermissions.length > 0) {
      setStatus(`${control.label} permission was denied`);
      return false;
    }

    return true;
  };

  const ensureCameraPermission = async () => {
    if (Platform.OS !== 'android') return false;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera permission required',
        message: 'VINXO needs camera access to control the device torch.',
        buttonPositive: 'Allow',
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleTorch = async (isEnabled: boolean) => {
    if (!DeviceControl) {
      setStatus('DeviceControl is available on Android only');
      return;
    }

    try {
      if (!(await ensureCameraPermission())) {
        setStatus('Camera permission was denied');
        return;
      }

      await DeviceControl.setTorch(isEnabled);
      setStatus(`Torch ${isEnabled ? 'on' : 'off'}`);
    } catch (error) {
      setStatus(`Torch error: ${String(error)}`);
    }
  };

  const handleLaunchApp = async () => {
    const requestedApp = appName.trim();
    if (!requestedApp) {
      setStatus('Enter an app name first');
      return;
    }

    if (!DeviceControl) {
      setStatus('DeviceControl is available on Android only');
      return;
    }

    try {
      await DeviceControl.launchApp(requestedApp);
      setStatus(`Launching ${requestedApp}`);
    } catch (error) {
      setStatus(`Launch error: ${String(error)}`);
    }
  };

  const handleCallContact = async () => {
    const requestedContact = contactName.trim();
    if (!requestedContact) {
      setStatus('Enter a contact name first');
      return;
    }

    if (!DeviceControl) {
      setStatus('DeviceControl is available on Android only');
      return;
    }

    try {
      const permissionResult = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      ]);
      const hasPermissions =
        permissionResult[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        permissionResult[PermissionsAndroid.PERMISSIONS.CALL_PHONE] ===
          PermissionsAndroid.RESULTS.GRANTED;

      if (!hasPermissions) {
        setStatus('Contacts and phone permissions are required');
        return;
      }

      await DeviceControl.callContact(requestedContact);
      setStatus(`Calling ${requestedContact}`);
    } catch (error) {
      setStatus(`Call error: ${String(error)}`);
    }
  };

  const handleControlPress = async (control: DeviceControlDescriptor) => {
    if (!DeviceControl) {
      setStatus('DeviceControl is available on Android only');
      return;
    }

    try {
      if (!(await requestControlPermissions(control))) return;

      switch (control.capability) {
        case 'TORCH':
          await handleTorch(true);
          return;
        case 'LAUNCH_APP':
          await handleLaunchApp();
          return;
        case 'CALL_CONTACT':
          await handleCallContact();
          return;
        case 'SEND_MESSAGE':
          await DeviceControl?.openSmsComposer();
          setStatus('SMS composer opened');
          return;
        case 'READ_CONTACTS': {
          const contacts = await DeviceControl?.readContacts();
          setStatus(`${contacts?.length ?? 0} contacts found`);
          return;
        }
        case 'CONTROL_VOLUME':
          await DeviceControl?.adjustVolume('UP');
          setStatus('Volume increased');
          return;
        case 'CONTROL_MEDIA':
          await DeviceControl?.toggleMedia();
          setStatus('Media play/pause toggled');
          return;
        case 'READ_BATTERY': {
          const battery = await DeviceControl?.readBattery();
          setStatus(`Battery ${battery?.level ?? 0}%${battery?.charging ? ' and charging' : ''}`);
          return;
        }
        case 'CONTROL_BRIGHTNESS':
          await DeviceControl?.setBrightness(128);
          setStatus('Brightness set to 50%');
          return;
        case 'READ_LOCATION': {
          const location = await DeviceControl?.readLocationStatus();
          setStatus(`Location is ${location?.status ?? 'unknown'}`);
          return;
        }
        case 'CONTROL_WIFI': {
          const wifi = await DeviceControl?.readWifiStatus();
          setStatus(`Wi-Fi is ${wifi?.enabled ? 'on' : 'off'}`);
          return;
        }
        case 'CONTROL_BLUETOOTH': {
          const bluetooth = await DeviceControl?.readBluetoothStatus();
          setStatus(`Bluetooth is ${bluetooth?.enabled ? 'on' : 'off'}`);
          return;
        }
        case 'READ_NOTIFICATIONS':
          await DeviceControl?.openNotificationSettings();
          setStatus('Notification access settings opened');
          return;
        case 'SET_ALARM':
          await DeviceControl?.setAlarm(8, 0);
          setStatus('Alarm screen opened');
          return;
        case 'SET_TIMER':
          await DeviceControl?.setTimer(60);
          setStatus('Timer screen opened');
          return;
        case 'VIBRATE':
          await DeviceControl?.vibrate();
          setStatus('Device vibrated');
          return;
        case 'TAKE_PHOTO':
          await DeviceControl?.openCamera();
          setStatus('Camera opened');
          return;
        case 'RECORD_AUDIO':
          await DeviceControl?.openAudioRecorder();
          setStatus('Audio recorder opened');
          return;
        case 'TAKE_SCREENSHOT':
          await DeviceControl?.openScreenCapturePrompt();
          setStatus('Screen capture permission opened');
          return;
        case 'OPEN_SETTINGS':
          await DeviceControl?.openAppSettings();
          setStatus('Android settings opened');
          return;
        default:
          setStatus(`${control.label}: no action is available yet`);
      }
    } catch (error) {
      setStatus(`${control.label} error: ${String(error)}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>PLAYGROUND</Text>
        <Text style={styles.title}>Native device controls</Text>
        <Text style={styles.subtitle}>
          Test the Kotlin bridge without changing the main conversation screen.
        </Text>

        <View style={styles.catalog}>
          <Text style={styles.sectionTitle}>Control catalog</Text>
          {CONTROL_CATALOG.map((control) => (
            <View key={control.capability} style={styles.catalogRow}>
              <View style={styles.catalogInfo}>
                <Text style={styles.catalogLabel}>{control.label}</Text>
                <Text style={styles.catalogStatus}>{control.availability}</Text>
              </View>
              <Pressable
                style={styles.catalogButton}
                onPress={() => handleControlPress(control)}
              >
                <Text style={styles.catalogButtonText}>
                  {control.permissions?.length ? 'Allow / run' : 'Check'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Torch</Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.button} onPress={() => handleTorch(true)}>
              <Text style={styles.buttonText}>Turn on</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => handleTorch(false)}>
              <Text style={styles.buttonText}>Turn off</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Launch an app</Text>
          <TextInput
            value={appName}
            onChangeText={setAppName}
            placeholder="App name or package name"
            placeholderTextColor="#7895A8"
            style={styles.input}
            autoCapitalize="none"
            onSubmitEditing={handleLaunchApp}
            returnKeyType="go"
          />
          <Pressable style={styles.button} onPress={handleLaunchApp}>
            <Text style={styles.buttonText}>Launch app</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Call a contact</Text>
          <TextInput
            value={contactName}
            onChangeText={setContactName}
            placeholder="Contact name"
            placeholderTextColor="#7895A8"
            style={styles.input}
            onSubmitEditing={handleCallContact}
            returnKeyType="done"
          />
          <Pressable style={styles.button} onPress={handleCallContact}>
            <Text style={styles.buttonText}>Call contact</Text>
          </Pressable>
        </View>

        <Text style={styles.status}>{status}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NativeControlPlayground;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081B2D',
  },
  content: {
    padding: 24,
  },
  eyebrow: {
    color: '#75D0F7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#B8D8E9',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  section: {
    marginTop: 28,
  },
  catalog: {
    marginTop: 24,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#0B263D',
    borderWidth: 1,
    borderColor: '#1D4968',
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  catalogInfo: {
    flex: 1,
    paddingRight: 8,
  },
  catalogLabel: {
    color: '#DDF5FF',
    fontSize: 13,
  },
  catalogStatus: {
    color: '#8ED8FF',
    fontSize: 10,
    fontWeight: '700',
  },
  catalogButton: {
    alignItems: 'center',
    backgroundColor: '#1689C9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  catalogButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#1689C9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#123552',
    borderColor: '#286080',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#123552',
    borderColor: '#286080',
    borderRadius: 8,
    borderWidth: 1,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  status: {
    color: '#8ED8FF',
    fontSize: 13,
    marginTop: 28,
  },
});
