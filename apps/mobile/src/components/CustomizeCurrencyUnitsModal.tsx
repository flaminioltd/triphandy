import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Text, useTheme, TextInput as PaperInput, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../stores/app-store';
import { useTranslation } from 'react-i18next';
import CustomSegmentedControl from './ui/CustomSegmentedControl';
import { CURRENCIES, getCurrencySymbol } from '../lib/currency';

interface CustomizeCurrencyUnitsModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function CustomizeCurrencyUnitsModal({ visible, onDismiss }: CustomizeCurrencyUnitsModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for the segmented control to ensure smooth UI updates
  const [localSizeFormat, setLocalSizeFormat] = useState<'metric' | 'imperial'>('metric');

  useEffect(() => {
    if (visible && settings) {
      setSearchQuery('');
      setLocalSizeFormat((settings.sizeFormat as 'metric' | 'imperial') || 'metric');
    }
  }, [visible, settings]);

  const filteredCurrencies = useMemo(() => {
    const list = searchQuery 
      ? CURRENCIES.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      : CURRENCIES;
    return list;
  }, [searchQuery]);

  const handleSelectCurrency = async (currencyCode: string) => {
    Keyboard.dismiss();
    await updateSettings({ homeCurrency: currencyCode });
    onDismiss();
  };

  const handleFormatChange = async (format: string) => {
    setLocalSizeFormat(format as 'metric' | 'imperial');
    await updateSettings({ sizeFormat: format });
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
            <Text variant="headlineSmall" style={{ flex: 1,  color: theme.colors.onSurface }}>
              {t("settingsScreen.customizeCurrencyUnitsTitle", "Customize Currency & Units")}
            </Text>
            <Pressable onPress={onDismiss} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.formatSection}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface,  marginBottom: 12 }}>
                {t("settingsScreen.measurementSystem", "Measurement System")}
              </Text>
              <CustomSegmentedControl
                value={localSizeFormat}
                onValueChange={handleFormatChange}
                buttons={[
                  { value: 'metric', label: t('welcomeScreen.metricSystem', 'Metric System') },
                  { value: 'imperial', label: t('welcomeScreen.imperialSystem', 'Imperial System') }
                ]}
              />
            </View>

            <View style={styles.searchArea}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface,  marginBottom: 12 }}>
                {t("settingsScreen.homeCurrency", "Origin Currency")}
              </Text>
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
                  placeholder={t("settingsScreen.searchCurrencyPlaceholder", "Enter a currency...")}
                  style={styles.input}
                  underlineStyle={{ display: 'none' }}
                  textColor={theme.colors.onSurface}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} style={styles.clearIcon}>
                    <MaterialIcons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>

              <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <FlatList
                  data={filteredCurrencies}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => {
                    const isSelected = settings?.homeCurrency === item;
                    return (
                      <Pressable 
                        style={({ pressed }) => [
                          styles.resultItem,
                          pressed && { backgroundColor: theme.colors.surfaceVariant },
                          isSelected && { backgroundColor: theme.colors.secondaryContainer }
                        ]}
                        onPress={() => handleSelectCurrency(item)}
                      >
                        <View style={[styles.resultIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text variant="titleMedium" style={{ color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant, }}>
                            {getCurrencySymbol(item)}
                          </Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text variant="bodyLarge" style={{ color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface, }}>
                            {item}
                          </Text>
                          {isSelected && (
                            <MaterialIcons name="check" size={20} color={theme.colors.onSecondaryContainer} />
                          )}
                        </View>
                      </Pressable>
                    );
                  }}
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
    height: '80%',
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
  formatSection: {
    marginBottom: 24,
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
