import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Linking } from "react-native";

const ZOOM = 16;
const TILE = 256;
const HEIGHT = 160;

const nameCache = new Map<string, string | null>();

function project(lat: number, lng: number) {
  const n = 2 ** ZOOM;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n * TILE,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * TILE,
  };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (nameCache.has(key)) return nameCache.get(key) ?? null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "Raqm/1.0 (personal finance app)", "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const parts = String(json.display_name ?? "").split(", ");
    const label = json.name || parts.slice(0, 3).join(", ") || null;
    const full = json.name && parts.length > 1 ? `${json.name}, ${parts.slice(1, 3).join(", ")}` : label;
    nameCache.set(key, full);
    return full;
  } catch {
    return null;
  }
}

export function LocationMap({ lat, lng }: { lat: number; lng: number }) {
  const [width, setWidth] = useState(0);
  const [place, setPlace] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setPlace(undefined);
    reverseGeocode(lat, lng).then((p) => alive && setPlace(p));
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  const tiles: { key: string; uri: string; left: number; top: number }[] = [];
  if (width > 0) {
    const c = project(lat, lng);
    const originX = c.x - width / 2;
    const originY = c.y - HEIGHT / 2;
    const n = 2 ** ZOOM;
    for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + HEIGHT) / TILE); ty++) {
      for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
        const wrapped = ((tx % n) + n) % n;
        tiles.push({
          key: `${tx}/${ty}`,
          uri: `https://tile.openstreetmap.org/${ZOOM}/${wrapped}/${ty}.png`,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
        });
      }
    }
  }

  const openGoogleMaps = () =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);

  return (
    <Pressable onPress={openGoogleMaps} accessibilityRole="link" accessibilityLabel="Open location in Google Maps">
      <View
        className="rounded-md overflow-hidden border border-border-subtle bg-surface-container-low"
        style={{ height: HEIGHT }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.uri }}
            style={{ position: "absolute", left: t.left, top: t.top, width: TILE, height: TILE }}
          />
        ))}
        <View
          className="absolute w-[18px] h-[18px] rounded-full bg-primary border-[3px] border-white"
          style={{ left: width / 2 - 9, top: HEIGHT / 2 - 9 }}
        />
        <Text className="absolute right-1 bottom-1 bg-white/80 px-1 text-[9px] text-black">© OpenStreetMap</Text>
      </View>
      <Text className="font-inter text-supporting-text text-on-surface mt-sm" numberOfLines={2}>
        {place === undefined ? "Locating place…" : (place ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`)}
      </Text>
      <Text className="font-inter text-annotation text-primary mt-xs">Open in Google Maps</Text>
    </Pressable>
  );
}
