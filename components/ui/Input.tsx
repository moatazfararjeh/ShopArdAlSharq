import { View, Text, TextInput, TextInputProps } from 'react-native';
import { forwardRef, useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, hint, style, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);
    return (
      <View style={{ marginBottom: 16 }}>
        {!!label && (
          <Text style={{ marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#374151' }}>
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          style={[
            {
              borderRadius: 14,
              borderWidth: 1.5,
              backgroundColor: focused ? '#ffffff' : '#f9fafb',
              borderColor: error ? '#ef4444' : focused ? '#f97316' : '#e5e7eb',
              paddingHorizontal: 16,
              paddingVertical: 13,
              fontSize: 15,
              color: '#111827',
              textAlign: 'right',
              shadowColor: focused ? '#f97316' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: focused ? 2 : 0,
            },
            style as any,
          ]}
          placeholderTextColor="#9ca3af"
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          {...rest}
        />
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
