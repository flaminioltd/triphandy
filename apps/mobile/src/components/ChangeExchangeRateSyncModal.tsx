import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, useTheme, Modal, Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../stores/app-store';
import { useTranslation } from 'react-i18next';

interface ChangeExchangeRateSyncModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ChangeExchangeRateSyncModal({ visible, onDismiss }: ChangeExchangeRateSyncModalProps) {
  const theme = useTheme();
  const { updateSettings, settings } = useAppStore();
  const { t } = useTranslation();

  const handleSelectPreference = async (preference: 'wifi_only' | 'cellular' | 'manual') => {
    await updateSettings({ exchangeRateSyncPreference: preference });
    onDismiss();
  };

  const currentPreference = settings?.exchangeRateSyncPreference || 'wifi_only';

  const OPTIONS = [
    { id: 'wifi_only', title: t("settingsScreen.syncWifiOnly", "Sync only when WiFi connected") },
    { id: 'cellular', title: t("settingsScreen.syncCellular", "Sync with mobile data") },
    { id: 'manual', title: t("settingsScreen.syncManual", "Sync only on manual trigger") },
  ] as const;

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{  color: theme.colors.onSurface }}>{t("settingsScreen.exchangeRateSyncTitle", "Exchange Rate Sync")}</Text>
          <Pressable onPress={onDismiss} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={[styles.content, { paddingBottom: 0 }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            {t("settingsScreen.exchangeRateSyncSubtitle", "The app runs daily exchange rate updates by default, which will be overridden by your choice of connection availability.")}
          </Text>

          <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, marginBottom: 24 }]}>
            <ScrollView nestedScrollEnabled={true}>
              {OPTIONS.map((item, index) => {
                const isSelected = currentPreference === item.id;
                return (
                  <Pressable 
                    key={item.id}
                    style={({ pressed }) => [
                      styles.resultItem,
                      index === OPTIONS.length - 1 && { borderBottomWidth: 0 },
                      pressed && { backgroundColor: theme.colors.surfaceVariant }
                    ]}
                    onPress={() => handleSelectPreference(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: isSelected ? theme.colors.primary : theme.colors.onSurface, fontWeight: isSelected ? 'bold' : '500' }}>
                        {item.title}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="radio-button-checked" size={24} color={theme.colors.primary} />
                    )}
                    {!isSelected && (
                      <MaterialIcons name="radio-button-unchecked" size={24} color={theme.colors.onSurfaceVariant} />
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
    maxHeight: '80%',
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
