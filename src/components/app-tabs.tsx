import { Tabs } from 'expo-router';
import { Image, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useInventory } from '@/hooks/use-inventory';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

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
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Image source={require('@/assets/images/tabIcons/home.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Image source={require('@/assets/images/tabIcons/explore.png')} style={{ width: size, height: size, tintColor: color }} />,
        }}
      />
    </Tabs>
  );
}
