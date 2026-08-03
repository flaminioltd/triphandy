import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Text, Button, useTheme, TextInput as PaperInput, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { FLAG_IMAGES } from '../lib/assets';
import { useTripStore } from '../stores/trip-store';
import { db } from '../db/client';
import { countries } from '../db/schema';

import { useTranslation } from 'react-i18next';

interface AddTripModalProps {
  visible: boolean;
  onDismiss: () => void;
}

import ProUpgradeModal from './ProUpgradeModal';
import { useAppStore } from '../stores/app-store';

export default function AddTripModal({ visible, onDismiss }: AddTripModalProps) {
  const theme = useTheme();
  const { createTrip, trips } = useTripStore();
  const { settings } = useAppStore();
  const { t, i18n } = useTranslation();
  
  const isPremium = settings?.isPremium;
  const today = new Date();
  today.setHours(0,0,0,0);
  const activeAndUpcomingTrips = trips.filter(t => !t.endDate || new Date(t.endDate) >= today);
  const isLimitReached = !isPremium && activeAndUpcomingTrips.length >= 2;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [notSetYet, setNotSetYet] = useState(false);
  const [allCountries, setAllCountries] = useState<any[]>([]);

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

  useEffect(() => {
    if (visible && allCountries.length === 0) {
      db.select().from(countries).then(res => setAllCountries(res));
    }
  }, [visible]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedCountry(null);
      setStartDate(null);
      setEndDate(null);
      setNotSetYet(false);
      setIsFocused(false);
      setShowPicker(false);
      setTempStart(null);
      setMarkedDates({});
    }
  }, [visible]);

  const filteredCountries = useMemo(() => {
    const list = searchQuery 
      ? allCountries.filter(c => {
          const translatedName = t(`countries.${c.code}`, c.name);
          return translatedName.toLowerCase().includes(searchQuery.toLowerCase());
        })
      : allCountries;
    return list.slice().sort((a, b) => {
      const aName = t(`countries.${a.code}`, a.name);
      const bName = t(`countries.${b.code}`, b.name);
      return aName.localeCompare(bName);
    });
  }, [searchQuery, allCountries]);

  const handleCreate = async () => {
    if (selectedCountry) {
      await createTrip({
        destinationCountry: selectedCountry.name,
        startDate: notSetYet ? null : startDate,
        endDate: notSetYet ? null : endDate,
        budget: 1000,
        currency: 'USD'
      });
      onDismiss();
    }
  };

  const handleSelectCountry = (country: any) => {
    setSelectedCountry(country);
    setSearchQuery(t(`countries.${country.code}`, country.name));
    setIsFocused(false);
    Keyboard.dismiss();
  };

  if (isLimitReached) {
    return <ProUpgradeModal visible={visible} onDismiss={onDismiss} />;
  }

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{  color: theme.colors.onSurface }}>{t('modals.addTrip.title', 'Plan New Trip')}</Text>
            <Pressable onPress={onDismiss} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.searchArea}>
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
                  placeholder={t('modals.addTrip.searchPlaceholder', 'Enter a country...')}
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

            </View>

            {isFocused && (
              <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => (
                    <Pressable 
                      style={({ pressed }) => [
                        styles.resultItem,
                        pressed && { backgroundColor: theme.colors.surfaceVariant }
                      ]}
                      onPress={() => handleSelectCountry(item)}
                    >
                      {FLAG_IMAGES[item.code] ? (
                        <Image source={FLAG_IMAGES[item.code]} style={{ width: 36, height: 36, marginRight: 16, borderRadius: 18 }} />
                      ) : (
                        <View style={[styles.resultIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <MaterialIcons name="location-on" size={20} color={theme.colors.onSurfaceVariant} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, }}>
                          {t(`countries.${item.code}`, item.name)}
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                          {t(`regions.${item.region}`, item.region)}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            )}

            <View style={styles.datesSection}>
              <Text variant="titleMedium" style={{ marginBottom: 12, }}>{t('modals.addTrip.tripDates', 'Trip Dates')}</Text>
              
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
                      : t('modals.addTrip.selectDateRange', 'Select Date Range')}
                  </Text>
                </Pressable>
              </View>

              <Pressable 
                 style={[styles.dateButton, { backgroundColor: 'transparent' }]}
                 onPress={() => setNotSetYet(!notSetYet)}
              >
                <MaterialIcons name={notSetYet ? 'check-circle' : 'radio-button-unchecked'} size={24} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8, color: theme.colors.onSurface }}>{t('modals.addTrip.notSetYet', 'Not Set Yet')}</Text>
              </Pressable>

                <Portal>
                  <Modal visible={showPicker} onDismiss={() => setShowPicker(false)} contentContainerStyle={{ margin: 24, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.colors.surface }}>
                    {showPicker && (
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
                    )}
                  </Modal>
                </Portal>
              </View>
            </View>

          <View style={styles.footer}>
            <Button 
              mode="contained" 
              onPress={handleCreate} 
              disabled={!selectedCountry || (!notSetYet && (!startDate || !endDate))}
              style={styles.button}
              contentStyle={{ height: 56 }}
              labelStyle={{ fontSize: 16, }}
            >
              {t('modals.addTrip.createTripButton', 'Create Trip')}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  keyboardView: {
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 24,
  },
  searchArea: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 24,
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
    height: 56,
  },
  clearIcon: {
    padding: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 64,
    left: 24,
    right: 24,
    maxHeight: 250,
    zIndex: 100,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  datesSection: {
    marginTop: 16,
    paddingBottom: 0,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 0,
  },
  datePickers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    padding: 24,
    paddingTop: 8,
  },
  button: {
    borderRadius: 28,
  },
});
