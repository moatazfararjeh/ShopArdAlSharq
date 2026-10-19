import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { forwardRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, secureTextEntry, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    // Password fields get an eye button to show / hide what was typed
    const isPassword = !!secureTextEntry;
    const [showPassword, setShowPassword] = useState(false);

    return (
      <View style={{ marginBottom: 16 }}>
        {!!label && (
          <Text style={{ marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#374151' }}>
            {label}
          </Text>
        )}
        <View style={{ position: 'relative', justifyContent: 'center' }}>
          <TextInput
            ref={ref}
            style={[
              {
                borderRadius: 14,
                borderWidth: 1.5,
                backgroundColor: focused ? '#ffffff' : '#f9fafb',
                borderColor: error ? '#ef4444' : focused ? '#e36523' : '#e5e7eb',
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                color: '#111827',
                textAlign: 'right',
                shadowColor: focused ? '#e36523' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
                elevation: focused ? 2 : 0,
              },
              // Keep typed text clear of the eye button (left side in RTL)
              isPassword && { paddingLeft: 48 },
              style as any,
            ]}
            placeholderTextColor="#9ca3af"
            secureTextEntry={isPassword && !showPassword}
            {...(isPassword ? { autoCapitalize: 'none' as const, autoCorrect: false } : {})}
            {...rest}
            // Ours run first, then the caller's — so a form's onBlur doesn't
            // replace the focus styling
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                position: 'absolute', left: 4, width: 44, height: 44,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text style={{ marginTop: 5, fontSize: 12, color: '#ef4444', fontWeight: '500' }}>
            {error}
          </Text>
        )}
        {hint && !error && (
          <Text style={{ marginTop: 5, fontSize: 12, color: '#6b7280' }}>{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';
