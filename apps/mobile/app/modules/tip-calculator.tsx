import Button from '../../src/components/ui/Button';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { View, Image, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Card, useTheme, SegmentedButtons, IconButton, Checkbox, Portal, Dialog } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { calculateTip } from '@triphandy/shared';
import { db } from '../../src/db/client';
import { trips, countries, expenses, exchangeRates, settings as dbSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { useTripStore } from '../../src/stores/trip-store';
import * as Crypto from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

export default function TipCalculatorScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [billAmount, setBillAmount] = useState('');
  const [tipPercentage, setTipPercentage] = useState('15');
  const [splitCount, setSplitCount] = useState(1);
  const [activeCountry, setActiveCountry] = useState<any>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [customPercentStr, setCustomPercentStr] = useState('');
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [customTipType, setCustomTipType] = useState<'percentage' | 'amount'>('percentage');
  const [customTipValue, setCustomTipValue] = useState<number | null>(null);
  const [confirmedCustomDisplay, setConfirmedCustomDisplay] = useState('');

  const { activeTrip, addExpense } = useTripStore();
  const activeCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code : null;
  
  useFocusEffect(
    React.useCallback(() => {
      async function loadCountryData() {
        try {
          let targetCountryName = activeTrip?.destinationCountry || 'United States';
          
          const countryRes = await db.select().from(countries).where(eq(countries.name, targetCountryName)).limit(1);
          if (countryRes.length > 0) {
            const country = countryRes[0];
            setActiveCountry(country);
            
            if (country.tippingType === 'none') setTipPercentage('0');
            else if (country.tippingType === 'round_up') setTipPercentage('round_up');
            else setTipPercentage('15');
          }
        } catch (error) {
          console.error('Failed to load active country data:', error);
        }
      }
      loadCountryData();
    }, [activeTrip?.destinationCountry])
  );

  let calculatedTipPercentage = 0;
  if (tipPercentage === 'custom') {
    calculatedTipPercentage = customTipValue || 0;
  } else {
    calculatedTipPercentage = tipPercentage === 'round_up' ? 0 : parseFloat(tipPercentage) || 0;
  }

  const handleCustomPercentChange = (val: string) => {
    setCustomPercentStr(val);
    const p = parseFloat(val);
    const b = parseFloat(billAmount) || 0;
    if (!isNaN(p) && b > 0) {
      setCustomAmountStr(((b * p) / 100).toFixed(2));
    } else {
      setCustomAmountStr('');
    }
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmountStr(val);
    const a = parseFloat(val);
    const b = parseFloat(billAmount) || 0;
    if (!isNaN(a) && b > 0) {
      setCustomPercentStr(((a / b) * 100).toFixed(1));
    } else {
      setCustomPercentStr('');
    }
  };

  const confirmCustomTip = () => {
    const p = parseFloat(customPercentStr);
    if (!isNaN(p)) {
      setCustomTipValue(p);
      setTipPercentage('custom');
      
      const cCode = activeCountry ? activeCountry.currencyCode : 'USD';
      const cSymbol = CURRENCY_SYMBOLS[cCode] || cCode;
      if (customTipType === 'percentage') {
        setConfirmedCustomDisplay(p + '%');
      } else {
        setConfirmedCustomDisplay(cSymbol + customAmountStr);
      }
    }
    setIsCustomModalVisible(false);
  };

  const result = calculateTip({
    billAmount: parseFloat(billAmount) || 0,
    tipPercentage: calculatedTipPercentage,
    splitCount: splitCount || 1
  });

  if (tipPercentage === 'round_up') {
    const totalWithoutTip = (parseFloat(billAmount) || 0);
    if (totalWithoutTip > 0) {
      let roundedTotal = Math.ceil(totalWithoutTip);
      const roundUpAmount = roundedTotal - totalWithoutTip;
      const tenPercent = totalWithoutTip * 0.10;
      
      if (roundUpAmount > tenPercent) {
        roundedTotal = totalWithoutTip; // No tip needed
      } else if (roundUpAmount < tenPercent) {
        roundedTotal = Math.floor(totalWithoutTip + tenPercent);
      }
      
      result.tipAmount = roundedTotal - totalWithoutTip;
      result.totalAmount = roundedTotal;
      result.perPersonAmount = result.totalAmount / (splitCount || 1);
    }
  }

  const handleSync = async () => {
    if (!activeTrip || result.totalAmount <= 0) return;
    try {
      const settingsRes = await db.select().from(dbSettings).limit(1);
      let hc = 'USD';
      if (settingsRes.length > 0) {
        hc = settingsRes[0].homeCurrency || 'USD';
        if (!settingsRes[0].homeCurrency && settingsRes[0].homeCountry) {
          const cObj = COUNTRIES.find((c: any) => c.code === settingsRes[0].homeCountry || c.name === settingsRes[0].homeCountry);
          if (cObj) hc = cObj.currencyCode;
        }
      }
      
      const localCurrency = activeCountry?.currencyCode || 'USD';
      let convertedAmt = result.totalAmount;

      if (hc !== localCurrency) {
         const ratesRes = await db.select().from(exchangeRates);
         const ratesMap: Record<string, number> = {};
         ratesRes.forEach(r => ratesMap[r.currencyCode] = r.rate);
         
         const fromRate = ratesMap[localCurrency] || 1;
         const toRate = ratesMap[hc] || 1;
         convertedAmt = (result.totalAmount / fromRate) * toRate;
      }

      await addExpense({
        tripId: activeTrip.id,
        title: t('modules.tipCalculator.expenseTitle', 'Restaurant Bill (Tip Included)'),
        category: 'food',
        localAmount: result.totalAmount,
        convertedAmount: convertedAmt,
        date: new Date()
      });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to sync to budget tracker', e);
    }
  };

  const handleReset = () => {
    setBillAmount('');
    if (activeCountry) {
      if (activeCountry.tippingType === 'none') setTipPercentage('0');
      else if (activeCountry.tippingType === 'round_up') setTipPercentage('round_up');
      else setTipPercentage('15');
    } else {
      setTipPercentage('15');
    }
    setSplitCount(1);
    setSyncSuccess(false);
    setCustomTipValue(null);
  };

  const getButtons = () => {
    const customButton = {
      value: 'custom',
      render: (isSelected: boolean) => tipPercentage === 'custom' && customTipValue !== null ? (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 10, color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }}>(Custom)</Text>
          <Text style={{ 
            color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurface,
            
            fontSize: 14
          }}>
            {confirmedCustomDisplay}
          </Text>
        </View>
      ) : (
        <Text style={{ color: isSelected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant,  fontSize: 14 }}>
          {t('modules.tipCalculator.customTip', 'Custom')}
        </Text>
      ),
      style: { flex: 1.4 }
    };

    if (!activeCountry) return [
      { value: '10', label: '10%' },
      { value: '15', label: '15%' },
      { value: '20', label: '20%' },
      customButton,
    ];
    
    if (activeCountry.tippingType === 'none') {
      return [
        { value: '5', label: '5%' },
        { value: '10', label: '10%' },
        { value: '15', label: '15%' },
        customButton,
      ];
    } else if (activeCountry.tippingType === 'round_up') {
      return [
        { 
          value: 'round_up', 
          icon: 'refresh',
          iconFamily: 'MaterialIcons',
          iconSize: 18,
          style: { flex: 1.4 } 
        },
        { value: '5', label: '5%', style: { flex: 1 } },
        { value: '10', label: '10%', style: { flex: 1 } },
        customButton,
      ];
    } else {
      return [
        { value: '10', label: '10%' },
        { value: '15', label: '15%' },
        { value: '20', label: '20%' },
        customButton,
      ];
    }
  };

  let headerText = t('modules.tipCalculator.defaultTippingText', 'Standard tipping in your destination is roughly 15-20%.');
  if (activeCountry) {
    if (activeCountry.tippingType === 'none') {
      headerText = t('modules.tipCalculator.noTippingText', 'Tipping in {{country}} is generally not required.', { country: activeCountry.name });
    } else if (activeCountry.tippingType === 'round_up') {
      headerText = t('modules.tipCalculator.roundUpTippingText', 'Standard tipping policy in {{country}} is to round up the bill.', { country: activeCountry.name });
    } else {
      headerText = t('modules.tipCalculator.standardTippingText', 'Standard tipping in {{country}} is {{standard}}.', { country: activeCountry.name, standard: activeCountry.tippingStandard || '15-20%' });
    }
  }
    
  const currencyCode = activeCountry ? activeCountry.currencyCode : 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.tipCalculator.headerTitle", "Tip Calculator")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          {headerText}
        </Text>

        <Card style={styles.card} mode="contained">
          <Card.Content>
            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
              label={t("modules.tipCalculator.billAmountLabel", "Bill Amount ({{symbol}})", { symbol: currencySymbol })}
              value={billAmount}
              onChangeText={setBillAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <Text variant="labelLarge">{t("modules.tipCalculator.tipPercentage", "Tip Amount")}</Text>
              <Pressable 
                onPress={() => setTipPercentage(tipPercentage === '0' ? (activeCountry?.tippingType === 'none' ? '5' : '15') : '0')}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>{t("modules.tipCalculator.noTip", "No Tip")}</Text>
                <View pointerEvents="none">
                  <MaterialIcons 
                    name={tipPercentage === '0' ? 'check-circle' : 'radio-button-unchecked'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
              </Pressable>
            </View>
            <View style={{ opacity: tipPercentage === '0' ? 0.5 : 1 }} pointerEvents={tipPercentage === '0' ? 'none' : 'auto'}>
              <CustomSegmentedControl
                value={tipPercentage}
                onValueChange={(val) => {
                  if (val === 'custom') {
                    const p = customTipValue !== null ? customTipValue.toString() : '10';
                    setCustomPercentStr(p);
                    const b = parseFloat(billAmount) || 0;
                    if (b > 0 && !isNaN(parseFloat(p))) {
                      setCustomAmountStr(((b * parseFloat(p)) / 100).toFixed(2));
                    } else {
                      setCustomAmountStr('');
                    }
                    setIsCustomModalVisible(true);
                  } else {
                    setTipPercentage(val);
                  }
                }}
                buttons={getButtons()}
              />
            </View>

            <Text variant="labelLarge" style={{ marginTop: 16, marginBottom: 8 }}>{t("modules.tipCalculator.splitBetween", "Split Between (people)")}</Text>
            <View style={[styles.counterContainer, { backgroundColor: '#F0F0F0' }]}>
              <IconButton 
                icon="minus" 
                mode="contained"
                containerColor={theme.colors.surface}
                onPress={() => setSplitCount(Math.max(1, splitCount - 1))} 
                disabled={splitCount <= 1}
              />
              <Text variant="headlineMedium" style={[styles.counterText, { color: theme.colors.onSurfaceVariant }]}>{splitCount}</Text>
              <IconButton 
                icon="plus" 
                mode="contained"
                containerColor={theme.colors.surface}
                onPress={() => setSplitCount(splitCount + 1)} 
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.resultCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
          <Card.Content style={styles.resultContent}>
            <View style={styles.resultRow}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.tipCalculator.suggestedTip", "Suggested Tip Amount")}</Text>
              <Text variant="titleLarge" style={{  color: theme.colors.onSurface }}>{currencySymbol}{result.tipAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.tipCalculator.totalBill", "Total Bill")}</Text>
              <Text variant="headlineSmall" style={{  color: theme.colors.primary }}>{currencySymbol}{result.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
            {splitCount > 1 && (
              <View style={[styles.resultRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.outline }]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.tipCalculator.perPerson", "Per Person")}</Text>
                <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{currencySymbol}{result.perPersonAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Button variant="alternative" onPress={handleReset}>
            {t('common.reset', 'Reset')}
          </Button>
          <Button variant="main" onPress={handleSync} disabled={syncSuccess || !billAmount || parseFloat(billAmount) === 0}>
            {syncSuccess ? t("modules.tipCalculator.synced", "Synced!") : t("modules.tipCalculator.syncToBudget", "Sync to Budget")}
          </Button>
        </View>

        {syncSuccess && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <MaterialIcons name="check-circle" size={20} color={theme.colors.primary} />
            <Text style={{ marginLeft: 6, color: theme.colors.primary, }}>{t("modules.tipCalculator.addedToExpenses", "Added to Expenses")}</Text>
          </View>
        )}
      </ScrollView>
      
      <Portal>
        <Dialog visible={isCustomModalVisible} onDismiss={() => setIsCustomModalVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title>{t("modules.tipCalculator.customTipTitle", "Custom Tip")}</Dialog.Title>
          <Dialog.Content>
            <View style={{ gap: 16 }}>
              <CustomSegmentedControl
                value={customTipType}
                onValueChange={(v) => setCustomTipType(v as 'percentage' | 'amount')}
                buttons={[
                  { value: 'percentage', label: t('modules.tipCalculator.percentageLabel', 'Percentage (%)') },
                  { value: 'amount', label: t('modules.tipCalculator.amountLabel', 'Amount ({{symbol}})', { symbol: currencySymbol }) },
                ]}
              />
              <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                value={customTipType === 'percentage' ? customPercentStr : customAmountStr}
                onChangeText={customTipType === 'percentage' ? handleCustomPercentChange : handleCustomAmountChange}
                keyboardType="numeric"
                mode="outlined"
                style={{ backgroundColor: theme.colors.surface, width: 140, alignSelf: 'center', textAlign: 'center', fontSize: 24, paddingVertical: 8 }}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, justifyContent: 'center', paddingBottom: 16 }}>
            <Button variant="alternative" style={{ width: 130 }} onPress={() => setIsCustomModalVisible(false)}>{t("modules.tipCalculator.cancel", "Cancel")}</Button>
            <Button variant="main" style={{ width: 130 }} onPress={confirmCustomTip}>{t("modules.tipCalculator.confirm", "Confirm")}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, borderBottomWidth: 1 },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', marginBottom: 24 },
  input: { backgroundColor: '#ffffff', marginBottom: 12 },
  segmented: { marginBottom: 12 },
  counterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 8, marginBottom: 8 },
  counterText: { marginHorizontal: 24, },
  resultCard: { elevation: 0 },
  resultContent: { gap: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
