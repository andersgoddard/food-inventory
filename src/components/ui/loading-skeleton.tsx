import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';
import { ThemedView } from '../themed-view';

export function InventoryLoadingSkeleton() {
  return (
    <ThemedView style={styles.list} testID="inventory-loading-skeleton">
      {[0, 1, 2].map((item) => (
        <ThemedView key={item} style={styles.card}>
          <ThemedView style={styles.title} />
          <ThemedView style={styles.line} />
          <ThemedView style={styles.lineShort} />
        </ThemedView>
      ))}
    </ThemedView>
  );
}

export function FormLoadingSkeleton() {
  return (
    <ThemedView style={styles.form} testID="form-loading-skeleton">
      {[0, 1, 2, 3, 4].map((item) => (
        <ThemedView key={item} style={styles.field} />
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
    backgroundColor: '#E5E7EB',
  },
  title: {
    height: 20,
    width: '55%',
    borderRadius: Spacing.one,
    backgroundColor: '#CBD5E1',
  },
  line: {
    height: 14,
    width: '90%',
    borderRadius: Spacing.one,
    backgroundColor: '#CBD5E1',
  },
  lineShort: {
    height: 14,
    width: '65%',
    borderRadius: Spacing.one,
    backgroundColor: '#CBD5E1',
  },
  form: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  field: {
    height: 44,
    borderRadius: Spacing.two,
    backgroundColor: '#E5E7EB',
  },
});
