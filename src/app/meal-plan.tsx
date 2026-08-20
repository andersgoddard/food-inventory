import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MealPlanDayCard } from '@/components/meal-plan/meal-plan-day-card';
import { MealPlanLoading } from '@/components/meal-plan/meal-plan-loading';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ModalDialog } from '@/components/ui/modal';
import { MEAL_PLAN_PREFERENCES_ROUTE } from '@/constants/meal-plan';
import { Spacing } from '@/constants/theme';
import { useMealPlanner } from '@/hooks/use-meal-planner';
import { parseMealPlanningPreferences } from '@/services/meal-plan.schemas';
import { MealPlanningPreferences } from '@/types/meal-plan';
import { formatDate } from '@/utils/date';

export default function MealPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    people?: string;
    days?: string;
    mealType?: string;
    prioritizeExpiring?: string;
    savedPlanId?: string;
  }>();
  const {
    plan,
    savedPlans,
    loading,
    error,
    planStale,
    replacement,
    generate,
    openReplacement,
    regenerateReplacement,
    selectReplacement,
    cancelReplacement,
    beginEdit,
    cancelEdit,
    loadSavedPlan,
    save,
    loadSaved,
  } = useMealPlanner();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<MealPlanningPreferences | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (params.savedPlanId) {
      loadSavedPlan(params.savedPlanId);
      return;
    }
    if (!params.people || !params.days || !params.mealType) {
      loadSaved();
      return;
    }

    try {
      const validated = parseMealPlanningPreferences({
        people: Number(params.people),
        days: Number(params.days),
        mealType: params.mealType,
        prioritizeExpiring: params.prioritizeExpiring !== 'false',
      });
      setRouteError(null);
      setPreferences(validated);
      generate(validated);
    } catch {
      setRouteError('This planning request is invalid. Choose your preferences again.');
    }
  }, [generate, loadSaved, loadSavedPlan, params.days, params.mealType, params.people, params.prioritizeExpiring, params.savedPlanId]);

  const handleSave = async () => {
    try {
      await save();
      setSavedMessage('Meal plan saved');
    } catch (saveError) {
      setSavedMessage(saveError instanceof Error ? saveError.message : 'Unable to save meal plan');
    }
  };

  const handleStartOver = () => router.replace(MEAL_PLAN_PREFERENCES_ROUTE);
  const handleSavedPlans = () => router.push('/meal-plan/saved');
  const handleShoppingList = () => plan && router.push({ pathname: '/shopping', params: { mealPlanId: plan.id } });
  const hasSavedVersion = !!plan && savedPlans.some((item) => item.id === plan.id);
  const handleDiscardChanges = () => {
    if (hasSavedVersion) cancelEdit();
    else handleStartOver();
  };
  const handleRetry = () => {
    if (preferences) generate(preferences);
    else handleStartOver();
  };

  const dateRange = plan
    ? `${formatDate(plan.startDate, { day: 'numeric', month: 'short' })} - ${formatDate(plan.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.pageHeader}>
            <ThemedText type="title">Your meal plan</ThemedText>
            {plan && <ThemedText type="smallBold" themeColor="textSecondary">{plan.status === 'saved' ? 'Saved plan' : 'Draft plan'}</ThemedText>}
          </ThemedView>
          <ThemedText type="small" themeColor="textSecondary">
            Review what is planned for each day using the food currently in your inventory.
          </ThemedText>

          {plan && (
            <ThemedView style={styles.planSummary}>
              <ThemedText type="subtitle" style={styles.summaryTitle}>{dateRange}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {plan.preferences.mealType[0].toUpperCase() + plan.preferences.mealType.slice(1)} for {plan.preferences.people} people · {plan.days.length} of {plan.preferences.days} days planned
              </ThemedText>
            </ThemedView>
          )}

          {(error || routeError) && <FeedbackBanner message={routeError || 'We could not prepare this meal plan.'} tone="error" />}
          {planStale && <FeedbackBanner message="Inventory has changed since this plan was created." tone="info" />}
          {savedMessage && <FeedbackBanner message={savedMessage} onDismiss={() => setSavedMessage(null)} />}

          {loading ? <MealPlanLoading /> : plan && plan.days.length > 0 ? (
            <ThemedView style={styles.planSection} testID="meal-plan-days">
              {plan.days.map((day) => (
                <MealPlanDayCard
                  key={day.date}
                  day={day}
                  onReplace={openReplacement}
                  replaceDisabled={loading}
                />
              ))}
              <ThemedView style={styles.planActions}>
                {plan.status === 'draft' && <Button title={loading ? 'Saving...' : 'Save plan'} onPress={handleSave} disabled={loading} />}
                {plan.status === 'saved' && <Button title="Edit plan" onPress={beginEdit} />}
                {plan.status === 'draft' && hasSavedVersion && <Button title="Discard changes" variant="secondary" onPress={handleDiscardChanges} />}
                <Button title="Plan again" variant="secondary" onPress={handleStartOver} />
                <Button title="Saved plans" variant="secondary" onPress={handleSavedPlans} />
                {plan && <Button title="Create shopping list" variant="secondary" onPress={handleShoppingList} />}
              </ThemedView>
            </ThemedView>
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle">No meals planned yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Generate a plan using the food currently in your inventory.</ThemedText>
              {savedPlans.length > 0 && <ThemedText type="small" themeColor="textSecondary">Your latest saved plan could not be displayed.</ThemedText>}
              <Button title="Choose preferences" onPress={handleStartOver} />
            </ThemedView>
          )}

          {(error || routeError) && !loading && <Button title="Try again" variant="secondary" onPress={handleRetry} />}
          <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.backAction}>
            <ThemedText type="small" themeColor="textSecondary">Back to dashboard</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {replacement && plan && (
        <ModalDialog
          visible
          title="Choose another meal"
          secondaryButtonText="Close"
          onClose={cancelReplacement}
          contentStyle={styles.alternativeModalContent}
        >
          <ScrollView contentContainerStyle={styles.alternativeList} showsVerticalScrollIndicator={false}>
            {replacement.loading && <MealPlanLoading />}
            {replacement.error && (
              <ThemedView style={styles.alternativeError}>
                <FeedbackBanner message="We could not load alternative meals." tone="error" />
                <Button title="Try again" variant="secondary" onPress={regenerateReplacement} />
              </ThemedView>
            )}
            {!replacement.loading && !replacement.error && replacement.candidates.length === 0 && (
              <ThemedView style={styles.alternativeEmpty}>
                <ThemedText type="subtitle">No other suitable meals</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Keep the current meal or try regenerating later with the current inventory.
                </ThemedText>
              </ThemedView>
            )}
            {!replacement.loading && replacement.candidates.map((candidate) => (
              <MealPlanDayCard
                key={candidate.recipeId}
                day={{
                  date: plan.days.find((day) => day.meals.some((meal) => meal.dayIndex === replacement.dayIndex))?.date || plan.startDate,
                  meals: [candidate],
                }}
                actionLabel="Use this meal"
                onAction={() => selectReplacement(candidate)}
                replaceDisabled={replacement.loading}
              />
            ))}
            {!replacement.loading && !replacement.error && (
              <Button title="Regenerate alternatives" variant="secondary" onPress={regenerateReplacement} />
            )}
          </ScrollView>
        </ModalDialog>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Platform.OS === 'web' ? 88 : Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  pageHeader: { gap: Spacing.one },
  planSummary: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#EEF4FF' },
  summaryTitle: { fontSize: 24, lineHeight: 30 },
  planSection: { gap: Spacing.three },
  planActions: { gap: Spacing.two },
  alternativeModalContent: { maxHeight: '75%' },
  alternativeList: { gap: Spacing.three, paddingBottom: Spacing.two },
  alternativeEmpty: { gap: Spacing.two, paddingVertical: Spacing.three },
  alternativeError: { gap: Spacing.two },
  emptyState: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  backAction: { alignItems: 'center', paddingVertical: Spacing.two },
});
