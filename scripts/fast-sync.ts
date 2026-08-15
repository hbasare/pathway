import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

async function overpassFetch(query: string, attempt = 1): Promise<any[]> {
  const activeIdx = (currentEndpointIdx + attempt - 1) % OVERPASS_ENDPOINTS.length;
  const url = OVERPASS_ENDPOINTS[activeIdx];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "PathwaysTheoryOfChange/3.0"
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (res.status === 429) {
      const delay = Math.min(Math.pow(2, attempt) * 2000, 10000);
      console.warn(`Overpass API ${url} rate-limited. Retrying next endpoint in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return overpassFetch(query, attempt + 1);
    }
    
    if (!res.ok) {
      console.error(`Overpass API ${url} failed: ${res.status}`);
      if (attempt <= 5) return overpassFetch(query, attempt + 1);
      return [];
    }
    
    const data = await res.json();
    currentEndpointIdx = activeIdx;
    return data.elements ?? [];
  } catch (err: any) {
    console.error(`Overpass API ${url} failed:`, err.message || err);
    if (attempt <= 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return overpassFetch(query, attempt + 1);
    }
    return [];
  }
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function cleanName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\b(region|county|state|province|governorate|wilaya|oblast|district|municipal|lga)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya",
  EG: "Egypt",
  GH: "Ghana"
};

async function syncCountry(countryCode: string): Promise<SeedRegion[]> {
  console.log(`Syncing ${countryCode} in parallel...`);
  const nameSelector = COUNTRY_NAMES[countryCode.toUpperCase()] || "";
  
  // 1. Fetch regions
  let regionsQuery = `[out:json][timeout:90];area["ISO3166-1"="${countryCode.toUpperCase()}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"="4"];out tags center;`;
  let regionElements = await overpassFetch(regionsQuery);
  
  if (regionElements.length === 0 && nameSelector) {
    console.log(`No regions found using ISO area for ${countryCode}. Trying name:en area...`);
    regionsQuery = `[out:json][timeout:90];area["name:en"="${nameSelector}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"="4"];out tags center;`;
    regionElements = await overpassFetch(regionsQuery);
  }

  if (regionElements.length === 0) {
    console.error(`No regions found for ${countryCode}`);
    return [];
  }

  const regions: SeedRegion[] = regionElements.map(el => ({
    name: el.tags?.["name:en"] || el.tags?.name || "",
    placeId: el.id,
    lat: el.center ? String(el.center.lat) : "0",
    lon: el.center ? String(el.center.lon) : "0",
    districts: [],
  })).filter(r => r.name !== "");

  console.log(`Found ${regions.length} regions in ${countryCode}. Fetching all districts...`);

  // 2. Fetch districts
  let districtsQuery = `[out:json][timeout:90];area["ISO3166-1"="${countryCode.toUpperCase()}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"~"5|6|7|8"];out tags center;`;
  let districtElements = await overpassFetch(districtsQuery);
  
  if (districtElements.length === 0 && nameSelector) {
    console.log(`No districts found using ISO area for ${countryCode}. Trying name:en area...`);
    districtsQuery = `[out:json][timeout:90];area["name:en"="${nameSelector}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"~"5|6|7|8"];out tags center;`;
    districtElements = await overpassFetch(districtsQuery);
  }

  console.log(`Found ${districtElements.length} raw subdivision elements. Mapping to parent regions...`);

  // 3. Map
  for (const el of districtElements) {
    const name = el.tags?.["name:en"] || el.tags?.name || "";
    if (!name) continue;
    
    const lat = el.center ? Number(el.center.lat) : 0;
    const lon = el.center ? Number(el.center.lon) : 0;
    if (lat === 0 && lon === 0) continue;

    let parentRegion: SeedRegion | undefined;
    const isIn = (el.tags?.["is_in:county"] || el.tags?.["is_in:state"] || el.tags?.["is_in"] || "").toLowerCase();
    if (isIn) {
      parentRegion = regions.find(r => isIn.includes(cleanName(r.name)));
    }

    if (!parentRegion) {
      let minDist = Infinity;
      for (const r of regions) {
        const rLat = Number(r.lat);
        const rLon = Number(r.lon);
        const dist = getDistance(lat, lon, rLat, rLon);
        if (dist < minDist) {
          minDist = dist;
          parentRegion = r;
        }
      }
    }

    if (parentRegion) {
      parentRegion.districts.push({
        name,
        placeId: el.id,
        lat: String(lat),
        lon: String(lon),
      });
    }
  }

  // Clean, deduplicate and sort
  for (const r of regions) {
    const seen = new Set<number>();
    r.districts = r.districts.filter(d => {
      if (seen.has(d.placeId)) return false;
      seen.add(d.placeId);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Region "${r.name}" has ${r.districts.length} districts.`);
  }

  return regions.sort((a, b) => a.name.localeCompare(b.name));
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
    const regions = await syncCountry(code);
    if (regions.length > 0) {
      const existingIdx = seedData.findIndex(c => c.countryCode === code);
      const countryEntry: SeedCountry = { countryCode: code, regions };
      if (existingIdx !== -1) {
        seedData[existingIdx] = countryEntry;
      } else {
        seedData.push(countryEntry);
      }
    }
  }

  fs.writeFileSync(SEED_FILE_PATH, JSON.stringify(seedData, null, 2), "utf8");
  console.log(`Successfully completed fast sync of locations data to ${SEED_FILE_PATH}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fast sync failed:", err);
  process.exit(1);
});
