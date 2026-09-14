const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * `whatsapp://` isn't in Android's default <queries> block (only `https`, added automatically
 * by Expo's own linking-scheme handling) — so Linking.canOpenURL/openURL for it fall back to
 * Android 11+ package-visibility filtering. The OS *sometimes* still resolves it anyway, via a
 * separate "implicit visibility" grant for apps the user recently interacted with directly —
 * that grant is cached per calling app's process/UID, which is exactly why "Share on WhatsApp"
 * (SplitDetailScreen.tsx) worked once, then silently stopped, and force-stopping Raqm "fixed"
 * it temporarily (the cache was cleared). It decays again — this is not a real fix.
 * Declaring the scheme here makes it queryable unconditionally, every time.
 */
function withAndroidQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [{}];
    const queries = manifest.queries[0];
    if (!queries.intent) queries.intent = [];

    const alreadyDeclared = queries.intent.some(
      (i) => i.data?.[0]?.$?.['android:scheme'] === 'whatsapp',
    );
    if (!alreadyDeclared) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'whatsapp' } }],
      });
    }

    return config;
  });
}

module.exports = withAndroidQueries;
