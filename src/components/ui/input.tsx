/**
 * Input Component
 * Text input with label and error state
 */

import { StyleSheet, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const theme = useTheme();

  const inputStyle = [
    styles.input,
    {
      borderColor: error ? '#FF3B30' : theme.backgroundElement,
      color: theme.text,
      backgroundColor: theme.backgroundElement,
    },
    style,
  ];

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <ThemedText type="default" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        style={inputStyle}
        placeholderTextColor={theme.textSecondary}
        cursorColor={theme.text}
        {...props}
      />
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
    height: 44,
  },
  error: {
    color: '#FF3B30',
  },
});
