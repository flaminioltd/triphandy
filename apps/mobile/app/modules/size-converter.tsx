import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';;
import { Text, useTheme, Card, ActivityIndicator } from 'react-native-paper';
import { tokens } from '../../src/theme/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import { useTripStore } from '../../src/stores/trip-store';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../src/stores/app-store';
import { sizeGuideService, SizeGuidePackage } from '../../src/services/sizeGuideService';
import { getCountryCodeByName, getSizeRegion, getMeasurementSystem, usesLetterSizes } from '../../src/lib/countryMappers';
import { kmToMiles, milesToKm, kgToLbs, lbsToKg, celsiusToFahrenheit, fahrenheitToCelsius, litersToGallons, gallonsToLiters, kmhToMph, mphToKmh } from '../../src/lib/conversions';
import { COUNTRIES } from '../../src/lib/countries';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';

type TabType = 'shoes' | 'clothes' | 'units';

// Generic Slider for Math Units (Distance, Weight, Temp, etc.)
const MathSlider = ({ title, homeLabel, destLabel, min, max, step, convertHomeToDest, convertDestToHome, theme }: any) => {
  const [homeStr, setHomeStr] = useState('');
  const [destStr, setDestStr] = useState('');
  const [sliderVal, setSliderVal] = useState(0);
  
  useEffect(() => {
    const mid = Math.round((min + max) / 2);
    setSliderVal(mid);
    setHomeStr(String(mid));
    setDestStr(convertHomeToDest(mid).toFixed(1));
  }, [min, max, convertHomeToDest]);

  const handleHomeChange = (text: string) => {
    setHomeStr(text);
    const num = parseFloat(text);
    if (!isNaN(num)) {
      setSliderVal(num);
      setDestStr(convertHomeToDest(num).toFixed(1));
    }
  };

  const handleDestChange = (text: string) => {
    setDestStr(text);
    const num = parseFloat(text);
    if (!isNaN(num)) {
      const homeNum = convertDestToHome(num);
      setSliderVal(homeNum);
      setHomeStr(homeNum.toFixed(1));
    }
  };

  const handleSliderChange = (v: number) => {
    setSliderVal(v);
    setHomeStr(String(Math.round(v * 10) / 10)); // keep it clean
    setDestStr(convertHomeToDest(v).toFixed(1));
  };

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 16 }}>{title}</Text>
        <View style={styles.ioContainer}>
          <View style={styles.ioBox}>
            <Text variant="labelMedium" style={styles.ioLabel}>{homeLabel}</Text>
            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
              value={homeStr}
              onChangeText={handleHomeChange}
              keyboardType="numeric"
              style={[styles.input, { color: tokens.colors.ui.textPrimary, borderBottomColor: tokens.colors.ui.warmBorder }]}
            />
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={theme.colors.onSurfaceVariant} style={{ marginTop: 16 }} />
          <View style={styles.ioBox}>
            <Text variant="labelMedium" style={styles.ioLabel}>{destLabel}</Text>
            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
              value={destStr}
              onChangeText={handleDestChange}
              keyboardType="numeric"
              style={[styles.input, { color: tokens.colors.ui.primaryPurple, borderBottomColor: tokens.colors.ui.warmBorder }]}
            />
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={sliderVal}
          onValueChange={handleSliderChange}
          minimumTrackTintColor={tokens.colors.ui.primaryPurple}
          maximumTrackTintColor={tokens.colors.ui.warmBorder}
          thumbTintColor={tokens.colors.ui.primaryPurple}
        />
      </Card.Content>
    </Card>
  );
};

