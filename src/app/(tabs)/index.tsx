import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ModalDialog } from '@/components/ui/modal';
import { INVENTORY_LOCATIONS } from '@/constants/inventory';
import { MEAL_PLAN_PREFERENCES_ROUTE } from '@/constants/meal-plan';
import { Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { InventoryItem } from '@/types/inventory';

export default function HomeScreen() {
  const router = useRouter();
  const { items, loading, getExpiringItems, clearAll } = useInventory();
  const [useSoonItems, setUseSoonItems] = useState<InventoryItem[]>([]);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetComplete, setResetComplete] = useState(false);

  useEffect(() => {
    getExpiringItems(7).then(setUseSoonItems).catch(() => setUseSoonItems([]));
  }, [getExpiringItems, items]);

  const locationCounts = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.location] = (counts[item.location] || 0) + 1;
    return counts;
  }, {});

  const handleReset = async () => {
    try {
      await clearAll();
      setResetVisible(false);
      setResetComplete(true);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : 'Failed to reset inventory');
    }
  };

  const navigate = (path: string) => {
    if (Platform.OS === 'web') {
      window.location.assign(path);
      return;
    }
    router.push(path as never);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>Food Inventory</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            A quick view of what is in your household right now.
          </ThemedText>
          <ThemedView style={styles.statsContainer}>
            <ThemedView style={styles.statCard}>
              <ThemedText type="default" style={styles.statNumber}>{items.length}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Items in inventory</ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.actions}>
            <Pressable style={styles.planAction} onPress={() => navigate(MEAL_PLAN_PREFERENCES_ROUTE)}>
              <ThemedText type="default" style={styles.planActionText}>Plan my week</ThemedText>
            </Pressable>
            <Pressable style={styles.scanAction} onPress={() => navigate('/scan-food')}>
              <ThemedText type="default" style={styles.scanActionText}>Scan food</ThemedText>
            </Pressable>
            <Pressable style={styles.receiptAction} onPress={() => navigate('/scan-receipt')}>
              <ThemedText type="default" style={styles.receiptActionText}>Scan receipt</ThemedText>
            </Pressable>
            <Pressable style={styles.primaryAction} onPress={() => router.push('/inventory')}>
              <ThemedText type="default" style={styles.primaryActionText}>View inventory</ThemedText>
            </Pressable>
            <Pressable style={styles.secondaryAction} onPress={() => navigate('/recipe-ideas')}>
              <ThemedText type="default" style={styles.secondaryActionText}>What can I make?</ThemedText>
            </Pressable>
          </ThemedView>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Use soon</ThemedText>
          <ThemedView style={styles.section}>
            {loading ? <ThemedText type="small" themeColor="textSecondary">Loading your expiry dates...</ThemedText> : useSoonItems.length > 0 ? (
              useSoonItems.slice(0, 4).map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/inventory/${item.id}`)} style={styles.row}>
                  <ThemedText type="default">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : ''}</ThemedText>
                </Pressable>
              ))
            ) : <ThemedText type="small" themeColor="textSecondary">Nothing needs using soon.</ThemedText>}
          </ThemedView>
          <ThemedText type="subtitle" style={styles.sectionTitle}>By location</ThemedText>
          <ThemedView style={styles.locationGrid}>
            {Object.entries(INVENTORY_LOCATIONS).map(([location, label]) => (
              <ThemedView key={location} style={styles.locationCard}>
                <ThemedText type="default" style={styles.locationCount}>{locationCounts[location] || 0}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
          {resetComplete && <FeedbackBanner message="Inventory reset" onDismiss={() => setResetComplete(false)} />}
          <Pressable accessibilityRole="button" onPress={() => setResetVisible(true)} style={styles.resetButton}>
            <ThemedText type="small" style={styles.resetButtonText}>Reset inventory</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <ModalDialog visible={resetVisible} title="Reset inventory?" message="This removes all items and saved filter preferences. This action cannot be undone." primaryButtonText="Reset" secondaryButtonText="Cancel" onPrimaryPress={handleReset} onClose={() => setResetVisible(false)} />
      <ModalDialog visible={!!resetError} title="Reset failed" message={resetError || 'Failed to reset inventory'} primaryButtonText="OK" onPrimaryPress={() => setResetError(null)} onClose={() => setResetError(null)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Platform.OS === 'web' ? 88 : Spacing.four, paddingBottom: Spacing.four, gap: Spacing.four },
  title: { marginBottom: Spacing.two },
  content: { paddingBottom: Spacing.six, gap: Spacing.three },
  subtitle: { marginBottom: Spacing.two },
  statsContainer: { gap: Spacing.three },
  statCard: { padding: Spacing.four, borderRadius: Spacing.three, alignItems: 'center' },
  actions: { gap: Spacing.two },
  primaryAction: { padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#007AFF', alignItems: 'center' },
  scanAction: { padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#34C759', alignItems: 'center' },
  planAction: { padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#AF52DE', alignItems: 'center' },
  planActionText: { color: '#FFFFFF', fontWeight: '600' },
  scanActionText: { color: '#FFFFFF', fontWeight: '600' },
  receiptAction: { padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#FF9500', alignItems: 'center' },
  receiptActionText: { color: '#FFFFFF', fontWeight: '600' },
  primaryActionText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryAction: { padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#E0E1E6', alignItems: 'center' },
  secondaryActionText: { fontWeight: '600' },
  statNumber: { fontSize: 32, fontWeight: 'bold' },
  sectionTitle: { marginTop: Spacing.three },
  section: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.one },
  locationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  locationCard: { width: '47%', padding: Spacing.three, borderRadius: Spacing.two, alignItems: 'center' },
  locationCount: { fontSize: 22, fontWeight: '700' },
  resetButton: { alignSelf: 'flex-start', paddingVertical: Spacing.two },
  resetButtonText: { color: '#FF3B30', fontWeight: '600' },
});
