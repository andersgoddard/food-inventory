/**
 * Category Selector Component
 * Dropdown for selecting from predefined inventory categories
 */

import { INVENTORY_CATEGORIES, CATEGORY_LIST } from '@/constants/inventory';
import { InventoryCategory } from '@/types/inventory';
import { Dropdown, DropdownOption } from '../ui/dropdown';
import { ViewStyle } from 'react-native';

export interface CategorySelectorProps {
  value: InventoryCategory | null;
  onChange: (category: InventoryCategory) => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export function CategorySelector({
  value,
  onChange,
  error,
  containerStyle,
}: CategorySelectorProps) {
  const options: DropdownOption<InventoryCategory>[] = CATEGORY_LIST.map((category) => ({
    value: category,
    label: INVENTORY_CATEGORIES[category],
  }));

  return (
    <Dropdown<InventoryCategory>
      label="Category"
      value={value}
      options={options}
      onSelect={onChange}
      error={error}
      containerStyle={containerStyle}
      testID="category-selector"
    />
  );
}
