import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
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
  const [mealTypes, setMealTypes] = useState<Array<'breakfast' | 'lunch' | 'dinner'>>(['dinner']);
  const [includeSavedRecipes, setIncludeSavedRecipes] = useState(false);
  const [includeIngredients, setIncludeIngredients] = useState('');
  const [excludeIngredients, setExcludeIngredients] = useState('');
  const [fixedExclusions, setFixedExclusions] = useState('');
  const [includeList, setIncludeList] = useState<string[]>([]);
  const [excludeList, setExcludeList] = useState<string[]>([]);
  const [includeDraft, setIncludeDraft] = useState('');
  const [excludeDraft, setExcludeDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    try {
      const preferences = createDinnerPlanningPreferences(people, days, {
        mealType: mealTypes[0],
        mealTypes,
        includeSavedRecipes,
        includeIngredients: includeList,
        excludeIngredients: excludeList,
        fixedExclusions: fixedExclusions.split(',').map((item) => item.trim()).filter(Boolean),
      });
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
          <ThemedText type="title">Weekly meal planner</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose the shape of your week and the ingredients you want to focus on.
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
              <ThemedView style={styles.dayOptions}>
                {(['breakfast', 'lunch', 'dinner'] as const).map((option) => (
                  <Pressable key={option} onPress={() => setMealTypes((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])} style={[styles.dayOption, mealTypes.includes(option) && styles.dayOptionSelected]}>
                    <ThemedText type="small" style={mealTypes.includes(option) && styles.selectedText}>{option[0].toUpperCase() + option.slice(1)}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.ingredientColumns}>
              <ThemedView style={styles.ingredientColumn}>
                <ThemedText type="default" style={styles.label}>Include</ThemedText>
                <ThemedView style={styles.addRow}><Input label="" value={includeDraft} onChangeText={setIncludeDraft} placeholder="chicken" /><Button title="Add" size="small" onPress={() => { const value = includeDraft.trim(); if (value && !includeList.includes(value)) setIncludeList((items) => [...items, value]); setIncludeDraft(''); }} /></ThemedView>
                <ThemedView style={styles.chips}>{includeList.map((item) => <Pressable key={item} onPress={() => setIncludeList((items) => items.filter((value) => value !== item))} style={styles.chip}><ThemedText type="small">{item} x</ThemedText></Pressable>)}</ThemedView>
              </ThemedView>
              <ThemedView style={styles.ingredientColumn}>
                <ThemedText type="default" style={styles.label}>Exclude</ThemedText>
                <ThemedView style={styles.addRow}><Input label="" value={excludeDraft} onChangeText={setExcludeDraft} placeholder="tofu" /><Button title="Add" size="small" onPress={() => { const value = excludeDraft.trim(); if (value && !excludeList.includes(value)) setExcludeList((items) => [...items, value]); setExcludeDraft(''); }} /></ThemedView>
                <ThemedView style={styles.chips}>{excludeList.map((item) => <Pressable key={item} onPress={() => setExcludeList((items) => items.filter((value) => value !== item))} style={styles.chip}><ThemedText type="small">{item} x</ThemedText></Pressable>)}</ThemedView>
                {!!fixedExclusions.trim() && <ThemedText type="small" themeColor="textSecondary">Fixed exclusions and allergies: {fixedExclusions}</ThemedText>}
              </ThemedView>
            </ThemedView>
            <Input label="Allergies or fixed exclusions" value={fixedExclusions} onChangeText={setFixedExclusions} placeholder="e.g. peanuts, shellfish" />
            <Pressable onPress={() => setIncludeSavedRecipes((value) => !value)} style={styles.preferenceRow}>
              <ThemedText type="default">Include saved recipes and favourites</ThemedText>
              <ThemedView style={[styles.toggle, includeSavedRecipes ? styles.toggleOn : styles.toggleOff]}><ThemedText type="small" style={styles.toggleText}>{includeSavedRecipes ? 'Yes' : 'No'}</ThemedText></ThemedView>
            </Pressable>
          </ThemedView>

          {error && <FeedbackBanner message={error} tone="error" />}
          <Button title="Generate plan" onPress={handleGenerate} testID="generate-plan-button" />
          <Button title="Saved plans" variant="secondary" onPress={() => router.push('/meal-plan/saved')} />
          <Pressable onPress={() => router.replace('/meals')} style={styles.backAction}>
            <ThemedText type="small" themeColor="textSecondary">Back to Meals</ThemedText>
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
    paddingTop: Spacing.three,
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
  preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.two },
  unselectedText: { color: '#8B949E', fontWeight: '600' },
  ingredientColumns: { flexDirection: 'row', gap: Spacing.two },
  ingredientColumn: { flex: 1, gap: Spacing.one },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Spacing.two, backgroundColor: '#E6F4FE' },
  toggle: { minWidth: 48, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  toggleOn: { backgroundColor: '#34C759' },
  toggleOff: { backgroundColor: '#8B949E' },
  toggleText: { color: '#FFFFFF', fontWeight: '700' },
  backAction: { alignItems: 'center', paddingVertical: Spacing.two },
});