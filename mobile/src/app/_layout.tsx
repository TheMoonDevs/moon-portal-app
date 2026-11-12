import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CompanyProvider } from '@/lib/company';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      background: Colors[scheme].background,
      card: Colors[scheme].background,
      text: Colors[scheme].text,
      border: Colors[scheme].border,
      primary: Colors[scheme].accent,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="auto" />
            <RootStack />
          </ThemeProvider>
        </CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** Signed-in screens and the sign-in screen; only one set is reachable. */
function RootStack() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="company"
          options={{
            presentation: 'formSheet',
            headerShown: true,
            title: 'Company',
            sheetAllowedDetents: [0.5, 1],
            sheetGrabberVisible: true,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
