import { Linking, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Opens an external URL (a upi:// or whatsapp:// link). If nothing on the
 * device can handle it (no UPI app installed, WhatsApp not installed), falls
 * back to copying fallbackMessage to the clipboard with a toast, rather than
 * a dead tap — per the spec's error-handling section.
 */
export async function openExternalLink(url: string, fallbackMessage: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('unsupported');
    await Linking.openURL(url);
  } catch {
    await Clipboard.setStringAsync(fallbackMessage);
    ToastAndroid.show('No app found — copied the link instead', ToastAndroid.LONG);
  }
}
