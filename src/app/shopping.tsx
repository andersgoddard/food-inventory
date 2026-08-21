import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FeedbackBanner } from '@/components/ui/feedback-banner';
import { Input } from '@/components/ui/input';
import { UnitSelector } from '@/components/inventory/unit-selector';
import { Spacing } from '@/constants/theme';
import { useShopping } from '@/hooks/use-shopping';
import { InventoryUnit } from '@/types/inventory';
import { ShoppingItemStatus } from '@/types/shopping';

export default function ShoppingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealPlanId?: string; shoppingListId?: string; message?: string }>();
  const { list, savedLists, loading, error, loadLists, generateForPlan, openList, save, setItemStatus, addManualItem, removeItem, compareItemPrice } = useShopping();
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualUnit, setManualUnit] = useState<InventoryUnit | null>(null);
  const [manualPriority, setManualPriority] = useState<'required' | 'recommended'>('required');
  const [priceInputs, setPriceInputs] = useState<Record<string, { current: string; reference: string }>>({});
  const [priceDetails, setPriceDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (params.shoppingListId) openList(params.shoppingListId);
    else if (params.mealPlanId) generateForPlan(params.mealPlanId);
    else loadLists();
  }, [generateForPlan, loadLists, openList, params.mealPlanId, params.shoppingListId]);

  const addItem = () => {
    addManualItem(manualName, manualQuantity ? Number(manualQuantity) : null, manualUnit, manualPriority);
    setManualName('');
    setManualQuantity('');
    setManualUnit(null);
  };

  // The list must be persisted before navigating away, since intake screens look the item up
  // by shoppingListId/shoppingItemId from storage (not from in-memory state) once they return.
  const confirmIntake = async (item: { id: string; name: string; missingQuantity: number | null; requiredQuantity: number | null; unit: string | null }) => {
    if (!list) return;
    await save();
    router.push({
      pathname: '/inventory/add',
      params: {
        name: item.name,
        quantity: String(item.missingQuantity ?? item.requiredQuantity ?? ''),
        unit: item.unit || undefined,
        shoppingListId: list.id,
        shoppingItemId: item.id,
      },
    });
  };

  const scanFoodIntake = async (itemId: string) => {
    if (!list) return;
    await save();
    router.push({ pathname: '/scan-food', params: { shoppingListId: list.id, shoppingItemId: itemId } });
  };

  const scanReceiptIntake = async (itemId: string) => {
    if (!list) return;
    await save();
    router.push({ pathname: '/scan-receipt', params: { shoppingListId: list.id, shoppingItemId: itemId } });
  };

  const statusButton = (itemId: string, status: ShoppingItemStatus, label: string) => (
    <Button title={label} size="small" variant={status === 'purchased' ? 'primary' : 'secondary'} onPress={() => setItemStatus(itemId, status)} />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Shopping list</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">What you need to buy for your meal plan.</ThemedText>
          {error && <FeedbackBanner message={error} tone="error" />}
          {params.message && <FeedbackBanner message={params.message} />}
          {loading && <ThemedText type="small" themeColor="textSecondary">Preparing your shopping list...</ThemedText>}
          {!loading && list && (
            <>
              <ThemedText type="subtitle">{list.title}</ThemedText>
              {list.items.length === 0 ? (
                <ThemedView style={styles.empty}><ThemedText type="subtitle">Nothing to buy</ThemedText><ThemedText type="small" themeColor="textSecondary">Your inventory covers this plan.</ThemedText></ThemedView>
              ) : (['required', 'recommended', 'manual'] as const).map((group) => {
                const groupItems = list.items.filter((item) => group === 'manual' ? item.source === 'manual' : item.source === 'meal_plan' && item.priority === group);
                if (!groupItems.length) return null;
                return <ThemedView key={group} style={styles.group}>
                  <ThemedText type="subtitle">{group === 'required' ? 'Required' : group === 'recommended' ? 'Recommended' : 'Manual items'}</ThemedText>
                  {groupItems.map((item) => (
                <ThemedView key={item.id} style={styles.item}>
                  <ThemedText type="subtitle" style={styles.itemName}>• {item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.missingQuantity === null
                      ? 'Quantity uncertain'
                      : item.availableQuantity
                        ? `Need ${item.requiredQuantity ?? item.missingQuantity} ${item.unit || ''} · have ${item.availableQuantity} ${item.unit || ''} · buy ${item.missingQuantity} ${item.unit || ''}`.trim()
                        : `${item.missingQuantity} ${item.unit || ''}`.trim()}
                    {' · '}{item.source === 'meal_plan' ? 'From meal plan' : 'Manual item'}
                  </ThemedText>
                  {item.sourceMealTitles.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">For: {item.sourceMealTitles.join(', ')}</ThemedText>
                  )}
                  {item.quantityConfidence !== 'exact' && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.confidenceNote}>
                      {item.quantityConfidence === 'unknown'
                        ? 'Amount needed is unknown - check before buying.'
                        : 'Amount needed is approximate and may be higher.'}
                    </ThemedText>
                  )}
                  {item.hasIncompatibleUnitInventory && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.confidenceNote}>
                      Some matching inventory uses a different unit and couldn't be compared automatically - check manually.
                    </ThemedText>
                  )}
                  {item.hasUseSoonInventory && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.confidenceNote}>
                      Some of what you already have is expiring soon - use that up before buying more.
                    </ThemedText>
                  )}
                  <Pressable onPress={() => setPriceDetails((current) => ({ ...current, [item.id]: !current[item.id] }))} style={styles.priceToggle}>
                    <ThemedText type="small" themeColor="textSecondary">{priceDetails[item.id] ? 'Hide price details' : 'Price details'}</ThemedText>
                  </Pressable>
                  {priceDetails[item.id] && <ThemedView style={styles.priceSection}>
                    <Input
                      label="Current price (GBP)"
                      value={priceInputs[item.id]?.current || ''}
                      onChangeText={(value) => setPriceInputs((current) => ({ ...current, [item.id]: { current: value, reference: current[item.id]?.reference || '' } }))}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 5.50"
                    />
                    <Input
                      label="Reference price (GBP)"
                      value={priceInputs[item.id]?.reference || ''}
                      onChangeText={(value) => setPriceInputs((current) => ({ ...current, [item.id]: { current: current[item.id]?.current || '', reference: value } }))}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 6.00"
                    />
                    <Button
                      title="Compare price"
                      variant="secondary"
                      onPress={() => {
                        const values = priceInputs[item.id];
                        if (values?.current && values.reference) void compareItemPrice(item.id, Number(values.current), Number(values.reference));
                      }}
                      disabled={!priceInputs[item.id]?.current || !priceInputs[item.id]?.reference}
                    />
                  </ThemedView>}
                  {item.priceAssessment && (
                    <ThemedView style={styles.assessment}>
                      <ThemedText type="smallBold">{item.priceAssessment.recommendation.replaceAll('_', ' ')}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.priceAssessment.differencePercent === null ? 'No comparable difference available.' : `${item.priceAssessment.differencePercent.toFixed(0)}% versus reference`}
                        {' · '}{item.priceAssessment.trend.direction} trend · {item.priceAssessment.volatility} volatility
                      </ThemedText>
                      {item.priceAssessment.reasons.map((reason) => <ThemedText key={reason} type="small" themeColor="textSecondary">• {reason}</ThemedText>)}
                    </ThemedView>
                  )}
                  <ThemedView style={styles.actions}>
                    {statusButton(item.id, 'needed', 'Needed')}
                    {statusButton(item.id, 'purchased', 'Purchased')}
                    {statusButton(item.id, 'skipped', 'Skipped')}
                    <Button title="Add to inventory" size="small" variant="secondary" onPress={() => confirmIntake(item)} />
                    <Button title="Scan food" size="small" variant="secondary" onPress={() => scanFoodIntake(item.id)} />
                    <Button title="Scan receipt" size="small" variant="secondary" onPress={() => scanReceiptIntake(item.id)} />
                    {item.source === 'manual' && (
                      <Button title="Remove" size="small" variant="danger" onPress={() => removeItem(item.id)} />
                    )}
                  </ThemedView>
                </ThemedView>
                  ))}
                </ThemedView>;
              })}
              <ThemedView style={styles.manualSection}>
                <ThemedText type="subtitle">Add an item</ThemedText>
                <Input label="Item name" value={manualName} onChangeText={setManualName} placeholder="e.g. Coffee" />
                <Input label="Quantity (optional)" value={manualQuantity} onChangeText={setManualQuantity} keyboardType="decimal-pad" />
                <UnitSelector value={manualUnit} onChange={setManualUnit} />
                <Pressable onPress={() => setManualPriority((value) => value === 'required' ? 'recommended' : 'required')} style={styles.priorityToggle}>
                  <ThemedText type="default">Priority</ThemedText><ThemedText type="small" themeColor="textSecondary">{manualPriority === 'required' ? 'Required' : 'Recommended'}</ThemedText>
                </Pressable>
                <Button title="Add manual item" onPress={addItem} disabled={!manualName.trim()} />
              </ThemedView>
              <Button title="Save shopping list" onPress={save} disabled={loading} />
            </>
          )}
          {!loading && !list && savedLists.length === 0 && <ThemedView style={styles.empty}><ThemedText type="subtitle">No shopping list yet</ThemedText><ThemedText type="small" themeColor="textSecondary">Open a saved meal plan to create one.</ThemedText></ThemedView>}
          {!loading && !list && savedLists.length > 0 && (
            <ThemedView style={styles.savedSection}>
              <ThemedText type="subtitle">Saved shopping lists</ThemedText>
              {savedLists.map((savedList) => (
                <Button
                  key={savedList.id}
                  title={savedList.title}
                  variant="secondary"
                  onPress={() => router.replace({ pathname: '/shopping', params: { shoppingListId: savedList.id } })}
                />
              ))}
            </ThemedView>
          )}
          <Pressable onPress={() => router.replace('/')} style={styles.back}><ThemedText type="small" themeColor="textSecondary">Back to dashboard</ThemedText></Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Platform.OS === 'web' ? 88 : Spacing.three },
  content: { gap: Spacing.three, paddingBottom: Spacing.six },
  item: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.two, backgroundColor: '#F7F8FA' },
  group: { gap: Spacing.two },
  itemName: { fontSize: 24, lineHeight: 30 },
  confidenceNote: { fontStyle: 'italic' },
  priceToggle: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  priceStatus: { color: '#9A6700', fontWeight: '600' },
  priceSection: { gap: Spacing.two, paddingTop: Spacing.two },
  assessment: { gap: Spacing.one, padding: Spacing.two, borderRadius: Spacing.two, backgroundColor: '#E7F0FF' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  manualSection: { gap: Spacing.two, paddingTop: Spacing.two },
  priorityToggle: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two },
  savedSection: { gap: Spacing.two },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  back: { alignItems: 'center', paddingVertical: Spacing.two },
});