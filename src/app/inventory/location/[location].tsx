import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryList } from '@/components/inventory/inventory-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { INVENTORY_LOCATIONS } from '@/constants/inventory';
import { Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { InventoryLocation } from '@/types/inventory';

const locationKeys = new Set<InventoryLocation>(['fridge', 'freezer', 'cupboard', 'other']);

export default function InventoryLocationScreen() {
  const router = useRouter();
  const { location } = useLocalSearchParams<{ location?: string }>();
  const { items, loading, error, searchQuery, setSearchQuery, deleteItem, loadItems } = useInventory();
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isUseSoon = location === 'use-soon';
  const physicalLocation = locationKeys.has(location as InventoryLocation) ? location as InventoryLocation : null;

  useEffect(() => {
    if (isUseSoon) {
      loadItems({ sortBy: 'expiryDate' });
    } else if (physicalLocation) {
      loadItems({ location: physicalLocation, sortBy: 'name' });
    }
  }, [isUseSoon, loadItems, physicalLocation]);

  const visibleItems = items.filter((item) => {
    if (isUseSoon) {
      if (!item.expiryDate || new Date(item.expiryDate).getTime() - Date.now() > 7 * 86400000) return false;
    } else if (physicalLocation && item.location !== physicalLocation) return false;
    if (showExpiringOnly && (!item.expiryDate || new Date(item.expiryDate).getTime() - Date.now() > 7 * 86400000)) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const title = isUseSoon ? 'Use soon' : physicalLocation ? INVENTORY_LOCATIONS[physicalLocation] : 'Inventory area';
  const navigate = (path: string) => {
    router.push(path as never);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText type="title">{title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{isUseSoon ? 'Items approaching expiry across your kitchen.' : 'Items stored in this area.'}</ThemedText>
            </ThemedView>
            <Pressable onPress={() => navigate('/inventory')} style={styles.back}><ThemedText type="small" themeColor="textSecondary">Back</ThemedText></Pressable>
          </ThemedView>
          <InventoryFilter searchQuery={searchQuery} onSearchChange={setSearchQuery} showExpiringOnly={showExpiringOnly} onExpiringChange={setShowExpiringOnly} />
          {feedback && <FeedbackBanner message={feedback} onDismiss={() => setFeedback(null)} />}
          {loading && <ThemedText type="small" themeColor="textSecondary">Loading inventory...</ThemedText>}
          {error && <FeedbackBanner message={error} tone="error" />}
          {!loading && !error && <InventoryList items={visibleItems} onDelete={deleteItem} emptyMessage={isUseSoon ? 'Nothing needs using soon.' : 'No items in this area yet.'} testID="inventory-location-list" />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.four, gap: Spacing.two },
  back: { paddingVertical: Spacing.two },
});
