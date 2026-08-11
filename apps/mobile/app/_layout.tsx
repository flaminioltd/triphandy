import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { theme } from '../src/theme/paper-theme';
import { useEffect } from 'react';
import { en, registerTranslation } from 'react-native-paper-dates';
import NetInfo from '@react-native-community/netinfo';
import '../src/i18n';

import { initNotifications, requestNotificationPermissions } from '../src/services/notification-service';

registerTranslation('en', en);
import { seedDatabase } from '../src/db/seed';
import { updateExchangeRates, shouldUpdateRates } from '../src/services/exchangeRates';
import { useFonts, DMSans_900Black, DMSans_700Bold, DMSans_400Regular } from '@expo-google-fonts/dm-sans';
import { useAppStore } from '../src/stores/app-store';
import { useTripStore } from '../src/stores/trip-store';
import { syncAllWidgets } from '../src/services/widget-service';
import { Text, View, ScrollView } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Qonversion, { QonversionConfigBuilder, LaunchMode } from 'react-native-qonversion';

SplashScreen.preventAutoHideAsync().catch(() => {});

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#ffcccc', paddingTop: 60, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>Startup Error</Text>
      <ScrollView>
        <Text style={{ fontSize: 14, color: 'black' }}>{error.message}</Text>
        <Text style={{ fontSize: 12, color: 'gray', marginTop: 10 }}>{error.stack}</Text>
      </ScrollView>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_900Black,
    DMSans_700Bold,
    DMSans_400Regular,
  });

  useEffect(() => {
    seedDatabase().then(() => {
      useTripStore.getState().loadTrips().then(() => {
        const state = useTripStore.getState();
        syncAllWidgets(state.activeTrip, state.expenses);
      }).catch(console.error);
    }).catch(console.error);
    initNotifications().then(() => requestNotificationPermissions()).catch(console.error);

    // Initialize Qonversion
    try {
      const config = new QonversionConfigBuilder(
        'e9kuA9PFmsWUmZ1OGJcXjGE2RRc3AOdJ',
        LaunchMode.SUBSCRIPTION_MANAGEMENT
      ).build();
      Qonversion.initialize(config);

      // Check entitlements on load
      Qonversion.getSharedInstance().checkEntitlements()
        .then(entitlements => {
          const premium = entitlements.get('premium_access');
          const isPremium = !!(premium && premium.isActive);
          useAppStore.getState().updateSettings({ isPremium });
        })
        .catch(err => console.error('Qonversion entitlement check error:', err));
    } catch (err) {
      console.error('Failed to initialize Qonversion:', err);
    }
    
    // Subscribe to network state changes to refresh exchange rates
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const settings = useAppStore.getState().settings;
      const pref = settings?.exchangeRateSyncPreference || 'wifi_only';
      
      if (pref === 'manual') return;
      if (pref === 'wifi_only' && state.type !== 'wifi') return;

      if (state.isConnected) {
        shouldUpdateRates().then(shouldUpdate => {
          if (shouldUpdate) {
            updateExchangeRates().catch(console.error);
          }
        }).catch(console.error);
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="modules" />
        <Stack.Screen name="access" />
      </Stack>
    </PaperProvider>
  );
}
