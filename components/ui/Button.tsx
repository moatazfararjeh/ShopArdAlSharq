import { TouchableOpacity, Text, ActivityIndicator, View, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantBg: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '#f97316',
  secondary: '#22c55e',
  outline: 'transparent',
  danger: '#ef4444',
  ghost: 'transparent',
};

const variantBorder: Record<NonNullable<ButtonProps['variant']>, string | undefined> = {
  primary: undefined,
  secondary: undefined,
  outline: '#f97316',
  danger: undefined,
  ghost: undefined,
};

const variantTextColor: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: '#ffffff',
  secondary: '#ffffff',
  outline: '#f97316',
  danger: '#ffffff',
  ghost: '#6b7280',
};

const sizePadding: Record<NonNullable<ButtonProps['size']>, { paddingVertical: number; paddingHorizontal: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 13, paddingHorizontal: 22 },
  lg: { paddingVertical: 16, paddingHorizontal: 28 },
};

const sizeFontSize: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 14,
  md: 15,
  lg: 17,
};

const sizeBorderRadius: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const bg = variantBg[variant];
  const borderColor = variantBorder[variant];
  const textColor = variantTextColor[variant];
  const padding = sizePadding[size];
  const fontSize = sizeFontSize[size];
  const borderRadius = sizeBorderRadius[size];

  return (
    <TouchableOpacity
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDisabled && variant === 'primary' ? '#d1d5db' : bg,
          borderRadius,
          borderWidth: borderColor ? 2 : 0,
          borderColor: borderColor ?? undefined,
          ...padding,
          ...(fullWidth ? { width: '100%' } : {}),
          shadowColor: variant === 'primary' && !isDisabled ? '#f97316' : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: variant === 'primary' && !isDisabled ? 4 : 0,
        },
        style as any,
      ]}
      {...rest}
    >
      {isLoading && (
        <View style={{ marginRight: 8 }}>
          <ActivityIndicator size="small" color={textColor} />
        </View>
      )}
      <Text style={{ color: isDisabled && variant === 'primary' ? '#9ca3af' : textColor, fontSize, fontWeight: '700', letterSpacing: 0.3 }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
