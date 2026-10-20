import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';

export interface QuickAddModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

/** Lightweight "create by name only" modal, used to add a new brand/section/
 * category without leaving the product form. */
export default function QuickAddModal({ visible, title, placeholder, onClose, onSubmit }: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  function handleClose() {
    if (saving) return;
    setName('');
    onClose();
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      Alert.alert('خطأ', 'الاسم يجب أن يكون حرفين على الأقل');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(name.trim());
      setName('');
      onClose();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'right' }}>{title}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={placeholder ?? 'الاسم بالعربية'}
            placeholderTextColor="#9ca3af"
            autoFocus
            editable={!saving}
            style={{
              borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
              color: '#111827', backgroundColor: '#f9fafb', textAlign: 'right',
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={saving}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#e36523', alignItems: 'center' }}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>حفظ</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
