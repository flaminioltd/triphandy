import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const countries = sqliteTable('countries', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  flagIcon: text('flag_icon').notNull(),
  coverImage: text('cover_image').notNull(),
  currencyCode: text('currency_code').notNull(),
  measurementSystem: text('measurement_system').notNull().default('metric'),
  tippingStandard: text('tipping_standard'),
  tippingType: text('tipping_type'),
  vatRate: real('vat_rate'),
  timezones: text('timezones'),
  plugs: text('plugs'),
});

export const exchangeRates = sqliteTable('exchange_rates', {
  currencyCode: text('currency_code').primaryKey(),
  rate: real('rate').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  homeCountry: text('home_country'),
  homeCurrency: text('home_currency'),
  sizeFormat: text('size_format'),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).default(false).notNull(),
  activeTripId: text('active_trip_id'),
  systemLanguage: text('system_language'),
  exchangeRateSyncPreference: text('exchange_rate_sync_preference').default('wifi_only'),
  isPremium: integer('is_premium', { mode: 'boolean' }).default(false).notNull(),
  moduleOrder: text('module_order'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  destinationCountry: text('destination_country').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  budget: real('budget'),
  budgetType: text('budget_type'),
  trackCurrency: text('track_currency'),
  isEditingBudget: integer('is_editing_budget', { mode: 'boolean' }).default(true),
  currency: text('currency'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  localAmount: real('local_amount').notNull(),
  convertedAmount: real('converted_amount'),
  date: integer('date', { mode: 'timestamp' }).notNull(),
});

export const contentCache = sqliteTable('content_cache', {
  packageName: text('package_name').primaryKey(),
  version: text('version').notNull(),
  hash: text('hash').notNull(),
  content: text('content').notNull(), // Stored as JSON string
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const vatPurchases = sqliteTable('vat_purchases', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  iconCategory: text('icon_category').notNull(),
  details: text('details'),
  amount: real('amount').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
