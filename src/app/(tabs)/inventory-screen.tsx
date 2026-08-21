import { useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

const storageAreas = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'cupboard', label: 'Store cupboard' },
  { key: 'other', label: 'Other' },
] as const;

export default function InventoryScreen() {
  const router = useRouter();
  const navigate = (path: string) => {
    router.push(path as never);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText type="title">Inventory</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Walk through your kitchen and open an area.</ThemedText>
            </ThemedView>
            <Button title="+ Add inventory" size="small" onPress={() => navigate('/inventory/add')} />
          </ThemedView>

          <ThemedView style={styles.areaGrid}>
            {storageAreas.map((area) => (
              <Pressable key={area.key} onPress={() => navigate(`/inventory/location/${area.key}`)} style={({ pressed }) => [styles.area, pressed && styles.pressed]}>
                <ThemedText type="subtitle">{area.label}</ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <Pressable onPress={() => navigate('/inventory/location/use-soon')} style={({ pressed }) => [styles.useSoon, pressed && styles.pressed]}>
            <ThemedText type="subtitle">Use soon</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Items from any area that need attention next.</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === 'web' ? 88 : 0 },
  content: { gap: Spacing.three, paddingBottom: Spacing.six, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  area: { width: '48%', minHeight: 116, justifyContent: 'flex-end', gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#E6F4FE' },
  useSoon: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#FFF3D6' },
  pressed: { opacity: 0.7 },
});
