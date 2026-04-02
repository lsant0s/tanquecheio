import {
  pgTable,
  uuid,
  integer,
  text,
  decimal,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================================
// Enums
// ==========================================

export const stationTypeEnum = pgEnum("station_type", [
  "urban",
  "highway",
  "maritime",
  "other",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "below_price",
  "drop_pct",
]);

export const syncTypeEnum = pgEnum("sync_type", [
  "dgeg_sync",
  "forecast",
  "accuracy_update",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "success",
  "partial",
  "failed",
]);

export const forecastDirectionEnum = pgEnum("forecast_direction", [
  "up",
  "down",
  "stable",
]);

// ==========================================
// Station Table
// ==========================================

export const station = pgTable(
  "station",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dgegId: integer("dgeg_id").notNull().unique(),
    codigo: text("codigo"),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    brandLogoUrl: text("brand_logo_url").default("/brands/generic-station.svg"),
    address: text("address").notNull(),
    postalCode: text("postal_code"),
    district: text("district"),
    concelho: text("concelho"),
    lat: decimal("lat").notNull(),
    lng: decimal("lng").notNull(),
    stationType: stationTypeEnum("station_type").default("other"),
    isOpen24h: boolean("is_open_24h").default(false),
    openingHours: jsonb("opening_hours"),
    fuelTypes: text("fuel_types").array().default([]),
    amenities: text("amenities").array().default([]),
    paymentMethods: text("payment_methods").array().default([]),
    isActive: boolean("is_active").default(true),
    volatility30d: jsonb("volatility_30d"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_station_dgeg_id").on(table.dgegId),
    index("idx_station_district").on(table.district),
    index("idx_station_concelho").on(table.concelho),
    index("idx_station_postal_code").on(table.postalCode),
    index("idx_station_lat_lng").on(table.lat, table.lng),
  ]
);

// ==========================================
// FuelPrice Table
// ==========================================

export const fuelPrice = pgTable(
  "fuel_price",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationId: uuid("station_id").notNull().references(() => station.id),
    fuelType: text("fuel_type").notNull(),
    price: decimal("price").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    dgegLastUpdated: timestamp("dgeg_last_updated", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_fuelprice_station_recorded").on(table.stationId, table.recordedAt.desc()),
    index("idx_fuelprice_fuel_recorded").on(table.fuelType, table.recordedAt.desc()),
    unique("uq_fuelprice").on(table.stationId, table.fuelType, table.recordedAt),
  ]
);

// ==========================================
// FuelForecast Table
// ==========================================

export const fuelForecast = pgTable(
  "fuel_forecast",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    weekOf: timestamp("week_of", { withTimezone: true }).notNull(),
    fuelType: text("fuel_type").notNull(),
    direction: forecastDirectionEnum("direction").notNull(),
    estimatedChangeEur: decimal("estimated_change_eur"),
    brentWeeklyAvg: decimal("brent_weekly_avg"),
    brentPrevWeeklyAvg: decimal("brent_prev_weekly_avg"),
    eurUsdRate: decimal("eur_usd_rate"),
    combinedSignalPct: decimal("combined_signal_pct"),
    actualChangeEur: decimal("actual_change_eur"),
    wasCorrect: boolean("was_correct"),
  },
  (table) => [
    index("idx_forecast_published").on(table.publishedAt.desc()),
    unique("uq_forecast").on(table.weekOf, table.fuelType),
  ]
);

// ==========================================
// User Table (links to Clerk)
// ==========================================

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  preferredFuelTypes: text("preferred_fuel_types").array().default([]),
  tankSizeLiters: integer("tank_size_liters"),
  district: text("district"),
  concelho: text("concelho"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// FavouriteStation Table
// ==========================================

export const favouriteStation = pgTable(
  "favourite_station",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => user.id),
    stationId: uuid("station_id").notNull().references(() => station.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [unique("uq_favourite").on(table.userId, table.stationId)]
);

// ==========================================
// PriceAlert Table
// ==========================================

export const priceAlert = pgTable(
  "price_alert",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => user.id),
    stationId: uuid("station_id").references(() => station.id),
    district: text("district"),
    concelho: text("concelho"),
    fuelType: text("fuel_type"),
    thresholdPrice: decimal("threshold_price"),
    thresholdPct: decimal("threshold_pct"),
    alertType: alertTypeEnum("alert_type").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_alert_active").on(table.isActive).where(sql<boolean>`is_active = true`)]
);

// ==========================================
// PushSubscription Table (V3)
// ==========================================

export const pushSubscription = pgTable("push_subscription", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => user.id),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ==========================================
// SyncLog Table
// ==========================================

export const syncLog = pgTable("sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  stationsAttempted: integer("stations_attempted"),
  stationsSynced: integer("stations_synced"),
  syncType: syncTypeEnum("sync_type").notNull().default("dgeg_sync"),
  status: syncStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
});

// ==========================================
// Relations
// ==========================================

export const stationRelations = relations(station, ({ many }) => ({
  fuelPrices: many(fuelPrice),
  favourites: many(favouriteStation),
  priceAlerts: many(priceAlert),
}));

export const fuelPriceRelations = relations(fuelPrice, ({ one }) => ({
  station: one(station, { fields: [fuelPrice.stationId], references: [station.id] }),
}));

export const userRelations = relations(user, ({ many }) => ({
  favouriteStations: many(favouriteStation),
  priceAlerts: many(priceAlert),
  pushSubscriptions: many(pushSubscription),
}));

export const favouriteStationRelations = relations(favouriteStation, ({ one }) => ({
  user: one(user, { fields: [favouriteStation.userId], references: [user.id] }),
  station: one(station, { fields: [favouriteStation.stationId], references: [station.id] }),
}));

export const priceAlertRelations = relations(priceAlert, ({ one }) => ({
  user: one(user, { fields: [priceAlert.userId], references: [user.id] }),
  station: one(station, { fields: [priceAlert.stationId], references: [station.id] }),
}));

export const pushSubscriptionRelations = relations(pushSubscription, ({ one }) => ({
  user: one(user, { fields: [pushSubscription.userId], references: [user.id] }),
}));