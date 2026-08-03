import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { useTripStore } from '../../src/stores/trip-store';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, useTheme, Card, Menu, IconButton, Switch, ThemeProvider } from 'react-native-paper';
import { TimePicker, en, registerTranslation } from 'react-native-paper-dates';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { settingsRepo } from '../../src/repositories/settings-repository';
import { useTranslation } from 'react-i18next';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';

registerTranslation('en', en);

export default function TimezoneHelperScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { activeTrip } = useTripStore();
  
  const [homeCountryCode, setHomeCountryCode] = useState('US');
  const [is24hMode, setIs24hMode] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  
  useEffect(() => {
    settingsRepo.getSettings().then(s => {
      if (s?.homeCountry) {
        setHomeCountryCode(s.homeCountry);
        const hc = COUNTRIES.find(c => c.code === s.homeCountry);
        if (hc?.timezones?.length) {
          setSelectedHomeTz(hc.timezones[0].name);
          setSelectedHomeCity(hc.timezones[0].city);
          
          const initTime = getTzTime(hc.timezones[0].name);
          setSliderHours(initTime.getHours());
          setSliderMinutes(initTime.getMinutes());
        }
      }
    });
  }, []);

  const destCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code || 'FR' : 'FR';
  
  const homeCountry = COUNTRIES.find(c => c.code === homeCountryCode) || COUNTRIES[0];
  const destCountry = COUNTRIES.find(c => c.code === destCountryCode) || COUNTRIES[6];

  const [selectedHomeTz, setSelectedHomeTz] = useState(homeCountry.timezones?.[0]?.name || 'America/New_York');
  const [selectedHomeCity, setSelectedHomeCity] = useState(homeCountry.timezones?.[0]?.city || 'New York');
  
  const [selectedDestTz, setSelectedDestTz] = useState(destCountry.timezones?.[0]?.name || 'Europe/Paris');
  const [selectedDestCity, setSelectedDestCity] = useState(destCountry.timezones?.[0]?.city || 'Paris');

  useEffect(() => {
    if (destCountry?.timezones?.length) {
      setSelectedDestTz(destCountry.timezones[0].name);
      setSelectedDestCity(destCountry.timezones[0].city);
    }
  }, [destCountry.code]);

  const getTzTime = (tz: string, baseDate = new Date()) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      }).formatToParts(baseDate);

      const obj: any = {};
      parts.forEach(p => obj[p.type] = parseInt(p.value, 10));
      return new Date(obj.year, obj.month - 1, obj.day, obj.hour === 24 ? 0 : obj.hour, obj.minute, obj.second || 0);
    } catch (e) {
      return baseDate;
    }
  };

  const [sliderHours, setSliderHours] = useState(() => getTzTime(homeCountry.timezones?.[0]?.name || 'America/New_York').getHours());
  const [sliderMinutes, setSliderMinutes] = useState(() => getTzTime(homeCountry.timezones?.[0]?.name || 'America/New_York').getMinutes());
  
  const [clockFocused, setClockFocused] = useState<'hours' | 'minutes'>('hours');

  const [homeMenuVisible, setHomeMenuVisible] = useState(false);
  const [destMenuVisible, setDestMenuVisible] = useState(false);

  const getTimeDiff = (tz1: string, tz2: string) => {
    const now = new Date();
    const d1 = getTzTime(tz1, now);
    const d2 = getTzTime(tz2, now);
    return d2.getTime() - d1.getTime();
  };

  const getTimes = () => {
    const baseDate = new Date(2024, 5, 15);
    const targetTime = new Date(baseDate.getTime() + (sliderHours * 60 + sliderMinutes) * 60000);
    
    const sourceTz = isReversed ? selectedDestTz : selectedHomeTz;
    const targetTz = isReversed ? selectedHomeTz : selectedDestTz;

    const diffMs = getTimeDiff(sourceTz, targetTz);
    const calculatedTime = new Date(targetTime.getTime() + diffMs);
    
    let dayOffset = 0;
    if (calculatedTime.getTime() > targetTime.getTime()) {
        if (calculatedTime.getDate() > targetTime.getDate()) dayOffset = 1;
    } else if (calculatedTime.getTime() < targetTime.getTime()) {
        if (calculatedTime.getDate() < targetTime.getDate()) dayOffset = -1;
    }

    const dayOffsetStr = dayOffset > 0 ? t('modules.timezoneHelper.plus1Day', '+1 Day') : dayOffset < 0 ? t('modules.timezoneHelper.minus1Day', '-1 Day') : t('modules.timezoneHelper.sameDay', 'Same Day');

    if (isReversed) {
       return { homeTime: calculatedTime, destTime: targetTime, dayOffsetStr };
    }
    return { homeTime: targetTime, destTime: calculatedTime, dayOffsetStr };
  };

  const { homeTime, destTime, dayOffsetStr } = getTimes();

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    
    if (is24hMode) {
      return `${hours.toString().padStart(2, '0')}:${mins}`;
    }
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${mins} ${ampm}`;
  };

  const renderBox = (type: 'home' | 'dest', isSource: boolean) => {
    const isHome = type === 'home';
    const country = isHome ? homeCountry : destCountry;
    const city = isHome ? selectedHomeCity : selectedDestCity;
    const time = isHome ? homeTime : destTime;
    const setMenuVisible = isHome ? setHomeMenuVisible : setDestMenuVisible;
    const menuVisible = isHome ? homeMenuVisible : destMenuVisible;
    const timezones = isHome ? homeCountry.timezones : destCountry.timezones;
    
    const title = isHome ? `${t("modules.timezoneHelper.origin", "Origin").toUpperCase()} (${country.code})` : t("modules.timezoneHelper.localLabel", "LOCAL ({{code}})", { code: country.code });

    return (
      <View style={styles.timeBox} key={type}>
        <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 4 }}>{title}</Text>
        
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginTop: 4,
          }}
          anchor={
            <TouchableOpacity 
              onPress={() => timezones && timezones.length > 1 && setMenuVisible(true)} 
              style={[
                styles.citySelector,
                {
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 4, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  backgroundColor: theme.colors.surface, 
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.outlineVariant,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                  marginBottom: 8,
                }
              ]}
            >
              <Text style={{ fontSize: 14,  color: theme.colors.onSurface }} numberOfLines={1}>{city}</Text>
              {timezones && timezones.length > 1 && (
                <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
          }
        >
          {timezones?.map(tz => (
            <Menu.Item 
              key={tz.name}
              onPress={() => {
                if (isHome) {
                  setSelectedHomeTz(tz.name);
                  setSelectedHomeCity(tz.city);
                } else {
                  setSelectedDestTz(tz.name);
                  setSelectedDestCity(tz.city);
                }
                setMenuVisible(false);
              }}
              title={tz.city} 
            />
          ))}
        </Menu>
        
        <Text variant="headlineSmall" style={{  color: theme.colors.onSurface, marginVertical: 8 }}>
          {formatTime(time)}
        </Text>
        
        <Text variant="labelMedium" style={{ color: theme.colors.primary, marginTop: -4, opacity: (!isSource && dayOffsetStr !== 'Same Day') ? 1 : 0 }}>
           {(!isSource && dayOffsetStr !== 'Same Day') ? dayOffsetStr : 'Placeholder'}
        </Text>
      </View>
    );
  };

  const boxes = [
    renderBox('home', !isReversed),
    renderBox('dest', isReversed)
  ];
  
  if (isReversed) {
    boxes.reverse();
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.timezoneHelper.headerTitle", "Time Zones")} />

      <ScrollView contentContainerStyle={styles.content}>
        
        <Card style={[styles.heroCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="contained">
          <Card.Content style={styles.heroContent}>
            
            {boxes[0]}
            
            <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
              <View style={[styles.verticalDivider, { backgroundColor: theme.colors.outlineVariant, position: 'absolute' }]} />
              <IconButton 
                icon="swap-horizontal" 
                mode="contained-tonal"
                containerColor={theme.colors.primaryContainer}
                size={22}
                style={{ borderWidth: 1, borderColor: theme.colors.outlineVariant }}
                onPress={() => {
                  const newSourceTime = isReversed ? homeTime : destTime;
                  setSliderHours(newSourceTime.getHours());
                  setSliderMinutes(newSourceTime.getMinutes());
                  setIsReversed(!isReversed);
                }}
              />
            </View>
            
            {boxes[1]}

          </Card.Content>
        </Card>

        <View style={styles.controlsRow}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, }}>{t("modules.timezoneHelper.timeSetting", "Time Setting")}</Text>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, marginRight: 8, color: !is24hMode ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: !is24hMode ? 'bold' : 'normal' }}>{t("modules.timezoneHelper.ampm", "AM/PM")}</Text>
            <Switch 
              value={is24hMode} 
              onValueChange={setIs24hMode} 
              color={theme.colors.primary}
            />
            <Text style={{ fontSize: 14, marginLeft: 8, color: is24hMode ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: is24hMode ? 'bold' : 'normal' }}>{t("modules.timezoneHelper.h24", "24h")}</Text>
          </View>
        </View>
        
        <View style={{ alignSelf: 'center', marginVertical: 8, paddingVertical: 4 }}>
          <ThemeProvider theme={{ 
            ...theme, 
            colors: { ...theme.colors, surfaceVariant: '#EFE7DC' },
            fonts: {
              ...theme.fonts,
              titleMedium: {
                ...theme.fonts.titleMedium,
                fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
              },
              displayLarge: {
                ...theme.fonts.displayLarge,
                fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
              }
            }
          }}>
            <TimePicker 
              hours={sliderHours}
              minutes={sliderMinutes}
              focused={clockFocused}
              inputType="picker"
              onFocusInput={(type) => setClockFocused(type)}
              onChange={({ hours, minutes }) => {
                setSliderHours(hours);
                setSliderMinutes(minutes);
              }}
              use24HourClock={is24hMode}
            />
          </ThemeProvider>
        </View>

        <Button mode="outlined" onPress={() => {
            const sourceTz = isReversed ? selectedDestTz : selectedHomeTz;
            const sourceTimeNow = getTzTime(sourceTz);
            setSliderHours(sourceTimeNow.getHours());
            setSliderMinutes(sourceTimeNow.getMinutes());
        }} style={styles.resetBtn}>{t("modules.timezoneHelper.resetCurrentTime", "Reset to Current Time")}</Button>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 16 },
  heroCard: { elevation: 0, marginBottom: 16, borderRadius: 24, minHeight: 130 },
  heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, flex: 1 },
  timeBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  citySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  verticalDivider: { width: 1, height: '100%' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, marginTop: 0 },
  resetBtn: { alignSelf: 'center', marginTop: 8 }
});
