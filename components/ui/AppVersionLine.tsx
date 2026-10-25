import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { getClientSource } from '@/lib/clientSource';
import { COLORS } from '@/lib/theme';

// Which code this device is running: app version + store build, and whether an
// OTA update is applied (with its date) or the code built into the install.
// Tapping "check" downloads a waiting OTA and restarts right away, instead of
// waiting for the next two cold starts.

function formatStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppVersionLine() {
  const { appVersion } = getClientSource();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (Platform.OS === 'web') {
    return (
      <Text style={{ fontSize: 12, color: COLORS.faint, textAlign: 'center' }}>
        الموقع · الإصدار {appVersion ?? '—'}
      </Text>
    );
  }

  const ota = Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.createdAt
    ? `تحديث ${formatStamp(Updates.createdAt)} · ${Updates.updateId?.slice(0, 8)}`
    : 'بدون تحديث (نسخة المتجر)';

  async function check() {
    if (!Updates.isEnabled) { setStatus('التحديثات غير مفعّلة في هذه النسخة'); return; }
    setChecking(true);
    setStatus(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) { setStatus('لديك آخر تحديث'); return; }
      setStatus('جارٍ تنزيل التحديث...');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();   // restarts the app on the new code
    } catch (e) {
      setStatus(`تعذّر التحقق: ${(e as Error).message ?? ''}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 12, color: COLORS.faint, textAlign: 'center' }}>
        الإصدار {appVersion ?? '—'} · {ota}
      </Text>
      <TouchableOpacity onPress={check} disabled={checking} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 }}>
        {checking && <ActivityIndicator size="small" color={COLORS.brandText} />}
        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.brandText }}>تحقق من وجود تحديث</Text>
      </TouchableOpacity>
      {!!status && <Text style={{ fontSize: 12, color: COLORS.muted, textAlign: 'center' }}>{status}</Text>}
    </View>
  );
}
