CREATE TABLE `content_cache` (
	`package_name` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`hash` text NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`flag_icon` text NOT NULL,
	`cover_image` text NOT NULL,
	`currency_code` text NOT NULL,
	`measurement_system` text DEFAULT 'metric' NOT NULL,
	`tipping_standard` text,
	`tipping_type` text,
	`vat_rate` real,
	`timezones` text,
	`plugs` text
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`currency_code` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`local_amount` real NOT NULL,
	`converted_amount` real,
	`date` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`home_country` text,
	`home_currency` text,
	`size_format` text,
	`setup_complete` integer DEFAULT false NOT NULL,
	`active_trip_id` text,
	`system_language` text,
	`exchange_rate_sync_preference` text DEFAULT 'wifi_only',
	`is_premium` integer DEFAULT false NOT NULL,
	`module_order` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`destination_country` text NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`budget` real,
	`budget_type` text,
	`track_currency` text,
	`is_editing_budget` integer DEFAULT true,
	`currency` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vat_purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`trip_id` text NOT NULL,
	`icon_category` text NOT NULL,
	`details` text,
	`amount` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE cascade
);
