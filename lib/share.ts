import { Linking, Platform, Share } from 'react-native';

export async function shareWhatsApp(message: string): Promise<void> {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // fall through
  }
  await Share.share({ message });
}

export async function shareEmail(subject: string, body: string, to?: string): Promise<void> {
  const mailto = `mailto:${to || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    const can = await Linking.canOpenURL(mailto);
    if (can) {
      await Linking.openURL(mailto);
      return;
    }
  } catch {
    // fall through
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(mailto, '_blank');
    return;
  }
  await Share.share({ message: `${subject}\n\n${body}` });
}

export async function nativeShare(title: string, message: string): Promise<void> {
  await Share.share({ title, message });
}
