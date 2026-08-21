/**
 * Add/Edit Item Form Component
 * Reusable form for both adding and editing inventory items
 * Handles validation via Zod schemas
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { validateCreateItem } from '@/services/inventory/inventory.validator';
import { CreateInventoryItemInput, InventoryCategory, InventoryItem, InventoryLocation, InventoryUnit } from '@/types/inventory';
import { getCurrentISOString } from '@/utils/date';
import { useState } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { CategorySelector } from './category-selector';
import { LocationSelector } from './location-selector';
import { UnitSelector } from './unit-selector';

export interface AddItemFormProps {
  item?: InventoryItem | null;
  // Seeds a new item's fields (e.g. from a Shopping item) without entering edit mode.
  initialValues?: Partial<Pick<InventoryItem, 'name' | 'category' | 'quantity' | 'unit'>>;
  onSubmit: (data: CreateInventoryItemInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  containerStyle?: ViewStyle;
}

export function AddItemForm({
  item,
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  containerStyle,
}: AddItemFormProps) {
  // Form state
  const [name, setName] = useState(item?.name || initialValues?.name || '');
  const [category, setCategory] = useState<InventoryCategory | null>(item?.category || initialValues?.category || null);
  const [location, setLocation] = useState<InventoryLocation | null>(item?.location || null);
  const [quantity, setQuantity] = useState(item?.quantity.toString() || initialValues?.quantity?.toString() || '');
  const [unit, setUnit] = useState<InventoryUnit | null>(item?.unit || initialValues?.unit || null);
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate || getCurrentISOString());
  const [expiryDate, setExpiryDate] = useState<string | null>(item?.expiryDate || null);
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice?.toString() || '');
  const [notes, setNotes] = useState(item?.notes || '');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditMode = !!item;

  const handleSubmit = async () => {
    setErrors({});
    setSubmitError(null);

    try {
      // Prepare data for validation
      const formData: CreateInventoryItemInput = {
        name: name.trim(),
        category: category as InventoryCategory,
        location: location as InventoryLocation,
        quantity: parseFloat(quantity),
        unit: unit as InventoryUnit,
        purchaseDate,
        expiryDate: expiryDate || null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        notes: notes.trim() || undefined,
      };

      // Validate
      const validation = validateCreateItem(formData);
      if (!validation.success) {
        setErrors(validation.errors || {});
        setSubmitError('Please fix the errors below');
        return;
      }

      // Submit
      await onSubmit(formData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save item';
      setSubmitError(message);
    }
  };

  return (
    <ScrollView
      style={containerStyle}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <ThemedView style={styles.container}>
        {/* Name */}
        <Input
          label="Item Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Whole Milk, Chicken Breast"
          editable={!isLoading}
          error={errors.name}
          testID="name-input"
        />

        {/* Category */}
        <CategorySelector
          value={category}
          onChange={setCategory}
          error={errors.category}
        />

        {/* Location */}
        <LocationSelector
          value={location}
          onChange={setLocation}
          error={errors.location}
        />

        {/* Quantity */}
        <Input
          label="Quantity *"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g., 2, 0.5, 250"
          keyboardType="decimal-pad"
          editable={!isLoading}
          error={errors.quantity}
          testID="quantity-input"
        />

        {/* Unit */}
        <UnitSelector
          value={unit}
          onChange={setUnit}
          error={errors.unit}
        />

        {/* Purchase Date */}
        <DatePicker
          label="Purchase Date *"
          value={purchaseDate}
          onChange={setPurchaseDate}
          error={errors.purchaseDate}
          testID="purchase-date-picker"
        />

        {/* Expiry Date */}
        <DatePicker
          label="Expiry Date (Optional)"
          value={expiryDate}
          onChange={setExpiryDate}
          error={errors.expiryDate}
          testID="expiry-date-picker"
        />

        {/* Purchase Price */}
        <Input
          label="Purchase Price (Optional)"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          placeholder="e.g., 2.50"
          keyboardType="decimal-pad"
          editable={!isLoading}
          error={errors.purchasePrice}
          testID="purchase-price-input"
        />

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional details..."
          multiline
          numberOfLines={3}
          editable={!isLoading}
          error={errors.notes}
          style={styles.notesInput}
          testID="notes-input"
        />

        {/* Error Message */}
        {submitError && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText type="small" style={styles.errorText}>
              {submitError}
            </ThemedText>
          </ThemedView>
        )}

        {/* Buttons */}
        <ThemedView style={styles.buttonContainer}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={onCancel || (() => {})}
            disabled={isLoading}
            style={styles.button}
            testID="cancel-button"
          />
          <Button
            title={isEditMode ? 'Update' : 'Add Item'}
            variant="primary"
            onPress={handleSubmit}
            disabled={isLoading}
            style={styles.button}
            testID="submit-button"
          />
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  container: {
    gap: Spacing.three,
  },
  notesInput: {
    minHeight: 100,
  },
  errorContainer: {
    padding: Spacing.two,
    backgroundColor: '#FFE5E5',
    borderRadius: Spacing.two,
  },
  errorText: {
    color: '#FF3B30',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
  },
});
