/**
 * Dropdown Component
 * Select/dropdown for choosing from enum values
 */

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

export interface DropdownOption<T> {
  value: T;
  label: string;
}

export interface DropdownProps<T> {
  label: string;
  value: T | null;
  options: DropdownOption<T>[];
  onSelect: (value: T) => void;
  allowClear?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  error?: string;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function Dropdown<T>({
  label,
  value,
  options,
  onSelect,
  allowClear = false,
  onClear,
  clearLabel = 'Clear selection',
  error,
  containerStyle,
  testID,
}: DropdownProps<T>) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || 'Select...';

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <ThemedText type="default" style={styles.label}>
        {label}
      </ThemedText>

      <Pressable
        onPress={() => setIsOpen(true)}
        testID={testID}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: error ? '#FF3B30' : theme.backgroundElement,
            backgroundColor: theme.backgroundElement,
          },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText
          type="default"
          style={[styles.buttonText, !selectedOption && styles.placeholder]}
        >
          {displayValue}
        </ThemedText>
      </Pressable>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.menu,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onSelect(item.value);
                    setIsOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                    value === item.value && styles.optionSelected,
                  ]}
                >
                  <ThemedText
                    type="default"
                    style={[
                      value === item.value && styles.optionSelectedText,
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              )}
            />
            {allowClear && (
              <Pressable
                onPress={() => {
                  onClear?.();
                  setIsOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <ThemedText type="default">{clearLabel}</ThemedText>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
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
  button: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    height: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
  },
  placeholder: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    borderRadius: Spacing.two,
    maxHeight: 300,
    minWidth: 200,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E1E6',
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionSelected: {
    backgroundColor: '#007AFF',
  },
  optionSelectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
  },
});
