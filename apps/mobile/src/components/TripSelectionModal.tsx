import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Text, useTheme, Modal, Portal, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../stores/trip-store';
import { FLAG_IMAGES } from '../lib/assets';
import { COUNTRIES } from '../lib/countries';
import i18n from '../i18n';

interface TripSelectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

const formatDateRange = (start: Date | null | undefined, end: Date | null | undefined, tbdStr: string = 'TBD') => {
  if (!start || !end) return tbdStr;
  const s = new Date(start);
  const e = new Date(end);
  const locale = i18n.language || 'en-US';
  return `${s.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} — ${e.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export default function TripSelectionModal({ visible, onDismiss, onConfirm }: TripSelectionModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const trips = useTripStore(state => state.trips);
  const removeTrip = useTripStore(state => state.removeTrip);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const activeTrips = trips.filter(t => {
    if (!t.endDate) return true;
    const e = new Date(t.endDate);
    e.setHours(0,0,0,0);
    return e >= today;
  });
  
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-select the first two active trips when modal opens
  useEffect(() => {
    if (visible && activeTrips.length > 2) {
      setSelectedTripIds(activeTrips.slice(0, 2).map(t => t.id));
    }
  }, [visible, trips]);

  const toggleSelection = (id: string) => {
    setSelectedTripIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(tid => tid !== id);
      }
      if (prev.length < 2) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const tripsToDelete = activeTrips.filter(t => !selectedTripIds.includes(t.id));
      for (const trip of tripsToDelete) {
        await removeTrip(trip.id);
      }
      onConfirm(); // Success, close everything
    } catch (error) {
      console.error('Failed to delete unselected trips', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        dismissable={false}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            {t('modals.tripSelection.title', 'Keep 2 Trips')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
            {t('modals.tripSelection.subtitle', "The Free version allows a maximum of 2 saved trips. Please select up to 2 trips you'd like to keep. Unselected trips will be deleted.")}
          </Text>

          {activeTrips.map(trip => {
            const isSelected = selectedTripIds.includes(trip.id);
            const countryInfo = COUNTRIES.find(c => c.name === trip.destinationCountry);
            const flagSource = countryInfo ? FLAG_IMAGES[countryInfo.code as keyof typeof FLAG_IMAGES] : null;
            
            return (
              <Pressable
                key={trip.id}
                style={[
                  styles.tripItem,
                  { 
                    backgroundColor: theme.colors.surface,
                    borderColor: isSelected ? '#8A61FF' : theme.colors.outlineVariant,
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
                onPress={() => toggleSelection(trip.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                  {flagSource ? (
                    <Image source={flagSource as any} style={styles.flagIcon} />
                  ) : (
                    <View style={[styles.flagIcon, { backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
                      <MaterialIcons name="public" size={20} color={theme.colors.onSurfaceVariant} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                      {countryInfo ? t(`countries.${countryInfo.code}`, trip.destinationCountry) : trip.destinationCountry}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {formatDateRange(trip.startDate as any, trip.endDate as any, t('general.tbd', 'TBD'))}
                    </Text>
                  </View>
                  <MaterialIcons 
                    name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                    size={24} 
                    color={isSelected ? '#8A61FF' : theme.colors.onSurfaceVariant} 
                  />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            onPress={onDismiss}
            disabled={isProcessing}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: '#8A61FF',
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
              },
              pressed && !isProcessing && { opacity: 0.8, backgroundColor: 'rgba(138, 97, 255, 0.1)' },
              isProcessing && { opacity: 0.5 }
            ]}
          >
            <Text style={{ color: '#8A61FF', fontSize: 14, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {t('general.cancel', 'Cancel')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={isProcessing}
            style={({ pressed }) => [
              {
                flex: 1,
                marginLeft: 12,
                backgroundColor: isProcessing ? theme.colors.surfaceVariant : '#8A61FF',
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
              },
              pressed && !isProcessing && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: isProcessing ? theme.colors.onSurfaceDisabled : '#FFFFFF', fontSize: 14, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {isProcessing 
                ? t('general.processing', 'Processing...') 
                : (selectedTripIds.length === 0 
                  ? t('modals.tripSelection.continueBtn', 'Continue') 
                  : t('modals.tripSelection.keepSelected', 'Keep'))}
            </Text>
          </Pressable>
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
    maxHeight: '85%',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tripItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  flagIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  }
});
