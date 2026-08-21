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
import { useRecipes } from '@/hooks/use-recipes';
import { RecipeSuggestion } from '@/types/recipe';

export default function RecipeIdeasScreen() {
  const router = useRouter();
  const { suggestions, loading, error, generate, save, isSaved } = useRecipes();
  const [prompt, setPrompt] = useState('');
  const [servings, setServings] = useState('2');
  const [maxMinutes, setMaxMinutes] = useState('30');
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSuggestion | null>(null);

  const handleGenerate = () => {
    generate({
      prompt: prompt.trim() || undefined,
      servings: Math.max(1, Number(servings) || 2),
      maxMinutes: Math.max(5, Number(maxMinutes) || 30),
      prioritizeExpiring,
    });
  };

  const handleSave = async (recipe: RecipeSuggestion) => {
    try {
      await save(recipe);
      setSavedMessage(`${recipe.title} saved`);
    } catch (saveError) {
      setSavedMessage(saveError instanceof Error ? saveError.message : 'Unable to save recipe');
    }
  };

  const handleReviewInventory = () => {
    router.push('/inventory');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Recipes</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Suggestions are based on your current inventory. Nothing is removed when you view or save a recipe.
          </ThemedText>

          <ThemedView style={styles.controls}>
            <Input
              label="What are you in the mood for?"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="e.g. quick dinner with eggs"
            />
            <ThemedView style={styles.row}>
              <ThemedView style={styles.half}>
                <Input label="Servings" value={servings} onChangeText={setServings} keyboardType="number-pad" />
              </ThemedView>
              <ThemedView style={styles.half}>
                <Input label="Max minutes" value={maxMinutes} onChangeText={setMaxMinutes} keyboardType="number-pad" />
              </ThemedView>
            </ThemedView>
            <Pressable onPress={() => setPrioritizeExpiring((value) => !value)} style={styles.preferenceRow}>
              <ThemedText type="default">Prioritize food expiring soon</ThemedText>
              <ThemedText type="small" style={prioritizeExpiring ? styles.enabled : styles.disabled}>
                {prioritizeExpiring ? 'On' : 'Off'}
              </ThemedText>
            </Pressable>
            <Button title={loading ? 'Generating...' : 'Find recipes'} onPress={handleGenerate} disabled={loading} />
          </ThemedView>

          {error && <FeedbackBanner message={error} tone="error" />}
          {savedMessage && <FeedbackBanner message={savedMessage} onDismiss={() => setSavedMessage(null)} />}

          {selectedRecipe ? (
            <ThemedView style={styles.results}>
              <ThemedText type="title">{selectedRecipe.title}</ThemedText>
              <ThemedText type="default">{selectedRecipe.summary}</ThemedText>
              <ThemedText type="subtitle">Ingredients</ThemedText>
              {selectedRecipe.ingredients.map((ingredient) => (
                <ThemedView key={`${selectedRecipe.id}-${ingredient.name}`} style={styles.ingredientRow}>
                  <ThemedText type="small">{ingredient.name}</ThemedText>
                  <ThemedText type="small" style={ingredient.status === 'available' ? styles.available : styles.missing}>{ingredient.status}</ThemedText>
                </ThemedView>
              ))}
              <ThemedText type="subtitle">Method</ThemedText>
              {selectedRecipe.steps.map((step, index) => <ThemedText key={`${selectedRecipe.id}-detail-step-${index}`} type="small">{index + 1}. {step}</ThemedText>)}
              <Button title="Back to recipes" variant="secondary" onPress={() => setSelectedRecipe(null)} />
            </ThemedView>
          ) : suggestions.length === 0 && !loading ? (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle">No suggestions yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                Add inventory items or adjust the request to see recipe ideas.
              </ThemedText>
              <Button title="Review inventory" variant="secondary" onPress={handleReviewInventory} />
            </ThemedView>
          ) : (
            <ThemedView style={styles.results}>
              <ThemedText type="subtitle">Suggestions</ThemedText>
              {suggestions.map((recipe) => (
                <Pressable key={recipe.id} onPress={() => setSelectedRecipe(recipe)} style={styles.recipeCard}>
                  <ThemedView style={styles.recipeHeader}>
                    <ThemedView style={styles.recipeTitle}>
                      <ThemedText type="subtitle">{recipe.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {recipe.preparationMinutes ?? '?'} min · {recipe.servings} servings · {Math.round(recipe.confidence * 100)}% confidence
                      </ThemedText>
                    </ThemedView>
                    <Pressable onPress={() => handleSave(recipe)}>
                      <ThemedText type="small" style={styles.saveAction}>{isSaved(recipe.id) ? 'Saved' : 'Save'}</ThemedText>
                    </Pressable>
                  </ThemedView>
                  <ThemedText type="default">Tap to view ingredients and method.</ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          )}
          <Button title="Back to Meals" variant="secondary" onPress={() => router.replace('/meals')} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  controls: { gap: Spacing.three, padding: Spacing.three, borderRadius: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.one },
  enabled: { color: '#238636', fontWeight: '600' },
  disabled: { color: '#8B949E', fontWeight: '600' },
  emptyState: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  centerText: { textAlign: 'center' },
  results: { gap: Spacing.three },
  recipeCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  recipeTitle: { flex: 1, gap: Spacing.one },
  saveAction: { color: '#007AFF', fontWeight: '600' },
  expiryText: { color: '#FF9500', fontWeight: '600' },
  subheading: { fontWeight: '600', marginTop: Spacing.one },
  ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  available: { color: '#238636', fontWeight: '600' },
  missing: { color: '#FF9500', fontWeight: '600' },
});
