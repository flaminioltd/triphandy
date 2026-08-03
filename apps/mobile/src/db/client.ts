import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export let sqliteClient: any;
export let db: any;

try {
  sqliteClient = openDatabaseSync('triphandy_v2.db');
  
  // Initialize database schema
  sqliteClient.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    flag_icon TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    measurement_system TEXT NOT NULL DEFAULT 'metric',
    tipping_standard TEXT,
    tipping_type TEXT,
    vat_rate REAL,
    timezones TEXT,
    plugs TEXT
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    currency_code TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    home_country TEXT,
    home_currency TEXT,
    size_format TEXT,
    setup_complete INTEGER NOT NULL DEFAULT 0,
    active_trip_id TEXT,
    system_language TEXT,
    exchange_rate_sync_preference TEXT DEFAULT 'wifi_only',
    is_premium INTEGER NOT NULL DEFAULT 0,
    module_order TEXT,
    updated_at INTEGER
  );

  -- Handle migration for existing settings table (ignoring errors if column already exists)
  -- SQLite does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so it may fail if it exists.
  -- We just rely on fresh install or catching error in a real migration tool later.

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    destination_country TEXT NOT NULL,
    start_date INTEGER,
    end_date INTEGER,
    budget REAL,
    budget_type TEXT,
    track_currency TEXT,
    is_editing_budget INTEGER DEFAULT 1,
    currency TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    local_amount REAL NOT NULL,
    converted_amount REAL,
    date INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS content_cache (
    package_name TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    hash TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vat_purchases (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    icon_category TEXT NOT NULL,
    details TEXT,
    amount REAL NOT NULL,
    created_at INTEGER NOT NULL
  );
`);
} catch (error) {
  console.error("FATAL: Failed to init DB schema", error);
}

try {
  sqliteClient?.execSync('ALTER TABLE countries ADD COLUMN tipping_standard TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE countries ADD COLUMN tipping_type TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE countries ADD COLUMN vat_rate REAL;');
} catch (e) {}
try {
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE countries ADD COLUMN timezones TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE countries ADD COLUMN plugs TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE trips ADD COLUMN budget_type TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE trips ADD COLUMN track_currency TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE trips ADD COLUMN is_editing_budget INTEGER DEFAULT 1;');
} catch (e) {}
try {
  sqliteClient?.execSync('ALTER TABLE settings ADD COLUMN system_language TEXT;');
} catch (e) {}
try {
  sqliteClient?.execSync("ALTER TABLE settings ADD COLUMN exchange_rate_sync_preference TEXT DEFAULT 'wifi_only';");
} catch (e) {}
try {
  sqliteClient?.execSync("ALTER TABLE settings ADD COLUMN is_premium INTEGER DEFAULT 0 NOT NULL;");
} catch (e) {}
try {
  sqliteClient?.execSync("ALTER TABLE settings ADD COLUMN module_order TEXT;");
} catch (e) {}

try {
  if (sqliteClient) {
    db = drizzle(sqliteClient, { schema });
  }
} catch (e) {
  console.error("FATAL: Failed to init drizzle", e);
}
