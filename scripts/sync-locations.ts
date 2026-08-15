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

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

let currentEndpointIdx = 0;

// Query the main official Overpass API with endpoint rotation and exponential backoff on 429/timeout
async function overpassFetch(query: string, attempt = 1): Promise<any[]> {
  const activeIdx = (currentEndpointIdx + attempt - 1) % OVERPASS_ENDPOINTS.length;
  const url = OVERPASS_ENDPOINTS[activeIdx];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout per endpoint

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "PathwaysTheoryOfChange/2.0"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (res.status === 429) {
      const delay = Math.min(Math.pow(2, attempt) * 2000, 10000); // 2s, 4s, etc.
      console.warn(`Overpass API ${url} rate-limited (429). Rotating to next endpoint in ${delay / 1000}s (attempt ${attempt})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return overpassFetch(query, attempt + 1);
    }
    
    if (!res.ok) {
      console.error(`Overpass API ${url} failed with status: ${res.status} ${res.statusText}`);
      if (attempt <= 5) {
        return overpassFetch(query, attempt + 1);
      }
      return [];
    }
    
    const data = await res.json();
    currentEndpointIdx = activeIdx; // Remember successful endpoint index globally
    return data.elements ?? [];
  } catch (err: any) {
    console.error(`Overpass API request to ${url} failed:`, err.message || err);
    if (attempt <= 5) {
      const delay = 1000;
      console.log(`Rotating and retrying next endpoint in ${delay / 1000}s (attempt ${attempt})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
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
  
  // Search levels 5, 6, 7, 8 in sequence to support markaz, kisms, subcounties, and villages
  for (const level of ["5", "6", "7", "8"]) {
    const q = `[out:json][timeout:30];area(id:${areaId})->.r;relation(area.r)["boundary"="administrative"]["admin_level"="${level}"];out tags center;`;
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
      break; // Found valid subdivisions, exit level search loop
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
