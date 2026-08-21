import { priceIntelligenceService, shoppingService } from '@/services';
import { getCurrentMealPlanDraft } from '@/services/meal-plan.draft-store';
import { InventoryUnit } from '@/types/inventory';
import { ShoppingList } from '@/types/shopping';
import { useCallback, useRef, useState } from 'react';

export function useShopping() {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [savedLists, setSavedLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<ShoppingList | null>(null);
  const setCurrentList = (next: ShoppingList | null) => {
    listRef.current = next;
    setList(next);
  };

  const loadLists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSavedLists(await shoppingService.getLists());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load shopping lists');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateForPlan = useCallback(async (planId: string) => {
    try {
      setLoading(true);
      setError(null);
      const existing = listRef.current?.mealPlanId === planId ? listRef.current : null;
      const draft = getCurrentMealPlanDraft(planId);
      const generated = draft
        ? await shoppingService.generateListForPlan(draft, existing)
        : await shoppingService.generateListForPlanId(planId, existing);
      setCurrentList(generated);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Unable to generate shopping list');
    } finally {
      setLoading(false);
    }
  }, []);

  const openList = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const opened = await shoppingService.getList(id);
      if (!opened) setError('Shopping list was not found');
      else setCurrentList(opened);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open shopping list');
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async () => {
    if (!list) return;
    try {
      setLoading(true);
      setError(null);
      const saved = await shoppingService.saveList(list);
      setCurrentList(saved);
      setSavedLists((current) => [...current.filter((item) => item.id !== saved.id), saved]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save shopping list');
    } finally {
      setLoading(false);
    }
  }, [list]);

  const setItemStatus = useCallback((itemId: string, status: 'needed' | 'purchased' | 'skipped') => {
    setList((current) => {
      const next = current ? shoppingService.updateItemStatus(current, itemId, status) : current;
      listRef.current = next;
      return next;
    });
  }, []);

  const addManualItem = useCallback((name: string, quantity: number | null, unit: InventoryUnit | null, priority: 'required' | 'recommended' = 'required') => {
    setList((current) => {
      const next = current && name.trim() ? shoppingService.addManualItem(current, name, quantity, unit, priority) : current;
      listRef.current = next;
      return next;
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setList((current) => {
      const next = current ? shoppingService.removeItem(current, itemId) : current;
      listRef.current = next;
      return next;
    });
  }, []);

  const compareItemPrice = useCallback(async (itemId: string, observedPrice: number, referencePrice: number) => {
    const current = list;
    if (!current) return;
    const item = current.items.find((entry) => entry.id === itemId);
    if (!item) return;
    try {
      setLoading(true);
      setError(null);
      const updated = await priceIntelligenceService.assessItem(item, observedPrice, referencePrice);
      setList((latest) => {
        if (!latest) return latest;
        return { ...latest, items: latest.items.map((entry) => entry.id === itemId ? updated : entry), updatedAt: updated.updatedAt };
      });
    } catch (comparisonError) {
      setError(comparisonError instanceof Error ? comparisonError.message : 'Unable to compare price');
    } finally {
      setLoading(false);
    }
  }, [list]);

  return { list, savedLists, loading, error, loadLists, generateForPlan, openList, save, setItemStatus, addManualItem, removeItem, compareItemPrice };
}