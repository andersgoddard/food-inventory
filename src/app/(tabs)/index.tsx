import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';

export default function TodayScreen() {
  const { items } = useInventory();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Today</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          A calm view of your household food, coming soon.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {items.length} {items.length === 1 ? 'item' : 'items'} in Inventory right now.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.four + BottomTabInset, gap: Spacing.one },
  subtitle: { marginBottom: Spacing.two },
});
