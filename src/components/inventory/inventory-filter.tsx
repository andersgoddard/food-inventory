/**
 * Inventory Filter Component
 * Search, filter, and sort controls for inventory items
 */

import { ThemedView } from '@/components/themed-view';
import { Dropdown, DropdownOption } from '@/components/ui/dropdown';
import { Input } from '@/components/ui/input';
import { CATEGORY_LIST, INVENTORY_CATEGORIES } from '@/constants/inventory';
import { Spacing } from '@/constants/theme';
import { InventoryCategory, InventoryFilters, InventoryLocation } from '@/types/inventory';
import { StyleSheet, ViewStyle } from 'react-native';
import { LocationSelector } from './location-selector';

export interface InventoryFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLocation: InventoryLocation | null;
  onLocationChange: (location: InventoryLocation | null) => void;
  selectedCategory: InventoryCategory | null;
  onCategoryChange: (category: InventoryCategory | null) => void;
  sortBy: InventoryFilters['sortBy'];
  onSortChange: (sortBy: InventoryFilters['sortBy']) => void;
  containerStyle?: ViewStyle;
}

export function InventoryFilter({
  searchQuery,
  onSearchChange,
  selectedLocation,
  onLocationChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
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

      <LocationSelector
        value={selectedLocation}
        onChange={(location) => onLocationChange(location)}
        allowClear
        containerStyle={styles.locationSelector}
      />

      <Dropdown<InventoryCategory>
        label="Category"
        value={selectedCategory}
        options={CATEGORY_LIST.map((category): DropdownOption<InventoryCategory> => ({
          value: category,
          label: INVENTORY_CATEGORIES[category],
        }))}
        onSelect={onCategoryChange}
        allowClear
        onClear={() => onCategoryChange(null)}
        clearLabel="All categories"
        testID="category-filter"
      />

      <Dropdown<NonNullable<InventoryFilters['sortBy']>>
        label="Sort by"
        value={sortBy || 'expiryDate'}
        options={[
          { value: 'expiryDate', label: 'Expiry date' },
          { value: 'name', label: 'Name' },
          { value: 'location', label: 'Location' },
          { value: 'purchaseDate', label: 'Purchase date' },
          { value: 'category', label: 'Category' },
        ]}
        onSelect={onSortChange}
        testID="sort-filter"
      />
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
});
