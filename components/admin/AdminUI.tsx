import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';

// Shared building blocks for the admin list screens (Option A style), so the
// header, search and filter chips look the same on every admin page.

type IconName = keyof typeof Ionicons.glyphMap;

/** White header: back arrow, title + optional subtitle, actions on the far side. */
export function AdminHeader({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Rendered under the title row (search, chips…). */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(admin)/dashboard' as any)}
          accessibilityLabel="رجوع"
          style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="arrow-forward" size={20} color={COLORS.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: COLORS.ink }} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={{ fontSize: 12, color: COLORS.muted }} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {actions}
      </View>
      {children}
    </View>
  );
}

/** Header action: `primary` is the filled brand button, otherwise outlined. */
export function AdminButton({ label, icon, onPress, primary, loading, accessibilityLabel }: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  primary?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}) {
  const fg = primary ? '#fff' : COLORS.ink;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        height: 40, minWidth: 40, paddingHorizontal: label ? 12 : 0, borderRadius: 10,
        backgroundColor: primary ? COLORS.brandFill : '#fff',
        borderWidth: primary ? 0 : 1, borderColor: COLORS.line,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
      }}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : icon && <Ionicons name={icon} size={18} color={fg} />}
      {!!label && <Text style={{ fontSize: 13, fontWeight: primary ? '700' : '600', color: fg }}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function AdminSearch({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ height: 44, borderRadius: 12, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
      <Ionicons name="search-outline" size={18} color={COLORS.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        style={{ flex: 1, fontSize: 14, color: COLORS.ink, textAlign: 'right' } as any}
      />
      {!!value && (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="مسح البحث">
          <Ionicons name="close-circle" size={18} color={COLORS.faint} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AdminChip({ label, count, active, onPress }: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityState={{ selected: active }}
      style={{
        height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 18,
        backgroundColor: active ? COLORS.ink : '#fff', borderWidth: 1, borderColor: active ? COLORS.ink : COLORS.line,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#fff' : COLORS.ink }}>{label}</Text>
      {count !== undefined && (
        <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : COLORS.muted }}>{count}</Text>
      )}
    </TouchableOpacity>
  );
}

/** Small status label. `tone` picks the colour pair. */
export function StatusPill({ label, tone, onPress }: {
  label: string;
  tone: 'green' | 'muted' | 'danger' | 'brand';
  onPress?: () => void;
}) {
  const colors = {
    green:  { fg: COLORS.green,     bg: COLORS.greenTint },
    muted:  { fg: COLORS.muted,     bg: COLORS.surface },
    danger: { fg: COLORS.danger,    bg: '#FDECEA' },
    brand:  { fg: COLORS.brandText, bg: COLORS.brandTint },
  }[tone];
  const pill = (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.fg }}>{label}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress} accessibilityRole="button">{pill}</TouchableOpacity> : pill;
}

/** 40×40 icon-only row action. */
export function RowAction({ icon, label, onPress, color = COLORS.ink }: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );
}

/** Centered empty-state message. */
export function AdminEmpty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ paddingTop: 80, alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={48} color={COLORS.faint} />
      <Text style={{ color: COLORS.muted, fontSize: 15, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
