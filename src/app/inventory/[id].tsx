/**
 * Edit Inventory Item Screen
 * Form to edit an existing inventory item
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemForm } from '@/components/inventory/add-item-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ModalDialog } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { CreateInventoryItemInput, InventoryItem } from '@/types/inventory';

export default function EditItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItem, updateItem, deleteItem } = useInventory();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const returnToInventory = () => {
    router.replace({ pathname: '/inventory', params: { message: 'Item updated' } });
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await deleteItem(id);
      router.replace({ pathname: '/inventory', params: { message: 'Item deleted' } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      setSubmitError(message);
    }
  };

  // Load item on mount
  useEffect(() => {
    const loadItem = async () => {
      if (!id) {
        setError('No item ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const loadedItem = await getItem(id);
        if (!loadedItem) {
          setError('Item not found');
        } else {
          setItem(loadedItem);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load item';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadItem();
  }, [id, getItem]);

  const handleSubmit = async (data: CreateInventoryItemInput) => {
    if (!id) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await updateItem(id, data);
      returnToInventory();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update item';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    returnToInventory();
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator />
          <ThemedText type="default">Loading item...</ThemedText>
          <FormLoadingSkeleton />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error || !item) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            Error
          </ThemedText>
          <ThemedView style={styles.errorContainer}>
            <ThemedText type="default" style={styles.errorText}>
              {error || 'Item not found'}
            </ThemedText>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Edit Item
        </ThemedText>

        <AddItemForm
          item={item}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          containerStyle={styles.form}
        />
        <ThemedText
          accessibilityRole="button"
          onPress={() => setDeleteConfirmVisible(true)}
          style={styles.deleteButton}
        >
          Delete item
        </ThemedText>
      </SafeAreaView>

      {/* Error Modal */}
      <ModalDialog
        visible={!!submitError}
        title="Error"
        message={submitError || 'Failed to update item'}
        primaryButtonText="OK"
        onPrimaryPress={() => setSubmitError(null)}
        onClose={() => setSubmitError(null)}
      />

      <ModalDialog
        visible={deleteConfirmVisible}
        title="Delete Item?"
        message="This action cannot be undone."
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleDelete}
        onClose={() => setDeleteConfirmVisible(false)}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  deleteButton: {
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
