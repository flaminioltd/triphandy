import { db } from './client';
import { countries } from './schema';
import { eq } from 'drizzle-orm';
import { COUNTRIES } from '../lib/countries';

const CURRENCY_MAP: Record<string, string> = {
  US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD',
  IE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', TR: 'TRY',
  DE: 'EUR', GR: 'EUR', AT: 'EUR', PT: 'EUR', NL: 'EUR',
  PL: 'PLN', HR: 'EUR', CZ: 'CZK', CH: 'CHF', DK: 'DKK',
  HU: 'HUF', SE: 'SEK', BE: 'EUR', NO: 'NOK', CN: 'CNY',
  JP: 'JPY', TH: 'THB', VN: 'VND', KR: 'KRW', IN: 'INR',
  MX: 'MXN', BR: 'BRL', AR: 'ARS'
};

export async function seedDatabase() {
  const countRes = await db.select().from(countries).limit(1);
  const isSeeded = countRes.length > 0;

  const countriesToInsert = COUNTRIES.map(c => ({
    code: c.code,
    name: c.name,
    region: c.region,
    flagIcon: c.code.toLowerCase() + '.png', // placeholder for asset names
    coverImage: c.code.toLowerCase() + '_cover.jpg', 
    currencyCode: CURRENCY_MAP[c.code] || 'USD',
    measurementSystem: c.code === 'US' ? 'imperial' : 'metric',
    tippingStandard: c.tippingStandard,
    tippingType: c.tippingType,
    vatRate: c.vatRate,
  }));

  try {
    if (!isSeeded) {
      await db.insert(countries).values(countriesToInsert);
      console.log('Database seeded with countries.');
    } else {
      // Check if we need to update tipping/VAT data by checking the first country
      const firstCountry = countRes[0];
      if (firstCountry.tippingStandard === null && firstCountry.vatRate === null) {
        // Wrap in transaction so it executes instantly instead of blocking the DB queue for seconds
        await db.transaction(async (tx) => {
          for (const c of countriesToInsert) {
            await tx.update(countries)
              .set({ tippingStandard: c.tippingStandard, tippingType: c.tippingType, vatRate: c.vatRate })
              .where(eq(countries.code, c.code));
          }
        });
        console.log('Database updated with tipping and VAT data for countries.');
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
