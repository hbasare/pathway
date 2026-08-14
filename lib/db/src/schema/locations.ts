import { pgTable, serial, text, integer, jsonb } from "drizzle-orm/pg-core";

export const seededRegionsTable = pgTable("seeded_regions", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(), // e.g. "KE"
  name: text("name").notNull(),
  placeId: integer("place_id").notNull().unique(), // OSM relation ID (unique)
  lat: text("lat").notNull(),
  lon: text("lon").notNull(),
  geojson: jsonb("geojson"),
});

export const seededDistrictsTable = pgTable("seeded_districts", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").notNull().references(() => seededRegionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  placeId: integer("place_id").notNull().unique(), // OSM relation ID (unique)
  lat: text("lat").notNull(),
  lon: text("lon").notNull(),
  geojson: jsonb("geojson"),
});
