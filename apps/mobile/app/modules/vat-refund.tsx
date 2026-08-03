import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../src/components/ui/Button';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { View, Image, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Card, useTheme, IconButton, Portal, Dialog } from 'react-native-paper';
import { Svg, G, Path } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTripStore } from '../../src/stores/trip-store';
import { db } from '../../src/db/client';
import { countries, vatPurchases, expenses, exchangeRates, settings as dbSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

const CATEGORIES = [
  { value: 'clothes', icon: 'tshirt-crew', label: 'Clothes' },
  { value: 'electronics', icon: 'cellphone', label: 'Electronics' },
  { value: 'jewelry', icon: 'ring', label: 'Jewelry' },
  { value: 'accessories', icon: 'glasses', label: 'Accessories' },
  { value: 'gifts', icon: 'gift', label: 'Gifts' },
  { value: 'other', icon: 'dots-horizontal', label: 'Other' },
];

const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent - Math.PI / 2);
  const y = Math.sin(2 * Math.PI * percent - Math.PI / 2);
  return [x, y];
};

const getCategoryColor = (category: string, theme: any) => {
  switch (category) {
    case 'clothes': return '#dcb2c2';
    case 'electronics': return '#94BBC9';
    case 'jewelry': return '#acc4e2';
    case 'accessories': return '#E2C2B8';
    case 'gifts': return '#d1bbe6';
    case 'other': return '#DAC7A7';
    case 'refund': return '#A4DAC4';
    default: return theme.colors.outline;
  }
};

