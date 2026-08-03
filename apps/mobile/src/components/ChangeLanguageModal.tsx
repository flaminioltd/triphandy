import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, useTheme, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../stores/app-store';

import { useTranslation } from 'react-i18next';

interface ChangeLanguageModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
];

export default function ChangeLanguageModal({ visible, onDismiss }: ChangeLanguageModalProps) {
  const theme = useTheme();
  const { updateSettings, settings } = useAppStore();
  const { t, i18n } = useTranslation();

  const handleSelectLanguage = async (code: string) => {
    await updateSettings({ systemLanguage: code });
    i18n.changeLanguage(code);
    onDismiss();
  };

  const currentLanguage = LANGUAGES.find(l => l.code === (settings?.systemLanguage || i18n.language.split('-')[0])) || LANGUAGES[0];

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{  color: theme.colors.onSurface }}>{t("settingsScreen.changeSystemLanguageTitle", "System Language")}</Text>
          <Pressable onPress={onDismiss} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={[styles.content, { paddingBottom: 0 }]}>
          <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, marginBottom: 24 }]}>
            <ScrollView nestedScrollEnabled={true}>
              {LANGUAGES.map((item, index) => {
                const isSelected = currentLanguage.code === item.code;
                return (
                  <Pressable 
                    key={item.code}
                    style={({ pressed }) => [
                      styles.resultItem,
                      index === LANGUAGES.length - 1 && { borderBottomWidth: 0 },
                      pressed && { backgroundColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => handleSelectLanguage(item.code)}
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
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '60%',
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
    paddingBottom: 24,
  },
  dropdown: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexShrink: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});
