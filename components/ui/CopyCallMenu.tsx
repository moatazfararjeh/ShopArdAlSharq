import { useState } from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/theme';
import { copyText } from '@/lib/clipboard';
import { useToastStore } from '@/stores/toastStore';

interface Option {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

/**
 * Wraps a phone number or address: tapping it opens a small menu —
 * "اتصال" + "نسخ" for a phone, "نسخ" for anything else.
 */
export function CopyCallMenu({ value, phone = false, children }: {
  value: string;
  phone?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const options: Option[] = [
    ...(phone ? [{
      icon: 'call-outline' as const,
      label: 'اتصال',
      onPress: () => Linking.openURL(`tel:${value.replace(/[^\d+]/g, '')}`).catch(() => showToast('تعذر فتح الاتصال', 'error')),
    }] : []),
    {
      icon: 'copy-outline',
      label: phone ? 'نسخ الرقم' : 'نسخ',
      onPress: async () => {
        if (await copyText(value)) showToast('تم النسخ');
      },
    },
  ];

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.6}>
        {children}
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        >
          <Pressable style={{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' }}>
            <Text numberOfLines={3} style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink, textAlign: 'center', padding: 16 }}>
              {value}
            </Text>
            {options.map((o) => (
              <TouchableOpacity
                key={o.label}
                onPress={() => { setOpen(false); o.onPress(); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 50, borderTopWidth: 1, borderTopColor: COLORS.line,
                }}
              >
                <Ionicons name={o.icon} size={18} color={COLORS.brandText} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.brandText }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={{ height: 50, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.line }}
            >
              <Text style={{ fontSize: 15, color: COLORS.muted }}>إلغاء</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
