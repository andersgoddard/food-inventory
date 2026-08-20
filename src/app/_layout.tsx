import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ErrorBoundary } from '@/components/error-boundary';
import { AI_GATEWAY_TOKEN, AI_GATEWAY_URL } from '@/constants/ai';
import { GatewayAiProvider } from '@/services/ai/gateway-ai.provider';

const gateway = new GatewayAiProvider({
  baseUrl: AI_GATEWAY_URL,
  token: AI_GATEWAY_TOKEN,
  timeoutMs: 5_000,
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void gateway.healthCheck();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

