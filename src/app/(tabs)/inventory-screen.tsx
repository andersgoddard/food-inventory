import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { useTheme } from '@/hooks/use-theme';

const storageAreas = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'cupboard', label: 'Store cupboard' },
  { key: 'other', label: 'Other' },
] as const;

const intakeOptions = [
  { label: 'Scan food', description: 'Take or choose a photo of food to add.', path: '/scan-food' },
  { label: 'Scan receipt', description: 'Add everything from a shopping receipt.', path: '/scan-receipt' },
  { label: 'Add manually', description: 'Enter an item yourself.', path: '/inventory/add' },
] as const;

export default function InventoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { items } = useInventory();
  const [addFoodVisible, setAddFoodVisible] = useState(false);

  const navigate = (path: string) => {
    router.push(path as never);
  };

  const openIntake = (path: string) => {
    setAddFoodVisible(false);
    navigate(path);
  };

  const countFor = (location: (typeof storageAreas)[number]['key']) => items.filter((item) => item.location === location).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText type="title">Inventory</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{items.length} {items.length === 1 ? 'item' : 'items'}</ThemedText>
          </View>

          <Button title="+ Add food" onPress={() => setAddFoodVisible(true)} />

          <ThemedText type="sectionTitle" style={styles.sectionSpacing}>Your food</ThemedText>
          <ThemedView style={[styles.list, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {storageAreas.map((area, index) => (
              <Pressable
                key={area.key}
                onPress={() => navigate(`/inventory/location/${area.key}`)}
                style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }, pressed && styles.pressed]}
              >
                <ThemedText type="body">{area.label}</ThemedText>
                <View style={styles.rowValue}>
                  <ThemedText type="body" themeColor="textSecondary">{countFor(area.key)}</ThemedText>
                  <ThemedText type="body" style={{ color: theme.textTertiary }}>›</ThemedText>
                </View>
              </Pressable>
            ))}
          </ThemedView>

          <Pressable
            onPress={() => navigate('/inventory/location/use-soon')}
            style={({ pressed }) => [styles.row, styles.useSoon, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View>
              <ThemedText type="body">Use soon</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Items from any area that need attention next.</ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textTertiary }}>›</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ModalDialog visible={addFoodVisible} title="Add food" onClose={() => setAddFoodVisible(false)} secondaryButtonText="Cancel">
        <ThemedView style={styles.intakeList}>
          {intakeOptions.map((option, index) => (
            <Pressable
              key={option.path}
              onPress={() => openIntake(option.path)}
              style={({ pressed }) => [styles.intakeRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <ThemedText type="body" themeColor="accent">{option.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{option.description}</ThemedText>
              </View>
            </Pressable>
          ))}
        </ThemedView>
      </ModalDialog>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.three, paddingBottom: Spacing.six + BottomTabInset, paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  sectionSpacing: { marginTop: Spacing.two },
  list: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, minHeight: 54 },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  useSoon: { borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two },
  intakeList: { gap: 0 },
  intakeRow: { paddingVertical: Spacing.three },
  rowText: { gap: 2 },
  pressed: { opacity: 0.6 },
});
