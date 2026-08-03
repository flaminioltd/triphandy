import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from 'react-native';
import { Text, useTheme, TextInput as PaperInput, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { FLAG_IMAGES } from '../lib/assets';
import { db } from '../db/client';
import { countries } from '../db/schema';
import { useAppStore } from '../stores/app-store';
import { useTranslation } from 'react-i18next';

interface ChangeHomeCountryModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ChangeHomeCountryModal({ visible, onDismiss }: ChangeHomeCountryModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { updateSettings } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allCountries, setAllCountries] = useState<any[]>([]);

  useEffect(() => {
    db.select().from(countries).then(res => setAllCountries(res));
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
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
  }, [searchQuery, allCountries, t]);

  const handleSelectCountry = async (country: any) => {
    Keyboard.dismiss();
    await updateSettings({ homeCountry: country.code, homeCurrency: country.currencyCode });
    onDismiss();
  };

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
            <Text variant="headlineSmall" style={{ flex: 1,  color: theme.colors.onSurface }}>{t("settingsScreen.changeHomeCountryTitle", "Change Home Country")}</Text>
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
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1
                }
              ]}>
                <MaterialIcons name="search" size={24} color={theme.colors.primary} style={styles.searchIcon} />
                <PaperInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t("modals.addTrip.searchPlaceholder", "Enter a country...")}
                  style={styles.input}
                  underlineStyle={{ display: 'none' }}
                  textColor={theme.colors.onSurface}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                    <MaterialIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>

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
            </View>
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
    height: '75%',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchArea: {
    position: 'relative',
    zIndex: 10,
    marginBottom: 24,
    flex: 1,
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
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});
