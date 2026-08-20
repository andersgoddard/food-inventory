/**
 * Unit Selector Component
 * Dropdown for selecting measurement unit
 */

import { INVENTORY_UNITS, UNIT_LIST } from '@/constants/inventory';
import { InventoryUnit } from '@/types/inventory';
import { Dropdown, DropdownOption } from '../ui/dropdown';
import { ViewStyle } from 'react-native';

export interface UnitSelectorProps {
  value: InventoryUnit | null;
  onChange: (unit: InventoryUnit) => void;
  error?: string;
  containerStyle?: ViewStyle;
}

export function UnitSelector({
  value,
  onChange,
  error,
  containerStyle,
}: UnitSelectorProps) {
  const options: DropdownOption<InventoryUnit>[] = UNIT_LIST.map((unit) => ({
    value: unit,
    label: INVENTORY_UNITS[unit],
  }));

  return (
    <Dropdown<InventoryUnit>
      label="Unit"
      value={value}
      options={options}
      onSelect={onChange}
      error={error}
      containerStyle={containerStyle}
      testID="unit-selector"
    />
  );
}
