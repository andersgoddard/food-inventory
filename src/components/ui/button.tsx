/**
 * Button Component
 * Reusable themed button with variants
 */

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';

export interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return theme.backgroundElement;
    switch (variant) {
      case 'primary':
        return '#007AFF';
      case 'secondary':
        return theme.backgroundElement;
      case 'danger':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.textSecondary;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return theme.text;
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one };
      case 'medium':
        return { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two };
      case 'large':
        return { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three };
      default:
        return { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two };
    }
  };

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      ...getPadding(),
    },
    style,
  ];

  const textStyle = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: size === 'small' ? 12 : size === 'large' ? 18 : 14,
    },
  ];

  return (
    <Pressable
      onPress={onPress}
      {...(Platform.OS === 'web' ? { onClick: onPress } : {})}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        buttonStyle,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <ThemedText style={textStyle} type={size === 'large' ? 'default' : 'small'}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
