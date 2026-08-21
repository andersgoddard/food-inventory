import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { MEAL_PLAN_PREFERENCES_ROUTE } from '@/constants/meal-plan';
import { useTheme } from '@/hooks/use-theme';

export default function MealsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const navigate = (path: string) => router.push(path as never);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Meals</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Decide what to cook using what you already have.</ThemedText>

          <Pressable
            onPress={() => navigate(MEAL_PLAN_PREFERENCES_ROUTE)}
            style={({ pressed }) => [styles.primaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.cardRow}>
              <ThemedText type="headline">Plan meals</ThemedText>
              <ThemedText type="body" style={{ color: theme.textTertiary }}>›</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">Build a weekly plan from your current inventory.</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigate('/meal-plan/saved')}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <ThemedText type="body">Saved plans</ThemedText>
            <ThemedText type="body" style={{ color: theme.textTertiary }}>›</ThemedText>
          </Pressable>

          <ThemedText type="sectionTitle" style={styles.sectionSpacing}>Recipes</ThemedText>

          <Pressable
            onPress={() => navigate('/recipe-ideas')}
            style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <ThemedText type="body">Recipe ideas</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Inventory-aware recipes, including saved favourites.</ThemedText>
            </View>
            <ThemedText type="body" style={{ color: theme.textTertiary }}>›</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, paddingBottom: Spacing.six + BottomTabInset },
  primaryCard: { padding: Spacing.three, borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth, gap: Spacing.one },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.card, borderWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 2 },
  sectionSpacing: { marginTop: Spacing.two },
  pressed: { opacity: 0.6 },
});
