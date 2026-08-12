// @ts-ignore
import HomeWidget from 'react-native-home-widget';
import { db } from '../db/client';
import { settings as dbSettings, exchangeRates } from '../db/schema';
import { COUNTRIES } from '../lib/countries';
import { EMERGENCY_NUMBERS, PUBLIC_HOLIDAYS, PublicHoliday } from '../lib/local-info-data';

const hw = HomeWidget as any;

const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$', 'CAD': 'C$',
  'CHF': 'CHF', 'CNY': '¥', 'SEK': 'kr', 'NZD': 'NZ$', 'MXN': '$', 'SGD': 'S$',
  'HKD': 'HK$', 'NOK': 'kr', 'KRW': '₩', 'TRY': '₺', 'INR': '₹', 'BRL': 'R$',
  'ZAR': 'R', 'RUB': '₽', 'THB': '฿', 'PLN': 'zł', 'IDR': 'Rp', 'CZK': 'Kč',
  'ILS': '₪', 'VND': '₫', 'DKK': 'kr', 'HUF': 'Ft', 'RON': 'lei', 'ARS': '$'
};

const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': '🥐',
  'Transport': '🚕',
  'Shopping': '🛍️',
  'Activities': '🎟️',
  'Sightseeing': '🎟️',
  'Accommodation': '🏨',
  'Other': '💸'
};

/**
 * Format holiday text with day of week & date
 */
function formatHolidayShort(holiday: PublicHoliday, lang: string = 'en'): string {
  try {
    const parts = holiday.date.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0] || '2026', 10), parseInt(parts[1] || '1', 10) - 1, parseInt(parts[2] || '1', 10));
      const dayOfWeek = d.toLocaleDateString(lang || 'en', { weekday: 'short' });
      const dayMonth = d.toLocaleDateString(lang || 'en', { month: 'short', day: 'numeric' });
      return `${holiday.name} (${dayOfWeek}, ${dayMonth})`;
    }
  } catch (e) {
    // fallback
  }
  return `${holiday.name} (${holiday.date})`;
}

/**
 * Format date for expense list
 */
function formatExpenseDate(dateInput: any): string {
  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch (e) {
    // fallback
  }
  return '';
}

/**
 * Sync data to all 3 native home screen widgets
 */
