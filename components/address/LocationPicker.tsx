import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, NativeModules, TurboModuleRegistry, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';

// OpenStreetMap (Leaflet) location picker for delivery addresses.
// The pin stays fixed in the centre; the customer moves the map under it, or
// taps "موقعي الحالي". The location only counts once the customer has moved
// the map or used their current location — the initial city centre is not a
// real pick, so `value` stays null until then.
//
// Native renders the map in a WebView; web renders the same page in an iframe.

export type LatLng = { latitude: number; longitude: number };

const CITY_CENTER: Record<string, LatLng> = {
  'عمان':    { latitude: 31.9539, longitude: 35.9106 },
  'الزرقاء': { latitude: 32.0728, longitude: 36.0880 },
};
const DEFAULT_CENTER = CITY_CENTER['عمان'];

/** Link that opens the point in Google Maps (handy for drivers). */
export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function mapHtml(center: LatLng, zoom: number) {
  return `<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%;background:#F5F2EE}.leaflet-control-attribution{font-size:9px}</style>
</head><body><div id="map"></div><script>
  var map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([${center.latitude}, ${center.longitude}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent) window.parent.postMessage(s, '*');
  }
  var userMoved = false;
  map.on('dragstart zoomstart', function () { userMoved = true; });
  map.on('moveend', function () {
    if (!userMoved) return;
    var c = map.getCenter();
    send({ type: 'center', latitude: c.lat, longitude: c.lng });
  });
  function onMessage(e) {
    try {
      var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (d && d.type === 'setView') { userMoved = false; map.setView([d.latitude, d.longitude], d.zoom || 17); }
    } catch (_) {}
  }
  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);
  send({ type: 'ready' });
</script></body></html>`;
}

// Native modules are loaded defensively: an app binary built before
// react-native-webview / expo-location were added must not crash just because
// this file is in the bundle (old dev builds; OTA is also guarded by the iOS
// runtimeVersion bump). Without them the picker explains that an update is needed.
function hasNativeWebView() {
  if (Platform.OS === 'web') return true;
  try {
    return !!(
      TurboModuleRegistry.get?.('RNCWebViewModule')
      ?? NativeModules.RNCWebViewModule
      ?? NativeModules.RNCWebView
      ?? ((UIManager as any).hasViewManagerConfig?.('RNCWebView') || null)
    );
  } catch {
    return false;
  }
}
const NativeWebView: any = Platform.OS !== 'web' && hasNativeWebView()
  ? require('react-native-webview').WebView
  : null;

function loadLocation(): typeof import('expo-location') | null {
  try {
    return require('expo-location');
  } catch {
    return null;
  }
}

