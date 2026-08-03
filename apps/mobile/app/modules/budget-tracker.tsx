import { SafeAreaView } from 'react-native-safe-area-context';
import ModuleHeader from '../../src/components/app-header/ModuleHeader';
import React, { useState, useEffect } from 'react';
import { COUNTRIES } from '../../src/lib/countries';
import { FLAG_IMAGES } from '../../src/lib/assets';
import { useTripStore } from '../../src/stores/trip-store';
import { useAppStore } from '../../src/stores/app-store';
import { View, Image, StyleSheet, FlatList, Pressable, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, IconButton, FAB, Avatar, Portal, Dialog, TextInput, ProgressBar, Switch, RadioButton } from 'react-native-paper';
import { Svg, G, Path, Circle } from 'react-native-svg';
import Button from '../../src/components/ui/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { db } from '../../src/db/client';
import { exchangeRates, countries, settings as dbSettings } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { MaterialIcons } from '@expo/vector-icons';
import CustomSegmentedControl from '../../src/components/ui/CustomSegmentedControl';
import { EXPENSE_CATEGORIES as CATEGORIES, getCategoryColor, getCoordinatesForPercent } from '../../src/lib/expense-categories';

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

export default function BudgetTrackerScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { activeTrip, expenses, updateTrip, addExpense, updateExpense, removeExpense } = useTripStore();
  
  const activeCountryCode = activeTrip ? COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry)?.code : null;
  const [activeCountry, setActiveCountry] = useState<any>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [homeCurrencyState, setHomeCurrencyState] = useState<string>('USD');

  const localCurrency = activeCountry?.currencyCode || 'USD';

  // Settings states
  const [budgetAmount, setBudgetAmount] = useState(activeTrip?.budget?.toString() || '');
  const [budgetType, setBudgetType] = useState(activeTrip?.budgetType || 'trip');
  const [trackCurrency, setTrackCurrency] = useState(activeTrip?.trackCurrency || 'local');
  const [loadedTripId, setLoadedTripId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'total' | 'daily'>('total');

  const tripDays = activeTrip?.startDate && activeTrip?.endDate ? 
    Math.max(1, Math.ceil((new Date(activeTrip.endDate).getTime() - new Date(activeTrip.startDate).getTime()) / (1000 * 60 * 60 * 24))) 
    : 1;


  const handleTrackCurrencyChange = (newCurrency: string) => {
    if (newCurrency === trackCurrency) return;
    
    const numAmount = parseFloat(budgetAmount) || 0;
    if (numAmount > 0) {
      const fromCurrencyCode = trackCurrency === 'home' ? homeCurrencyState : localCurrency;
      const toCurrencyCode = newCurrency === 'home' ? homeCurrencyState : localCurrency;
      const convertedAmount = getConvertedAmount(numAmount, fromCurrencyCode, toCurrencyCode);
      setBudgetAmount(convertedAmount > 0 ? convertedAmount.toFixed(2).replace(/\.00$/, '') : '');
    }
    setTrackCurrency(newCurrency);
  };

  const handleBudgetTypeChange = (newType: string) => {
    if (newType === budgetType) return;
    const numAmount = parseFloat(budgetAmount) || 0;
    
    let newAmount = numAmount;
    if (newType === 'trip' && budgetType === 'daily') {
      newAmount = numAmount * tripDays;
    } else if (newType === 'daily' && budgetType === 'trip') {
      newAmount = numAmount / tripDays;
    }
    
    setBudgetAmount(newAmount > 0 ? newAmount.toFixed(2).replace(/\.00$/, '') : '');
    setBudgetType(newType);
  };

  // Modal states
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState('food');
  const [modalAmount, setModalAmount] = useState('');
  const [modalInputCurrency, setModalInputCurrency] = useState<'local' | 'home'>('local');

  // Pie Chart states
  const [isPieChartVisible, setIsPieChartVisible] = useState(false);
  const [includeRemainingBudget, setIncludeRemainingBudget] = useState(false);

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

          const targetCountryName = activeTrip.destinationCountry;
          const countryRes = await db.select().from(countries).where(eq(countries.name, targetCountryName)).limit(1);
          if (countryRes.length > 0) setActiveCountry(countryRes[0]);

          const ratesRes = await db.select().from(exchangeRates);
          const ratesMap: Record<string, number> = {};
          ratesRes.forEach(r => ratesMap[r.currencyCode] = r.rate);
          setRates(ratesMap);

          // Restore state from trip if available only on first load for this trip
          if (loadedTripId !== activeTrip.id) {
            setBudgetAmount(activeTrip.budget?.toString() || '');
            setBudgetType(activeTrip.budgetType || 'trip');
            setTrackCurrency(activeTrip.trackCurrency || 'local');
            setLoadedTripId(activeTrip.id);
          }
        } catch (e) {
          console.error("Failed to load data:", e);
        }
      }
      loadData();
    }, [activeTrip?.id]) // Run when trip ID changes, not on every object mutation
  );

  // Auto-save settings when they change
  useEffect(() => {
    if (activeTrip && loadedTripId === activeTrip.id) {
      updateTrip(activeTrip.id, {
        budget: parseFloat(budgetAmount.replace(/,/g, '')) || 0,
        budgetType,
        trackCurrency
      });
    }
  }, [budgetAmount, budgetType, trackCurrency]);

  const getConvertedAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    // Base is USD. amount in USD = amount / fromRate. amount in toCurrency = (amount / fromRate) * toRate
    return (amount / fromRate) * toRate;
  };

  const handleSaveExpense = async () => {
    if (!activeTrip || !modalAmount) return;
    
    const amountNum = parseFloat(modalAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    // The user inputs the amount in the selected modal input currency
    let localAmt = 0;
    let convertedAmt = 0;

    if (modalInputCurrency === 'home') {
      convertedAmt = amountNum;
      localAmt = getConvertedAmount(amountNum, homeCurrencyState, localCurrency);
    } else {
      localAmt = amountNum;
      convertedAmt = getConvertedAmount(amountNum, localCurrency, homeCurrencyState);
    }

    const finalTitle = modalTitle.trim();

    if (editingExpenseId) {
      await updateExpense(editingExpenseId, {
        title: finalTitle,
        category: modalCategory,
        localAmount: localAmt,
        convertedAmount: convertedAmt,
      });
    } else {
      await addExpense({
        tripId: activeTrip.id,
        title: finalTitle,
        category: modalCategory,
        localAmount: localAmt,
        convertedAmount: convertedAmt,
        date: new Date(),
      });
    }
    
    setIsModalVisible(false);
  };

  const openAddModal = () => {
    setEditingExpenseId(null);
    setModalCategory('food');
    setModalTitle('');
    setModalAmount('');
    setModalInputCurrency('local');
    setIsModalVisible(true);
  };

  const openEditModal = (expense: any) => {
    setEditingExpenseId(expense.id);
    setModalCategory(expense.category);
    setModalTitle(expense.title);
    setModalAmount(expense.localAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setModalInputCurrency('local');
    setIsModalVisible(true);
  };

  const handleToggleInputCurrency = (newValue: string) => {
    if (newValue === modalInputCurrency) return;
    const num = parseFloat(modalAmount.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      if (newValue === 'home') {
        setModalAmount(getConvertedAmount(num, localCurrency, homeCurrencyState).toFixed(2));
      } else {
        setModalAmount(getConvertedAmount(num, homeCurrencyState, localCurrency).toFixed(2));
      }
    }
    setModalInputCurrency(newValue as 'local' | 'home');
  };

  // Calculations
  const displayCurrency = trackCurrency === 'home' ? homeCurrencyState : localCurrency;
  const displaySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;
  
  const totalSpentDisplay = expenses.reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);

  const getProgressColor = (progress: number) => {
    if (progress < 0.5) return '#4CAF50'; // Green
    if (progress < 0.7) return '#FF9800'; // Light Orange
    if (progress < 0.9) return '#F57C00'; // Dark Orange
    return '#F44336'; // Red
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const spentTodayDisplay = expenses
    .filter(e => new Date(e.date).getTime() >= todayStart.getTime())
    .reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);

  const budgetNum = parseFloat(budgetAmount) || 0;

  let totalTripBudget = budgetType === 'trip' ? budgetNum : budgetNum * tripDays;
  let todayBudgetLimit = budgetType === 'trip' ? (budgetNum / tripDays) : budgetNum;

  const totalProgress = totalTripBudget > 0 ? Math.min(1, totalSpentDisplay / totalTripBudget) : 0;
  const todayProgress = todayBudgetLimit > 0 ? Math.min(1, spentTodayDisplay / todayBudgetLimit) : 0;

  // Pie chart calculations
  const pieChartData = React.useMemo(() => {
    if (!isPieChartVisible) return [];
    
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;
    
    expenses.forEach(e => {
      const amt = trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount;
      if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
      categoryTotals[e.category] += amt;
      totalSpent += amt;
    });

    const slices: { category: string, value: number, color: string, label: string }[] = Object.keys(categoryTotals).map(cat => {
      const catObj = CATEGORIES.find(c => c.value === cat) || CATEGORIES.find(c => c.value === 'other')!;
      return {
        category: cat,
        value: categoryTotals[cat],
        color: getCategoryColor(cat, theme),
        label: t(`categories.${cat}`, catObj.label)
      };
    });

    slices.sort((a, b) => b.value - a.value);

    if (includeRemainingBudget && budgetNum > 0) {
      const remaining = (viewMode === 'total' ? totalTripBudget : todayBudgetLimit) - totalSpent;
      if (remaining > 0) {
        slices.push({
          category: 'remaining',
          value: remaining,
          color: theme.colors.outlineVariant,
          label: t('modules.budgetTracker.remaining', 'Remaining')
        });
      }
    }

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    if (total === 0) return [];

    let cumulativePercent = 0;

    return slices.map(slice => {
      const percent = slice.value / total;
      
      let pathData = '';
      if (percent === 1) {
        pathData = `M 0 -1 A 1 1 0 1 1 0 1 A 1 1 0 1 1 0 -1 Z`;
      } else {
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
  }, [isPieChartVisible, expenses, trackCurrency, includeRemainingBudget, budgetNum, viewMode, totalTripBudget, todayBudgetLimit, theme, t]);

  const handleReset = () => {
    Alert.alert(
      t("modules.budgetTracker.clearExpensesAlertTitle", "Clear Expenses"),
      t("modules.budgetTracker.clearExpensesAlertMessage", "Are you sure you want to delete all expenses? This cannot be undone."),
      [
        { text: t("modules.budgetTracker.cancelButton", "Cancel"), style: "cancel" },
        {
          text: t("modules.budgetTracker.clearButton", "Clear"),
          style: "destructive",
          onPress: async () => {
            if (expenses.length > 0) {
              for (const e of expenses) {
                await removeExpense(e.id);
              }
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ModuleHeader title={t("modules.budgetTracker.headerTitle", "Budget Tracker")} />

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Card style={[styles.settingsCard, { elevation: 0, backgroundColor: 'transparent' }]} mode="outlined">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>{t("modules.budgetTracker.budgetLabel", "Budget")}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {budgetNum > 0 
                      ? `${displaySymbol}${todayBudgetLimit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${t('modules.budgetTracker.day', 'day')} (${displaySymbol}${totalTripBudget.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})`
                      : t('modules.budgetTracker.notSet', 'Not set')
                    }
                  </Text>
                </View>
                <Button variant="main" onPress={() => setIsSettingsModalVisible(true)}>
                  {t('modules.budgetTracker.adjustButton', 'Adjust')}
                </Button>
              </View>
            </Card>

            <Card style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} mode="contained">
              <Card.Content>
                <View>
                  <View style={styles.progressHeader}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, }}>
                      {viewMode === 'total' ? t('modules.budgetTracker.totalSpent', 'Total Spent') : t('modules.budgetTracker.spentToday', 'Spent Today')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, marginRight: 0, color: viewMode === 'daily' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: viewMode === 'daily' ? 'bold' : 'normal' }}>{t('modules.budgetTracker.dailyBudget', 'Daily')}</Text>
                      <Switch 
                        value={viewMode === 'total'} 
                        onValueChange={(val) => setViewMode(val ? 'total' : 'daily')} 
                        color={theme.colors.primary}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginHorizontal: -4 }}
                      />
                      <Text style={{ fontSize: 12, marginLeft: 0, color: viewMode === 'total' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: viewMode === 'total' ? 'bold' : 'normal' }}>{t('modules.budgetTracker.totalTripBudget', 'Trip')}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary, }}>
                      {displaySymbol}{(viewMode === 'total' ? totalSpentDisplay : spentTodayDisplay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                      {budgetNum > 0 && (
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                          {' '}/ {displaySymbol}{(viewMode === 'total' ? totalTripBudget : todayBudgetLimit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      )}
                    </Text>
                  </View>
                  <ProgressBar 
                    progress={viewMode === 'total' ? totalProgress : todayProgress} 
                    color={getProgressColor(viewMode === 'total' ? totalProgress : todayProgress)} 
                    style={styles.progressBar} 
                  />
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'right' }}>
                    {t('modules.budgetTracker.remaining', 'Remaining:')} {budgetNum > 0 ? `${displaySymbol}${((viewMode === 'total' ? totalTripBudget : todayBudgetLimit) - (viewMode === 'total' ? totalSpentDisplay : spentTodayDisplay)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <View style={[styles.sectionHeader, { paddingRight: 16 }]}>
              <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{t('modules.budgetTracker.expensesTitle', 'Recent Expenses')}</Text>
              {expenses.length > 0 && (
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
                <Text variant="titleMedium" style={{  color: theme.colors.onSurface }}>{t('modules.budgetTracker.addExpenseButton', 'Add New Expense')}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.budgetTracker.addExpenseDesc', 'Track a new transaction')}</Text>
              </View>
            </Pressable>
            {expenses.length === 0 && (
              <View style={styles.emptyState}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('modules.budgetTracker.noExpensesLabel', 'No expenses added yet.')}</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const categoryObj = CATEGORIES.find(c => c.value === item.category) || CATEGORIES.find(c => c.value === 'other')!;
          const displayAmt = trackCurrency === 'home' ? (item.convertedAmount || 0) : item.localAmount;
          const secondaryAmt = trackCurrency === 'home' ? item.localAmount : (item.convertedAmount || 0);
          const secondarySymbol = trackCurrency === 'home' ? CURRENCY_SYMBOLS[localCurrency] : CURRENCY_SYMBOLS[homeCurrencyState];

          return (
            <Card style={styles.entryCard} mode="elevated">
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 0 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: theme.colors.surfaceVariant }}>
                  <IconButton icon={categoryObj.icon} size={24} iconColor={getCategoryColor(item.category, theme)} style={{ margin: 0 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium">{item.title ? item.title : t(`categories.${categoryObj.value}`, categoryObj.label)}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{new Date(item.date).toLocaleDateString(i18n.language || 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</Text>
                </View>
                <View style={{ marginRight: 8, alignItems: 'flex-end' }}>
                  <Text variant="titleMedium" style={{ }}>{displaySymbol}{displayAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{secondarySymbol || ''}{secondaryAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon="pencil" size={20} onPress={() => openEditModal(item)} style={{ margin: 0 }} />
                  <IconButton icon="delete" size={20} iconColor={theme.colors.error} onPress={async () => {
                    await removeExpense(item.id);
                  }} style={{ margin: 0 }} />
                </View>
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          <View style={{ padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 64 }}>
            <Button 
              variant="destructive"
              icon="delete-sweep"
              onPress={handleReset}
            >
              {t('modules.budgetTracker.clearExpensesButton', 'Clear Expenses')}
            </Button>
          </View>
        }
      />

      <Portal>
        <Dialog visible={isModalVisible} onDismiss={() => setIsModalVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {editingExpenseId ? t('modules.budgetTracker.expenseModalTitleEdit', 'Edit Expense') : t('modules.budgetTracker.expenseModalTitleAdd', 'Add Expense')}
            </Text>
            </View>
          <Dialog.Content>
            <Text variant="labelMedium" style={{ marginBottom: 8 }}>{t("modules.budgetTracker.categoryLabel", "Category")}</Text>
            <View style={styles.categoryGrid}>
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
                    {t(`categories.${cat.value}`, cat.label)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
              label={t("modules.budgetTracker.detailsOptional", "Description (Optional)")}
              value={modalTitle}
              onChangeText={setModalTitle}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                label={t("modules.budgetTracker.amountLocal", "Amount ({{currency}})", { currency: modalInputCurrency === 'home' ? homeCurrencyState : localCurrency })}
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
                  { value: 'local', label: CURRENCY_SYMBOLS[localCurrency] || localCurrency, style: { borderRadius: 18, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                  { value: 'home', label: CURRENCY_SYMBOLS[homeCurrencyState] || homeCurrencyState, style: { borderRadius: 18, paddingHorizontal: 4 }, labelStyle: { fontSize: 10 } },
                ]}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'column', gap: 12, alignItems: 'center', paddingBottom: 24, paddingHorizontal: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="alternative" style={{ width: 125 }} onPress={() => setIsModalVisible(false)}>{t('modules.budgetTracker.cancelButton', 'Cancel')}</Button>
              <Button variant="main" style={{ width: 125 }} onPress={handleSaveExpense}>{t('modules.budgetTracker.saveExpenseButton', 'Save')}</Button>
            </View>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isPieChartVisible} onDismiss={() => setIsPieChartVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12 }}>
            <Dialog.Title style={{ color: theme.colors.onSurface, flex: 1, marginBottom: 0, marginTop: 0 }}>{t('modules.budgetTracker.pieChartTitle', 'Expense Breakdown')}</Dialog.Title>
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
              <Text style={{ textAlign: 'center', marginTop: 20 }}>{t('modules.budgetTracker.noData', 'No data available.')}</Text>
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
                    {displaySymbol}{slice.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
              ))}
            </View>

            {budgetNum > 0 && (
              <Pressable 
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}
                onPress={() => setIncludeRemainingBudget(!includeRemainingBudget)}
              >
                <View pointerEvents="none" style={{ marginRight: 8 }}>
                  <MaterialIcons 
                    name={includeRemainingBudget ? 'check-circle' : 'radio-button-unchecked'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, flex: 1 }}>
                  {t('modules.budgetTracker.includeRemaining', 'Include Remaining Budget')}
                </Text>
              </Pressable>
            )}
          </Dialog.Content>
        </Dialog>
        <Dialog visible={isSettingsModalVisible} onDismiss={() => setIsSettingsModalVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 12 }}>
            <Dialog.Title style={{ color: theme.colors.onSurface, flex: 1, marginBottom: 0, marginTop: 0 }}>{t("modules.budgetTracker.budgetSettings", "Budget Settings")}</Dialog.Title>
            <IconButton 
              icon="close" 
              size={20} 
              onPress={() => setIsSettingsModalVisible(false)} 
              style={{ margin: 0 }}
            />
          </View>
          <Dialog.Content style={{ paddingTop: 16 }}>
            <View style={{ marginBottom: 16 }}>
              <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t("modules.budgetTracker.trackIn", "Track Expenses In")}</Text>
              <CustomSegmentedControl
                value={trackCurrency}
                onValueChange={handleTrackCurrencyChange}
                buttons={[
                  { value: 'home', label: `${t('modules.budgetTracker.homeCurrency', 'Origin')} (${CURRENCY_SYMBOLS[homeCurrencyState] || homeCurrencyState})` },
                  { value: 'local', label: `${t('modules.budgetTracker.localCurrency', 'Local')} (${CURRENCY_SYMBOLS[localCurrency] || localCurrency})` },
                ]}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t("modules.budgetTracker.budgetLimit", "Budget Amount")}</Text>
                <TextInput placeholderTextColor="#B7B0AA" theme={{ colors: { onSurfaceVariant: "#B7B0AA" } }}
                  value={budgetAmount}
                  onChangeText={setBudgetAmount}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Affix text={displaySymbol} />}
                  style={{ backgroundColor: theme.colors.surface, height: 40 }}
                />
              </View>
              <View style={{ flex: 1.15, paddingLeft: 8 }}>
                <Text variant="labelMedium" style={{ marginBottom: 4 }}>{t("modules.budgetTracker.budgetType", "Budget Scope")}</Text>
                <CustomSegmentedControl
                  value={budgetType}
                  onValueChange={handleBudgetTypeChange}
                  buttons={[
                    { value: 'daily', label: t('modules.budgetTracker.dailyBudget', 'Daily'), labelStyle: { fontSize: 11 } },
                    { value: 'trip', label: t('modules.budgetTracker.totalTripBudget', 'Trip'), labelStyle: { fontSize: 11 } },
                  ]}
                />
              </View>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, justifyContent: 'center', paddingBottom: 16 }}>
            <Button variant="alternative" onPress={() => setBudgetAmount('0')} style={{ width: 130 }}>
              {t('common.reset', 'Reset')}
            </Button>
            <Button variant="main" onPress={() => setIsSettingsModalVisible(false)} style={{ width: 130 }}>
              {t('modules.budgetTracker.doneButton', 'Done')}
            </Button>
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
  settingsCard: { marginBottom: 16, backgroundColor: '#ffffff' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCard: { elevation: 0, marginBottom: 24 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyState: { padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 16 },
  entryCard: { marginBottom: 8, backgroundColor: '#ffffff' },
  amountContainer: { alignItems: 'flex-end', paddingRight: 16, justifyContent: 'center' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }
});
