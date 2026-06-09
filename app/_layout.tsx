import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useAppFonts } from '@/theme/fonts';
import { LlmLoader } from '@/features/ai/LlmLoader';
import { useLlmStatus } from '@/features/ai/llmStatus';
import { useSession } from '@/features/auth/auth';
import { SyncManager } from '@/db/sync/SyncManager';
import { useNavPrefs } from '@/features/nav/navPrefs';
import { useCalendarSync } from '@/features/planning/deviceCalendar';
import { prunePastReminders } from '@/features/planning/reminders';
import { useGroupes } from '@/features/work/groupes';
import { useProfile } from '@/features/profile/profile';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  const llmEnabled = useLlmStatus((s) => s.enabled);
  const { session, loading: authLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();

  const ready = fontsLoaded && !authLoading;

  useEffect(() => {
    // No auto-seed: with mandatory auth + cloud sync, demo data would duplicate
    // the user's synced data on every clean rebuild.
    useNavPrefs.getState().load();
    useCalendarSync.getState().load();
    useGroupes.getState().load();
    useProfile.getState().load();
    prunePastReminders().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Auth gate: no session → force the login screen; signed in → leave it.
  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!session && !onLogin) router.replace('/login');
    else if (session && onLogin) router.replace('/home');
  }, [ready, session, segments, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initial="soft">
          <StatusBar style="dark" />
          {llmEnabled && session ? <LlmLoader /> : null}
          {session ? <SyncManager /> : null}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
