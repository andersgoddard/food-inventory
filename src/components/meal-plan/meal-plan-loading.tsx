import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function MealPlanLoading() {
  return (
    <ThemedView style={styles.container} testID="meal-plan-loading">
      <ThemedView style={styles.skeletonTitle} />
      <ThemedText type="small" themeColor="textSecondary">Preparing your weekly plan...</ThemedText>
      {[0, 1, 2].map((item) => <ThemedView key={item} style={styles.skeletonCard} />)}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  skeletonTitle: { height: 28, width: '55%', borderRadius: Spacing.one, backgroundColor: '#D8DDE5' },
  skeletonCard: { height: 150, borderRadius: Spacing.two, backgroundColor: '#EEF0F4' },
});