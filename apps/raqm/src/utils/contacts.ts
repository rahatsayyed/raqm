import * as Contacts from 'expo-contacts';

/**
 * Opens the native contact picker and returns the picked contact's name and
 * first phone number, or null if the user cancelled or denied permission.
 * Never throws — a permission denial or picker cancellation both resolve to
 * null so callers can fall back to manual entry without a try/catch.
 */
export async function pickContact(): Promise<{ name: string; phoneNumber: string | null } | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const contact = await Contacts.Contact.presentPicker();
    if (!contact) return null;

    const phones = await contact.getPhones();
    const phoneNumber = phones?.[0]?.number ?? null;
    const name = await contact.getFullName();

    return { name: name ?? 'Unknown', phoneNumber };
  } catch {
    return null;
  }
}
