/**
 * Inventory Item Card Component
 * Displays a single inventory item with actions
 */

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '@/constants/inventory';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { InventoryItem } from '@/types/inventory';
import { daysUntilDate, formatDate, isDateExpiredOrToday } from '@/utils/date';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export interface InventoryItemCardProps {
  item: InventoryItem;
  onDelete: (id: string) => void;
  containerStyle?: ViewStyle;
  testID?: string;
}

export function InventoryItemCard({
  item,
  onDelete,
  containerStyle,
  testID,
}: InventoryItemCardProps) {
  const router = useRouter();
  const theme = useTheme();

  const isExpired = isDateExpiredOrToday(item.expiryDate);
  const daysUntilExpiry = item.expiryDate ? daysUntilDate(item.expiryDate) : null;

  const handleEdit = () => {
    if (Platform.OS === 'web') {
      window.location.assign(`/inventory/${item.id}`);
      return;
    }

    router.push(`/inventory/${item.id}`);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  const getExpiryStatusColor = () => {
    if (!item.expiryDate) return undefined;
    if (isExpired) return '#FF3B30';
    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) return '#FF9500';
    return '#34C759';
  };

  const getExpiryStatusLabel = () => {
    if (!item.expiryDate) return 'No expiry';
    if (isExpired) return 'Expired';
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    if (daysUntilExpiry !== null && daysUntilExpiry > 0) return `${daysUntilExpiry} days left`;
    return 'Expiring soon';
  };

  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <Pressable
        onPress={handleEdit}
        testID={testID}
        style={({ pressed }) => [
          styles.container,
          {
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.7 : 1,
          },
          containerStyle,
        ]}
      >
      <ThemedView style={styles.header}>
        <View style={styles.titleAndCategory}>
          <ThemedText type="default" style={styles.itemName}>
            {item.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {INVENTORY_CATEGORIES[item.category]}
          </ThemedText>
        </View>

        {item.expiryDate && (
          <ThemedView
            style={[
              styles.expiryBadge,
              { borderColor: getExpiryStatusColor() },
            ]}
          >
            <ThemedText
              type="small"
              style={[styles.expiryText, { color: getExpiryStatusColor() }]}
            >
              {getExpiryStatusLabel()}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.details}>
        <ThemedView style={styles.detailRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Location:
          </ThemedText>
          <ThemedText type="small" style={styles.detailValue}>
            {INVENTORY_LOCATIONS[item.location]}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.detailRow}>
          <ThemedText type="small" themeColor="textSecondary">
            Quantity:
          </ThemedText>
          <ThemedText type="small" style={styles.detailValue}>
            {item.quantity} {item.unit}
          </ThemedText>
        </ThemedView>

        {item.expiryDate && (
          <ThemedView style={styles.detailRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Expires:
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              {formatDate(item.expiryDate)}
            </ThemedText>
          </ThemedView>
        )}

        {item.purchasePrice !== null && item.purchasePrice !== undefined && (
          <ThemedView style={styles.detailRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Price:
            </ThemedText>
            <ThemedText type="small" style={styles.detailValue}>
              £{item.purchasePrice.toFixed(2)}
            </ThemedText>
          </ThemedView>
        )}

        {item.notes && (
          <ThemedView style={styles.notesRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {item.notes}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.actions}>
        <Button
          title="Edit"
          variant="secondary"
          size="small"
          onPress={handleEdit}
          style={styles.actionButton}
          testID={`edit-button-${item.id}`}
        />
        <Button
          title="Delete"
          variant="danger"
          size="small"
          onPress={handleDelete}
          style={styles.actionButton}
          testID={`delete-button-${item.id}`}
        />
      </ThemedView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleAndCategory: {
    flex: 1,
    gap: Spacing.one,
  },
  itemName: {
    fontWeight: '600',
    fontSize: 16,
  },
  expiryBadge: {
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  expiryText: {
    fontWeight: '600',
  },
  details: {
    gap: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailValue: {
    fontWeight: '500',
  },
  notesRow: {
    marginTop: Spacing.one,
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  actionButton: {
    flex: 1,
  },
});
