/**
 * Inventory Screen
 * Displays the list of inventory items with filtering and search
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryList } from '@/components/inventory/inventory-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { InventoryLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ModalDialog } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';

export default function InventoryScreen() {
  const router = useRouter();
  const {
    items,
    loading,
    error,
    selectedLocation,
    selectedCategory,
    sortBy,
    searchQuery,
    setSelectedLocation,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    deleteItem,
  } = useInventory();

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const params = useLocalSearchParams<{ message?: string }>();
  const [feedback, setFeedback] = useState<string | null>(params.message ?? null);

  const handleAddItem = () => {
    if (Platform.OS === 'web') {
      window.location.assign('/inventory/add');
      return;
    }

    router.push('/inventory/add');
  };

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      try {
        await deleteItem(id);
        setDeleteError(null);
        setDeleteConfirmId(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete item';
        setDeleteError(message);
      }
    },
    [deleteItem]
  );

  const filteredItems = items.filter((item) => {
    if (selectedLocation && item.location !== selectedLocation) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.header}>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Inventory</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </ThemedText>
            </ThemedView>
            <Pressable
              testID="add-item-button"
              accessibilityRole="button"
              onPress={handleAddItem}
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.addButtonPressed,
              ]}
            >
              <ThemedText type="small" style={styles.addButtonText}>
                + Add Item
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Filter */}
          <InventoryFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {feedback && (
            <FeedbackBanner message={feedback} onDismiss={() => setFeedback(null)} />
          )}

          {/* Loading State */}
          {loading && (
            <>
              <ThemedView style={styles.centerContent}>
                <ActivityIndicator />
                <ThemedText type="default">Loading inventory...</ThemedText>
              </ThemedView>
              <InventoryLoadingSkeleton />
            </>
          )}

          {/* Error State */}
          {error && !loading && (
            <ThemedView style={styles.centerContent}>
              <ThemedText type="default" style={styles.errorText}>
                {error}
              </ThemedText>
            </ThemedView>
          )}

          {/* Items List */}
          {!loading && !error && (
            <InventoryList
              items={filteredItems}
              onDelete={setDeleteConfirmId}
              groupByLocation={!selectedLocation}
              emptyMessage={
                searchQuery || selectedLocation
                  ? 'No items match your filters'
                  : 'No items yet. Add your first item!'
              }
              testID="inventory-list"
            />
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        visible={!!deleteConfirmId}
        title="Delete Item?"
        message="This action cannot be undone."
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        onPrimaryPress={() => deleteConfirmId && handleDeleteConfirm(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
      />

      {/* Delete Error Modal */}
      <ModalDialog
        visible={!!deleteError}
        title="Error"
        message={deleteError || 'Failed to delete item'}
        primaryButtonText="OK"
        onPrimaryPress={() => setDeleteError(null)}
        onClose={() => setDeleteError(null)}
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
    paddingTop: Platform.OS === 'web' ? 88 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    gap: Spacing.one,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
});
