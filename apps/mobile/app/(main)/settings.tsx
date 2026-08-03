import Button from '../../src/components/ui/Button';
import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, useTheme, List, Switch } from 'react-native-paper';
import { useAppStore } from '../../src/stores/app-store';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import ChangeHomeCountryModal from '../../src/components/ChangeHomeCountryModal';
import ChangeLanguageModal from '../../src/components/ChangeLanguageModal';
import CustomizeCurrencyUnitsModal from '../../src/components/CustomizeCurrencyUnitsModal';
import ChangeExchangeRateSyncModal from '../../src/components/ChangeExchangeRateSyncModal';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { updateExchangeRates, getLastSyncTime } from '../../src/services/exchangeRates';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { settings, updateSettings } = useAppStore();
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    getLastSyncTime().then(date => {
      if (date) setLastSyncDate(new Date(date));
    });
  }, []);

  const homeCountry = COUNTRIES.find(c => c.code === settings?.homeCountry);
  const currentLanguageCode = settings?.systemLanguage || i18n.language.split('-')[0] || 'en';
  const LANGUAGES: Record<string, string> = { en: 'English', es: 'Español', de: 'Deutsch', fr: 'Français', it: 'Italiano', pt: 'Português' };
  const currentLanguageName = LANGUAGES[currentLanguageCode] || 'English';

  const currentPreference = settings?.exchangeRateSyncPreference || 'wifi_only';
  const PREFERENCE_NAMES: Record<string, string> = {
    'wifi_only': t("settingsScreen.syncWifiOnly", "Sync only when WiFi connected"),
    'cellular': t("settingsScreen.syncCellular", "Sync with mobile data"),
    'manual': t("settingsScreen.syncManual", "Sync only on manual trigger")
  };
  const currentPreferenceName = PREFERENCE_NAMES[currentPreference];

  const handleSync = async () => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      Alert.alert(t('settingsScreen.error', 'Error'), t('settingsScreen.noConnection', 'No internet connection available.'));
      return;
    }
    
    setIsSyncing(true);
    const result = await updateExchangeRates();
    setIsSyncing(false);
    
    if (result.success && result.timestamp) {
      setLastSyncDate(result.timestamp);
    } else {
      Alert.alert(t('settingsScreen.error', 'Error'), t('settingsScreen.syncFailed', 'Failed to fetch the latest exchange rates.'));
    }
  };

  const formatSyncDate = (date: Date | null) => {
    if (!date) return t('settingsScreen.neverSynced', 'Never synced');
    const d = date.getDate().toString().padStart(2, '0');
    const m = date.toLocaleString(currentLanguageCode, { month: 'short' });
    const y = date.getFullYear();
    return `${d} ${m}, ${y}`;
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, alignSelf: 'flex-start', marginBottom: 8 }}>
        {t('settingsScreen.headerTitle')}
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, alignSelf: 'flex-start', marginBottom: 24 }}>
        {t('settingsScreen.headerSubtitle')}
      </Text>

      <View style={[styles.section, { backgroundColor: '#EFE7DC', borderRadius: 16 }]}>
        <List.Item
          title={t('settingsScreen.homeCountry')}
          description={homeCountry ? t(`countries.${homeCountry.code}`, homeCountry.name) : t('settingsScreen.notSet')}
          left={props => (
            homeCountry && FLAG_IMAGES[homeCountry.code] ? 
              <Image source={FLAG_IMAGES[homeCountry.code]} style={{ width: 32, height: 32, borderRadius: 16, margin: 8 }} />
              : <List.Icon {...props} icon="earth" />
          )}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setCountryModalVisible(true)}
        />
        <List.Item
          title={t('settingsScreen.customizeCurrencyUnitsTitle', 'Customize Currency & Units')}
          description={`${settings?.homeCurrency || 'USD'} • ${settings?.sizeFormat === 'imperial' ? t('welcomeScreen.imperialSystem', 'Imperial') : t('welcomeScreen.metricSystem', 'Metric')}`}
          left={props => <List.Icon {...props} icon="tune" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setCustomizeModalVisible(true)}
        />
        <List.Item
          title={t('settingsScreen.systemLanguage')}
          description={currentLanguageName}
          left={props => <List.Icon {...props} icon="translate" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setLanguageModalVisible(true)}
        />
        <List.Item
          title={t('settingsScreen.exchangeRateSyncTitle', 'Exchange Rate Sync')}
          description={currentPreferenceName}
          left={props => <List.Icon {...props} icon="cloud-sync" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setSyncModalVisible(true)}
        />
        <List.Item
          title="Pro Mode (Test)"
          description="Enable to test Pro features"
          left={props => <List.Icon {...props} icon="star" />}
          right={props => (
            <Switch
              value={!!settings?.isPremium}
              onValueChange={(val) => updateSettings({ isPremium: val })}
              color={theme.colors.primary}
            />
          )}
        />
      </View>

      <View style={{ marginTop: 'auto', width: '100%', alignItems: 'center' }}>
        <Button variant="alternative" onPress={handleSync} icon="sync" loading={isSyncing} disabled={isSyncing}>
          {t('settingsScreen.forceSyncRatesButton', 'Sync Exchange Rates')}
        </Button>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          {t('settingsScreen.lastUpdated', 'Last updated:')} {formatSyncDate(lastSyncDate)}
        </Text>
      </View>

      <ChangeHomeCountryModal 
        visible={countryModalVisible} 
        onDismiss={() => setCountryModalVisible(false)} 
      />
      
      <ChangeLanguageModal
        visible={languageModalVisible}
        onDismiss={() => setLanguageModalVisible(false)}
      />
      
      <CustomizeCurrencyUnitsModal
        visible={customizeModalVisible}
        onDismiss={() => setCustomizeModalVisible(false)}
      />
      
      <ChangeExchangeRateSyncModal
        visible={syncModalVisible}
        onDismiss={() => setSyncModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  section: {
    width: '100%',
    marginBottom: 24,
  }
});
