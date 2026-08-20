/**
 * Inventory List Component
 * Displays a list of inventory items, optionally grouped by location
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { INVENTORY_LOCATIONS } from '@/constants/inventory';
import { Spacing } from '@/constants/theme';
import { InventoryItem, InventoryLocation } from '@/types/inventory';
import { StyleSheet, ViewStyle } from 'react-native';
import { InventoryItemCard } from './inventory-item-card';

export interface InventoryListProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  groupByLocation?: boolean;
  emptyMessage?: string;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function InventoryList({
  items,
  onDelete,
  groupByLocation = false,
  emptyMessage = 'No items to display',
  containerStyle,
  testID,
}: InventoryListProps) {
  if (items.length === 0) {
    return (
      <ThemedView style={[styles.empty, containerStyle]}>
        <ThemedText type="default" style={styles.emptyText}>
          {emptyMessage}
        </ThemedText>
      </ThemedView>
    );
  }

  if (!groupByLocation) {
    return (
      <ThemedView
        style={[styles.list, containerStyle]}
        testID={testID}
      >
        <ThemedView style={styles.listContent}>
          {items.map((item) => (
          <InventoryItemCard
            key={item.id}
            item={item}
            onDelete={onDelete}
            testID={`item-card-${item.id}`}
          />
          ))}
        </ThemedView>
      </ThemedView>
    );
  }

  // Group items by location
  const locationGroups: Record<InventoryLocation, InventoryItem[]> = {
    fridge: [],
    freezer: [],
    cupboard: [],
    other: [],
  };

  items.forEach((item) => {
    locationGroups[item.location].push(item);
  });

  const locationsWithItems = Object.entries(locationGroups).filter(
    ([_, locationItems]) => locationItems.length > 0
  ) as [InventoryLocation, InventoryItem[]][];

  return (
    <ThemedView
      style={[styles.list, containerStyle]}
      testID={testID}
    >
      <ThemedView style={styles.listContent}>
        {locationsWithItems.map(([location, locationItems]) => (
        <ThemedView key={location} style={styles.locationGroup}>
          <ThemedText type="subtitle" style={styles.locationHeader}>
            {INVENTORY_LOCATIONS[location]}
          </ThemedText>
          <ThemedView>
            {locationItems.map((item) => (
              <InventoryItemCard
                key={item.id}
                item={item}
                onDelete={onDelete}
                testID={`item-card-${item.id}`}
              />
            ))}
          </ThemedView>
        </ThemedView>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  locationGroup: {
    marginBottom: Spacing.four,
  },
  locationHeader: {
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
});
