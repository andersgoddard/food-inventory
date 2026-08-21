import { SymbolView, SymbolViewProps } from 'expo-symbols';
import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const tabIcon = (name: SymbolViewProps['name']) => ({ tintColor }: { tintColor: string }) => (
  <SymbolView name={name} size={22} tintColor={tintColor} weight="regular" />
);

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="today" href="/" asChild>
            <TabButton label="Today" icon={tabIcon({ ios: 'sun.max', android: 'wb_sunny', web: 'wb_sunny' })} />
          </TabTrigger>
          <TabTrigger name="inventory" href="/inventory" asChild>
            <TabButton label="Inventory" icon={tabIcon({ ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' })} />
          </TabTrigger>
          <TabTrigger name="meals" href="/meals" asChild>
            <TabButton label="Meals" icon={tabIcon({ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' })} />
          </TabTrigger>
          <TabTrigger name="shopping" href="/shopping" asChild>
            <TabButton label="Shopping" icon={tabIcon({ ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' })} />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: (props: { tintColor: string }) => React.ReactNode;
}

export function TabButton({ label, icon, isFocused, ...props }: TabButtonProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const tintColor = isFocused ? colors.accent : colors.textTertiary;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      {icon({ tintColor })}
      <ThemedText type="caption" style={{ color: tintColor }}>{label}</ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();

  return (
    <View {...props} style={[styles.tabListContainer, { backgroundColor: colors.backgroundElement, borderTopColor: colors.separator, paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
      <ThemedView style={styles.innerContainer}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  tabButton: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
