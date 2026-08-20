import { Spacing } from '@/constants/theme';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';

export interface FeedbackBannerProps {
  message: string;
  tone?: 'success' | 'error' | 'info';
  onDismiss?: () => void;
}

export function FeedbackBanner({ message, tone = 'success', onDismiss }: FeedbackBannerProps) {
  return (
    <ThemedView style={[styles.container, tone === 'error' ? styles.error : styles.success]}>
      <ThemedText type="small" style={styles.message}>{message}</ThemedText>
      {onDismiss && (
        <Pressable accessibilityRole="button" onPress={onDismiss}>
          <ThemedText type="small" style={styles.dismiss}>Dismiss</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  success: { backgroundColor: '#DDF7E7' },
  error: { backgroundColor: '#FFE5E5' },
  info: { backgroundColor: '#E7F0FF' },
  message: { flex: 1 },
  dismiss: { fontWeight: '600' },
});