export function LocationPicker({
  value, onChange, city, error,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  city?: string;
  error?: string;
}) {
  const webRef    = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const [ready, setReady]       = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // Built once: re-centering after that goes through messages, so the map
  // doesn't reload while the customer is moving it.
  const html = useMemo(
    () => mapHtml(value ?? CITY_CENTER[city ?? ''] ?? DEFAULT_CENTER, value ? 17 : 12),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function post(msg: object) {
    const s = JSON.stringify(msg);
    if (Platform.OS === 'web') iframeRef.current?.contentWindow?.postMessage(s, '*');
    else webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(s)}}));true;`);
  }

  // Last point the map itself reported, so we can tell a value set from outside
  // (e.g. a saved address that loaded after the map opened) and re-center on it.
  const lastFromMap = useRef<LatLng | null>(null);

  function handleMessage(raw: string) {
    try {
      const d = JSON.parse(raw);
      if (d.type === 'ready') setReady(true);
      if (d.type === 'center') {
        lastFromMap.current = { latitude: d.latitude, longitude: d.longitude };
        onChange(lastFromMap.current);
      }
    } catch {
      // ignore unrelated messages
    }
  }

  // Web: messages from our iframe only
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && typeof e.data === 'string') handleMessage(e.data);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  });

  useEffect(() => {
    if (!ready || !value) return;
    const m = lastFromMap.current;
    if (m && m.latitude === value.latitude && m.longitude === value.longitude) return;
    lastFromMap.current = value;
    post({ type: 'setView', ...value, zoom: 17 });
  }, [ready, value?.latitude, value?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // Picking another city before choosing a point moves the map to that city
  useEffect(() => {
    if (!ready || value || !city || !CITY_CENTER[city]) return;
    post({ type: 'setView', ...CITY_CENTER[city], zoom: 12 });
  }, [city, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  async function useMyLocation() {
    setLocError(null);
    setLocating(true);
    try {
      const Location = loadLocation();
      if (!Location) {
        setLocError('تحديد الموقع التلقائي غير متاح في هذا الإصدار. حرّك الخريطة لتحديد موقعك.');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('لم يتم السماح بالوصول للموقع. حرّك الخريطة يدوياً لتحديد موقعك.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      lastFromMap.current = point;
      post({ type: 'setView', ...point, zoom: 17 });
      onChange(point);
    } catch {
      setLocError('تعذّر تحديد موقعك. حرّك الخريطة يدوياً لتحديد موقعك.');
    } finally {
      setLocating(false);
    }
  }

  const borderColor = error && !value ? COLORS.danger : COLORS.line;

  if (Platform.OS !== 'web' && !NativeWebView) {
    return (
      <View style={{ marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: COLORS.brandTint, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Ionicons name="map-outline" size={22} color={COLORS.brandText} />
        <Text style={{ flex: 1, fontSize: 13, color: COLORS.ink, lineHeight: 19 }}>
          لتحديد الموقع على الخريطة، يرجى تحديث التطبيق إلى آخر إصدار من المتجر.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink, marginBottom: 6, textAlign: 'right' }}>
        الموقع على الخريطة *
      </Text>

      <View style={{ height: 240, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor, backgroundColor: COLORS.surface }}>
        {Platform.OS === 'web'
          ? createElement('iframe', {
              ref: iframeRef,
              srcDoc: html,
              title: 'خريطة تحديد الموقع',
              style: { border: 0, width: '100%', height: '100%' },
            })
          : (
            <NativeWebView
              ref={webRef}
              originWhitelist={['*']}
              // A real origin so OpenStreetMap tile requests carry a Referer, as its usage policy asks
              source={{ html, baseUrl: 'https://shop.ardalsharq.com' }}
              onMessage={(e: any) => handleMessage(e.nativeEvent.data)}
              javaScriptEnabled
              scrollEnabled={false}
              nestedScrollEnabled
              style={{ flex: 1, backgroundColor: 'transparent' }}
            />
          )}

        {/* Fixed centre pin (the map moves under it) */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ marginTop: -34, alignItems: 'center' }}>
            <Ionicons name="location" size={40} color={COLORS.brandFill} />
            <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: 'rgba(28,25,23,0.3)', marginTop: -4 }} />
          </View>
        </View>

        {!ready && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface }}>
            <ActivityIndicator color={COLORS.brandText} />
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons
            name={value ? 'checkmark-circle' : 'information-circle-outline'}
            size={18}
            color={value ? COLORS.green : (error ? COLORS.danger : COLORS.muted)}
          />
          <Text style={{ flex: 1, fontSize: 12, color: value ? COLORS.green : (error ? COLORS.danger : COLORS.muted), fontWeight: value ? '600' : '400' }}>
            {value ? 'تم تحديد الموقع' : (error ?? 'حرّك الخريطة حتى يكون الدبوس على موقعك')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={useMyLocation}
          disabled={locating}
          activeOpacity={0.8}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12,
            borderRadius: 10, backgroundColor: COLORS.brandTint,
          }}
        >
          {locating
            ? <ActivityIndicator size="small" color={COLORS.brandText} />
            : <Ionicons name="navigate" size={16} color={COLORS.brandText} />}
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.brandText }}>موقعي الحالي</Text>
        </TouchableOpacity>
      </View>

      {!!locError && (
        <Text style={{ fontSize: 12, color: COLORS.danger, marginTop: 4, textAlign: 'right' }}>{locError}</Text>
      )}
    </View>
  );
}
