/**
 * Location Selector Component
 * Dropdown for selecting storage location
 */

import { INVENTORY_LOCATIONS, LOCATION_LIST } from '@/constants/inventory';
import { InventoryLocation } from '@/types/inventory';
import { ViewStyle } from 'react-native';
import { Dropdown, DropdownOption } from '../ui/dropdown';

export interface LocationSelectorProps {
  value: InventoryLocation | null;
  onChange: (location: InventoryLocation | null) => void;
  error?: string;
  containerStyle?: ViewStyle;
  allowClear?: boolean;
}

export function LocationSelector({
  value,
  onChange,
  error,
  containerStyle,
  allowClear = false,
}: LocationSelectorProps) {
  const options: DropdownOption<InventoryLocation>[] = LOCATION_LIST.map((location) => ({
    value: location,
    label: INVENTORY_LOCATIONS[location],
  }));

  return (
    <Dropdown<InventoryLocation>
      label="Location"
      value={value}
      options={options}
      onSelect={onChange}
      allowClear={allowClear}
      onClear={() => onChange(null)}
      error={error}
      containerStyle={containerStyle}
      testID="location-selector"
    />
  );
}
