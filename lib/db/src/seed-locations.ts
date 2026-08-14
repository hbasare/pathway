import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Country, State, City } from "country-state-city";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./index.js";
import { seededRegionsTable, seededDistrictsTable } from "./schema/locations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedFilePath = path.resolve(__dirname, "seeds/locations-seed.json");

interface SeedDistrict {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
  geojson?: any;
}

interface SeedRegion {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
  geojson?: any;
  districts: SeedDistrict[];
}

interface SeedCountry {
  countryCode: string;
  regions: SeedRegion[];
}

export async function seedLocations() {
  try {
    // 1. Initial global seed using country-state-city library
    const existing = await db.select({ id: seededRegionsTable.id }).from(seededRegionsTable).limit(1);
    if (existing.length === 0) {
      console.log("Starting database locations seeding for all countries in the world...");
      const allCountries = Country.getAllCountries();
      
      let regionIdCounter = 1;
      let districtIdCounter = 1;

      const regionsBatch: any[] = [];
      const districtsBatch: any[] = [];

      for (const country of allCountries) {
        const states = State.getStatesOfCountry(country.isoCode);
        if (!states || states.length === 0) continue;

        for (const state of states) {
          const currentRegionId = regionIdCounter++;
          const regionPlaceId = 10000000 + currentRegionId;

          regionsBatch.push({
            id: currentRegionId,
            countryCode: country.isoCode,
            name: state.name,
            placeId: regionPlaceId,
            lat: state.latitude || "0",
            lon: state.longitude || "0",
            geojson: null,
          });

          const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
          if (cities && cities.length > 0) {
            for (const city of cities) {
              const currentDistrictId = districtIdCounter++;
              const districtPlaceId = 50000000 + currentDistrictId;

              districtsBatch.push({
                id: currentDistrictId,
                regionId: currentRegionId,
                name: city.name,
                placeId: districtPlaceId,
                lat: city.latitude || "0",
                lon: city.longitude || "0",
                geojson: null,
              });
            }
          }
        }
      }

      console.log(`Inserting ${regionsBatch.length} regions and ${districtsBatch.length} districts...`);
      for (let i = 0; i < regionsBatch.length; i += 2000) {
        await db.insert(seededRegionsTable).values(regionsBatch.slice(i, i + 2000));
      }
      for (let i = 0; i < districtsBatch.length; i += 2000) {
        await db.insert(seededDistrictsTable).values(districtsBatch.slice(i, i + 2000));
      }
      
      console.log("Resetting primary key sequences...");
      await db.execute(sql`SELECT setval('seeded_regions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM seeded_regions))`);
      await db.execute(sql`SELECT setval('seeded_districts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM seeded_districts))`);
      
      console.log("Global location seeding complete.");
    }

    // 2. High-fidelity OSM overlay sync using locations-seed.json
    if (fs.existsSync(seedFilePath)) {
      console.log("Checking locations-seed.json for high-fidelity OSM updates...");
      const raw = fs.readFileSync(seedFilePath, "utf8");
      const seedData = JSON.parse(raw) as SeedCountry[];

      for (const country of seedData) {
        console.log(`Enriching subdivisions with OSM IDs for country: ${country.countryCode}...`);
        for (const region of country.regions) {
          const [existingRegion] = await db
            .select()
            .from(seededRegionsTable)
            .where(and(eq(seededRegionsTable.countryCode, country.countryCode), eq(seededRegionsTable.name, region.name)))
            .limit(1);

          let regionId = existingRegion?.id;
          if (existingRegion) {
            // Update OSM details
            await db
              .update(seededRegionsTable)
              .set({
                placeId: region.placeId,
                lat: region.lat,
                lon: region.lon,
                geojson: region.geojson ?? null,
              })
              .where(eq(seededRegionsTable.id, existingRegion.id));
          } else {
            // Insert new region if not found
            const [newRegion] = await db
              .insert(seededRegionsTable)
              .values({
                countryCode: country.countryCode,
                name: region.name,
                placeId: region.placeId,
                lat: region.lat,
                lon: region.lon,
                geojson: region.geojson ?? null,
              })
              .returning();
            regionId = newRegion.id;
          }

          if (region.districts && region.districts.length > 0) {
            for (const d of region.districts) {
              const [existingDistrict] = await db
                .select()
                .from(seededDistrictsTable)
                .where(and(eq(seededDistrictsTable.regionId, regionId), eq(seededDistrictsTable.name, d.name)))
                .limit(1);

              if (existingDistrict) {
                await db
                  .update(seededDistrictsTable)
                  .set({
                    placeId: d.placeId,
                    lat: d.lat,
                    lon: d.lon,
                    geojson: d.geojson ?? null,
                  })
                  .where(eq(seededDistrictsTable.id, existingDistrict.id));
              } else {
                await db
                  .insert(seededDistrictsTable)
                  .values({
                    regionId,
                    name: d.name,
                    placeId: d.placeId,
                    lat: d.lat,
                    lon: d.lon,
                    geojson: d.geojson ?? null,
                  });
              }
            }
          }
        }
      }
      console.log("High-fidelity OSM updates synced.");
    }
  } catch (err) {
    console.error("Failed to seed locations database:", err);
  }
}
