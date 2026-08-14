import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
    if (!fs.existsSync(seedFilePath)) {
      console.warn(`Location seed file not found at ${seedFilePath}. Skipping.`);
      return;
    }

    console.log("Starting locations database seeding (upsert mode)...");
    const raw = fs.readFileSync(seedFilePath, "utf8");
    const seedData = JSON.parse(raw) as SeedCountry[];

    let regionCount = 0;
    let districtCount = 0;

    for (const country of seedData) {
      console.log(`Seeding/Updating subdivisions for country: ${country.countryCode}...`);
      for (const region of country.regions) {
        // Upsert region
        const [insertedRegion] = await db.insert(seededRegionsTable).values({
          countryCode: country.countryCode,
          name: region.name,
          placeId: region.placeId,
          lat: region.lat,
          lon: region.lon,
          geojson: region.geojson ?? null,
        })
        .onConflictDoUpdate({
          target: seededRegionsTable.placeId,
          set: {
            name: region.name,
            lat: region.lat,
            lon: region.lon,
            geojson: region.geojson ?? null,
          }
        })
        .returning();

        regionCount++;

        if (region.districts && region.districts.length > 0) {
          for (const d of region.districts) {
            // Upsert district
            await db.insert(seededDistrictsTable).values({
              regionId: insertedRegion.id,
              name: d.name,
              placeId: d.placeId,
              lat: d.lat,
              lon: d.lon,
              geojson: d.geojson ?? null,
            })
            .onConflictDoUpdate({
              target: seededDistrictsTable.placeId,
              set: {
                regionId: insertedRegion.id,
                name: d.name,
                lat: d.lat,
                lon: d.lon,
                geojson: d.geojson ?? null,
              }
            });
            districtCount++;
          }
        }
      }
    }

    console.log(`Successfully seeded/updated ${regionCount} regions and ${districtCount} districts.`);
  } catch (err) {
    console.error("Failed to seed locations database:", err);
  }
}
