import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { db } from '../db/client';
import { settings as dbSettings, vatPurchases } from '../db/schema';
import { eq } from 'drizzle-orm';
import { COUNTRIES } from '../lib/countries';
import { PUBLIC_HOLIDAYS, PublicHoliday } from '../lib/local-info-data';
import i18n from 'i18next';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Initialize notification handler & channels (Android requirement)
 */
export async function initNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

/**
 * Request system notification permissions
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Format holiday date with day of week and month
 * e.g., "Bastille Day (Tue, Jul 14)"
 */
function formatHolidayText(holiday: PublicHoliday, lang?: string): string {
  try {
    const parts = holiday.date.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const validLang = lang || 'en';
      const dayOfWeek = d.toLocaleDateString(validLang, { weekday: 'short' });
      const dayMonth = d.toLocaleDateString(validLang, { month: 'short', day: 'numeric' });
      return `${holiday.name} (${dayOfWeek}, ${dayMonth})`;
    }
  } catch (e) {
    // fallback
  }
  return `${holiday.name} (${holiday.date})`;
}

/**
 * Synchronize local scheduled notifications for the active trip
 */
export async function syncTripNotifications(activeTrip: any | null) {
  try {
    // Cancel all previously scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!activeTrip || !activeTrip.startDate) {
      return;
    }

    // Load home country from settings
    const settingsRes = await db.select().from(dbSettings).limit(1);
    let homeCountryCode = 'US';
    if (settingsRes.length > 0 && settingsRes[0].homeCountry) {
      const homeMatch = COUNTRIES.find((c: any) => c.code === settingsRes[0].homeCountry || c.name === settingsRes[0].homeCountry);
      if (homeMatch) {
        homeCountryCode = homeMatch.code;
      }
    }

    const homeCountryObj = COUNTRIES.find((c: any) => c.code === homeCountryCode) || COUNTRIES[0];
    const destCountryObj = COUNTRIES.find((c: any) => c.name === activeTrip.destinationCountry);
    const destCode = destCountryObj?.code || 'FR';

    const now = new Date();
    const startDate = new Date(activeTrip.startDate);
    const endDate = activeTrip.endDate ? new Date(activeTrip.endDate) : startDate;

    // 1 DAY BEFORE TRIP START (Set reminder for 9:00 AM)
    const startReminderDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    startReminderDate.setHours(9, 0, 0, 0);

    if (startReminderDate > now) {
      // 1. Outlet Adapter Reminder
      const homePlugs: { types: string[] } = homeCountryObj?.plugs || { types: [] };
      const destPlugs: { types: string[] } = destCountryObj?.plugs || { types: [] };
      const needsAdapter = !homePlugs.types.some((t: string) => destPlugs.types.includes(t));

      if (needsAdapter && destPlugs.types.length > 0) {
        const typesStr = destPlugs.types.join(', ');
        const translatedCountry = i18n.t(`countries.${destCode}`, activeTrip.destinationCountry);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications.adapterTitle', 'Outlet Adapter Reminder 🔌'),
            body: i18n.t('notifications.adapterBody', {
              country: translatedCountry,
              types: typesStr,
              defaultValue: `Don't forget to pack an outlet adapter for ${translatedCountry}! (Types: ${typesStr})`,
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: startReminderDate,
          },
        });
      }

      // 2. Local Holidays Reminder
      const holidaysByYear = PUBLIC_HOLIDAYS[destCode];
      if (holidaysByYear) {
        const relevantHolidays: PublicHoliday[] = [];
        const tripStartTs = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const tripEndTs = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();

        Object.values(holidaysByYear).forEach((yearHolidays) => {
          yearHolidays.forEach((h: PublicHoliday) => {
            const parts = h.date.split('-');
            if (parts.length === 3) {
              const hDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
              const hTs = hDate.getTime();
              if (hTs >= tripStartTs && hTs <= tripEndTs) {
                relevantHolidays.push(h);
              }
            }
          });
        });

        if (relevantHolidays.length > 0) {
          const lang = i18n.language || 'en';
          const formattedHolidayItems = relevantHolidays.map((h) => formatHolidayText(h, lang));
          const translatedCountry = i18n.t(`countries.${destCode}`, activeTrip.destinationCountry);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: i18n.t('notifications.holidayTitle', 'Upcoming Local Holidays 🗓️'),
              body: i18n.t('notifications.holidayBody', {
                country: translatedCountry,
                holidays: formattedHolidayItems.join('; '),
                defaultValue: `Local holidays during your trip in ${translatedCountry}: ${formattedHolidayItems.join('; ')}`,
              }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: startReminderDate,
            },
          });
        }
      }
    }

    // 1 DAY BEFORE TRIP END (Set reminder for 9:00 AM)
    if (activeTrip.endDate) {
      const endReminderDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      endReminderDate.setHours(9, 0, 0, 0);

      if (endReminderDate > now) {
        // 3. VAT Refund Reminder
        const vatItems = await db.select().from(vatPurchases).where(eq(vatPurchases.tripId, activeTrip.id));
        if (vatItems.length > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: i18n.t('notifications.vatTitle', 'VAT Refund Reminder 🧾'),
              body: i18n.t('notifications.vatBody', "Don't forget to prepare your purchased items and receipts for VAT refund submission!"),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: endReminderDate,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync trip notifications:', error);
  }
}
