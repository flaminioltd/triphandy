import Button from '../../src/components/ui/Button';
import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Text, useTheme, TextInput as PaperInput, Card, List } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { db } from '../../src/db/client';
import { countries } from '../../src/db/schema';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/stores/app-store';
import { useTranslation } from 'react-i18next';

const getCurrencyDisplayName = (code: string) => {
  try {
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      const name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code);
      if (name && name !== code) return `${name} (${code})`;
    }
  } catch (e) {
    // Ignore and use fallback
  }
  
  const fallbacks: Record<string, string> = {
    'USD': 'US Dollar', 'EUR': 'Euro', 'GBP': 'British Pound', 'AUD': 'Australian Dollar',
    'NZD': 'New Zealand Dollar', 'CAD': 'Canadian Dollar', 'JPY': 'Japanese Yen', 'CNY': 'Chinese Yuan',
    'KRW': 'South Korean Won', 'INR': 'Indian Rupee', 'MXN': 'Mexican Peso', 'BRL': 'Brazilian Real',
    'ARS': 'Argentine Peso', 'CHF': 'Swiss Franc', 'DKK': 'Danish Krone', 'SEK': 'Swedish Krona',
    'NOK': 'Norwegian Krone', 'CZK': 'Czech Koruna', 'HUF': 'Hungarian Forint', 'PLN': 'Polish Zloty',
    'TRY': 'Turkish Lira', 'THB': 'Thai Baht', 'VND': 'Vietnamese Dong'
  };
  
  return fallbacks[code] ? `${fallbacks[code]} (${code})` : code;
};

const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateSettings } = useAppStore();
  const { t, i18n } = useTranslation();
  
  const [step, setStep] = useState<0 | 1>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(i18n.language.split('-')[0] || 'en');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [allCountries, setAllCountries] = useState<any[]>([]);

  useEffect(() => {
    db.select().from(countries).then(res => setAllCountries(res));
  }, []);

  const filteredCountries = useMemo(() => {
    const translatedCountries = allCountries.map(c => ({
      ...c,
      translatedName: t(`countries.${c.code}`, c.name),
      translatedRegion: t(`regions.${c.region}`, c.region)
    }));
    
    let list = translatedCountries;
    if (searchQuery) {
      list = translatedCountries.filter(c => c.translatedName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list.sort((a, b) => a.translatedName.localeCompare(b.translatedName));
  }, [searchQuery, allCountries, t]);

  const handleAction = async () => {
    if (step === 0) {
      await updateSettings({ systemLanguage: selectedLanguage });
      i18n.changeLanguage(selectedLanguage);
      setStep(1);
      return;
    }

    if (!selectedCountry) return;
    
    await updateSettings({ homeCountry: selectedCountry.code, homeCurrency: selectedCountry.currencyCode });
    router.push({ pathname: '/onboarding/date-selection', params: { homeCountryCode: selectedCountry.code } });
  };

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setSearchQuery(country.translatedName || country.name);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 32, position: 'relative' }]}>

        <Image source={require('../../assets/images/Logo.png')} style={{ height: 32, width: 110, resizeMode: 'contain' }} />
      </View>

      {step === 0 ? (
        <View style={styles.content}>
          <View style={styles.heroText}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              System Language
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Choose your language to continue.
            </Text>
          </View>
          
          <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, position: 'relative', top: 0, elevation: 0, shadowOpacity: 0, flex: 1, marginBottom: 24 }]}>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item, index }) => {
                const isSelected = selectedLanguage === item.code;
                return (
                  <Pressable 
                    style={({ pressed }) => [
                      styles.resultItem,
                      index === LANGUAGES.length - 1 && { borderBottomWidth: 0 },
                      pressed && { backgroundColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => setSelectedLanguage(item.code)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: isSelected ? theme.colors.primary : theme.colors.onSurface, fontWeight: isSelected ? 'bold' : '500' }}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.heroText}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {t('welcomeScreen.heroTitle')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('welcomeScreen.heroSubtitle')}
            </Text>
          </View>

          <View style={[styles.searchArea, { flex: 1 }]}>
            <View style={[
              styles.searchContainer, 
              { 
                backgroundColor: theme.colors.surface,
                borderColor: isFocused ? theme.colors.primary : theme.colors.outlineVariant,
                borderWidth: isFocused ? 2 : 1
              }
            ]}>
              <MaterialIcons name="search" size={24} color={theme.colors.primary} style={styles.searchIcon} />
              <PaperInput
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setSelectedCountry(null);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t('welcomeScreen.searchPlaceholder')}
                style={styles.input}
                underlineStyle={{ display: 'none' }}
                textColor={theme.colors.onSurface}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => {
                  setSearchQuery('');
                  setSelectedCountry(null);
                }} style={styles.clearIcon}>
                  <MaterialIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              )}
            </View>

            {selectedCountry && (
              <Card style={{ marginTop: 24, backgroundColor: theme.colors.surfaceVariant }} mode="contained">
                <Card.Content>
                  <Text variant="titleLarge" style={[{  marginBottom: 8 }, { color: theme.colors.onSurface }]}>
                    {t('welcomeScreen.settingsTitle', { countryName: selectedCountry.translatedName || selectedCountry.name })}
                  </Text>
                  <List.Item
                    title={getCurrencyDisplayName(selectedCountry.currencyCode)}
                    description={t('welcomeScreen.baseCurrency')}
                    left={props => <List.Icon {...props} icon="cash" />}
                  />
                  <List.Item
                    title={selectedCountry.measurementSystem === 'metric' ? t('welcomeScreen.metricSystem') : t('welcomeScreen.imperialSystem')}
                    description={t('welcomeScreen.measurementSystem')}
                    left={props => <List.Icon {...props} icon="ruler" />}
                  />
                </Card.Content>
              </Card>
            )}

            {isFocused && (
              <View style={[styles.dropdown, { position: 'relative', top: 0, flex: 1, marginTop: 8, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ flex: 1 }}
                  renderItem={({ item }) => (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.resultItem,
                        pressed && { backgroundColor: theme.colors.surfaceVariant }
                      ]}
                      onPress={() => handleSelectCountry(item)}
                    >
                      {FLAG_IMAGES[item.code] ? (
                        <Image source={FLAG_IMAGES[item.code]} style={[styles.resultIcon, { width: 36, height: 36, borderRadius: 18 }]} />
                      ) : (
                        <View style={[styles.resultIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <MaterialIcons name="location-on" size={20} color={theme.colors.onSurfaceVariant} />
                        </View>
                      )}
                      <View>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, }}>
                          {item.translatedName || item.name}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                          {item.translatedRegion || item.region}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleAction} 
          disabled={step === 1 && !selectedCountry}
          style={styles.button}
          contentStyle={{ height: 56 }}
          labelStyle={{ fontSize: 16, }}
        >
          {step === 0 ? 'Continue' : t('welcomeScreen.buttonContinue')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  heroText: {
    marginBottom: 32,
  },
  title: {
    
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 24,
  },
  searchArea: {
    position: 'relative',
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 50,
  },
  clearIcon: {
    padding: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  button: {
    borderRadius: 28,
  }
});
