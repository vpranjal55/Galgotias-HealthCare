import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  users: 'gch_users',
  session: 'gch_session',
  mess: 'gch_mess_logs',
  curfew: 'gch_curfew_logs',
  health: 'gch_health_metrics',
  chats: 'gch_chat_messages',
  appointments: 'gch_appointments',
  notifications: 'gch_notifications',
  seeded: 'gch_seeded_v5',
  hcSync: 'gch_health_connect_sync',
};

export async function getJSON<T>(key: keyof typeof KEYS, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(KEYS[key]);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: keyof typeof KEYS, value: T): Promise<void> {
  await AsyncStorage.setItem(KEYS[key], JSON.stringify(value));
}

export async function removeKey(key: keyof typeof KEYS): Promise<void> {
  await AsyncStorage.removeItem(KEYS[key]);
}

export { KEYS };
