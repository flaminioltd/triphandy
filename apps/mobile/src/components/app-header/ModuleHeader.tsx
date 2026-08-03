import React, { useState } from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Menu, Divider } from 'react-native-paper';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTripStore } from '../../stores/trip-store';
import { COUNTRIES } from '../../lib/countries';
import { FLAG_IMAGES } from '../../lib/assets';
import { FINANCE_MODULES, ESSENTIALS_MODULES } from '../../lib/modules';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/app-store';
import ProUpgradeModal from '../ProUpgradeModal';
import ProIcon from '../ProIcon';
const formatDateRange = (start: Date | null | undefined, end: Date | null | undefined, locale: string = 'en-US', tbdStr: string = 'TBD') => {
  if (!start || !end) return tbdStr;
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

interface Props {
  title: string;
}

export default function ModuleHeader({ title }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { trips, activeTrip, setActiveTrip } = useTripStore();
  const { settings } = useAppStore();
  
  const activeCountryCode = activeTrip 
    ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code 
    : null;

  const [navMenuVisible, setNavMenuVisible] = useState(false);
  const [tripMenuVisible, setTripMenuVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const today = new Date();
  today.setHours(0,0,0,0);

  const isPastTrip = (t: any) => {
    if (!t.endDate) return false;
    const e = new Date(t.endDate);
    e.setHours(0,0,0,0);
    return e < today;
  };

  const upcomingTrips = trips.filter(t => !isPastTrip(t)).sort((a, b) => {
    if (!a.startDate && !b.startDate) return 0;
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const handleNav = (route: string) => {
    setNavMenuVisible(false);
    setTimeout(() => {
      router.navigate(route as any);
    }, 0);
  };

  const pathname = usePathname();
  const allModules = [...FINANCE_MODULES, ...ESSENTIALS_MODULES];
  const currentModule = allModules.find(m => (pathname && (pathname.includes(m.route) || pathname.includes(m.route.split('/').pop()))) || m.title === title || t(`homeScreen.modules.${m.id}.title`, m.title) === title);
  

  return (
    <View>
      <View style={{ height: 8, width: '100%', backgroundColor: currentModule ? currentModule.backgroundColor : theme.colors.primary }} />
      <View style={[styles.header, { borderBottomColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => {
          const parent = navigation.getParent();
          if (parent && parent.canGoBack()) {
            parent.goBack();
          } else {
            router.navigate('/(main)');
          }
        }} />
        <Text variant="titleLarge" style={{  color: theme.colors.onSurface }}>{currentModule ? t(`homeScreen.modules.${currentModule.id}.title`, title) : title}</Text>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Menu
          visible={tripMenuVisible}
          onDismiss={() => setTripMenuVisible(false)}
          contentStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginTop: 4,
            minWidth: 250,
          }}
          anchor={
            <Pressable onPress={() => setTripMenuVisible(true)}>
              {activeCountryCode && FLAG_IMAGES[activeCountryCode] && (
                <Image source={FLAG_IMAGES[activeCountryCode]} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 4, borderWidth: 1, borderColor: theme.colors.outlineVariant }} />
              )}
            </Pressable>
          }
        >
          {upcomingTrips.length === 0 && <Menu.Item title={t('components.moduleHeader.noUpcomingTrips', 'No upcoming trips')} disabled />}
          
          {upcomingTrips.length > 0 && upcomingTrips.map(trip => {
            const countryCode = COUNTRIES.find(c => c.name === trip.destinationCountry)?.code;
            return (
              <Pressable
                key={trip.id}
                onPress={() => {
                  setActiveTrip(trip.id);
                  setTripMenuVisible(false);
                }}
                style={({ pressed }) => [
                  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
                  pressed && { backgroundColor: theme.colors.surfaceVariant }
                ]}
              >
                <View style={[styles.flagPlaceholder, { marginRight: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant }]}>
                  {countryCode && FLAG_IMAGES[countryCode] ? (
                    <Image source={FLAG_IMAGES[countryCode]} style={{ width: 24, height: 24, borderRadius: 12 }} />
                  ) : (
                    <Text style={styles.flagText}>{'🌍'}</Text>
                  )}
                </View>
                <View style={{ flex: 1, justifyContent: 'center', paddingRight: 8 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: trip.id === activeTrip?.id ? 'bold' : 'normal' }}>
                    {countryCode ? t(`countries.${countryCode}`, trip.destinationCountry) : (trip.destinationCountry || t('components.moduleHeader.unknownTrip', 'Unknown Trip'))}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatDateRange(trip.startDate, trip.endDate, i18n.language, t('tripsScreen.tbd', 'TBD'))}
                  </Text>
                </View>
                {trip.id === activeTrip?.id && (
                  <MaterialIcons name="check" size={24} color={theme.colors.primary} />
                )}
              </Pressable>
            );
          })}
        </Menu>
        
        <Menu
          visible={navMenuVisible}
          onDismiss={() => setNavMenuVisible(false)}
          contentStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginTop: 4,
          }}
          anchor={
            <Pressable onPress={() => setNavMenuVisible(true)} style={styles.moreButton}>
              <MaterialIcons name="menu" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          }
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 4 }}>
            <Text style={styles.menuSectionHeader}>{t('categories.Finance', 'Finance')}</Text>
            <IconButton icon="close" size={20} onPress={() => setNavMenuVisible(false)} style={{ margin: 0 }} />
          </View>
          {FINANCE_MODULES.map(mod => {
            const isLocked = mod.isPremium && !settings?.isPremium;
            return (
              <Menu.Item 
                key={mod.title}
                onPress={() => {
                  if (isLocked) {
                    setNavMenuVisible(false);
                    setPremiumModalVisible(true);
                  } else {
                    handleNav(mod.route);
                  }
                }} 
                title={
                  <Text>
                    {t(`homeScreen.modules.${mod.id}.title`, mod.title)}
                    {isLocked && <Text> <ProIcon size={16} /></Text>}
                  </Text>
                }
                leadingIcon={({ size }) => (
                  <View style={{ backgroundColor: mod.backgroundColor, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    {mod.CustomIcon ? <mod.CustomIcon size={18} color="#FFFFFF" /> : <MaterialIcons name={mod.fallbackIcon} size={18} color="#FFFFFF" />}
                  </View>
                )} 
              />
            );
          })}
          <Divider />
          <Text style={styles.menuSectionHeader}>{t('categories.Essentials', 'Essentials')}</Text>
          {ESSENTIALS_MODULES.map(mod => {
            const isLocked = mod.isPremium && !settings?.isPremium;
            return (
              <Menu.Item 
                key={mod.title}
                onPress={() => {
                  if (isLocked) {
                    setNavMenuVisible(false);
                    setPremiumModalVisible(true);
                  } else {
                    handleNav(mod.route);
                  }
                }} 
                title={
                  <Text>
                    {t(`homeScreen.modules.${mod.id}.title`, mod.title)}
                    {isLocked && <Text> <ProIcon size={16} /></Text>}
                  </Text>
                }
                leadingIcon={({ size }) => (
                  <View style={{ backgroundColor: mod.backgroundColor, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    {mod.CustomIcon ? <mod.CustomIcon size={18} color="#FFFFFF" /> : <MaterialIcons name={mod.fallbackIcon} size={18} color="#FFFFFF" />}
                  </View>
                )} 
              />
            );
          })}
        </Menu>

        <ProUpgradeModal 
          visible={premiumModalVisible} 
          onDismiss={() => setPremiumModalVisible(false)} 
        />
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingRight: 8, 
    borderBottomWidth: 1 
  },
  moreButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 12,
    color: '#888'
  },
  flagPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  flagText: {
    fontSize: 16,
  }
});
