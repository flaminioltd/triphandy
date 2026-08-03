import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Text, useTheme, Modal, Portal, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FINANCE_MODULES, ESSENTIALS_MODULES } from '../lib/modules';
import { useTripStore } from '../stores/trip-store';
import TripSelectionModal from './TripSelectionModal';
import { useAppStore } from '../stores/app-store';
import Qonversion from 'react-native-qonversion';

interface ProUpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
  isEligibleForTrial?: boolean;
}

export default function ProUpgradeModal({ visible, onDismiss, isEligibleForTrial = true }: ProUpgradeModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const trips = useTripStore(state => state.trips);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const activeTrips = trips.filter(t => {
    if (!t.endDate) return true;
    const e = new Date(t.endDate);
    e.setHours(0,0,0,0);
    return e >= today;
  });
  
  const [tripSelectionVisible, setTripSelectionVisible] = React.useState(false);

  const handleUpgrade = async () => {
    try {
      const products = await Qonversion.getSharedInstance().products();
      const productId = isEligibleForTrial ? 'triphandy_yearly_499_promo' : 'triphandy_yearly_799';
      
      const product = products.get(productId);
      if (!product) {
        console.error('Product not found in Qonversion:', productId);
        return;
      }
      
      const entitlements = await Qonversion.getSharedInstance().purchaseProduct(product);
      const premium = entitlements.get('premium_access');
      
      if (premium && premium.isActive) {
        useAppStore.getState().updateSettings({ isPremium: true });
        onDismiss();
      }
    } catch (e) {
      console.error('Purchase failed:', e);
    }
  };

  const handleRestore = async () => {
    try {
      const entitlements = await Qonversion.getSharedInstance().restore();
      const premium = entitlements.get('premium_access');
      if (premium && premium.isActive) {
        useAppStore.getState().updateSettings({ isPremium: true });
        onDismiss();
      }
    } catch (e) {
      console.error('Restore failed:', e);
    }
  };

  const allModules = [...FINANCE_MODULES, ...ESSENTIALS_MODULES];

  const freeFeatures = [
    { ...allModules.find(m => m.id === 'tipCalculator'), title: t('homeScreen.modules.tipCalculator.title', 'Tip Calculator') },
    { ...allModules.find(m => m.id === 'sizeConverter'), title: t('homeScreen.modules.sizeConverter.title', 'Sizes & Units') },
    { ...allModules.find(m => m.id === 'localInfo'), title: t('homeScreen.modules.localInfo.title', 'Local Info') },
    { ...allModules.find(m => m.id === 'basicPhrases'), title: t('modals.premium.features.basicPhrasesLite', 'Basic Phrases Lite') },
    { title: t('modals.premium.features.max2Trips', 'Max 2 Trips'), fallbackIcon: 'flight', color: theme.colors.onSurfaceVariant, backgroundColor: '#EFEFEF' },
  ];

  const premiumFeatures = [
    { ...allModules.find(m => m.id === 'vatRefund'), title: t('homeScreen.modules.vatRefund.title', 'VAT Refund Calculator') },
    { ...allModules.find(m => m.id === 'budgetTracker'), title: t('homeScreen.modules.budgetTracker.title', 'Budget Tracker') },
    { ...allModules.find(m => m.id === 'atmExchange'), title: t('homeScreen.modules.atmExchange.title', 'ATM & Exchange Impact') },
    { ...allModules.find(m => m.id === 'timezoneHelper'), title: t('homeScreen.modules.timezoneHelper.title', 'Time Zones Helper') },
    { ...allModules.find(m => m.id === 'basicPhrases'), title: t('modals.premium.features.fullBasicPhrases', 'Full Basic Phrases') },
    { title: t('modals.premium.features.unlimitedTrips', 'Unlimited Trips'), fallbackIcon: 'flight-takeoff', color: '#8A61FF', backgroundColor: 'rgba(138, 97, 255, 0.1)' },
  ];

  const renderFeature = (feat: any, isPremiumSide: boolean) => {
    const iconColor = isPremiumSide ? '#8A61FF' : theme.colors.onSurfaceVariant;
    return (
      <View style={styles.featureItem}>
        <View style={{ width: 20, alignItems: 'center', justifyContent: 'center' }}>
          {feat.CustomIcon ? (
            <feat.CustomIcon size={18} color={iconColor} />
          ) : (
            <MaterialIcons name={feat.fallbackIcon as any} size={18} color={iconColor} />
          )}
        </View>
        <Text variant="bodySmall" style={{ marginLeft: 8, color: isPremiumSide ? theme.colors.onSurface : theme.colors.onSurfaceVariant, flexShrink: 1, fontWeight: isPremiumSide ? '500' : 'normal' }}>
          {feat.title}
        </Text>
      </View>
    );
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
            {t('modals.premium.title', 'triphandy Pro')}
          </Text>
          <Pressable onPress={onDismiss} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.featuresBox}>
            <View style={styles.column}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Image source={require('../../assets/icon-free.png')} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurfaceVariant }}>
                  {t('modals.premium.freeTier', 'Free')}
                </Text>
              </View>
              {freeFeatures.map((feat, idx) => (
                <View key={`free-${idx}`}>
                  {renderFeature(feat, false)}
                </View>
              ))}
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
            
            <View style={styles.column}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                <Image source={require('../../assets/icon-pro.png')} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#8A61FF' }}>
                  {t('modals.premium.premiumTier', 'Pro')}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, textAlign: 'center', marginBottom: 12, marginTop: -14 }}>
                {t('modals.premium.allFreeModulesPlus', 'Everything in free, plus:')}
              </Text>
              {premiumFeatures.map((feat, idx) => (
                <View key={`prem-${idx}`}>
                  {renderFeature(feat, true)}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footerBox}>
            <Text variant="titleMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginBottom: 2, textDecorationLine: 'line-through' }}>
              $7.99/year
            </Text>
            <Text variant="titleMedium" style={{ textAlign: 'center', color: theme.colors.onSurface, marginBottom: isEligibleForTrial ? 4 : 16, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
              {t('modals.premium.promoText', 'Special Launch Sale: ')}
              <Text style={{ color: '#8A61FF', fontWeight: '900' }}>{t('modals.premium.promoPrice', '$4.99/year')}</Text>
            </Text>
            {isEligibleForTrial && (
              <Text variant="labelSmall" style={{ textAlign: 'center', color: '#8A61FF', marginBottom: 16, fontWeight: 'bold' }}>
                {t('modals.premium.trialSublabel', '7-day free trial')}
              </Text>
            )}
            
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleUpgrade}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#8A61FF',
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                  {isEligibleForTrial 
                    ? t('modals.premium.startTrialBtn', 'Start Your Free Trial')
                    : t('modals.premium.upgradeBtn', 'Upgrade to Premium')}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => {
                  if (activeTrips.length > 2) {
                    setTripSelectionVisible(true);
                  } else {
                    onDismiss();
                  }
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#8A61FF',
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 8,
                  },
                  pressed && { opacity: 0.8, backgroundColor: 'rgba(138, 97, 255, 0.1)' }
                ]}
              >
                <Text style={{ color: '#8A61FF', fontSize: 14, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                  {t('modals.premium.continueFree', 'Continue with Free')}
                </Text>
              </Pressable>

              <Pressable onPress={handleRestore} style={{ marginTop: 8 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, textAlign: 'center', textDecorationLine: 'underline' }}>
                  {t('modals.premium.restorePurchases', 'Restore Purchases')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Render TripSelectionModal for handling 2-trip downgrade limit */}
      <TripSelectionModal
        visible={tripSelectionVisible}
        onDismiss={() => setTripSelectionVisible(false)} // User hit cancel, go back to Premium modal
        onConfirm={() => {
          setTripSelectionVisible(false);
          onDismiss(); // Complete the flow by closing the main modal
        }}
      />
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
  featuresBox: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    paddingHorizontal: 8,
  },
  columnHeader: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerBox: {
    marginTop: 0,
  }
});
