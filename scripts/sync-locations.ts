import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define output file path relative to this script
const SEED_FILE_PATH = path.resolve(__dirname, "../lib/db/src/seeds/locations-seed.json");

interface SeedDistrict {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
}

interface SeedRegion {
  name: string;
  placeId: number;
  lat: string;
  lon: string;
  districts: SeedDistrict[];
}

interface SeedCountry {
  countryCode: string;
  regions: SeedRegion[];
}

// Query the main official Overpass API with exponential backoff on 429
async function overpassFetch(query: string, attempt = 1): Promise<any[]> {
  const url = "https://overpass-api.de/api/interpreter";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "PathwaysTheoryOfChange/1.0"
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    
    if (res.status === 429) {
      const delay = Math.min(Math.pow(2, attempt) * 4000, 30000); // 8s, 16s, up to 30s backoff
      console.warn(`Overpass API rate-limited (429). Retrying in ${delay / 1000}s (attempt ${attempt})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return overpassFetch(query, attempt + 1);
    }
    
    if (!res.ok) {
      console.error(`Overpass API failed with status: ${res.status} ${res.statusText}`);
      return [];
    }
    
    const data = await res.json();
    return data.elements ?? [];
  } catch (err: any) {
    console.error(`Overpass API request failed:`, err.message || err);
    if (attempt <= 3) {
      console.log(`Retrying failed request in 5s (attempt ${attempt})...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return overpassFetch(query, attempt + 1);
    }
    return [];
  }
}

async function fetchRegions(countryCode: string): Promise<SeedRegion[]> {
  console.log(`Fetching regions for ${countryCode}...`);
  const q = `[out:json][timeout:60];area["ISO3166-1"="${countryCode.toUpperCase()}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"="4"];out tags center;`;
  const elements = await overpassFetch(q);
  
  const regions: SeedRegion[] = [];
  for (const el of elements) {
    const name = el.tags?.["name:en"] || el.tags?.name || "";
    if (!name) continue;
    regions.push({
      name,
      placeId: el.id,
      lat: el.center ? String(el.center.lat) : "0",
      lon: el.center ? String(el.center.lon) : "0",
      districts: [],
    });
  }
  
  return regions.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchDistricts(regionOsmId: number): Promise<SeedDistrict[]> {
  const areaId = 3600000000 + regionOsmId;
  const districts: SeedDistrict[] = [];
  
  for (const level of ["5", "6"]) {
    const q = `[out:json][timeout:60];area(id:${areaId})->.r;relation(area.r)["boundary"="administrative"]["admin_level"="${level}"];out tags center;`;
    const elements = await overpassFetch(q);
    
    if (elements.length >= 2) {
      for (const el of elements) {
        const name = el.tags?.["name:en"] || el.tags?.name || "";
        if (!name) continue;
        districts.push({
          name,
          placeId: el.id,
          lat: el.center ? String(el.center.lat) : "0",
          lon: el.center ? String(el.center.lon) : "0",
        });
      }
      break;
    }
  }
  
  return districts.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const targetCountries = ["KE", "EG", "GH"];
  
  let seedData: SeedCountry[] = [];
  if (fs.existsSync(SEED_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(SEED_FILE_PATH, "utf8");
      seedData = JSON.parse(raw);
    } catch {
      seedData = [];
    }
  }
  
  for (const code of targetCountries) {
    const regions = await fetchRegions(code);
    
    for (let i = 0; i < regions.length; i++) {
      const reg = regions[i];
      console.log(`[${i + 1}/${regions.length}] Fetching districts for region: ${reg.name}`);
      reg.districts = await fetchDistricts(reg.placeId);
      
      // Sleep 2 seconds between requests to prevent aggressive rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const existingIdx = seedData.findIndex(c => c.countryCode === code);
    const countryEntry: SeedCountry = { countryCode: code, regions };
    if (existingIdx !== -1) {
      seedData[existingIdx] = countryEntry;
    } else {
      seedData.push(countryEntry);
    }
  }
  
  fs.writeFileSync(SEED_FILE_PATH, JSON.stringify(seedData, null, 2), "utf8");
  console.log(`Successfully synced locations data to ${SEED_FILE_PATH}`);
}

main().catch(err => {
  console.error("Crawler error:", err);
  process.exit(1);
});
