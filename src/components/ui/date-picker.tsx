/**
 * Date Picker Component
 * Simple date picker using native platform UI
 */

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { extractDatePart, formatDate, parseISOString } from '@/utils/date';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

export interface DatePickerProps {
  label: string;
  value: string | null;
  onChange: (isoString: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  containerStyle,
  testID,
}: DatePickerProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const dateValue = parseISOString(value) || new Date();
  const displayValue = value ? formatDate(value) : 'Select a date';

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      // Convert Date to ISO 8601 string
      const isoString = selectedDate.toISOString();
      onChange(isoString);
    }
  };

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <ThemedText type="default" style={styles.label}>
        {label}
      </ThemedText>

      <Pressable
        onPress={() => setShowPicker(true)}
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
        <ThemedText type="default" style={styles.buttonText}>
          {displayValue}
        </ThemedText>
      </Pressable>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      {Platform.OS === 'web' && React.createElement('input', {
        type: 'date',
        value: extractDatePart(value),
        onChange: (event: { target: { value: string } }) => {
          onChange(event.target.value ? `${event.target.value}T00:00:00.000Z` : '');
        },
        'aria-label': label,
        'data-testid': testID,
        style: styles.webInput,
      })}

      {Platform.OS !== 'web' && showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          onTouchCancel={() => setShowPicker(false)}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <Pressable
          style={styles.iosDonButton}
          onPress={() => setShowPicker(false)}
        >
          <ThemedText type="default" style={styles.iosDoneText}>
            Done
          </ThemedText>
        </Pressable>
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
  pressed: {
    opacity: 0.7,
  },
  error: {
    color: '#FF3B30',
  },
  iosDonButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#007AFF',
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  webInput: {
    width: '100%',
    height: 44,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    fontSize: 16,
    boxSizing: 'border-box',
  },
  iosDoneText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
