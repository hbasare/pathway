import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Country, State, City } from "country-state-city";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./index.js";
import { seededRegionsTable, seededDistrictsTable } from "./schema/locations.js";

let seedFilePath = "";
try {
  const filename = fileURLToPath(import.meta.url);
  const dirname = path.dirname(filename);
  seedFilePath = path.resolve(dirname, "seeds/locations-seed.json");
} catch {
  // CommonJS fallback (when bundled in api-server)
  seedFilePath = path.resolve(__dirname, "../../../lib/db/src/seeds/locations-seed.json");
}

// Fallback search paths if the primary one doesn't exist
if (seedFilePath === "" || !fs.existsSync(seedFilePath)) {
  const possiblePaths = [
    path.resolve(process.cwd(), "lib/db/src/seeds/locations-seed.json"),
    path.resolve(process.cwd(), "../../lib/db/src/seeds/locations-seed.json"),
    path.resolve(__dirname, "seeds/locations-seed.json"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      seedFilePath = p;
      break;
    }
  }
}

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

// Clean names for matching (remove region, county, state, province, etc. and trim/lowercase)
function cleanName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\b(region|county|state|province|governorate|wilaya|oblast|district|municipal|lga)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
        
        // Fetch all current regions in the database for this country
        const dbRegions = await db
          .select()
          .from(seededRegionsTable)
          .where(eq(seededRegionsTable.countryCode, country.countryCode));

        for (const region of country.regions) {
          const cleanInputRegion = cleanName(region.name);
          const existingRegion = dbRegions.find(r => cleanName(r.name) === cleanInputRegion);

          let regionId: number;
          if (existingRegion) {
            // Update OSM details and promote to OSM region name (high-fidelity name)
            await db
              .update(seededRegionsTable)
              .set({
                name: region.name, // Promote to OSM name (e.g. "Upper West Region")
                placeId: region.placeId,
                lat: region.lat,
                lon: region.lon,
                geojson: region.geojson ?? null,
              })
              .where(eq(seededRegionsTable.id, existingRegion.id));
            regionId = existingRegion.id;
          } else {
            // Insert new region if not found at all
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

          if (!regionId) continue;

          if (region.districts && region.districts.length > 0) {
            // Delete existing districts for this region to clean out old placeholders
            await db
              .delete(seededDistrictsTable)
              .where(eq(seededDistrictsTable.regionId, regionId));

            // Insert high-fidelity districts
            const valuesToInsert = region.districts.map(d => ({
              regionId,
              name: d.name,
              placeId: d.placeId,
              lat: d.lat,
              lon: d.lon,
              geojson: d.geojson ?? null,
            }));

            // Batch insert in chunks of 500
            for (let chunkStart = 0; chunkStart < valuesToInsert.length; chunkStart += 500) {
              await db
                .insert(seededDistrictsTable)
                .values(valuesToInsert.slice(chunkStart, chunkStart + 500));
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
