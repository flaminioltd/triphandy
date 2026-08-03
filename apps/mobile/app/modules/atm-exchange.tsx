import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { useTripStore } from '../../src/stores/trip-store';
import { View, Image, StyleSheet, ScrollView, Pressable, TextInput as NativeTextInput } from 'react-native';;
import { Text, TextInput, Card, useTheme, IconButton, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { compareAtmAndExchange } from '@triphandy/shared';
import { db } from '../../src/db/client';
import { exchangeRates, settings as dbSettings, countries } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

export default function AtmExchangeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { activeTrip } = useTripStore();
  
  const activeCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code : null;
  const activeCountryData = COUNTRIES.find((c: any) => c.name === activeTrip?.destinationCountry);
  
  const [homeCurrencyCode, setHomeCurrencyCode] = useState('USD');
  const [localCurrencyCode, setLocalCurrencyCode] = useState(activeCountryData?.currencyCode || 'EUR');
  const [midMarketRate, setMidMarketRate] = useState('1.10');

  // Base State
  const [baseAmount, setBaseAmount] = useState('0');
  const [baseCurrencyType, setBaseCurrencyType] = useState('local');

  // ATM State
  const [atmLocalFeeLocal, setAtmLocalFeeLocal] = useState('0');
  const [atmHomeBankFxFeePercentage, setAtmHomeBankFxFeePercentage] = useState('0');
  const [atmHomeBankFlatFeeHome, setAtmHomeBankFlatFeeHome] = useState('0');

  // Exchange Bureau State
  const [exchangeBureauRate, setExchangeBureauRate] = useState('1.10');
  const [exchangeBureauFee, setExchangeBureauFee] = useState('0');
  const [exchangeBureauFeeCurrency, setExchangeBureauFeeCurrency] = useState('local');
  const [rateDirection, setRateDirection] = useState<'homeToLocal' | 'localToHome'>('homeToLocal');

  const handleSwapRateDirection = () => {
    setRateDirection(prev => prev === 'homeToLocal' ? 'localToHome' : 'homeToLocal');
    const mid = parseFloat(midMarketRate);
    if (mid > 0) setMidMarketRate((1 / mid).toFixed(4));
    
    const bureau = parseFloat(exchangeBureauRate);
    if (bureau > 0) setExchangeBureauRate((1 / bureau).toFixed(4));
  };

  useFocusEffect(
    React.useCallback(() => {
      async function loadRatesAndCurrencies() {
        try {
          const settingsRes = await db.select().from(dbSettings).limit(1);
          let hc = 'USD';
          if (settingsRes.length > 0) {
            hc = settingsRes[0].homeCurrency || 'USD';
            if (!settingsRes[0].homeCurrency && settingsRes[0].homeCountry) {
              // Try by code or name
              let cObj = await db.select().from(countries).where(eq(countries.code, settingsRes[0].homeCountry)).limit(1);
              if (cObj.length === 0) {
                cObj = await db.select().from(countries).where(eq(countries.name, settingsRes[0].homeCountry)).limit(1);
              }
              if (cObj.length > 0) {
                hc = cObj[0].currencyCode;
              }
            }
          }
          setHomeCurrencyCode(hc);

          let lc = 'EUR';
          if (activeTrip?.destinationCountry) {
            const destCountryRes = await db.select().from(countries).where(eq(countries.name, activeTrip.destinationCountry)).limit(1);
            if (destCountryRes.length > 0) {
              lc = destCountryRes[0].currencyCode;
            }
          }
          setLocalCurrencyCode(lc);

          if (hc !== lc) {
            const ratesRes = await db.select().from(exchangeRates);
            const ratesMap: Record<string, number> = {};
            ratesRes.forEach((r: any) => ratesMap[r.currencyCode] = r.rate);
            
            // USD is base. 1 USD = fromRate LC, 1 USD = toRate HC.
            const rateLc = ratesMap[lc] || 1;
            const rateHc = ratesMap[hc] || 1;
            
            // We need 1 Home = X Local => Rate = rateLc / rateHc
            const currentMidRate = rateLc / rateHc;
            setRateDirection('homeToLocal');
            const formattedMid = currentMidRate.toFixed(4);
            setMidMarketRate(formattedMid);
            setExchangeBureauRate(formattedMid);
          } else {
            setMidMarketRate('1.0000');
            setExchangeBureauRate('1.0000');
          }
        } catch (error) {
          console.error('Failed to load currency data:', error);
        }
      }
      loadRatesAndCurrencies();
    }, [activeTrip?.destinationCountry])
  );

  const handleReset = () => {
    setBaseAmount('0');
    setBaseCurrencyType('local');
    setAtmLocalFeeLocal('0');
    setAtmHomeBankFxFeePercentage('0');
    setAtmHomeBankFlatFeeHome('0');
    setRateDirection('homeToLocal');
    setExchangeBureauRate(midMarketRate);
    setExchangeBureauFee('0');
    setExchangeBureauFeeCurrency('local');
  };

  const homeSymbol = CURRENCY_SYMBOLS[homeCurrencyCode] || homeCurrencyCode;
  const localSymbol = CURRENCY_SYMBOLS[localCurrencyCode] || localCurrencyCode;

  const leftCurrency = rateDirection === 'homeToLocal' ? homeSymbol : localSymbol;
  const rightCurrency = rateDirection === 'homeToLocal' ? localSymbol : homeSymbol;

  const actualMidMarketRate = rateDirection === 'homeToLocal' 
    ? parseFloat(midMarketRate) || 0 
    : (parseFloat(midMarketRate) > 0 ? 1 / parseFloat(midMarketRate) : 0);

  const actualBureauRate = rateDirection === 'homeToLocal' 
    ? parseFloat(exchangeBureauRate) || 0 
    : (parseFloat(exchangeBureauRate) > 0 ? 1 / parseFloat(exchangeBureauRate) : 0);

  const result = compareAtmAndExchange({
    baseAmount: parseFloat(baseAmount) || 0,
    baseCurrencyType: baseCurrencyType as 'home' | 'local',
    midMarketRate: actualMidMarketRate,
    atmLocalFeeLocal: parseFloat(atmLocalFeeLocal) || 0,
    atmHomeBankFxFeePercentage: parseFloat(atmHomeBankFxFeePercentage) || 0,
    atmHomeBankFlatFeeHome: parseFloat(atmHomeBankFlatFeeHome) || 0,
    exchangeBureauRate: actualBureauRate,
    exchangeBureauFee: parseFloat(exchangeBureauFee) || 0,
    exchangeBureauFeeCurrency: exchangeBureauFeeCurrency as 'home' | 'local' | 'percentage',
  });

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.atmExchange.headerTitle", "ATM & Exchange")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          {t('modules.atmExchange.description', 'Compare ATM withdrawals against local Exchange Bureaus.')}
        </Text>

        {/* Base Configuration */}
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="labelLarge" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>{t("modules.atmExchange.targetAmount", "Target Amount")}</Text>
            <CustomSegmentedControl
              value={baseCurrencyType}
              onValueChange={setBaseCurrencyType}
              buttons={[
                { value: 'home', label: `${t('modules.atmExchange.home', 'Origin')} (${homeSymbol})` },
                { value: 'local', label: `${t('modules.atmExchange.local', 'Destination')} (${localSymbol})` },
              ]}
              style={{ marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.amount', 'Amount')} ({baseCurrencyType === 'home' ? homeSymbol : localSymbol})</Text>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
                  value={baseAmount} 
                  onChangeText={setBaseAmount} 
                  keyboardType="numeric" 
                  mode="outlined" 
                  style={[styles.input, { height: 48, marginBottom: 4 }]} 
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.marketRate', 'Market Rate')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.outline, paddingLeft: 12, paddingRight: 4, backgroundColor: theme.colors.surfaceVariant, marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, opacity: 0.5 }}>1 {leftCurrency} = </Text>
                  <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>{midMarketRate}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, opacity: 0.5 }}> {rightCurrency}</Text>
                  <View style={{ flex: 1 }} />
                  <IconButton icon="swap-vertical" size={20} onPress={handleSwapRateDirection} style={{ margin: 0 }} />
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Option A: ATM */}
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, }}>{t('modules.atmExchange.optionA', 'Option A: ATM Withdrawal')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.localFee', 'Local Fee')}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
                  value={atmLocalFeeLocal} 
                  onChangeText={setAtmLocalFeeLocal} 
                  keyboardType="numeric" 
                  mode="outlined" 
                  style={[styles.input, { height: 48, marginBottom: 4 }]} 
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>{t('modules.atmExchange.in', 'in')} {localSymbol}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.bankFlatFee', 'Bank Flat Fee')}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
                  value={atmHomeBankFlatFeeHome} 
                  onChangeText={setAtmHomeBankFlatFeeHome} 
                  keyboardType="numeric" 
                  mode="outlined" 
                  style={[styles.input, { height: 48, marginBottom: 4 }]} 
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}>{t('modules.atmExchange.in', 'in')} {homeSymbol}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.bankFxFee', 'Bank FX %')}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
                  value={atmHomeBankFxFeePercentage} 
                  onChangeText={setAtmHomeBankFxFeePercentage} 
                  keyboardType="numeric" 
                  mode="outlined" 
                  style={[styles.input, { height: 48, marginBottom: 4 }]} 
                />
                <Text variant="bodySmall" style={{ fontSize: 10 }}> </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Option B: Exchange Bureau */}
        <Card style={styles.card} mode="contained">
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12 }}>{t('modules.atmExchange.optionB', 'Option B: Cash Exchange')}</Text>
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1.2, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.bureauRate', 'Bureau Rate')}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.outline, paddingLeft: 12, paddingRight: 4, backgroundColor: theme.colors.surface, marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, opacity: 0.5 }}>1 {leftCurrency} = </Text>
                  <NativeTextInput 
                    value={exchangeBureauRate}
                    onChangeText={setExchangeBureauRate}
                    keyboardType="numeric"
                    style={{ color: theme.colors.onSurface, fontSize: 14, padding: 0, margin: 0, minWidth: 20 }}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, opacity: 0.5 }}> {rightCurrency}</Text>
                  <View style={{ flex: 1 }} />
                  <IconButton icon="swap-vertical" size={20} onPress={handleSwapRateDirection} style={{ margin: 0 }} />
                </View>
              </View>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 }}>{t('modules.atmExchange.bureauFee', 'Bureau Fee')}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }} 
                  value={exchangeBureauFee} 
                  onChangeText={setExchangeBureauFee} 
                  keyboardType="numeric" 
                  mode="outlined" 
                  style={[styles.input, { height: 48, marginBottom: 8 }]} 
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1.2 }}>
                <Slider
                  style={{ width: '100%', height: 32 }}
                  minimumValue={(parseFloat(midMarketRate) || 1) * 0.7}
                  maximumValue={parseFloat(midMarketRate) || 1}
                  step={Math.max(0.0001, (parseFloat(midMarketRate) || 1) * 0.001)}
                  value={parseFloat(exchangeBureauRate) || parseFloat(midMarketRate) || 1}
                  onValueChange={(val) => setExchangeBureauRate(val.toFixed(4))}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                  thumbTintColor={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomSegmentedControl
                  value={exchangeBureauFeeCurrency}
                  onValueChange={setExchangeBureauFeeCurrency}
                  buttons={[
                    { value: 'home', label: homeSymbol, style: { flex: 1, paddingVertical: 2, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                    { value: 'local', label: localSymbol, style: { flex: 1, paddingVertical: 2, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                    { value: 'percentage', label: '%', style: { flex: 1, paddingVertical: 2, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                  ]}
                />
              </View>
            </View>

          </Card.Content>
        </Card>

        {/* Results */}
        <Card style={[styles.resultCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
          <Card.Content style={styles.resultContent}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
              {/* ATM Column */}
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, }}>{t('modules.atmExchange.atm', 'ATM')}</Text>
                
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.atmExchange.cost', 'Cost')}</Text>
                <Text variant="bodyMedium" style={{  marginBottom: 2 }}>{homeSymbol}{result.atmHomeCost.toFixed(2)}</Text>
                
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6, marginBottom: 8 }}>
                  {t('modules.atmExchange.effectiveRate', 'Effective Rate:')} {result.atmEffectiveRate.toFixed(4)}
                </Text>
                
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.atmExchange.receive', 'Receive')}</Text>
                <Text variant="titleMedium" style={{  color: theme.colors.primary }}>{localSymbol}{result.atmLocalReceived.toFixed(2)}</Text>
              </View>

              <View style={{ width: 1, backgroundColor: theme.colors.outlineVariant || theme.colors.outline }} />

              {/* Bureau Column */}
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, }}>{t('modules.atmExchange.exchangeBureau', 'Exchange Bureau')}</Text>
                
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.atmExchange.cost', 'Cost')}</Text>
                <Text variant="bodyMedium" style={{  marginBottom: 2 }}>{homeSymbol}{result.bureauHomeCost.toFixed(2)}</Text>
                
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6, marginBottom: 8 }}>
                  {t('modules.atmExchange.effectiveRate', 'Effective Rate:')} {result.bureauEffectiveRate.toFixed(4)}
                </Text>
                
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.atmExchange.receive', 'Receive')}</Text>
                <Text variant="titleMedium" style={{  color: theme.colors.primary }}>{localSymbol}{result.bureauLocalReceived.toFixed(2)}</Text>
              </View>
            </View>

            <Divider style={styles.divider} />
            
            <View style={styles.recommendationContainer}>
              <Text variant="titleMedium" style={{ color: theme.colors.primary, textAlign: 'center', }}>
                {t('modules.atmExchange.recommendation', 'Recommendation:')} {t(`modules.atmExchange.recommendation${result.recommendation}`, result.recommendation)}
              </Text>
              {result.recommendation !== t('modules.atmExchange.recommendationEqual', 'Equal') && (
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, textAlign: 'center', marginTop: 4 }}>
                  {baseCurrencyType === 'local' 
                    ? `${t('modules.atmExchange.savesYou', 'Saves you ')}${homeSymbol}${result.differenceHome.toFixed(2)}`
                    : `${t('modules.atmExchange.givesYou', 'Gives you ')}${localSymbol}${result.differenceLocal.toFixed(2)}${t('modules.atmExchange.more', ' more')}`}
                </Text>
              )}
            </View>
            
          </Card.Content>
        </Card>
        <View style={{ marginTop: 32, marginBottom: 40, paddingHorizontal: 16, alignItems: 'center' }}>
          <Button variant="alternative" onPress={handleReset} style={{ width: 160, paddingHorizontal: 8 }}>
            {t('common.reset', 'Reset')}
          </Button>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, borderBottomWidth: 1 },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', marginBottom: 24 },
  input: { backgroundColor: '#ffffff', marginBottom: 12 },
  divider: { marginVertical: 12 },
  resultCard: { elevation: 0 },
  resultContent: { gap: 8 },
  resultSection: { marginVertical: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recommendationContainer: { marginVertical: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8 }
});
