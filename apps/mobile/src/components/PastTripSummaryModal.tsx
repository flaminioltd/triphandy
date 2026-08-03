import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Modal, Portal, Button, Divider, List, IconButton } from 'react-native-paper';
import { budgetRepo } from '../repositories/budget-repository';
import { useAppStore } from '../stores/app-store';
import { COUNTRIES } from '../lib/countries';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { EXPENSE_CATEGORIES, getCategoryColor, getCoordinatesForPercent } from '../lib/expense-categories';

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

interface Props {
  visible: boolean;
  trip: any | null;
  onDismiss: () => void;
}

export default function PastTripSummaryModal({ visible, trip, onDismiss }: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { settings } = useAppStore();
  const [expenses, setExpenses] = useState<any[]>([]);

  useEffect(() => {
    if (visible && trip) {
      budgetRepo.getExpensesForTrip(trip.id).then(setExpenses);
    } else {
      setExpenses([]);
    }
  }, [visible, trip]);

  const homeCountry = settings?.homeCountry;
  const homeCurrency = settings?.homeCurrency || (homeCountry ? COUNTRIES.find((c: any) => c.code === homeCountry || c.name === homeCountry)?.currencyCode : null) || 'USD';
  
  const budgetNum = trip?.budget || 0;
  const budgetType = trip?.budgetType || 'trip';
  const trackCurrency = trip?.trackCurrency || 'local';
  const localCurrency = COUNTRIES.find(c => c.name === trip?.destinationCountry)?.currencyCode || 'USD';
  
  const tripDays = trip?.startDate && trip?.endDate ? 
    Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))) 
    : 1;

  const totalTripBudget = budgetType === 'trip' ? budgetNum : budgetNum * tripDays;
  const totalSpentDisplay = expenses.reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);
  
  const displayCurrency = trackCurrency === 'home' ? homeCurrency : localCurrency;
  const displaySymbol = CURRENCY_SYMBOLS[displayCurrency] || displayCurrency;

  const pieChartData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let totalSpent = 0;
    
    expenses.forEach(e => {
      const amt = trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount;
      if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
      categoryTotals[e.category] += amt;
      totalSpent += amt;
    });

    const slices: { category: string, value: number, color: string, label: string }[] = Object.keys(categoryTotals).map(cat => {
      const catObj = EXPENSE_CATEGORIES.find(c => c.value === cat) || EXPENSE_CATEGORIES.find(c => c.value === 'other')!;
      return {
        category: cat,
        value: categoryTotals[cat],
        color: getCategoryColor(cat, theme),
        label: t(`categories.${cat}`, catObj.label)
      };
    });

    slices.sort((a, b) => b.value - a.value);

    const total = slices.reduce((acc, s) => acc + s.value, 0);
    if (total === 0) return [];

    let cumulativePercent = 0;

    return slices.map(slice => {
      const percent = slice.value / total;
      
      let pathData = '';
      if (percent === 1) {
        pathData = `M 1 0 A 1 1 0 1 1 0.99 -0.01 Z`;
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
  }, [expenses, trackCurrency, theme, t]);

  if (!trip) return null;

  const isOverBudget = totalTripBudget > 0 && totalSpentDisplay > totalTripBudget;
  const progressPercent = totalTripBudget > 0 ? Math.min(1, totalSpentDisplay / totalTripBudget) : 0;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{  color: theme.colors.onSurface, flex: 1 }}>
            {t("components.pastTripSummary.title", "{{country}} Summary", { country: (() => {
              const pastCode = COUNTRIES.find(c => c.name === trip.destinationCountry)?.code;
              return pastCode ? t(`countries.${pastCode}`, trip.destinationCountry) : trip.destinationCountry;
            })() })}
          </Text>
          <IconButton icon="close" size={24} onPress={onDismiss} style={{ margin: 0 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("components.pastTripSummary.usedBudget", "Used Budget")}</Text>
              {totalTripBudget > 0 && (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("components.pastTripSummary.configuredBudget", "Configured Budget")}</Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <Text variant="headlineMedium" style={{  color: isOverBudget ? theme.colors.error : theme.colors.onSurface }}>
                {displaySymbol}{totalSpentDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              {totalTripBudget > 0 && (
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, paddingBottom: 4 }}>
                  / {displaySymbol}{totalTripBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </View>

            <View style={{ position: 'relative', marginTop: 12 }}>
              <View style={{ height: 16, backgroundColor: theme.colors.outlineVariant, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', position: 'relative' }}>
                {totalTripBudget > 0 ? (
                  <>
                    <View style={{ width: `${isOverBudget ? 100 : progressPercent * 100}%`, backgroundColor: isOverBudget ? theme.colors.error : theme.colors.primary, height: '100%', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6 }}>
                      {progressPercent > 0.05 && (
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                          {Math.round((totalSpentDisplay / totalTripBudget) * 100)}%
                        </Text>
                      )}
                    </View>
                    {isOverBudget && (
                      <View style={{ position: 'absolute', left: `${(totalTripBudget / totalSpentDisplay) * 100}%`, width: 2, height: '100%', backgroundColor: theme.colors.surface }} />
                    )}
                  </>
                ) : (
                  <View style={{ width: '100%', backgroundColor: theme.colors.primary, height: '100%' }} />
                )}
              </View>
            </View>

            {totalTripBudget > 0 && (
              <Text variant="bodySmall" style={{ color: isOverBudget ? theme.colors.error : theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'right' }}>
                {isOverBudget 
                  ? t('components.pastTripSummary.overBudget', 'Over budget')
                  : t('components.pastTripSummary.underBudget', 'Under budget!')}
              </Text>
            )}
          </View>

          {expenses.length > 0 && (
            <View style={[styles.card, { marginTop: 16 }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>{t('components.pastTripSummary.breakdown', 'Expense Breakdown')}</Text>
              <View style={{ alignItems: 'center' }}>
                <Svg height="160" width="160" viewBox="-1.2 -1.2 2.4 2.4">
                  {pieChartData.map((slice, index) => (
                    <Path key={index} d={slice.path} fill={slice.color} />
                  ))}
                </Svg>
              </View>
              <View style={{ marginTop: 20 }}>
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
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            <Text variant="titleMedium" style={{  marginBottom: 8, color: theme.colors.onSurface }}>{t("components.pastTripSummary.expensesCount", "Expenses ({{count}})", { count: expenses.length })}</Text>
            {expenses.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{t("components.pastTripSummary.noExpenses", "No expenses recorded for this trip.")}</Text>
            ) : (
              expenses.map((exp, idx) => {
                const categoryObj = EXPENSE_CATEGORIES.find(c => c.value === exp.category) || EXPENSE_CATEGORIES.find(c => c.value === 'other')!;
                return (
                  <View key={exp.id}>
                    <List.Item
                      title={exp.title}
                      description={new Date(exp.date).toLocaleDateString(i18n.language || 'en-US')}
                      left={() => (
                        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: theme.colors.surfaceVariant }}>
                          <IconButton icon={categoryObj.icon} size={20} iconColor={getCategoryColor(exp.category, theme)} style={{ margin: 0 }} />
                        </View>
                      )}
                      right={() => (
                        <View style={{ justifyContent: 'center' }}>
                          <Text style={{  color: theme.colors.onSurface }}>
                            {displaySymbol}{(trackCurrency === 'home' ? (exp.convertedAmount || 0) : exp.localAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                      )}
                    />
                    {idx < expenses.length - 1 && <Divider />}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
});
