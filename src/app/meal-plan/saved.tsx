import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { ModalDialog } from '@/components/ui/modal';
import { Spacing } from '@/constants/theme';
import { useMealPlanner } from '@/hooks/use-meal-planner';
import { formatDate } from '@/utils/date';

export default function SavedMealPlansScreen() {
  const router = useRouter();
  const { savedPlans, loading, error, loadSavedPlans, deleteSavedPlan } = useMealPlanner();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPlans();
  }, [loadSavedPlans]);

  const plans = savedPlans.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSavedPlan(deleteId);
      setDeleteId(null);
    } catch (deleteFailure) {
      setDeleteError(deleteFailure instanceof Error ? deleteFailure.message : 'Unable to delete saved plan');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Saved plans</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Open a saved plan to review or edit it.</ThemedText>
          {error && <FeedbackBanner message="We could not load your saved plans." tone="error" />}
          {deleteError && <FeedbackBanner message={deleteError} tone="error" onDismiss={() => setDeleteError(null)} />}
          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">Loading saved plans...</ThemedText>
          ) : plans.length === 0 ? (
            <ThemedView style={styles.empty}>
              <ThemedText type="subtitle">No saved plans yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Generate and save a plan to see it here.</ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.list}>
              {plans.map((plan) => (
                <ThemedView key={plan.id} style={styles.planItem}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${plan.title}`}
                    onPress={() => router.replace({ pathname: '/meal-plan', params: { savedPlanId: plan.id } })}
                    style={styles.planOpen}
                  >
                    <ThemedText type="subtitle" style={styles.planTitle}>{plan.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDate(plan.startDate, { day: 'numeric', month: 'short' })} - {formatDate(plan.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {plan.preferences.mealType} · {plan.preferences.people} people · {plan.days.length} days · Version {plan.version}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">Updated {formatDate(plan.updatedAt)}</ThemedText>
                  </Pressable>
                  <Button title="Delete" variant="danger" size="small" onPress={() => setDeleteId(plan.id)} />
                </ThemedView>
              ))}
            </ThemedView>
          )}
          <Button title="Plan my week" onPress={() => router.replace('/meal-plan/preferences')} />
          <Pressable onPress={() => router.replace('/meals')} style={styles.backAction}>
            <ThemedText type="small" themeColor="textSecondary">Back to Meals</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <ModalDialog
        visible={!!deleteId}
        title="Delete saved plan?"
        message="This removes the saved plan. Inventory will not be changed."
        primaryButtonText="Delete"
        onPrimaryPress={handleDelete}
        secondaryButtonText="Cancel"
        onClose={() => setDeleteId(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  list: { gap: Spacing.two },
  planItem: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#F7F8FA' },
  planOpen: { gap: Spacing.one, minHeight: 44 },
  planTitle: { fontSize: 24, lineHeight: 30 },
  backAction: { alignItems: 'center', paddingVertical: Spacing.two },
});