// Generic Slider for Array Lookups (Shoes, Clothes)
const ArraySlider = ({ title, homeLabel, destLabel, homeArray, destArray, min, max, step, isLetters, theme }: any) => {
  const [homeStr, setHomeStr] = useState('');
  const [destStr, setDestStr] = useState('');
  const [sliderVal, setSliderVal] = useState(0);

  const destIsNumeric = destArray.length > 0 && !isNaN(parseFloat(destArray[0]));

  const getDestForHomeNum = (num: number) => {
    if (isLetters) {
      const idx = Math.min(Math.max(Math.round(num), 0), homeArray.length - 1);
      return String(destArray[idx] || '-');
    } else {
      let closestIdx = 0;
      let minDiff = Infinity;
      homeArray.forEach((val: any, idx: number) => {
        const diff = Math.abs(Number(val) - num);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      return String(destArray[closestIdx] || '-');
    }
  };

  const getHomeForDestStr = (text: string) => {
    if (isLetters && !destIsNumeric) {
      const idx = destArray.findIndex((v: any) => String(v).toLowerCase() === text.toLowerCase());
      if (idx !== -1) return { num: idx, text: String(homeArray[idx]) };
      return null;
    } else {
      const num = parseFloat(text);
      if (!isNaN(num)) {
        let closestIdx = 0;
        let minDiff = Infinity;
        destArray.forEach((val: any, idx: number) => {
          const diff = Math.abs(Number(val) - num);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });
        if (isLetters) {
          return { num: closestIdx, text: String(homeArray[closestIdx]) };
        } else {
          return { num: Number(homeArray[closestIdx]), text: String(homeArray[closestIdx]) };
        }
      }
      return null;
    }
  };

  const getHomeForHomeStr = (text: string) => {
    if (isLetters) {
      const idx = homeArray.findIndex((v: any) => String(v).toLowerCase() === text.toLowerCase());
      if (idx !== -1) return { num: idx, text: String(homeArray[idx]) };
      return null;
    } else {
      const num = parseFloat(text);
      if (!isNaN(num)) return { num, text };
      return null;
    }
  };

  useEffect(() => {
    const newMiddle = (min + max) / 2;
    const newInitial = isLetters ? Math.floor(newMiddle) : (Math.round(newMiddle / step) * step);
    setSliderVal(newInitial);
    
    const hText = isLetters ? String(homeArray[newInitial]) : String(newInitial);
    setHomeStr(hText);
    setDestStr(getDestForHomeNum(newInitial));
  }, [min, max, step, isLetters, homeArray, destArray]);

  const handleHomeChange = (text: string) => {
    setHomeStr(text);
    const parsed = getHomeForHomeStr(text);
    if (parsed !== null) {
      setSliderVal(parsed.num);
      setDestStr(getDestForHomeNum(parsed.num));
    }
  };

  const handleDestChange = (text: string) => {
    setDestStr(text);
    const parsed = getHomeForDestStr(text);
    if (parsed !== null) {
      setSliderVal(parsed.num);
      setHomeStr(parsed.text);
    }
  };

  const handleSliderChange = (v: number) => {
    setSliderVal(v);
    setHomeStr(isLetters ? String(homeArray[Math.round(v)]) : String(v));
    setDestStr(getDestForHomeNum(v));
  };

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 16 }}>{title}</Text>
        <View style={styles.ioContainer}>
          <View style={styles.ioBox}>
            <Text variant="labelMedium" style={styles.ioLabel}>{homeLabel}</Text>
            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
              value={homeStr}
              onChangeText={handleHomeChange}
              keyboardType={isLetters ? "default" : "numeric"}
              style={[styles.input, { color: tokens.colors.ui.textPrimary, borderBottomColor: tokens.colors.ui.warmBorder }]}
            />
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={theme.colors.onSurfaceVariant} style={{ marginTop: 16 }} />
          <View style={styles.ioBox}>
            <Text variant="labelMedium" style={styles.ioLabel}>{destLabel}</Text>
            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
              value={destStr}
              onChangeText={handleDestChange}
              keyboardType={destIsNumeric ? "numeric" : "default"}
              style={[styles.input, { color: tokens.colors.ui.primaryPurple, borderBottomColor: tokens.colors.ui.warmBorder }]}
            />
          </View>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={sliderVal}
          onValueChange={handleSliderChange}
          minimumTrackTintColor={tokens.colors.ui.primaryPurple}
          maximumTrackTintColor={tokens.colors.ui.warmBorder}
          thumbTintColor={tokens.colors.ui.primaryPurple}
        />
      </Card.Content>
    </Card>
  );
};


