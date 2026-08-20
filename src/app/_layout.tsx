import { DarkTheme, DefaultTheme, Slot, ThemeProvider, usePathname } from 'expo-router';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ErrorBoundary } from '@/components/error-boundary';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const pathname = usePathname();
  const isInventoryDetailRoute =
    pathname === '/inventory/add' ||
    pathname === '/recipe-ideas' ||
    pathname === '/scan-food' ||
    pathname === '/scan-receipt' ||
    pathname === '/meal-plan' ||
    pathname === '/meal-plan/preferences' ||
    pathname === '/meal-plan/saved' ||
    pathname === '/shopping' ||
    /^\/inventory\/[^/]+$/.test(pathname);

  return isInventoryDetailRoute ? <Slot /> : <AppTabs />;
}
