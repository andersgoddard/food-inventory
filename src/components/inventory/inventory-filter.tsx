/**
 * Inventory Filter Component
 * Search, filter, and sort controls for inventory items
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

export interface InventoryFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showExpiringOnly: boolean;
  onExpiringChange: (value: boolean) => void;
  containerStyle?: ViewStyle;
}

export function InventoryFilter({
  searchQuery,
  onSearchChange,
  showExpiringOnly,
  onExpiringChange,
  containerStyle,
}: InventoryFilterProps) {
  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <Input
        label="Search"
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Search by name..."
        testID="search-input"
      />

      <Pressable onPress={() => onExpiringChange(!showExpiringOnly)} style={styles.expiryToggle}>
        <ThemedText type="default">Close to expiry</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{showExpiringOnly ? 'On' : 'Off'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  locationSelector: {
    gap: Spacing.one,
  },
  expiryToggle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two },
});
