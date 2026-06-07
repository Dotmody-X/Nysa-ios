import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

/**
 * Supabase is the cloud mirror + auth provider. Row Level Security (configured
 * in the Supabase dashboard) guarantees a user can only ever read/write their
 * own rows — enforced at the database layer, not in app code.
 *
 * Auth tokens are persisted in the device's secure enclave (Keychain /
 * Keystore) via expo-secure-store, never in plain AsyncStorage.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY — copy .env.example to .env');
}

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
