import { NativeModules, Platform } from 'react-native';

interface VinxoAssistantInterface {
  isAssistantRoleHeld(): Promise<boolean>;
  requestAssistantRole(): Promise<boolean>;
}

const { VinxoAssistant } = NativeModules;

const Assistant: VinxoAssistantInterface | undefined =
  Platform.OS === 'android' ? VinxoAssistant : undefined;

export const isAssistantRoleHeld = async (): Promise<boolean> => {
  if (!Assistant) {
    throw new Error('VINXO Assistant native module is unavailable');
  }

  return Assistant.isAssistantRoleHeld();
};

export const requestAssistantRole = async (): Promise<boolean> => {
  if (!Assistant) {
    throw new Error('VINXO Assistant native module is unavailable');
  }

  return Assistant.requestAssistantRole();
};