export async function syncAllWidgets(activeTrip: any | null, expenses: any[] = []) {
  try {
    if (!hw.setItem) return;

    if (!activeTrip) {
      await Promise.all([
        hw.setItem('trip_destination', 'No Active Trip'),
        hw.setItem('trip_days_left', 'Plan a trip'),
        hw.setItem('trip_date_range', ''),
        hw.setItem('trip_exchange_rate', '')
      ]);
      await hw.updateWidget?.({ androidName: 'ActiveTripOverviewWidget', name: 'ActiveTripOverviewWidget' });
      return;
    }

    // 1. Load settings & rates
    const [settingsRes, ratesRes] = await Promise.all([
      db.select().from(dbSettings).limit(1),
      db.select().from(exchangeRates)
    ]);
    
    let homeCurrency = 'USD';
    if (settingsRes.length > 0 && settingsRes[0]?.homeCurrency) {
      homeCurrency = settingsRes[0].homeCurrency;
    }

    const ratesMap: Record<string, number> = {};
    ratesRes.forEach((r: any) => {
      if (r && r.currencyCode) {
        ratesMap[r.currencyCode] = r.rate;
      }
    });

    const destCountryObj: any = COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry);
    const destCode = destCountryObj?.code || 'FR';
    const destCurrency = destCountryObj?.currencyCode || 'EUR';

    // Calculate live exchange rate
    const fromRate = ratesMap[homeCurrency] || 1;
    const toRate = ratesMap[destCurrency] || 1;
    const convertedFx = ((1 / fromRate) * toRate).toFixed(2);

    // Calculate Days Left
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let daysLeftText = '';
    if (activeTrip.startDate) {
      const sDate = new Date(activeTrip.startDate);
      sDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((sDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        daysLeftText = `${diffDays} Days Left`;
      } else if (diffDays === 0) {
        daysLeftText = 'Starts Today!';
      } else if (activeTrip.endDate) {
        const eDate = new Date(activeTrip.endDate);
        eDate.setHours(0, 0, 0, 0);
        if (eDate >= today) {
          daysLeftText = 'Active Trip';
        } else {
          daysLeftText = 'Completed';
        }
      }
    }

    // Dates range
    let dateRangeText = '';
    if (activeTrip.startDate && activeTrip.endDate) {
      const s = new Date(activeTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = new Date(activeTrip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dateRangeText = `${s} — ${e}`;
    }

    // ----------------------------------------------------
    // WIDGET 1: Active Trip Overview (2x1 Grid)
    // ----------------------------------------------------
    await Promise.all([
      hw.setItem('trip_destination', activeTrip.destinationCountry || ''),
      hw.setItem('trip_flag', destCode),
      hw.setItem('trip_days_left', daysLeftText),
      hw.setItem('trip_date_range', dateRangeText),
      hw.setItem('trip_exchange_rate', `1 ${homeCurrency} = ${convertedFx} ${destCurrency}`)
    ]);
    await hw.updateWidget({ androidName: 'ActiveTripOverviewWidget', name: 'ActiveTripOverviewWidget' });

    // ----------------------------------------------------
    // WIDGET 2: Quick Local Info (2x2 Grid)
    // ----------------------------------------------------
    const emergData = EMERGENCY_NUMBERS[destCode] || { police: '112', ambulance: '112', fire: '112', general: '112' };
    
    // Find upcoming holiday during trip
    let holidayText = 'No upcoming local holidays';
    const holidaysByYear = PUBLIC_HOLIDAYS[destCode];
    if (holidaysByYear && activeTrip.startDate) {
      const tripStartTs = new Date(activeTrip.startDate).getTime();
      const tripEndTs = activeTrip.endDate ? new Date(activeTrip.endDate).getTime() : tripStartTs;

      const matched: PublicHoliday[] = [];
      Object.values(holidaysByYear).forEach((yHolidays) => {
        yHolidays.forEach((h) => {
          const parts = h.date.split('-');
          if (parts.length === 3) {
            const hDate = new Date(parseInt(parts[0] || '2026', 10), parseInt(parts[1] || '1', 10) - 1, parseInt(parts[2] || '1', 10));
            if (hDate.getTime() >= tripStartTs && hDate.getTime() <= tripEndTs) {
              matched.push(h);
            }
          }
        });
      });

      if (matched.length > 0 && matched[0]) {
        holidayText = formatHolidayShort(matched[0], 'en');
      }
    }

    await Promise.all([
      hw.setItem('local_country', activeTrip.destinationCountry || ''),
      hw.setItem('emerg_police', emergData.police),
      hw.setItem('emerg_ambulance', emergData.ambulance),
      hw.setItem('emerg_fire', emergData.fire),
      hw.setItem('emerg_general', emergData.general),
      hw.setItem('upcoming_holiday', holidayText)
    ]);
    await hw.updateWidget({ androidName: 'QuickLocalInfoWidget', name: 'QuickLocalInfoWidget' });

    // ----------------------------------------------------
    // WIDGET 3: Budget & Expenses (2x4 Grid)
    // ----------------------------------------------------
    const trackCurrency = activeTrip.trackCurrency || 'local';
    const activeCurrency = trackCurrency === 'home' ? homeCurrency : destCurrency;
    const activeSym = CURRENCY_SYMBOLS[activeCurrency] || activeCurrency;

    const totalSpent = expenses.reduce((sum, e) => sum + (trackCurrency === 'home' ? (e.convertedAmount || 0) : e.localAmount), 0);
    const budgetNum = activeTrip.budget || 0;
    const remaining = Math.max(0, budgetNum - totalSpent);
    const percent = budgetNum > 0 ? Math.min(1.0, totalSpent / budgetNum) : 0;

    const budgetPromises = [
      hw.setItem('budget_spent', `${activeSym}${totalSpent.toFixed(0)}`),
      hw.setItem('budget_remaining', `${activeSym}${remaining.toFixed(0)} remaining of ${activeSym}${budgetNum.toFixed(0)}`),
      hw.setItem('budget_total', `${activeSym}${budgetNum.toFixed(0)}`),
      hw.setItem('budget_percent', percent.toFixed(2))
    ];

    // Sort recent expenses desc by date
    const sortedExp = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

    for (let i = 0; i < 3; i++) {
      const idx = i + 1;
      if (i < sortedExp.length && sortedExp[i]) {
        const item = sortedExp[i];
        const icon = CATEGORY_ICONS[item.category] || '💸';
        const amtVal = trackCurrency === 'home' ? (item.convertedAmount || item.localAmount) : item.localAmount;
        budgetPromises.push(
          hw.setItem(`expense_${idx}_name`, `${icon} ${item.title}`),
          hw.setItem(`expense_${idx}_date`, formatExpenseDate(item.date)),
          hw.setItem(`expense_${idx}_amount`, `${activeSym}${amtVal.toFixed(2)}`)
        );
      } else {
        budgetPromises.push(
          hw.setItem(`expense_${idx}_name`, ''),
          hw.setItem(`expense_${idx}_date`, ''),
          hw.setItem(`expense_${idx}_amount`, '')
        );
      }
    }

    await Promise.all(budgetPromises);
    await hw.updateWidget({ androidName: 'BudgetWidget', name: 'BudgetWidget' });

  } catch (error) {
    console.error('Failed to sync widgets:', error);
  }
}
