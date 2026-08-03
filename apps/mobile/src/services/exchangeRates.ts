import { db } from '../db/client';
import { exchangeRates } from '../db/schema';
import { eq } from 'drizzle-orm';

// Function to fetch real exchange rates from an open API
async function fetchLatestRatesFromAPI() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.result === 'success' && data.rates) {
      return data.rates;
    }
  } catch (error) {
    console.warn('Network error fetching exchange rates, falling back to local cache if available.');
  }
  return null;
}

export async function shouldUpdateRates(): Promise<boolean> {
  try {
    const result = await db.select().from(exchangeRates).limit(1);
    if (!result || result.length === 0) return true;
    
    // Check the updatedAt of the first record
    const lastUpdated = new Date(result[0].updatedAt);
    const now = new Date();
    const diffInHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return diffInHours > 24;
  } catch (error) {
    console.error('Failed to check if rates should update:', error);
    return true; // Default to true if table doesn't exist yet or query fails
  }
}

export async function updateExchangeRates() {
  try {
    const rates = await fetchLatestRatesFromAPI();
    
    if (rates) {
      const now = new Date();
      const ratesToInsert = Object.entries(rates).map(([currencyCode, rate]) => ({
        currencyCode,
        rate: rate as number,
        updatedAt: now,
      }));

      // Delete old rates and insert new ones
      await db.delete(exchangeRates);
      await db.insert(exchangeRates).values(ratesToInsert);
      console.log(`Exchange rates updated. Fetched ${ratesToInsert.length} rates.`);
      return { success: true, timestamp: now };
    }
    return { success: false };
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
    return { success: false };
  }
}

export async function getExchangeRate(currencyCode: string) {
  const result = await db.select().from(exchangeRates).where(eq(exchangeRates.currencyCode, currencyCode)).limit(1);
  return result[0] || null;
}

export async function getLastSyncTime() {
  const result = await db.select({ updatedAt: exchangeRates.updatedAt }).from(exchangeRates).limit(1);
  return result[0]?.updatedAt || null;
}
