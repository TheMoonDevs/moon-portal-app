import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { EntryBridge } from '@/components/entry-bridge';
import { PushBridge } from '@/components/push-bridge';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ChatProvider } from '@/lib/chat';
import { CompanyProvider } from '@/lib/company';
import { LockGate } from '@/lib/lock';
import { loadPreferences } from '@/lib/preferences';
import { persistOptions, queryClient } from '@/lib/query';
import { setCrashUser, withCrashReports } from '@/lib/sentry';
import { UpdateGate } from '@/lib/updates';

void SplashScreen.preventAutoHideAsync();

export default withCrashReports(RootLayout);

function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [ready, setReady] = useState(false);

  // The saved theme first, so the first screen has the right colours.
  useEffect(() => {
    void loadPreferences().finally(() => setReady(true));
  }, []);

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

  if (!ready) return null;
  return (
    // First, so a share that opened the app is caught (components/entry-bridge.tsx).
    <ShareIntentProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          // Work logged offline in an earlier session goes out now.
          onSuccess={() => void queryClient.resumePausedMutations()}>
          <AuthProvider>
            <ChatProvider>
              <CompanyProvider>
                <ThemeProvider value={theme}>
                  <StatusBar style="auto" />
                  <UpdateGate>
                    <LockGate>
                      <RootStack />
                    </LockGate>
                  </UpdateGate>
                </ThemeProvider>
              </CompanyProvider>
            </ChatProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

const sheet = {
  presentation: 'formSheet',
  headerShown: true,
  sheetGrabberVisible: true,
} as const;

/** Signed-in screens and the sign-in screen; only one set is reachable. */
function RootStack() {
  const { status, profile } = useAuth();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  useEffect(() => {
    setCrashUser(status === 'signedIn' ? (profile?.id ?? null) : null);
  }, [status, profile?.id]);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <>
      {signedIn ? (
        <>
          <PushBridge />
          <EntryBridge />
        </>
      ) : null}
      <Stack
        screenOptions={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
        }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
          <Stack.Screen
            name="company"
            options={{ ...sheet, title: 'Company', sheetAllowedDetents: [0.5, 1] }}
          />
          <Stack.Screen
            name="log"
            options={{ ...sheet, title: 'Log work', sheetAllowedDetents: [0.75, 1] }}
          />
          <Stack.Screen
            name="new-task"
            options={{ ...sheet, title: 'New task', sheetAllowedDetents: [0.8, 1] }}
          />
          <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
          <Stack.Screen name="tasks" options={{ title: 'All my tasks' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="chat/[id]" options={{ title: '' }} />
          <Stack.Screen name="chat/new" options={{ ...sheet, title: 'New chat', sheetAllowedDetents: [1] }} />
          <Stack.Screen name="projects" options={{ title: 'Projects' }} />
          <Stack.Screen name="project/[id]" options={{ title: 'Project' }} />
          <Stack.Screen
            name="header-image"
            options={{ ...sheet, title: 'Header image', sheetAllowedDetents: [0.75, 1] }}
          />
          <Stack.Screen name="page/[projectId]/[pageId]" options={{ title: '' }} />
          <Stack.Screen name="goals" options={{ title: 'Goals' }} />
          <Stack.Screen name="goal/[projectId]/[goalId]" options={{ title: 'Goal' }} />
          <Stack.Screen name="plans" options={{ title: 'Plans' }} />
          <Stack.Screen name="plan/[id]" options={{ title: 'Plan' }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
          <Stack.Screen name="badges" options={{ title: 'Badges' }} />
          <Stack.Screen name="meetings" options={{ title: 'Meetings' }} />
          <Stack.Screen name="profile" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="person/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="share"
            options={{ ...sheet, title: 'Share to Portal', sheetAllowedDetents: [0.75, 1] }}
          />
          <Stack.Screen name="search" options={{ title: 'Search' }} />
          <Stack.Screen name="whats-new" options={{ title: 'What’s new' }} />
          <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
          <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
