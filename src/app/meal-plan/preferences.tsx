import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import {
    createDinnerPlanningPreferences,
    defaultMealPlanningPreferences,
    supportedMealPlanDays,
    toMealPlanRouteParams,
} from '@/services/meal-plan.schemas';

export default function MealPlanPreferencesScreen() {
  const router = useRouter();
  const [people, setPeople] = useState(String(defaultMealPlanningPreferences.people));
  const [days, setDays] = useState(defaultMealPlanningPreferences.days);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    try {
      const preferences = createDinnerPlanningPreferences(people, days);
      setError(null);
      router.replace({
        pathname: '/meal-plan',
        params: toMealPlanRouteParams(preferences),
      });
    } catch {
      setError('Enter between 1 and 12 people and choose 3, 5, or 7 days.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Plan my week</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set the basics for a simple dinner plan.
          </ThemedText>

          <ThemedView style={styles.section}>
            <Input
              label="Who are you feeding?"
              value={people}
              onChangeText={setPeople}
              keyboardType="number-pad"
              error={error ? 'Use a whole number from 1 to 12.' : undefined}
            />

            <ThemedView style={styles.field}>
              <ThemedText type="default" style={styles.label}>How many days?</ThemedText>
              <ThemedView style={styles.dayOptions}>
                {supportedMealPlanDays.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setDays(option)}
                    accessibilityRole="button"
                    style={[styles.dayOption, days === option && styles.dayOptionSelected]}
                  >
                    <ThemedText type="default" style={days === option && styles.selectedText}>
                      {option}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.field}>
              <ThemedText type="default" style={styles.label}>Meal</ThemedText>
              <ThemedText type="default">Dinner</ThemedText>
            </ThemedView>
          </ThemedView>

          {error && <FeedbackBanner message={error} tone="error" />}
          <Button title="Generate plan" onPress={handleGenerate} testID="generate-plan-button" />
          <Button title="Saved plans" variant="secondary" onPress={() => router.push('/meal-plan/saved')} />
          <Pressable onPress={() => router.replace('/')} style={styles.backAction}>
            <ThemedText type="small" themeColor="textSecondary">Back to dashboard</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'web' ? 88 : Spacing.three,
  },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  section: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.two },
  field: { gap: Spacing.one },
  label: { fontWeight: '600' },
  dayOptions: { flexDirection: 'row', gap: Spacing.two },
  dayOption: {
    minWidth: 56,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  dayOptionSelected: { backgroundColor: '#007AFF' },
  selectedText: { color: '#FFFFFF', fontWeight: '600' },
  backAction: { alignItems: 'center', paddingVertical: Spacing.two },
});