export default function VatRefundScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { activeTrip, addExpense } = useTripStore();
  const activeCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code : null;
  
  const [activeCountry, setActiveCountry] = useState<any>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  
  const [rates, setRates] = useState<Record<string, number>>({});
  const [homeCurrencyState, setHomeCurrencyState] = useState('USD');
  
  // VAT and Admin fee states
  const [vatRate, setVatRate] = useState('0');
  const [isEditingVatRate, setIsEditingVatRate] = useState(false);
  const [adminFee, setAdminFee] = useState('5');
  const [isEditingAdminFee, setIsEditingAdminFee] = useState(false);
  
  // Purchases list
  const [purchases, setPurchases] = useState<any[]>([]);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [modalCategory, setModalCategory] = useState('clothes');
  const [modalDetails, setModalDetails] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalInputCurrency, setModalInputCurrency] = useState<'local' | 'home'>('local');

  // Pie Chart states
  const [isPieChartVisible, setIsPieChartVisible] = useState(false);
  const [showEstimatedRefund, setShowEstimatedRefund] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        if (!activeTrip) return;

        try {
          // Load settings from DB for accurate home currency
          const settingsRes = await db.select().from(dbSettings).limit(1);
          if (settingsRes.length > 0) {
            let hc = settingsRes[0].homeCurrency;
            if (!hc && settingsRes[0].homeCountry) {
              const countryObj = COUNTRIES.find((c: any) => c.code === settingsRes[0].homeCountry || c.name === settingsRes[0].homeCountry);
              if (countryObj) hc = countryObj.currencyCode;
            }
            if (hc) setHomeCurrencyState(hc);
          }

          const ratesRes = await db.select().from(exchangeRates);
          const ratesMap: Record<string, number> = {};
          ratesRes.forEach(r => ratesMap[r.currencyCode] = r.rate);
          setRates(ratesMap);

          // Load active country and default VAT
          const targetCountryName = activeTrip.destinationCountry;
          const countryRes = await db.select().from(countries).where(eq(countries.name, targetCountryName)).limit(1);
          if (countryRes.length > 0) {
            setActiveCountry(countryRes[0]);
            if (!isEditingVatRate && vatRate === '0') {
               setVatRate((countryRes[0].vatRate || 0).toString());
            }
          }

          // Load purchases
          const purchasesRes = await db.select().from(vatPurchases).where(eq(vatPurchases.tripId, activeTrip.id));
          setPurchases(purchasesRes);
        } catch (e) {
          console.error("Failed to load VAT data:", e);
        }
      }
      loadData();
    }, [activeTrip])
  );

  const currencyCode = activeCountry ? activeCountry.currencyCode : 'USD';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  const homeSymbol = CURRENCY_SYMBOLS[homeCurrencyState] || homeCurrencyState;

  const getConvertedAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    return (amount / fromRate) * toRate;
  };

  const handleSavePurchase = async () => {
    if (!activeTrip || !modalAmount) return;

    try {
      let amountNum = parseFloat(modalAmount.replace(/,/g, ''));
      if (isNaN(amountNum) || amountNum <= 0) return;

      if (modalInputCurrency === 'home') {
        amountNum = getConvertedAmount(amountNum, homeCurrencyState, currencyCode);
      }

      if (editingPurchaseId) {
        // Update existing
        const updated = {
          iconCategory: modalCategory,
          details: modalDetails,
          amount: amountNum,
        };
        await db.update(vatPurchases).set(updated).where(eq(vatPurchases.id, editingPurchaseId));
        
        setPurchases(prev => prev.map(p => p.id === editingPurchaseId ? { ...p, ...updated } : p));
      } else {
        // Insert new
        const newPurchase = {
          id: Crypto.randomUUID(),
          tripId: activeTrip.id,
          iconCategory: modalCategory,
          details: modalDetails,
          amount: amountNum,
          createdAt: new Date(),
        };
        await db.insert(vatPurchases).values(newPurchase);
        setPurchases(prev => [...prev, newPurchase]);
      }
      
      setIsModalVisible(false);
    } catch (e) {
      console.error("Failed to save VAT purchase:", e);
    }
  };

  const handleRemovePurchase = async (id: string) => {
    try {
      await db.delete(vatPurchases).where(eq(vatPurchases.id, id));
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error("Failed to delete purchase:", e);
    }
  };

  const openAddModal = () => {
    setEditingPurchaseId(null);
    setModalCategory('clothes');
    setModalDetails('');
    setModalAmount('');
    setModalInputCurrency('local');
    setIsModalVisible(true);
  };

  const openEditModal = (purchase: any) => {
    setEditingPurchaseId(purchase.id);
    setModalCategory(purchase.iconCategory);
    setModalDetails(purchase.details || '');
    setModalAmount(purchase.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setModalInputCurrency('local');
    setIsModalVisible(true);
  };

  const handleToggleInputCurrency = (newValue: string) => {
    if (newValue === modalInputCurrency) return;
    const num = parseFloat(modalAmount.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      if (newValue === 'home') {
        setModalAmount(getConvertedAmount(num, currencyCode, homeCurrencyState).toFixed(2));
      } else {
        setModalAmount(getConvertedAmount(num, homeCurrencyState, currencyCode).toFixed(2));
      }
    }
    setModalInputCurrency(newValue as 'local' | 'home');
  };

  // Calculations
  const grandTotal = purchases.reduce((sum, p) => sum + p.amount, 0);
  const vatRateNum = parseFloat(vatRate) || 0;
  const adminFeeNum = parseFloat(adminFee) || 0;

  // Effective refund rate = (VAT Rate / (100 + VAT Rate)) * 100
  const baseRefundRate = vatRateNum > 0 ? (vatRateNum / (100 + vatRateNum)) * 100 : 0;
  const effectiveRefundRate = Math.max(0, baseRefundRate - adminFeeNum);
  const estimatedRefund = grandTotal * (effectiveRefundRate / 100);

  // Pie chart calculations
  const pieChartData = React.useMemo(() => {
    if (!isPieChartVisible) return [];
    
    const categoryTotals: Record<string, number> = {};
    let totalPurchases = 0;
    
    purchases.forEach(p => {
      if (!categoryTotals[p.iconCategory]) categoryTotals[p.iconCategory] = 0;
      categoryTotals[p.iconCategory] += p.amount;
      totalPurchases += p.amount;
    });

    if (totalPurchases === 0) return [];

    let slicesList: { category: string, value: number, color: string, label: string }[] = Object.keys(categoryTotals).map(cat => {
      const catObj = CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
      return {
        category: cat,
        value: categoryTotals[cat],
        color: getCategoryColor(cat, theme),
        label: t(`modules.vatRefund.cat${catObj.label}`, catObj.label)
      };
    });

    slicesList.sort((a, b) => b.value - a.value);
    
    let slices: { category: string, value: number, color: string, label: string }[] = [];

    if (showEstimatedRefund && estimatedRefund > 0) {
      const refundRatio = estimatedRefund / totalPurchases;
      
      slicesList.forEach(s => {
        slices.push({
          ...s,
          value: s.value - (s.value * refundRatio)
        });
      });

      slices.push({
        category: 'refund',
        value: estimatedRefund,
        color: getCategoryColor('refund', theme),
        label: t('modules.vatRefund.estimatedRefund', 'Estimated Refund')
      });
    } else {
      slices = slicesList;
    }

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    let cumulativePercent = 0;

    return slices.map(slice => {
      const percent = slice.value / total;
      
      let pathData = '';
      if (percent === 1) {
        pathData = `M 0 -1 A 1 1 0 1 1 0 1 A 1 1 0 1 1 0 -1 Z`;
      } else if (percent > 0) {
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;
        pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
      }
        
      return {
        ...slice,
        path: pathData,
        percent
      };
    });
  }, [isPieChartVisible, purchases, showEstimatedRefund, estimatedRefund, theme, t]);

  const handleSync = async () => {
    const finalAmount = Math.max(0, grandTotal - estimatedRefund);
    if (!activeTrip || finalAmount <= 0) return;
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
      let convertedAmt = finalAmount;

      if (hc !== localCurrency) {
         const ratesRes = await db.select().from(exchangeRates);
         const ratesMap: Record<string, number> = {};
         ratesRes.forEach(r => ratesMap[r.currencyCode] = r.rate);
         
         const fromRate = ratesMap[localCurrency] || 1;
         const toRate = ratesMap[hc] || 1;
         convertedAmt = (finalAmount / fromRate) * toRate;
      }

      await addExpense({
        tripId: activeTrip.id,
        title: t('modules.vatRefund.expenseTitle', 'Shopping (VAT Refund Applied)'),
        category: 'shopping',
        localAmount: finalAmount,
        convertedAmount: convertedAmt,
        date: new Date()
      });
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to sync to budget tracker', e);
    }
  };

  const handleReset = async () => {
    if (activeTrip) {
      await db.delete(vatPurchases).where(eq(vatPurchases.tripId, activeTrip.id));
    }
    setPurchases([]);
    setAdminFee('5');
    setIsEditingAdminFee(false);
    
    if (activeCountry) {
      setVatRate((activeCountry.vatRate || 0).toString());
    } else {
      setVatRate('0');
    }
    setIsEditingVatRate(false);
    setSyncSuccess(false);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.vatRefund.headerTitle", "VAT Refund")} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          {t("modules.vatRefund.estimateDesc", "Estimate your tax-free shopping refund for {{country}}.", { country: activeCountry ? t(`countries.${activeCountry.code}`, activeCountry.name) : t("modules.vatRefund.yourDestination", "your destination") })}
        </Text>

        <Card style={styles.card} mode="contained">
          <Card.Content>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ marginBottom: 8 }}>{t("modules.vatRefund.standardVat", "Standard VAT Rate")}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                  value={vatRate}
                  onChangeText={setVatRate}
                  keyboardType="numeric"
                  mode="outlined"
                  disabled={!isEditingVatRate}
                  style={{ backgroundColor: '#ffffff', marginBottom: 8 }}
                  right={<TextInput.Affix text="%" />}
                />
                <Button 
                  mode={isEditingVatRate ? "contained" : "outlined"} 
                  onPress={() => setIsEditingVatRate(!isEditingVatRate)}
                >
                  {isEditingVatRate ? t("modules.vatRefund.setButton", "Set") : t("modules.vatRefund.adjustButton", "Adjust")}
                </Button>
              </View>

              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="labelMedium" style={{ marginBottom: 8 }}>{t("modules.vatRefund.adminFee", "Estimated Admin Fee")}</Text>
                </View>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                  value={adminFee}
                  onChangeText={setAdminFee}
                  keyboardType="numeric"
                  mode="outlined"
                  disabled={!isEditingAdminFee}
                  style={{ backgroundColor: '#ffffff', marginBottom: 8 }}
                  right={<TextInput.Affix text="%" />}
                />
                <Button 
                  mode={isEditingAdminFee ? "contained" : "outlined"} 
                  onPress={() => setIsEditingAdminFee(!isEditingAdminFee)}
                >
                  {isEditingAdminFee ? t("modules.vatRefund.setButton", "Set") : t("modules.vatRefund.adjustButton", "Adjust")}
                </Button>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text variant="titleMedium" style={{ }}>{t("modules.vatRefund.purchases", "Purchases")}</Text>
          {purchases.length > 0 && (
            <IconButton icon="chart-pie" iconColor={theme.colors.primary} size={24} onPress={() => setIsPieChartVisible(true)} style={{ margin: 0 }} />
          )}
        </View>

        <Pressable 
          onPress={openAddModal}
          style={({pressed}) => [
            { 
              flexDirection: 'row', 
              alignItems: 'center', 
              padding: 16, 
              borderRadius: 16, 
              backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.primaryContainer,
              marginBottom: 16
            }
          ]}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{t("modules.vatRefund.addNew", "Add New")}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.vatRefund.addNewDesc", "Add an item to estimate your refund")}</Text>
          </View>
        </Pressable>

        {purchases.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.vatRefund.noPurchases", "No purchases added yet.")}</Text>
          </View>
        ) : (
          purchases.map(p => {
            const categoryObj = CATEGORIES.find(c => c.value === p.iconCategory) || CATEGORIES[0];
            return (
              <Card key={p.id} style={styles.purchaseCard} mode="elevated">
                <View style={styles.purchaseRow}>
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <IconButton icon={categoryObj.icon} size={24} iconColor={getCategoryColor(p.iconCategory, theme)} />
                  </View>
                  <View style={styles.purchaseInfo}>
                    <Text variant="titleMedium">{p.details ? p.details : t(`modules.vatRefund.cat${categoryObj.label}`, categoryObj.label)}</Text>
                  </View>
                  <View style={[styles.purchaseAmount, { alignItems: 'flex-end', justifyContent: 'center' }]}>
                    <Text variant="titleMedium" style={{ }}>{currencySymbol}{p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    {homeCurrencyState !== currencyCode && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {homeSymbol}{getConvertedAmount(p.amount, currencyCode, homeCurrencyState).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.purchaseActions}>
                    <IconButton icon="pencil" size={20} onPress={() => openEditModal(p)} style={{ margin: 0 }} />
                    <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={() => handleRemovePurchase(p.id)} style={{ margin: 0 }} />
                  </View>
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.grandTotalRow}>
          <View>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.vatRefund.grandTotal", "Grand Total")}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text variant="titleLarge" style={{ }}>{currencySymbol}{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            {homeCurrencyState !== currencyCode && grandTotal > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {homeSymbol}{getConvertedAmount(grandTotal, currencyCode, homeCurrencyState).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            )}
          </View>
        </View>

        <Card style={[styles.resultCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
          <Card.Content style={styles.resultContent}>
            <View style={styles.resultRow}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.vatRefund.estimatedRefund", "Estimated Refund")}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="headlineMedium" style={{  color: theme.colors.primary }}>
                  {currencySymbol}{estimatedRefund > 0 ? estimatedRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </Text>
                {homeCurrencyState !== currencyCode && estimatedRefund > 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.primary, opacity: 0.8 }}>
                    {homeSymbol}{getConvertedAmount(estimatedRefund, currencyCode, homeCurrencyState).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.resultRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t("modules.vatRefund.effectiveRefundRate", "Effective Refund Rate")}</Text>
              <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>
                {effectiveRefundRate > 0 ? effectiveRefundRate.toFixed(1) : '0.0'}%
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
          <Button mode="outlined" onPress={handleReset}>
            {t('common.reset', 'Reset')}
          </Button>
          <Button mode="contained" onPress={handleSync} disabled={syncSuccess || purchases.length === 0}>
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
        <Dialog visible={isModalVisible} onDismiss={() => setIsModalVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <Dialog.Title>{editingPurchaseId ? t('modules.vatRefund.editPurchase', 'Edit Purchase') : t('modules.vatRefund.addPurchase', 'Add New Purchase')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="labelMedium" style={{ marginBottom: 8 }}>{t("modules.vatRefund.category", "Category")}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map(cat => (
                <Pressable
                  key={cat.value}
                  onPress={() => setModalCategory(cat.value)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: modalCategory === cat.value ? theme.colors.primary : theme.colors.outline,
                      backgroundColor: modalCategory === cat.value ? theme.colors.primaryContainer : 'transparent',
                    }
                  ]}
                >
                  <IconButton icon={cat.icon} iconColor={getCategoryColor(cat.value, theme)} size={16} style={{ margin: 0, width: 16, height: 16 }} />
                  <Text style={{ color: modalCategory === cat.value ? theme.colors.onPrimaryContainer : theme.colors.onSurface, fontSize: 12 }}>
                    {t(`modules.vatRefund.cat${cat.label}`, cat.label)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
              label={t("modules.vatRefund.detailsOptional", "Details (Optional)")}
              value={modalDetails}
              onChangeText={setModalDetails}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                label={t("modules.vatRefund.amountLocal", "Amount ({{currency}})", { currency: modalInputCurrency === 'home' ? homeCurrencyState : currencyCode })}
                value={modalAmount}
                onChangeText={setModalAmount}
                keyboardType="numeric"
                mode="outlined"
                style={{ flex: 1, backgroundColor: theme.colors.surface, marginRight: 8 }}
              />
              <CustomSegmentedControl
                value={modalInputCurrency}
                onValueChange={handleToggleInputCurrency}
                style={{ width: 86, padding: 0, borderRadius: 18 }}
                buttons={[
                  { value: 'local', label: CURRENCY_SYMBOLS[currencyCode] || currencyCode, style: { borderRadius: 18, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                  { value: 'home', label: CURRENCY_SYMBOLS[homeCurrencyState] || homeCurrencyState, style: { borderRadius: 18, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                ]}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, justifyContent: 'center', paddingBottom: 16 }}>
            <Button variant="alternative" style={{ width: 130 }} onPress={() => setIsModalVisible(false)}>{t("modules.tipCalculator.cancel", "Cancel")}</Button>
            <Button variant="main" style={{ width: 130 }} onPress={handleSavePurchase}>{t("modules.vatRefund.save", "Save")}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isPieChartVisible} onDismiss={() => setIsPieChartVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12 }}>
            <Dialog.Title style={{ color: theme.colors.onSurface, flex: 1, marginBottom: 0, marginTop: 0 }}>{t('modules.vatRefund.pieChartTitle', 'Purchases Breakdown')}</Dialog.Title>
            <IconButton 
              icon="close" 
              size={20} 
              onPress={() => setIsPieChartVisible(false)} 
              style={{ margin: 0 }}
            />
          </View>
          <Dialog.Content style={{ paddingTop: 16 }}>
            {pieChartData.length > 0 ? (
              <View style={{ alignItems: 'center' }}>
                <Svg height="200" width="200" viewBox="-1.2 -1.2 2.4 2.4">
                  {pieChartData.map((slice, index) => (
                    <Path
                      key={index}
                      d={slice.path}
                      fill={slice.color}
                    />
                  ))}
                </Svg>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 20 }}>{t('modules.vatRefund.noData', 'No data available.')}</Text>
            )}

            <View style={{ marginTop: 24, paddingHorizontal: 8 }}>
              {pieChartData.map((slice, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: slice.color, marginRight: 8 }} />
                  <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>{slice.label}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>
                    {(slice.percent * 100).toFixed(0)}%
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}>
                    {currencySymbol}{slice.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              ))}
            </View>

            {estimatedRefund > 0 && (
              <Pressable 
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}
                onPress={() => setShowEstimatedRefund(!showEstimatedRefund)}
              >
                <View pointerEvents="none" style={{ marginRight: 8 }}>
                  <MaterialIcons 
                    name={showEstimatedRefund ? 'check-circle' : 'radio-button-unchecked'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                  {t('modules.vatRefund.showRefundToggle', 'Show Estimated Refund')}
                </Text>
              </Pressable>
            )}
          </Dialog.Content>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16, borderBottomWidth: 1 },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#ffffff', marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyState: { padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 16 },
  purchaseCard: { marginBottom: 12, backgroundColor: '#ffffff' },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 0 },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  purchaseInfo: { flex: 1 },
  purchaseAmount: { marginRight: 8 },
  purchaseActions: { flexDirection: 'row' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', marginBottom: 24 },
  resultCard: { elevation: 0, marginBottom: 16 },
  resultContent: { gap: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }
});
