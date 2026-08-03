import Button from '../../src/components/ui/Button';
import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Text, useTheme, TextInput as PaperInput, Card, List, Modal, Portal } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useTripStore } from '../../src/stores/trip-store';
import { useAppStore } from '../../src/stores/app-store';
import { db } from '../../src/db/client';
import { countries, exchangeRates } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { getExchangeRate } from '../../src/services/exchangeRates';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { useTranslation } from 'react-i18next';

export default function DateSelectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createTrip } = useTripStore();
  const { updateSettings } = useAppStore();
  const { t } = useTranslation();
  
  const { homeCountryCode = 'US' } = useLocalSearchParams<{ homeCountryCode: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [allCountries, setAllCountries] = useState<any[]>([]);

  // Dates
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [notSetYet, setNotSetYet] = useState(false);
  
  const [tempStart, setTempStart] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});

  const handleDayPress = (day: any) => {
    if (!tempStart) {
      setTempStart(day.dateString);
      setMarkedDates({
        [day.dateString]: { startingDay: true, endingDay: true, color: theme.colors.primary, textColor: 'white' }
      });
      setStartDate(new Date(day.timestamp));
      setEndDate(null);
    } else {
      const start = new Date(tempStart);
      const end = new Date(day.timestamp);
      if (end < start) {
        setTempStart(day.dateString);
        setMarkedDates({
          [day.dateString]: { startingDay: true, endingDay: true, color: theme.colors.primary, textColor: 'white' }
        });
        setStartDate(new Date(day.timestamp));
        setEndDate(null);
      } else {
        const range: any = {};
        let current = new Date(start);
        while (current <= end) {
          const dateString = current.toISOString().split('T')[0];
          if (current.getTime() === start.getTime()) {
            range[dateString] = { startingDay: true, color: theme.colors.primary, textColor: 'white' };
          } else if (current.getTime() === end.getTime()) {
            range[dateString] = { endingDay: true, color: theme.colors.primary, textColor: 'white' };
          } else {
            range[dateString] = { color: theme.colors.primaryContainer, textColor: theme.colors.onPrimaryContainer };
          }
          current.setDate(current.getDate() + 1);
        }
        setMarkedDates(range);
        setStartDate(start);
        setEndDate(end);
        setTempStart(null);
        setTimeout(() => setShowPicker(false), 300);
      }
    }
  };

  // Exchange Rate
  const [exchangeRateInfo, setExchangeRateInfo] = useState<{ rate: number, baseCurrency: string, targetCurrency: string, date: string } | null>(null);

  useEffect(() => {
    // Load countries from DB
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

  const handleSelectCountry = async (country: any) => {
    setSelectedDestination(country);
    setSearchQuery(country.translatedName || country.name);
    setIsFocused(false);
    Keyboard.dismiss();

    const homeCountry = allCountries.find(c => c.code === homeCountryCode);
    const homeCurrency = homeCountry?.currencyCode || 'USD';

    // Fetch exchange rate
    const destRateData = await getExchangeRate(country.currencyCode);
    const homeRateData = await getExchangeRate(homeCurrency);

    if (destRateData && homeRateData) {
      const conversionRate = destRateData.rate / homeRateData.rate;
      setExchangeRateInfo({
        rate: conversionRate,
        baseCurrency: homeCurrency,
        targetCurrency: country.currencyCode,
        date: new Date(destRateData.updatedAt).toLocaleDateString()
      });
    } else {
      setExchangeRateInfo(null);
    }
  };

  const handleSkip = async () => {
    await updateSettings({ setupComplete: true });
    router.replace('/(main)');
  };

  const handleContinue = async () => {
    if (selectedDestination) {
      await createTrip({
        destinationCountry: selectedDestination.name,
        startDate: notSetYet ? null : startDate,
        endDate: notSetYet ? null : endDate,
        budget: null,
        currency: selectedDestination.currencyCode,
      });
      await updateSettings({ setupComplete: true });
      router.replace('/(main)');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 32, paddingBottom: 32, position: 'relative', justifyContent: 'center' }]}>
        <Pressable 
          style={{ position: 'absolute', left: 16, top: insets.top + 16, zIndex: 10, padding: 8 }} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={28} color={theme.colors.primary} />
        </Pressable>
        
        <Image source={require('../../assets/images/Logo.png')} style={{ height: 32, width: 110, resizeMode: 'contain' }} />

        <View style={{ position: 'absolute', right: 8, top: insets.top + 12, zIndex: 10 }}>
          <Button mode="text" labelStyle={{ textAlign: 'right' }} contentStyle={{ justifyContent: 'flex-end' }} onPress={handleSkip}>{t('dateSelectionScreen.skipButton')}</Button>
        </View>
      </View>

      <View style={styles.content}>
        {!selectedDestination && (
          <View style={styles.heroText}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
              {t('dateSelectionScreen.heroTitle')}
            </Text>
          </View>
        )}

        <View style={[styles.searchArea, { flex: selectedDestination ? 0 : 1, zIndex: 10 }]}>
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
                setSelectedDestination(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('dateSelectionScreen.searchPlaceholder')}
              style={styles.input}
              underlineStyle={{ display: 'none' }}
              textColor={theme.colors.onSurface}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => {
                setSearchQuery('');
                setSelectedDestination(null);
              }} style={styles.clearIcon}>
                <MaterialIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>

          {isFocused && (
            <View style={[styles.dropdown, { position: 'absolute', top: 60, left: 0, right: 0, maxHeight: 250, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, zIndex: 100 }]}>
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
                          <Image source={FLAG_IMAGES[item.code]} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 16 }} />
                        ) : (
                          <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 16, backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
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

        {selectedDestination && !isFocused && (
          <View style={[styles.selectedContainer, { marginTop: 24, zIndex: 1 }]}>
             <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} mode="contained">
                <Card.Content>
                  <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                    {t('dateSelectionScreen.detailsTitle', { countryName: selectedDestination.translatedName })}
                  </Text>
                  <List.Item
                    title={t('dateSelectionScreen.exchangeRateTitle', { currency: selectedDestination.currencyCode, baseCurrency: exchangeRateInfo ? exchangeRateInfo.baseCurrency : 'Home Currency' })}
                    description={exchangeRateInfo ? t('dateSelectionScreen.exchangeRateDesc', { 
                      targetCurrency: exchangeRateInfo.targetCurrency, 
                      rate: exchangeRateInfo.rate.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: exchangeRateInfo.rate === 0 ? 2 : Math.max(2, Math.ceil(-Math.log10(exchangeRateInfo.rate)) + 1) 
                      }), 
                      baseCurrency: exchangeRateInfo.baseCurrency, 
                      date: exchangeRateInfo.date 
                    }) : t('dateSelectionScreen.exchangeRateOffline')}
                    left={props => <List.Icon {...props} icon="cash" />}
                  />
                  <List.Item
                    title={selectedDestination.measurementSystem === 'metric' ? t('welcomeScreen.metricSystem') : t('welcomeScreen.imperialSystem')}
                    description={t('dateSelectionScreen.localMeasurement')}
                    left={props => <List.Icon {...props} icon="ruler" />}
                  />
                </Card.Content>
             </Card>

             <View style={styles.datesSection}>
               <Text variant="titleMedium" style={{ marginBottom: 12, }}>{t('dateSelectionScreen.datesTitle')}</Text>
               
               <View style={{ marginBottom: 8 }}>
                 <Pressable 
                   onPress={() => setShowPicker(true)} 
                   disabled={notSetYet}
                   style={({ pressed }) => [
                     { 
                       flexDirection: 'row', 
                       alignItems: 'center', 
                       justifyContent: 'center',
                       borderColor: theme.colors.outlineVariant, 
                       borderWidth: 1,
                       borderRadius: 999,
                       opacity: notSetYet ? 0.5 : 1, 
                       height: 52,
                       backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent'
                     }
                   ]}
                 >
                   <MaterialIcons name="date-range" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                   <Text style={{ fontSize: 16, color: theme.colors.primary, }}>
                     {startDate && endDate 
                       ? `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`
                       : t('dateSelectionScreen.selectDateRange', 'Select Date Range')}
                   </Text>
                 </Pressable>
               </View>

               <Pressable 
                  style={[styles.dateButton, { backgroundColor: 'transparent', borderWidth: 0, padding: 8, paddingHorizontal: 0 }]}
                  onPress={() => setNotSetYet(!notSetYet)}
               >
                 <MaterialIcons name={notSetYet ? 'check-circle' : 'radio-button-unchecked'} size={24} color={theme.colors.primary} />
                 <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>{t('dateSelectionScreen.notSetYet')}</Text>
               </Pressable>

               <Portal>
                 <Modal visible={showPicker} onDismiss={() => setShowPicker(false)} contentContainerStyle={{ margin: 24, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
                   <Calendar
                     minDate={new Date().toISOString().split('T')[0]}
                     markingType={'period'}
                     markedDates={markedDates}
                     onDayPress={handleDayPress}
                     theme={{
                       todayTextColor: theme.colors.primary,
                       arrowColor: theme.colors.primary,
                     }}
                   />
                 </Modal>
               </Portal>
             </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleContinue} 
          disabled={!selectedDestination || (!notSetYet && (!startDate || !endDate))}
          style={styles.button}
          contentStyle={{ height: 56 }}
        >
          {selectedDestination ? t('dateSelectionScreen.saveTripButton') : t('dateSelectionScreen.continueButton')}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { },
  content: { flex: 1, padding: 24 },
  heroText: { marginBottom: 32 },
  title: {  marginBottom: 8 },
  searchArea: { position: 'relative', zIndex: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 56, paddingHorizontal: 12 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, backgroundColor: 'transparent', height: 50 },
  clearIcon: { padding: 8 },
  dropdown: { position: 'absolute', top: 64, left: 0, right: 0, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  selectedContainer: { flex: 1 },
  card: { marginBottom: 24, backgroundColor: '#ffffff' },
  cardTitle: {  marginBottom: 8 },
  datesSection: { marginTop: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  datePickers: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: { padding: 24, paddingBottom: 40 },
  button: { borderRadius: 28 }
});
