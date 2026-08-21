/**
 * Add Inventory Item Screen
 * Form to add a new inventory item
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemForm } from '@/components/inventory/add-item-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModalDialog } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { shoppingService } from '@/services';
import { CreateInventoryItemInput, InventoryCategory, InventoryUnit } from '@/types/inventory';

export default function AddItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    category?: string;
    quantity?: string;
    unit?: string;
    shoppingListId?: string;
    shoppingItemId?: string;
  }>();
  const { addItem } = useInventory();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnToInventory = () => {
    router.replace({ pathname: '/inventory', params: { message: 'Item added' } });
  };

  // When arriving from a Shopping item, confirming intake here also marks that item
  // purchased - Shopping state stays a separate, explicit step, not an automatic side effect.
  const confirmShoppingItemIfPresent = async () => {
    if (!params.shoppingListId || !params.shoppingItemId) return;
    await shoppingService.confirmItemPurchased(params.shoppingListId, params.shoppingItemId);
  };

  const handleSubmit = async (data: CreateInventoryItemInput) => {
    try {
      setIsLoading(true);
      setError(null);
      await addItem(data);
      await confirmShoppingItemIfPresent();
      if (params.shoppingListId) {
        router.replace({ pathname: '/shopping', params: { shoppingListId: params.shoppingListId, message: 'Item added to inventory' } });
        return;
      }
      returnToInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (params.shoppingListId) {
      router.replace({ pathname: '/shopping', params: { shoppingListId: params.shoppingListId } });
      return;
    }
    returnToInventory();
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Add Item
        </ThemedText>

        <AddItemForm
          initialValues={{
            name: params.name,
            category: params.category as InventoryCategory | undefined,
            quantity: params.quantity ? Number(params.quantity) : undefined,
            unit: params.unit as InventoryUnit | undefined,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          containerStyle={styles.form}
        />
      </SafeAreaView>

      {/* Error Modal */}
      <ModalDialog
        visible={!!error}
        title="Error"
        message={error || 'Failed to add item'}
        primaryButtonText="OK"
        onPrimaryPress={() => setError(null)}
        onClose={() => setError(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  title: {
    marginBottom: Spacing.three,
  },
  form: {
    flex: 1,
  },
});