export default function SizeConverterScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  
  const { activeTrip } = useTripStore();
  const { settings } = useAppStore();

  const [packageData, setPackageData] = useState<SizeGuidePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [personType, setPersonType] = useState<'mens' | 'womens' | 'kids'>('mens');

  const homeCode = settings?.homeCountry;
  const destCode = activeTrip ? getCountryCodeByName(activeTrip.destinationCountry) : null;

  const homeCountryName = homeCode ? t(`countries.${homeCode}`, COUNTRIES.find((c: any) => c.code === homeCode)?.name) : 'Origin';
  const destCountryName = destCode ? t(`countries.${destCode}`, activeTrip?.destinationCountry) : (activeTrip?.destinationCountry || 'Destination');

  const homeSizeRegion = homeCode ? getSizeRegion(homeCode) : 'US';
  const destSizeRegion = destCode ? getSizeRegion(destCode) : 'US';
  
  const homeUnits = getMeasurementSystem(homeCode || 'XX');
  const destUnits = getMeasurementSystem(destCode || 'XX');

  const homeUsesLetters = usesLetterSizes(homeSizeRegion);

  const sizesDiffer = homeSizeRegion !== destSizeRegion;
  const unitsDiffer = 
    homeUnits.distance !== destUnits.distance ||
    homeUnits.temperature !== destUnits.temperature ||
    homeUnits.weight !== destUnits.weight ||
    homeUnits.volume !== destUnits.volume ||
    homeUnits.speed !== destUnits.speed;

  useEffect(() => {
    async function loadData() {
      try {
        await sizeGuideService.seedPlaceholderDataIfEmpty();
        const data = await sizeGuideService.getSizeGuides();
        setPackageData(data);
        
        if (!activeTab) setActiveTab('shoes');
      } catch (e) {
        console.error("Failed to load size guides", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ModuleHeader title={t("modules.sizeConverter.headerTitle", "Sizes & Units")} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const availableTabs = [
    { value: 'shoes', label: t('modules.sizeConverter.tabShoes', 'Shoes'), icon: 'shoe-sneaker' },
    { value: 'clothes', label: t('modules.sizeConverter.tabClothes', 'Clothes'), icon: 'tshirt-crew' },
    { value: 'units', label: t('modules.sizeConverter.tabUnits', 'Units'), icon: 'ruler' }
  ];

  const renderShoesTab = () => {
    if (!packageData) return null;
    const shoeData = packageData.shoes[personType as keyof typeof packageData.shoes];
    if (!shoeData) return null;

    const homeSizes = shoeData[homeSizeRegion.toLowerCase() as keyof typeof shoeData] || shoeData['eu'];
    const destSizes = shoeData[destSizeRegion.toLowerCase() as keyof typeof shoeData] || shoeData['eu'];

    const shoesMatch = JSON.stringify(homeSizes) === JSON.stringify(destSizes);

    if (shoesMatch) {
      return (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            {t("modules.sizeConverter.matchTitleShoes", "Shoe sizes match!")}
          </Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            {t("modules.sizeConverter.shoeSizesMatchDesc", "{{home}} and {{dest}} use the exact same shoe sizes.", { home: homeCountryName, dest: destCountryName })}
          </Text>
        </View>
      );
    }

    const shoeMin = Math.min(...(homeSizes as number[]));
    const shoeMax = Math.max(...(homeSizes as number[]));

    return (
      <View>
        <CustomSegmentedControl
          value={personType}
          onValueChange={(val) => setPersonType(val as any)}
          buttons={[
            { value: 'mens', label: t('modules.sizeConverter.mens', 'Mens') },
            { value: 'womens', label: t('modules.sizeConverter.womens', 'Womens') },
            { value: 'kids', label: t('modules.sizeConverter.kids', 'Kids') }
          ]}
          style={{ marginBottom: 24 }}
        />
        <ArraySlider
          title={t("modules.sizeConverter.shoesType", "{{personType}} Shoes", { personType: t(`modules.sizeConverter.${personType}`) })}
          homeLabel={homeCountryName}
          destLabel={destCountryName}
          homeArray={homeSizes}
          destArray={destSizes}
          min={shoeMin}
          max={shoeMax}
          step={0.5}
          isLetters={false}
          theme={theme}
        />
      </View>
    );
  };

  const renderClothesTab = () => {
    if (!packageData) return null;
    
    const topsData = packageData.tops[personType as 'mens' | 'womens'];
    const bottomsData = packageData.bottoms[personType as 'mens' | 'womens'];
    if (!topsData || !bottomsData) return null;

    // Use labels if the home country uses letters (e.g. US/UK). Otherwise use numeric arrays.
    const homeTops = homeUsesLetters ? topsData.label : (topsData[homeSizeRegion.toLowerCase() as keyof typeof topsData] || topsData['eu']);
    const destTops = destSizeRegion === 'US' || destSizeRegion === 'UK' ? topsData.label : (topsData[destSizeRegion.toLowerCase() as keyof typeof topsData] || topsData['eu']);

    const homeBottoms = homeUsesLetters ? bottomsData.label : (bottomsData[homeSizeRegion.toLowerCase() as keyof typeof bottomsData] || bottomsData['eu']);
    const destBottoms = destSizeRegion === 'US' || destSizeRegion === 'UK' ? bottomsData.label : (bottomsData[destSizeRegion.toLowerCase() as keyof typeof bottomsData] || bottomsData['eu']);

    const clothesMatch = JSON.stringify(homeTops) === JSON.stringify(destTops) && JSON.stringify(homeBottoms) === JSON.stringify(destBottoms);

    if (clothesMatch) {
      return (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            {t("modules.sizeConverter.matchTitleClothes", "Clothing sizes match!")}
          </Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            {t("modules.sizeConverter.clothingSizesMatchDesc", "{{home}} and {{dest}} use the exact same clothing sizes.", { home: homeCountryName, dest: destCountryName })}
          </Text>
        </View>
      );
    }

    const topsMin = homeUsesLetters ? 0 : Math.min(...(homeTops as number[]));
    const topsMax = homeUsesLetters ? homeTops.length - 1 : Math.max(...(homeTops as number[]));

    const bottomsMin = homeUsesLetters ? 0 : Math.min(...(homeBottoms as number[]));
    const bottomsMax = homeUsesLetters ? homeBottoms.length - 1 : Math.max(...(homeBottoms as number[]));

    return (
      <View>
        <CustomSegmentedControl
          value={personType}
          onValueChange={(val) => setPersonType(val as any)}
          buttons={[
            { value: 'mens', label: t('modules.sizeConverter.mens', 'Mens') },
            { value: 'womens', label: t('modules.sizeConverter.womens', 'Womens') }
          ]}
          style={{ marginBottom: 24 }}
        />
        <ArraySlider
          title={t("modules.sizeConverter.shirtsTops", "{{personType}} Shirts / Tops", { personType: t(`modules.sizeConverter.${personType}`) })}
          homeLabel={homeCountryName}
          destLabel={destCountryName}
          homeArray={homeTops}
          destArray={destTops}
          min={topsMin}
          max={topsMax}
          step={homeUsesLetters ? 1 : 2}
          isLetters={homeUsesLetters}
          theme={theme}
        />
        <ArraySlider
          title={t("modules.sizeConverter.pantsBottoms", "{{personType}} Pants / Bottoms", { personType: t(`modules.sizeConverter.${personType}`) })}
          homeLabel={homeCountryName}
          destLabel={destCountryName}
          homeArray={homeBottoms}
          destArray={destBottoms}
          min={bottomsMin}
          max={bottomsMax}
          step={homeUsesLetters ? 1 : 2}
          isLetters={homeUsesLetters}
          theme={theme}
        />
      </View>
    );
  };

  const renderUnitsTab = () => {
    if (!unitsDiffer) {
      return (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="check-circle-outline" size={64} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
            {t("modules.sizeConverter.matchTitleUnits", "Units match!")}
          </Text>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            {t("modules.sizeConverter.unitsMatchDesc", "{{home}} and {{dest}} use the exact same measurement systems.", { home: homeCountryName, dest: destCountryName })}
          </Text>
        </View>
      );
    }
    
    return (
      <View>
        <Text variant="bodyLarge" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
          {t("modules.sizeConverter.unitsDifferDesc", "Here are the measurements that differ between {{home}} and {{dest}}. Use the sliders to convert.", { home: homeCountryName, dest: destCountryName })}
        </Text>
        
        {homeUnits.distance !== destUnits.distance && (
          <MathSlider
            title={t("modules.sizeConverter.distance", "Distance")}
            homeLabel={homeUnits.distance === 'metric' ? 'km' : 'mi'}
            destLabel={destUnits.distance === 'metric' ? 'km' : 'mi'}
            min={0}
            max={500}
            step={1}
            convertHomeToDest={homeUnits.distance === 'metric' ? kmToMiles : milesToKm}
            convertDestToHome={homeUnits.distance === 'metric' ? milesToKm : kmToMiles}
            theme={theme}
          />
        )}

        {homeUnits.temperature !== destUnits.temperature && (
          <MathSlider
            title={t("modules.sizeConverter.temperature", "Temperature")}
            homeLabel={homeUnits.temperature === 'metric' ? '°C' : '°F'}
            destLabel={destUnits.temperature === 'metric' ? '°C' : '°F'}
            min={homeUnits.temperature === 'metric' ? -20 : 0}
            max={homeUnits.temperature === 'metric' ? 50 : 122}
            step={1}
            convertHomeToDest={homeUnits.temperature === 'metric' ? celsiusToFahrenheit : fahrenheitToCelsius}
            convertDestToHome={homeUnits.temperature === 'metric' ? fahrenheitToCelsius : celsiusToFahrenheit}
            theme={theme}
          />
        )}

        {homeUnits.weight !== destUnits.weight && (
          <MathSlider
            title={t("modules.sizeConverter.weight", "Weight (Luggage)")}
            homeLabel={homeUnits.weight === 'metric' ? 'kg' : 'lbs'}
            destLabel={destUnits.weight === 'metric' ? 'kg' : 'lbs'}
            min={0}
            max={100}
            step={1}
            convertHomeToDest={homeUnits.weight === 'metric' ? kgToLbs : lbsToKg}
            convertDestToHome={homeUnits.weight === 'metric' ? lbsToKg : kgToLbs}
            theme={theme}
          />
        )}

        {homeUnits.volume !== destUnits.volume && (
          <MathSlider
            title={t("modules.sizeConverter.volume", "Volume (Liquids/Gas)")}
            homeLabel={homeUnits.volume === 'metric' ? 'L' : 'gal'}
            destLabel={destUnits.volume === 'metric' ? 'L' : 'gal'}
            min={0}
            max={100}
            step={1}
            convertHomeToDest={homeUnits.volume === 'metric' ? litersToGallons : gallonsToLiters}
            convertDestToHome={homeUnits.volume === 'metric' ? gallonsToLiters : litersToGallons}
            theme={theme}
          />
        )}
        
        {homeUnits.speed !== destUnits.speed && (
          <MathSlider
            title={t("modules.sizeConverter.speed", "Speed")}
            homeLabel={homeUnits.speed === 'metric' ? 'km/h' : 'mph'}
            destLabel={destUnits.speed === 'metric' ? 'km/h' : 'mph'}
            min={0}
            max={200}
            step={1}
            convertHomeToDest={homeUnits.speed === 'metric' ? kmhToMph : mphToKmh}
            convertDestToHome={homeUnits.speed === 'metric' ? mphToKmh : kmhToMph}
            theme={theme}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.sizeConverter.headerTitle", "Sizes & Units")} />

      <View style={{ width: '100%', position: 'relative', marginTop: 16 }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: tokens.colors.ui.warmBorder, zIndex: 0 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16 }}>
          {availableTabs.map((tab) => {
            const isSelected = activeTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => {
                  setActiveTab(tab.value as TabType);
                  if (tab.value === 'clothes' && personType === 'kids') {
                    setPersonType('mens');
                  }
                }}
                style={[
                  { 
                    paddingHorizontal: 16, 
                    paddingVertical: 10, 
                    borderTopLeftRadius: 8, 
                    borderTopRightRadius: 8,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: tokens.colors.ui.warmBorder,
                    backgroundColor: '#F0F0F0',
                    zIndex: 1
                  },
                  isSelected && { 
                    backgroundColor: tokens.colors.ui.appBackground, 
                    borderBottomColor: tokens.colors.ui.appBackground,
                    zIndex: 2
                  }
                ]}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: isSelected ? '600' : '500', 
                  color: isSelected ? tokens.colors.ui.primaryPurple : tokens.colors.ui.textSecondary 
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'shoes' && renderShoesTab()}
        {activeTab === 'clothes' && renderClothesTab()}
        {activeTab === 'units' && renderUnitsTab()}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { padding: 16, paddingBottom: 40 },
  emptyTitle: {  marginTop: 24, marginBottom: 8, textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 24 },
  tabsWrapper: { marginBottom: 24, flexGrow: 0 },
  segmented: { minWidth: '100%' },
  card: { backgroundColor: '#FFFFFF', marginBottom: 16, borderColor: '#E5DED7' },
  ioContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ioBox: { flex: 1, alignItems: 'center' },
  ioLabel: { marginBottom: 4, opacity: 0.7 },
  ioValue: { },
  input: { fontSize: 24,  textAlign: 'center', borderBottomWidth: 2, minWidth: 60, padding: 0 },
  slider: { width: '75%', alignSelf: 'center', height: 40, marginTop: 24, transform: [{ scale: 1.3 }] },
});


