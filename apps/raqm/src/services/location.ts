import * as Location from 'expo-location';
import { logEvent } from './logger';

/** L1/L3: returns null on any failure or denial — never throws. */
export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== Location.PermissionStatus.GRANTED) {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }
    if (status !== Location.PermissionStatus.GRANTED) return null;

    // A fresh GPS fix (getCurrentPositionAsync) can take several seconds or fail outright
    // right when a live SMS arrives (cold radio, indoors, no fix since boot) — exactly the
    // moment live transaction capture needs a coordinate immediately, which is why live
    // transactions were ending up with no location while the fix silently swallowed the
    // error below. A last-known fix is near-instant and good enough for "where was this."
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000 });
    if (lastKnown) return { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch (error) {
    console.warn('getCurrentCoords failed:', error);
    logEvent('error.caught', `location.getCurrentCoords: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
