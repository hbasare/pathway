import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { theoriesTable, theoryLocationsTable, insertTheoryLocationSchema, seededRegionsTable, seededDistrictsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logChange } from "../lib/changelog";

const router: IRouter = Router();

async function getAuthorizedTheory(req: any, id: number) {
  const orgId = req.session.orgId;
  const isGlobalAdmin = req.session.role === "system_admin" && !orgId;
  const query = db.select().from(theoriesTable);
  const [theory] = isGlobalAdmin
    ? await query.where(eq(theoriesTable.id, id))
    : await query.where(and(eq(theoriesTable.id, id), eq(theoriesTable.orgId, orgId!)));
  return theory || null;
}

router.get("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const rows = await db
    .select()
    .from(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)))
    .orderBy(theoryLocationsTable.createdAt);
  res.json(rows);
});

router.post("/theories/:theoryId/locations", async (req, res) => {
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const parsed = insertTheoryLocationSchema.safeParse({ ...req.body, theoryId, orgId: theory.orgId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(theoryLocationsTable).values(parsed.data).returning();
  await logChange(req, { theoryId, orgId: theory.orgId, action: "create", entityType: "location", entityLabel: row.displayName ?? "", summary: `Added location "${row.displayName ?? ""}"` });
  res.status(201).json(row);
});

router.patch("/theories/:theoryId/locations/:id", async (req, res) => {
  const id       = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const allowed  = [
    "icon", "figureLabel", "targetFigure", "actualFigure",
    "lat", "lng", "displayName", "community",
    "sector", "activityType", "activityDate", "activityOther", "activityCommodity",
    "beneficiaryType", "numBeneficiaries", "numMale", "numFemale",
    "gender", "youthFocused", "implementingPartner", "fundingSource", "notes",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) patch[key] = req.body[key];
  }
  patch.updatedAt = new Date();
  const [updated] = await db
    .update(theoryLocationsTable)
    .set(patch)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logChange(req, { theoryId, orgId: theory.orgId, action: "update", entityType: "location", entityLabel: updated.displayName ?? "", summary: `Updated location "${updated.displayName ?? ""}"` });
  res.json(updated);
});

router.delete("/theories/:theoryId/locations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const theoryId = Number(req.params.theoryId);
  const theory = await getAuthorizedTheory(req, theoryId);
  if (!theory) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db.select().from(theoryLocationsTable).where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)));
  await db
    .delete(theoryLocationsTable)
    .where(and(eq(theoryLocationsTable.id, id), eq(theoryLocationsTable.theoryId, theoryId), eq(theoryLocationsTable.orgId, theory.orgId)));
  if (row) {
    await logChange(req, { theoryId, orgId: theory.orgId, action: "delete", entityType: "location", entityLabel: row.displayName ?? "", summary: `Deleted location "${row.displayName ?? ""}"` });
  }
  res.status(204).send();
});

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
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout per endpoint

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
      await new Promise(resolve => setTimeout(resolve, delay));
      return overpassFetch(query, attempt + 1);
    }
    
    if (!res.ok) {
      if (attempt <= 5) return overpassFetch(query, attempt + 1);
      return [];
    }
    
    const data = await res.json();
    currentEndpointIdx = activeIdx;
    return data.elements ?? [];
  } catch (err: any) {
    if (attempt <= 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return overpassFetch(query, attempt + 1);
    }
    return [];
  }
}

const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya",
  EG: "Egypt",
  GH: "Ghana",
  UG: "Uganda",
  TZ: "Tanzania",
  NG: "Nigeria"
};

async function fetchOsmRelationId(regionName: string, countryCode: string): Promise<number | null> {
  try {
    const cleanNameStr = regionName.replace(/\b(region|county|state|province|governorate|wilaya|oblast|district)\b/gi, "").trim();
    const countryName = COUNTRY_NAMES[countryCode.toUpperCase()] || "";

    // Try area search using ISO code, fallback to country name
    let q = `[out:json][timeout:15];
area["ISO3166-1"="${countryCode.toUpperCase()}"]->.c;
relation(area.c)["boundary"="administrative"]["admin_level"="4"]["name"~"${cleanNameStr}",i];
out tags center;`;
    let elements = await overpassFetch(q);

    if (elements.length === 0 && countryName) {
      q = `[out:json][timeout:15];
area["name:en"="${countryName}"]->.c;
relation(area.c)["boundary"="administrative"]["admin_level"="4"]["name"~"${cleanNameStr}",i];
out tags center;`;
      elements = await overpassFetch(q);
    }

    if (elements.length > 0) {
      return elements[0].id;
    }

    // Fallback: search globally for the relation matching the region name and country code
    q = `[out:json][timeout:15];
relation["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^${countryCode.toUpperCase()}-",i]["name"~"${cleanNameStr}",i];
out tags center;`;
    elements = await overpassFetch(q);
    if (elements.length > 0) {
      return elements[0].id;
    }

    return null;
  } catch (err) {
    console.error(`Failed to fetch OSM relation ID for ${regionName}:`, err);
    return null;
  }
}

