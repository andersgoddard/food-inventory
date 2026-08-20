import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MealPlanDay } from '@/types/meal-plan';
import { formatDate } from '@/utils/date';
import { getMealAvailability, MealAvailability } from './meal-plan-presentation';

const availabilityLabels: Record<MealAvailability, string> = {
  available: 'Available',
  partial: 'Partially available',
  missing: 'Missing ingredients',
};

interface MealPlanDayCardProps {
  day: MealPlanDay;
  onReplace?: (dayIndex: number) => void;
  onAction?: () => void;
  actionLabel?: string;
  replaceDisabled?: boolean;
}

export function MealPlanDayCard({
  day,
  onReplace,
  onAction,
  actionLabel = 'Replace',
  replaceDisabled = false,
}: MealPlanDayCardProps) {
  const meal = day.meals[0];

  if (!meal) {
    return (
      <ThemedView style={styles.card} testID={`meal-plan-day-${day.date}`}>
        <ThemedText type="small" themeColor="textSecondary">{formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</ThemedText>
        <ThemedText type="subtitle">No meal planned</ThemedText>
      </ThemedView>
    );
  }

  const availability = getMealAvailability(meal);

  return (
    <ThemedView style={styles.card} testID={`meal-plan-day-${day.date}`}>
      <ThemedView style={styles.dayHeader}>
        <ThemedView>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {formatDate(day.date, { weekday: 'long' })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(day.date, { day: 'numeric', month: 'long', year: 'numeric' })}
          </ThemedText>
        </ThemedView>
        {(onReplace || onAction) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} for day ${meal.dayIndex + 1}`}
            disabled={replaceDisabled}
            onPress={() => onAction ? onAction() : onReplace?.(meal.dayIndex)}
            style={styles.replaceButton}
          >
            <ThemedText type="small" style={styles.replaceText}>{actionLabel}</ThemedText>
          </Pressable>
        )}
      </ThemedView>

      <ThemedText type="subtitle" style={styles.recipeTitle}>{meal.recipeSnapshot.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{meal.recipeSnapshot.summary}</ThemedText>

      <ThemedView style={styles.metaRow}>
        <ThemedText type="small" style={[styles.status, styles[availability]]}>
          {availabilityLabels[availability]}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meal.recipeSnapshot.preparationMinutes === null
            ? 'Prep time unavailable'
            : `${meal.recipeSnapshot.preparationMinutes} min prep`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {meal.recipeSnapshot.servings} servings
        </ThemedText>
      </ThemedView>

      {meal.missingIngredients.length > 0 && (
        <ThemedView style={styles.supportingSection}>
          <ThemedText type="smallBold">Missing</ThemedText>
          {meal.missingIngredients.map((ingredient) => (
            <ThemedText key={ingredient} type="small" themeColor="textSecondary">• {ingredient}</ThemedText>
          ))}
        </ThemedView>
      )}

      {meal.usesExpiringIngredients && (
        <ThemedView style={styles.useSoonNotice}>
          <ThemedText type="smallBold" style={styles.useSoonTitle}>Use soon</ThemedText>
          <ThemedText type="small">Uses food approaching its use-by date.</ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.reasonsSection}>
        <ThemedText type="smallBold">Why this meal?</ThemedText>
        {meal.reasons.map((reason) => (
          <ThemedText key={reason} type="small" themeColor="textSecondary">• {reason}</ThemedText>
        ))}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#F7F8FA',
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  replaceButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
  replaceText: { color: '#007AFF', fontWeight: '600' },
  recipeTitle: { fontSize: 26, lineHeight: 32 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  status: { fontWeight: '700' },
  available: { color: '#18794E' },
  partial: { color: '#9A6700' },
  missing: { color: '#B42318' },
  supportingSection: { gap: Spacing.one },
  useSoonNotice: { gap: Spacing.one, padding: Spacing.two, borderRadius: Spacing.two, backgroundColor: '#FFF4CC' },
  useSoonTitle: { color: '#8A5A00' },
  reasonsSection: { gap: Spacing.one, paddingTop: Spacing.one },
});