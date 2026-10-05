import { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

const BRAND = '#e36523';
const DARK = '#1e293b';
const MUTED = '#64748b';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: DARK, textAlign: 'right' }}>{title}</Text>
          <Text style={{ fontSize: 14, color: MUTED, textAlign: 'right', lineHeight: 22 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: MUTED }}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: destructive ? '#dc2626' : BRAND }}
            >
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Promise-based in-app confirmation. Render the returned `dialog` element once in the screen:
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title, message })) { ... }
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOptions(opts);
      }),
    [],
  );

  function close(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  const dialog = (
    <ConfirmDialog
      visible={!!options}
      title={options?.title ?? ''}
      message={options?.message ?? ''}
      confirmText={options?.confirmText}
      cancelText={options?.cancelText}
      destructive={options?.destructive}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialog };
}