async function fetchOsmDistricts(regionOsmId: number): Promise<Array<{ name: string; placeId: number; lat: string; lon: string }> | null> {
  const areaId = 3600000000 + regionOsmId;
  
  // Search levels 5, 6, 7, 8 in sequence to support markaz, kisms, subcounties, and villages
  for (const level of ["5", "6", "7", "8"]) {
    const q = `[out:json][timeout:15];area(id:${areaId})->.r;relation(area.r)["boundary"="administrative"]["admin_level"="${level}"];out tags center;`;
    try {
      const elements = await overpassFetch(q);
      if (elements.length >= 2) {
        return elements.map((el: any) => ({
          name: el.tags?.["name:en"] || el.tags?.name || "",
          placeId: el.id,
          lat: el.center ? String(el.center.lat) : "0",
          lon: el.center ? String(el.center.lon) : "0",
        })).filter((x: any) => x.name !== "");
      }
    } catch (err) {
      console.error(`Failed to fetch OSM districts for relation ${regionOsmId} at level ${level}:`, err);
    }
  }
  return null;
}

router.get("/locations/regions", async (req, res) => {
  const countryCode = (req.query.countryCode as string || "").toUpperCase();
  if (!countryCode) {
    res.status(400).json({ error: "countryCode query parameter is required" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(seededRegionsTable)
      .where(eq(seededRegionsTable.countryCode, countryCode))
      .orderBy(seededRegionsTable.name);
    
    const mapped = rows.map(r => ({
      id: r.id,
      place_id: r.placeId,
      display_name: r.name,
      lat: r.lat,
      lon: r.lon,
      type: "administrative",
      class: "boundary",
      address: { state: r.name, region: r.name },
      geojson: r.geojson ?? undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("Error fetching regions from DB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/locations/districts", async (req, res) => {
  const regionId = Number(req.query.regionId);
  if (isNaN(regionId)) {
    res.status(400).json({ error: "regionId query parameter must be a number" });
    return;
  }
  try {
    const [region] = await db
      .select()
      .from(seededRegionsTable)
      .where(eq(seededRegionsTable.id, regionId))
      .limit(1);

    if (!region) {
      res.status(404).json({ error: "Region not found" });
      return;
    }

    let districts = await db
      .select()
      .from(seededDistrictsTable)
      .where(eq(seededDistrictsTable.regionId, regionId))
      .orderBy(seededDistrictsTable.name);

    // If districts are empty or are placeholder library records (placeId >= 50000000), query OSM to self-heal/sync
    const isPlaceholder = districts.length === 0 || districts.some(d => d.placeId >= 50000000);

    if (isPlaceholder) {
      console.log(`Region "${region.name}" has placeholder or empty districts. Attempting lazy OSM sync...`);
      let osmRelationId: number | null = null;

      if (region.placeId >= 20000000) {
        osmRelationId = await fetchOsmRelationId(region.name, region.countryCode);
        if (osmRelationId) {
          await db
            .update(seededRegionsTable)
            .set({ placeId: osmRelationId })
            .where(eq(seededRegionsTable.id, regionId));
        }
      } else {
        osmRelationId = region.placeId;
      }

      if (osmRelationId) {
        const osmDistricts = await fetchOsmDistricts(osmRelationId);
        if (osmDistricts && osmDistricts.length > 0) {
          await db.delete(seededDistrictsTable).where(eq(seededDistrictsTable.regionId, regionId));
          const insertBatch = osmDistricts.map(d => ({
            regionId,
            name: d.name,
            placeId: d.placeId,
            lat: d.lat,
            lon: d.lon,
            geojson: null,
          }));
          await db.insert(seededDistrictsTable).values(insertBatch);
          
          districts = await db
            .select()
            .from(seededDistrictsTable)
            .where(eq(seededDistrictsTable.regionId, regionId))
            .orderBy(seededDistrictsTable.name);
          console.log(`Successfully completed lazy OSM sync for "${region.name}". Cached ${districts.length} districts.`);
        }
      }
    }

    const mapped = districts.map(d => ({
      id: d.id,
      place_id: d.placeId,
      display_name: d.name,
      lat: d.lat,
      lon: d.lon,
      type: "administrative",
      class: "boundary",
      address: { county: d.name },
      geojson: d.geojson ?? undefined,
    }));
    res.json(mapped);
  } catch (err) {
    console.error("Error fetching districts from DB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
