import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { ColorValue, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

function TabIcon(name: SymbolViewProps['name'], color: ColorValue, size: number) {
  return <SymbolView name={name} size={size} tintColor={color as string} weight="regular" />;
}

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { refresh } = useInventory();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.backgroundElement, borderTopColor: colors.separator },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => TabIcon({ ios: 'sun.max', android: 'wb_sunny', web: 'wb_sunny' }, color, size),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => TabIcon({ ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' }, color, size),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size }) => TabIcon({ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }, color, size),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ color, size }) => TabIcon({ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' }, color, size),
        }}
      />
    </Tabs>
  );
}
