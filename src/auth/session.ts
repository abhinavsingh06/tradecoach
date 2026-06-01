import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'tradecoach_session_token';

// SecureStore is not supported on web. Fall back to localStorage so the same
// API works across native + web. On native we still use the OS keychain.
const isWeb = Platform.OS === 'web';

export const getSessionToken = async (): Promise<string | null> => {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setSessionToken = async (token: string): Promise<void> => {
  if (isWeb) {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const clearSessionToken = async (): Promise<void> => {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* already cleared */
  }
};
