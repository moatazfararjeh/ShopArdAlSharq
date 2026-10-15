import { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useErrorLogs, useDeleteErrorLog, useClearErrorLogs } from '@/hooks/useErrorLogs';
import { ErrorLogEntry } from '@/services/errorLogService';
import { formatDateTime, formatRelativeTime } from '@/utils/formatDate';

const C = { surface: '#f0f4f8', card: '#ffffff', brand: '#e36523', text: '#1e293b', muted: '#64748b', hairline: '#e2e8f0' };

const PLATFORM_OPTIONS = [
  { id: 'all', label: 'الكل' },
  { id: 'android', label: 'Android' },
  { id: 'ios', label: 'iOS' },
  { id: 'web', label: 'Web' },
];

const PLATFORM_COLORS: Record<string, string> = {
  android: '#16a34a',
  ios: '#64748b',
  web: '#3b82f6',
};

function LogCard({ entry, onDelete }: { entry: ErrorLogEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const platformColor = PLATFORM_COLORS[entry.platform ?? ''] ?? C.muted;
  const metadataStr = entry.metadata && Object.keys(entry.metadata).length > 0
    ? JSON.stringify(entry.metadata, null, 2)
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setExpanded((e) => !e)}
      style={{
        backgroundColor: C.card, borderRadius: 16, marginHorizontal: 16, marginVertical: 5,
        padding: 14, shadowColor: '#1e293b', shadowOpacity: 0.05, shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <TouchableOpacity
          onPress={() => Alert.alert('حذف السجل', 'هل تريد حذف هذا السجل؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'حذف', style: 'destructive', onPress: () => onDelete(entry.id) },
          ])}
          style={{ padding: 4 }}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
            {entry.context ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.text }}>{entry.context}</Text>
              </View>
            ) : null}
            {entry.platform ? (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: `${platformColor}22`, borderRadius: 20 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: platformColor }}>{entry.platform}</Text>
              </View>
            ) : null}
          </View>

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626', textAlign: 'right' }} numberOfLines={expanded ? undefined : 2}>
            {entry.message}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: C.muted }}>{entry.app_version ?? '—'}</Text>
            <Text style={{ fontSize: 10, color: C.muted, textAlign: 'right' }}>
              {entry.profiles?.email ?? (entry.user_id ? 'مستخدم محذوف' : 'زائر غير مسجل')} · {formatRelativeTime(entry.created_at)}
            </Text>
          </View>

          {expanded && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.hairline }}>
              <Text style={{ fontSize: 10, color: C.muted, textAlign: 'right', marginBottom: 6 }}>
                {formatDateTime(entry.created_at)}
              </Text>
              {entry.stack ? (
                <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'left', writingDirection: 'ltr' }} selectable>
                  {entry.stack}
                </Text>
              ) : null}
              {metadataStr ? (
                <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'left', writingDirection: 'ltr', marginTop: 6 }} selectable>
                  {metadataStr}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ErrorLogsScreen() {
  const router = useRouter();
  const { data: logs, isLoading, refetch, isRefetching } = useErrorLogs();
  const deleteLog = useDeleteErrorLog();
  const clearAll = useClearErrorLogs();
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');

  const filtered = useMemo(() => {
    if (!logs) return [];
    let rows = logs;
    if (platform !== 'all') rows = rows.filter((l) => l.platform === platform);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((l) =>
        l.message.toLowerCase().includes(q) || (l.context ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [logs, search, platform]);

  function handleClearAll() {
    Alert.alert('مسح كل السجلات', 'هل تريد حذف جميع سجلات الأخطاء؟ هذا الإجراء لا يمكن التراجع عنه.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مسح الكل', style: 'destructive', onPress: () => clearAll.mutate() },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      {/* Header */}
      <View style={{
        backgroundColor: C.card, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: C.hairline,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="home-outline" size={18} color={C.muted} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>سجل الأخطاء</Text>
          <TouchableOpacity
            onPress={handleClearAll}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="بحث بالرسالة أو السياق..."
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, fontSize: 13, color: C.text, textAlign: 'right' }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Platform filter chips */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {PLATFORM_OPTIONS.map((opt) => {
            const active = platform === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setPlatform(opt.id)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: active ? C.brand : '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.text }}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 32 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          logs && !isLoading ? (
            <Text style={{ fontSize: 12, color: C.muted, paddingHorizontal: 20, paddingBottom: 4, marginTop: 4, textAlign: 'right' }}>
              {filtered.length} سجل
            </Text>
          ) : null
        }
        renderItem={({ item }) => <LogCard entry={item} onDelete={(id) => deleteLog.mutate(id)} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingTop: 80, alignItems: 'center' }}>
              <ActivityIndicator color={C.brand} />
            </View>
          ) : (
            <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: C.muted, fontSize: 15, fontWeight: '600' }}>لا توجد أخطاء مسجّلة</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
