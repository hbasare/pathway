import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MapPin, Plus, Trash2, Loader2, Search, Globe,
  Check, Navigation, Target, TrendingUp, Pencil, X, Printer,
  Users, Briefcase, Building2, ChevronDown,
  Upload, FileText, AlertCircle, Download, Table2,
} from "lucide-react";
import type { Theory } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Tile layers ───────────────────────────────────────────────────────────────
const TILE_LAYERS: Record<string, { url: string; subdomains?: string; attribution: string }> = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  fr: {
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.openstreetmap.fr">OSM France</a>',
  },
};
const NOMINATIM_LANG: Record<string, string> = {
  en: "en", fr: "fr", pt: "pt", es: "es",
  it: "it", nl: "nl", sw: "sw,en", ha: "ha,en", af: "af,en",
};

// ── Visual marker icons ───────────────────────────────────────────────────────
const MARKER_ICONS = [
  { id: "general",        emoji: "📍", label: "General" },
  { id: "education",      emoji: "🏫", label: "Education" },
  { id: "health",         emoji: "🏥", label: "Health" },
  { id: "agriculture",    emoji: "🌾", label: "Agriculture" },
  { id: "water",          emoji: "💧", label: "WASH" },
  { id: "livelihoods",    emoji: "💼", label: "Livelihoods" },
  { id: "governance",     emoji: "🏛️",  label: "Governance" },
  { id: "humanitarian",   emoji: "🚨", label: "Humanitarian" },
  { id: "environment",    emoji: "🌿", label: "Environment" },
  { id: "infrastructure", emoji: "🏗️",  label: "Infrastructure" },
  { id: "community",      emoji: "👥", label: "Community" },
  { id: "research",       emoji: "🔬", label: "Research" },
];
const markerEmoji = (id: string | null | undefined) =>
  MARKER_ICONS.find(m => m.id === (id ?? "general"))?.emoji ?? "📍";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationRecord {
  id: number; theoryId: number;
  displayName: string; country: string; countryCode: string;
  adminLevel1: string; adminLevel2: string; community: string;
  lat: number | null; lng: number | null;
  boundaryGeoJson: string; level: string; nominatimId: string;
  icon: string; figureLabel: string; targetFigure: string; actualFigure: string;
  // GIS extended fields
  sector: string; activityType: string; activityDate: string; activityOther: string; activityCommodity: string; beneficiaryType: string;
  numBeneficiaries: number | null; numMale: number | null; numFemale: number | null;
  gender: string; youthFocused: boolean;
  implementingPartner: string; fundingSource: string; notes: string;
}

// ── GIS option lists ──────────────────────────────────────────────────────────
const SECTORS = ["Agriculture","Health","Education","WASH","Livelihoods","Governance","Nutrition","Environment","Infrastructure","Humanitarian","Market Systems","Research"];
const ACTIVITY_TYPES = ["Training","Grant / Cash Transfer","Input Distribution","Technical Assistance","Capacity Building","Demonstration / Pilot","Community Mobilisation","Market Linkage","Infrastructure Works","Research / Survey","Monitoring Visit","Agriculture","Other"];
const ACTIVITY_TYPE_ICON_MAP: Record<string, string> = {
  "Training":               "education",
  "Grant / Cash Transfer":  "livelihoods",
  "Input Distribution":     "agriculture",
  "Technical Assistance":   "general",
  "Capacity Building":      "community",
  "Demonstration / Pilot":  "research",
  "Community Mobilisation": "community",
  "Market Linkage":         "livelihoods",
  "Infrastructure Works":   "infrastructure",
  "Research / Survey":      "research",
  "Monitoring Visit":       "general",
  "Agriculture":            "agriculture",
  "Other":                  "general",
};
function activityEmoji(activityType: string) {
  return markerEmoji(ACTIVITY_TYPE_ICON_MAP[activityType] ?? "general");
}
const BENEFICIARY_TYPES = ["Farmers","Smallholders","Agri-businesses","SMEs","Cooperatives","Schools","Health Facilities","Communities","Households","Youth Groups","Women's Groups","Processing Facilities","Markets","Service Providers","Other"];
const GENDER_OPTIONS = ["Mixed","Male","Female","Male-led","Female-led"];
const SECTOR_COLOURS: Record<string, string> = {
  Agriculture: "#84cc16", Health: "#ec4899", Education: "#3b82f6", WASH: "#06b6d4",
  Livelihoods: "#f97316", Governance: "#8b5cf6", Nutrition: "#eab308", Environment: "#10b981",
  Infrastructure: "#6366f1", Humanitarian: "#ef4444", "Market Systems": "#14b8a6", Research: "#a855f7",
};
interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string;
  geojson?: object;
  address?: { country?: string; country_code?: string; state?: string; county?: string; municipality?: string; city?: string; district?: string; region?: string };
  type: string; class: string;
}
interface Country { name: string; code: string; }
interface ConfirmedLoc {
  uid: string;
  country: Country;
  region: NominatimResult | null;
  district: NominatimResult | null;
  lat: number; lng: number;
  boundaryGeoJson: string;
  level: "country" | "admin1" | "admin2";
  displayName: string;
}
// ── Constants ─────────────────────────────────────────────────────────────────
const COLOURS = [
  "#6366f1","#f97316","#10b981","#ec4899","#3b82f6",
  "#eab308","#8b5cf6","#14b8a6","#ef4444","#06b6d4",
  "#84cc16","#f43f5e","#0ea5e9","#a855f7","#22d3ee",
];

const COUNTRIES: Country[] = [
  { name: "Afghanistan", code: "af" }, { name: "Angola", code: "ao" },
  { name: "Bangladesh", code: "bd" }, { name: "Benin", code: "bj" },
  { name: "Bolivia", code: "bo" }, { name: "Botswana", code: "bw" },
  { name: "Brazil", code: "br" }, { name: "Burkina Faso", code: "bf" },
  { name: "Burundi", code: "bi" }, { name: "Cambodia", code: "kh" },
  { name: "Cameroon", code: "cm" }, { name: "Central African Republic", code: "cf" },
  { name: "Chad", code: "td" }, { name: "Colombia", code: "co" },
  { name: "Comoros", code: "km" }, { name: "Congo (DRC)", code: "cd" },
  { name: "Congo (Republic)", code: "cg" }, { name: "Côte d'Ivoire", code: "ci" },
  { name: "Ecuador", code: "ec" }, { name: "Egypt", code: "eg" },
  { name: "El Salvador", code: "sv" }, { name: "Eritrea", code: "er" },
  { name: "Eswatini", code: "sz" }, { name: "Ethiopia", code: "et" },
  { name: "Gambia", code: "gm" }, { name: "Ghana", code: "gh" },
  { name: "Guatemala", code: "gt" }, { name: "Guinea", code: "gn" },
  { name: "Guinea-Bissau", code: "gw" }, { name: "Haiti", code: "ht" },
  { name: "Honduras", code: "hn" }, { name: "India", code: "in" },
  { name: "Indonesia", code: "id" }, { name: "Iraq", code: "iq" },
  { name: "Jordan", code: "jo" }, { name: "Kenya", code: "ke" },
  { name: "Laos", code: "la" }, { name: "Lebanon", code: "lb" },
  { name: "Lesotho", code: "ls" }, { name: "Liberia", code: "lr" },
  { name: "Libya", code: "ly" }, { name: "Madagascar", code: "mg" },
  { name: "Malawi", code: "mw" }, { name: "Mali", code: "ml" },
  { name: "Mauritania", code: "mr" }, { name: "Mozambique", code: "mz" },
  { name: "Myanmar", code: "mm" }, { name: "Namibia", code: "na" },
  { name: "Nepal", code: "np" }, { name: "Nicaragua", code: "ni" },
  { name: "Niger", code: "ne" }, { name: "Nigeria", code: "ng" },
  { name: "Pakistan", code: "pk" }, { name: "Palestine", code: "ps" },
  { name: "Papua New Guinea", code: "pg" }, { name: "Paraguay", code: "py" },
  { name: "Peru", code: "pe" }, { name: "Philippines", code: "ph" },
  { name: "Rwanda", code: "rw" }, { name: "Senegal", code: "sn" },
  { name: "Sierra Leone", code: "sl" }, { name: "Somalia", code: "so" },
  { name: "South Africa", code: "za" }, { name: "South Sudan", code: "ss" },
  { name: "Sri Lanka", code: "lk" }, { name: "Sudan", code: "sd" },
  { name: "Syria", code: "sy" }, { name: "Tanzania", code: "tz" },
  { name: "Timor-Leste", code: "tl" }, { name: "Togo", code: "tg" },
  { name: "Tunisia", code: "tn" }, { name: "Uganda", code: "ug" },
  { name: "Ukraine", code: "ua" }, { name: "Venezuela", code: "ve" },
  { name: "Vietnam", code: "vn" }, { name: "Yemen", code: "ye" },
  { name: "Zambia", code: "zm" }, { name: "Zimbabwe", code: "zw" },
].sort((a, b) => a.name.localeCompare(b.name));

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortNameStr(loc: LocationRecord) {
  if (loc.adminLevel2) return loc.adminLevel2;
  if (loc.adminLevel1) return loc.adminLevel1;
  return loc.country;
}
function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// ── Map helpers ───────────────────────────────────────────────────────────────
function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2.5px solid rgba(255,255,255,.95)"><span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span></div>`,
    iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -38],
  });
}

function FitBounds({ locations }: { locations: LocationRecord[] }) {
  const map = useMap();
  const key = locations.map(l => l.id).join(",");
  useEffect(() => {
    if (!locations.length) return;
    const pts: [number, number][] = [];
    locations.forEach(loc => {
      if (loc.lat != null && loc.lng != null) pts.push([loc.lat, loc.lng]);
      if (loc.boundaryGeoJson) {
        try {
          const b = L.geoJSON(JSON.parse(loc.boundaryGeoJson)).getBounds();
          if (b.isValid()) { pts.push([b.getNorth(), b.getEast()]); pts.push([b.getSouth(), b.getWest()]); }
        } catch { /* skip */ }
      }
    });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 10 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// ── Nominatim helpers ─────────────────────────────────────────────────────────
function regionDisplayName(r: NominatimResult): string {
  return r.address?.state ?? r.address?.region ?? r.display_name.split(",")[0].trim();
}
function districtDisplayName(r: NominatimResult): string {
  return r.address?.county ?? r.address?.district ?? r.address?.municipality ?? r.address?.city ?? r.display_name.split(",")[0].trim();
}
async function nomFetch(params: Record<string, string>, acceptLang: string): Promise<NominatimResult[]> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`, { headers: { "Accept-Language": acceptLang } });
    return res.ok ? (await res.json() as NominatimResult[]) : [];
  } catch { return []; }
}
function mergeUnique(lists: NominatimResult[][]): NominatimResult[] {
  const seen = new Set<number>();
  const out: NominatimResult[] = [];
  for (const r of lists.flat()) { if (!seen.has(r.place_id)) { seen.add(r.place_id); out.push(r); } }
  return out;
}

// ── Overpass API helpers ──────────────────────────────────────────────────────
// Overpass filters by OSM admin_level tag, which is the reliable way to find
// all first-level subdivisions regardless of whether they're called "state",
// "county", "province", "department", "governorate", "wilaya", etc.
interface OverpassElement {
  id: number; type: string;
  tags: Record<string, string>;
  center?: { lat: number; lon: number };
}
async function overpassFetch(query: string): Promise<OverpassElement[]> {
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements ?? []) as OverpassElement[];
  } catch { return []; }
}
function overpassToNominatim(el: OverpassElement, lang: string, addrKey: "state" | "county" = "state"): NominatimResult {
  const lc = lang.split(",")[0];
  const name = el.tags[`name:${lc}`] || el.tags["name:en"] || el.tags.name || "";
  return {
    place_id: el.id,
    display_name: name,
    lat: el.center ? String(el.center.lat) : "0",
    lon: el.center ? String(el.center.lon) : "0",
    type: "administrative", class: "boundary",
    address: { [addrKey]: name, region: name } as NominatimResult["address"],
  };
}
// First-level subdivisions: try admin_level 4 (covers ~90% of countries in
// international development work), then fall back to 3, 5, 6.
async function fetchRegionsOverpass(countryCode: string, lang: string): Promise<NominatimResult[]> {
  const code = countryCode.toUpperCase();
  for (const level of ["4", "3", "5", "6"]) {
    const q = `[out:json][timeout:20];area["ISO3166-1"="${code}"]->.c;relation(area.c)["boundary"="administrative"]["admin_level"="${level}"];out tags center;`;
    const els = await overpassFetch(q);
    if (els.length >= 2) {
      return els.map(el => overpassToNominatim(el, lang, "state")).filter(r => r.display_name.trim());
    }
  }
  return [];
}
// Second-level subdivisions within a given region relation ID.
async function fetchDistrictsOverpass(regionOsmId: number, lang: string): Promise<NominatimResult[]> {
  const areaId = 3600000000 + regionOsmId;
  for (const level of ["5", "6", "7", "8"]) {
    const q = `[out:json][timeout:20];area(id:${areaId})->.r;relation(area.r)["boundary"="administrative"]["admin_level"="${level}"];out tags center;`;
    const els = await overpassFetch(q);
    if (els.length >= 2) {
      return els.map(el => overpassToNominatim(el, lang, "county")).filter(r => r.display_name.trim());
    }
  }
  return [];
}
// Batch-fetch GeoJSON polygons from Nominatim for up to 50 OSM relation IDs.
// Used to attach boundary overlays after Overpass gives us the list.
async function batchFetchGeoJson(osmRelIds: number[]): Promise<Map<number, object>> {
  if (!osmRelIds.length) return new Map();
  try {
    const ids = osmRelIds.slice(0, 50).map(id => `R${id}`).join(",");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${ids}&format=json&polygon_geojson=1`,
      { headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return new Map();
    const data = (await res.json()) as Array<{ osm_id: string; geojson?: object }>;
    return new Map(data.filter(d => d.geojson).map(d => [parseInt(d.osm_id), d.geojson!]));
  } catch { return new Map(); }
}

// ── CSV / GPS upload helpers ──────────────────────────────────────────────────
interface GpsRow {
  lat: number; lon: number;
  name: string; country: string; region: string; district: string; community: string;
  sector: string; activityType: string; notes: string;
  implementingPartner: string; fundingSource: string;
  targetFigure: string; actualFigure: string; numBeneficiaries: string;
  _rowNum: number;
}
function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let val = ""; i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else val += line[i++];
      }
      cells.push(val);
      if (line[i] === ",") i++;
    } else {
      const start = i;
      while (i < line.length && line[i] !== ",") i++;
      cells.push(line.slice(start, i).trim());
      if (line[i] === ",") i++;
    }
  }
  return cells;
}
function parseGpsCSV(text: string): { rows: GpsRow[]; skipped: number; colErrors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], skipped: 0, colErrors: ["File is empty or has no data rows"] };
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const find = (...names: string[]) => { for (const n of names) { const i = headers.indexOf(n); if (i >= 0) return i; } return -1; };
  const latIdx = find("lat","latitude","y");
  const lonIdx = find("lon","lng","longitude","long","x");
  if (latIdx < 0 || lonIdx < 0) {
    return { rows: [], skipped: 0, colErrors: [`Could not detect lat/lon columns. Columns found: ${headers.join(", ")}`] };
  }
  const col = {
    name:      find("name","label","display_name","location","site","place"),
    country:   find("country","country_name"),
    region:    find("region","state","province","admin1","admin_level1"),
    district:  find("district","county","lga","admin2","sub_county","local_government"),
    community: find("community","village","ward","community_name"),
    sector:    find("sector"),
    activity:  find("activity_type","activitytype","activity"),
    notes:     find("notes","note","comments"),
    partner:   find("implementing_partner","implementingpartner","partner","ip"),
    funder:    find("funding_source","fundingsource","funder","donor"),
    target:    find("target","target_figure","targetfigure"),
    actual:    find("actual","actual_figure","actualfigure"),
    bene:      find("beneficiaries","num_beneficiaries","numbeneficiaries","total_beneficiaries","total"),
  };
  const g = (cells: string[], idx: number) => idx >= 0 ? (cells[idx] ?? "").trim() : "";
  const rows: GpsRow[] = []; let skipped = 0; const colErrors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCSVLine(lines[i]);
    const latStr = g(cells, latIdx); const lonStr = g(cells, lonIdx);
    const lat = parseFloat(latStr); const lon = parseFloat(lonStr);
    if (!latStr || !lonStr || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      skipped++;
      if (colErrors.length < 4) colErrors.push(`Row ${i + 1}: invalid coordinates (${latStr || "—"}, ${lonStr || "—"})`);
      continue;
    }
    rows.push({
      lat, lon,
      name: g(cells, col.name), country: g(cells, col.country), region: g(cells, col.region),
      district: g(cells, col.district), community: g(cells, col.community),
      sector: g(cells, col.sector), activityType: g(cells, col.activity), notes: g(cells, col.notes),
      implementingPartner: g(cells, col.partner), fundingSource: g(cells, col.funder),
      targetFigure: g(cells, col.target), actualFigure: g(cells, col.actual),
      numBeneficiaries: g(cells, col.bene), _rowNum: i + 1,
    });
  }
  return { rows, skipped, colErrors };
}
const CSV_TEMPLATE = [
  "lat,lon,name,country,region,district,community,sector,activity_type,notes,implementing_partner,funding_source,target,actual,beneficiaries",
  "5.6037,-0.1870,Accra Pilot,Ghana,Greater Accra,Accra Metro,Osu,Agriculture,Training,Farmer training site,CARE Ghana,USAID,5000,4200,500",
  "-1.2921,36.8219,Nairobi Hub,Kenya,Nairobi County,Westlands,Kangemi,Livelihoods,Market Linkage,,Kenya Red Cross,FCDO,2000,1750,320",
].join("\n");

// ── UI helpers ────────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    country: { label: "Country",         cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    admin1:  { label: "Region / State",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
    admin2:  { label: "District / LGA",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const d = map[level] ?? { label: level, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${d.cls}`}>{d.label}</span>;
}

// ── Reusable select field ─────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full h-9 pl-3 pr-8 text-sm border rounded-md bg-card appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors">
          <option value="">{placeholder ?? `Select ${label.toLowerCase()}…`}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

// ── GIS details form (shared between Add and Edit) ────────────────────────────
interface GisFields {
  community: string; sector: string; activityType: string;
  activityDate: string; activityOther: string; activityCommodity: string;
  beneficiaryType: string; numBeneficiaries: string; numMale: string; numFemale: string;
  gender: string; youthFocused: boolean;
  implementingPartner: string; fundingSource: string; notes: string;
}
function emptyGis(): GisFields {
  return { community: "", sector: "", activityType: "", activityDate: "", activityOther: "", activityCommodity: "",
    beneficiaryType: "", numBeneficiaries: "", numMale: "", numFemale: "", gender: "", youthFocused: false,
    implementingPartner: "", fundingSource: "", notes: "" };
}
function gisFromRecord(loc: LocationRecord): GisFields {
  return {
    community: loc.community || "", sector: loc.sector || "", activityType: loc.activityType || "",
    activityDate: loc.activityDate || "", activityOther: loc.activityOther || "", activityCommodity: loc.activityCommodity || "",
    beneficiaryType: loc.beneficiaryType || "", numBeneficiaries: loc.numBeneficiaries?.toString() ?? "",
    numMale: loc.numMale?.toString() ?? "", numFemale: loc.numFemale?.toString() ?? "",
    gender: loc.gender || "", youthFocused: loc.youthFocused ?? false,
    implementingPartner: loc.implementingPartner || "", fundingSource: loc.fundingSource || "", notes: loc.notes || "",
  };
}
function GisDetailsForm({ fields, onChange, onIconChange }: {
  fields: GisFields; onChange: (f: GisFields) => void; onIconChange?: (iconId: string) => void;
}) {
  const set = (k: keyof GisFields, v: string | boolean) => onChange({ ...fields, [k]: v });
  const iconId = ACTIVITY_TYPE_ICON_MAP[fields.activityType];
  const aEmoji = iconId ? markerEmoji(iconId) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Sector" value={fields.sector} onChange={v => set("sector", v)} options={SECTORS} />
        <SelectField label="Activity Type" value={fields.activityType} onChange={v => {
          onChange({ ...fields, activityType: v, activityOther: "", activityCommodity: "" });
          if (onIconChange) onIconChange(ACTIVITY_TYPE_ICON_MAP[v] ?? "general");
        }} options={ACTIVITY_TYPES} />
      </div>
      {fields.activityType && (
        <div className="space-y-3 border-l-2 border-primary/20 pl-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border text-sm font-medium">
              <span className="text-base leading-none">{aEmoji}</span>
              <span className="text-xs">{fields.activityType}{fields.activityOther ? ` — ${fields.activityOther}` : ""}{fields.activityCommodity ? ` (${fields.activityCommodity})` : ""}</span>
            </span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Activity Date</label>
            <Input type="date" value={fields.activityDate} onChange={e => set("activityDate", e.target.value)} className="h-9 text-sm" />
          </div>
          {fields.activityType === "Other" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Please Specify</label>
              <Input value={fields.activityOther} onChange={e => set("activityOther", e.target.value)}
                placeholder="Describe the activity…" className="h-9 text-sm" autoFocus />
            </div>
          )}
          {fields.activityType === "Agriculture" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">🌾 Commodity</label>
              <Input value={fields.activityCommodity} onChange={e => set("activityCommodity", e.target.value)}
                placeholder="e.g. Maize, Soybean, Cassava…" className="h-9 text-sm" autoFocus />
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Beneficiary Type" value={fields.beneficiaryType} onChange={v => set("beneficiaryType", v)} options={BENEFICIARY_TYPES} />
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">No. of Beneficiaries</label>
          <div className="relative">
            <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input type="number" min={0} value={fields.numBeneficiaries} onChange={e => set("numBeneficiaries", e.target.value)}
              placeholder="e.g. 500" className="pl-8 h-9 text-sm" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Gender Focus" value={fields.gender} onChange={v => set("gender", v)} options={GENDER_OPTIONS} />
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Community / Village</label>
          <Input value={fields.community} onChange={e => set("community", e.target.value)} placeholder="e.g. Tamale North" className="h-9 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Implementing Partner</label>
          <div className="relative">
            <Building2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input value={fields.implementingPartner} onChange={e => set("implementingPartner", e.target.value)} placeholder="e.g. CARE Ghana" className="pl-8 h-9 text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Funding Source</label>
          <div className="relative">
            <Briefcase className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input value={fields.fundingSource} onChange={e => set("fundingSource", e.target.value)} placeholder="e.g. USAID / FCDO" className="pl-8 h-9 text-sm" />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Notes</label>
        <textarea value={fields.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Any additional context about this location…"
          rows={3} className="w-full rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none" />
      </div>
      <div className="flex items-center gap-2.5 pt-1">
        <button type="button" onClick={() => set("youthFocused", !fields.youthFocused)}
          className={`w-9 h-5 rounded-full transition-colors flex-none ${fields.youthFocused ? "bg-primary" : "bg-muted-foreground/30"}`}>
          <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${fields.youthFocused ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <label className="text-sm cursor-pointer select-none" onClick={() => set("youthFocused", !fields.youthFocused)}>
          Youth-focused activity
        </label>
      </div>
    </div>
  );
}

// ── Marker picker ─────────────────────────────────────────────────────────────
function MarkerPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1.5">Map Marker Style</label>
      <div className="grid grid-cols-6 gap-1">
        {MARKER_ICONS.map(ic => (
          <button key={ic.id} onClick={() => onChange(ic.id)} title={ic.label}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-[10px] transition-all ${value === ic.id ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-muted/60 text-muted-foreground"}`}>
            <span className="text-lg leading-none">{ic.emoji}</span>
            <span className="leading-tight">{ic.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Location picker (multi-add) ───────────────────────────────────────────────
function makeConfirmedLoc(country: Country, region: NominatimResult | null, district: NominatimResult | null): ConfirmedLoc {
  const src = district ?? region;
  const lat = src ? parseFloat(src.lat) : 0;
  const lng = src ? parseFloat(src.lon) : 0;
  const level: ConfirmedLoc["level"] = district ? "admin2" : region ? "admin1" : "country";
  const parts: string[] = [];
  if (district) parts.push(districtDisplayName(district));
  else if (region) parts.push(regionDisplayName(region));
  parts.push(country.name);
  return { uid: `${Date.now()}-${Math.random()}`, country, region, district, lat, lng, boundaryGeoJson: src?.geojson ? JSON.stringify(src.geojson) : "", level, displayName: parts.filter(Boolean).join(", ") };
}

// ── Checkbox multi-select list ────────────────────────────────────────────────
function MultiCheckList({ items, selected, onToggle, getLabel, loading, filter, onFilter, placeholder, emptyMsg }: {
  items: NominatimResult[]; selected: NominatimResult[];
  onToggle: (r: NominatimResult) => void;
  getLabel: (r: NominatimResult) => string;
  loading: boolean; filter: string; onFilter: (v: string) => void;
  placeholder: string; emptyMsg: string;
}) {
  const selectedIds = useMemo(() => new Set(selected.map(s => s.place_id)), [selected]);
  const filtered = useMemo(
    () => items.filter(it => getLabel(it).toLowerCase().includes(filter.toLowerCase())),
    [items, filter, getLabel],
  );

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input value={filter} onChange={e => onFilter(e.target.value)} placeholder={placeholder} className="pl-8 h-8 text-sm" />
        {loading && items.length === 0 && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-1.5 justify-center py-4 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-2">{emptyMsg}</p>
      ) : (
        <div className="border rounded-md max-h-48 overflow-y-auto divide-y divide-border bg-card">
          {filtered.map(item => {
            const on = selectedIds.has(item.place_id);
            return (
              <button key={item.place_id} onClick={() => onToggle(item)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-muted/50 ${on ? "bg-primary/5" : ""}`}>
                <div className={`w-4 h-4 rounded border-2 flex-none flex items-center justify-center transition-colors ${on ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                  {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                <span className="flex-1 truncate">{getLabel(item)}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {selected.map(s => (
            <span key={s.place_id} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full max-w-[180px]">
              <span className="truncate">{getLabel(s)}</span>
              <button onClick={e => { e.stopPropagation(); onToggle(s); }} className="hover:text-destructive flex-none"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          {selected.length > 1 && (
            <button onClick={() => selected.forEach(s => onToggle(s))} className="text-[11px] text-muted-foreground hover:text-destructive underline self-center">clear all</button>
          )}
        </div>
      )}
    </div>
  );
}

function LocationPicker({ confirmed, onAdd, onRemove, lang }: {
  confirmed: ConfirmedLoc[]; onAdd: (loc: ConfirmedLoc) => void; onRemove: (uid: string) => void; lang: string;
}) {
  const [country, setCountry]               = useState<Country | null>(null);
  const [countryQ, setCountryQ]             = useState("");
  const [allRegions, setAllRegions]         = useState<NominatimResult[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [regionFilter, setRegionFilter]     = useState("");
  const [selRegions, setSelRegions]         = useState<NominatimResult[]>([]);
  const [allDistricts, setAllDistricts]         = useState<NominatimResult[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtFilter, setDistrictFilter]     = useState("");
  const [selDistricts, setSelDistricts]         = useState<NominatimResult[]>([]);

  const acceptLang = NOMINATIM_LANG[lang] ?? "en";
  const filteredCountries = useMemo(
    () => COUNTRIES.filter(c => c.name.toLowerCase().includes(countryQ.toLowerCase())),
    [countryQ],
  );

  // Auto-load all regions when country changes
  useEffect(() => {
    setAllRegions([]); setSelRegions([]); setRegionFilter("");
    setAllDistricts([]); setSelDistricts([]); setDistrictFilter("");
    if (!country) return;
    setRegionsLoading(true);

    (async () => {
      // Primary: Overpass API — queries by admin_level, works regardless of
      // whether subdivisions are called state/county/province/department/etc.
      let regions = await fetchRegionsOverpass(country.code, acceptLang);

      if (regions.length >= 2) {
        // Batch-fetch GeoJSON from Nominatim for map boundary overlays
        const geoMap = await batchFetchGeoJson(regions.map(r => r.place_id));
        regions = regions.map(r => ({ ...r, geojson: geoMap.get(r.place_id) ?? r.geojson }));
      } else {
        // Fallback: Nominatim text search with an expanded set of admin-unit terms
        const base = { format: "json", polygon_geojson: "1", addressdetails: "1", limit: "50", countrycodes: country.code };
        const lists = await Promise.all(
          ["state", "province", "region", "county", "department", "governorate",
           "division", "territory", "wilaya", "prefecture", "oblast", "zone"].map(q =>
            nomFetch({ ...base, q }, acceptLang)
              .then(data => data.filter(r => r.class === "boundary" ||
                ["state","province","region","administrative","county","department"].includes(r.type)))
          )
        );
        regions = mergeUnique(lists);
      }

      setAllRegions(regions.sort((a, b) => regionDisplayName(a).localeCompare(regionDisplayName(b))));
      setRegionsLoading(false);
    })().catch(() => setRegionsLoading(false));
  }, [country, acceptLang]);

  // Auto-load districts whenever selected regions change
  useEffect(() => {
    setAllDistricts([]); setSelDistricts([]); setDistrictFilter("");
    if (!selRegions.length || !country) return;
    setDistrictsLoading(true);

    (async () => {
      const allDists: NominatimResult[] = [];

      for (const reg of selRegions) {
        // Primary: Overpass, using the region's OSM relation ID
        const overpassDists = await fetchDistrictsOverpass(reg.place_id, acceptLang);
        if (overpassDists.length >= 2) {
          allDists.push(...overpassDists);
        } else {
          // Fallback: Nominatim text search with expanded district-type terms
          const base = { format: "json", polygon_geojson: "1", addressdetails: "1", limit: "50", countrycodes: country.code };
          const lists = await Promise.all(
            ["county", "district", "municipality", "lga", "sub-county",
             "division", "zone", "woreda", "cercle", "tehsil", "upazila",
             "arrondissement", "local government"].map(q =>
              nomFetch({ ...base, q: `${q} ${regionDisplayName(reg)}` }, acceptLang)
                .then(data => data.filter(r => r.class === "boundary" ||
                  ["county","district","municipality","administrative","city","quarter"].includes(r.type)))
            )
          );
          allDists.push(...lists.flat());
        }
      }

      setAllDistricts(mergeUnique(allDists).sort((a, b) => districtDisplayName(a).localeCompare(districtDisplayName(b))));
      setDistrictsLoading(false);
    })().catch(() => setDistrictsLoading(false));
  }, [selRegions, country, acceptLang]);

  const toggleRegion = (r: NominatimResult) =>
    setSelRegions(prev => prev.some(p => p.place_id === r.place_id) ? prev.filter(p => p.place_id !== r.place_id) : [...prev, r]);
  const toggleDistrict = (d: NominatimResult) =>
    setSelDistricts(prev => prev.some(p => p.place_id === d.place_id) ? prev.filter(p => p.place_id !== d.place_id) : [...prev, d]);

  const resetCountry = () => {
    setCountry(null); setCountryQ("");
    setAllRegions([]); setSelRegions([]); setRegionFilter("");
    setAllDistricts([]); setSelDistricts([]); setDistrictFilter("");
  };

  const handleAdd = () => {
    if (!country) return;
    if (selDistricts.length > 0) {
      selDistricts.forEach(dist => {
        const parentRegion = selRegions.find(r => dist.display_name.toLowerCase().includes(regionDisplayName(r).toLowerCase())) ?? selRegions[0] ?? null;
        onAdd(makeConfirmedLoc(country, parentRegion, dist));
      });
    } else if (selRegions.length > 0) {
      selRegions.forEach(reg => onAdd(makeConfirmedLoc(country, reg, null)));
    } else {
      onAdd(makeConfirmedLoc(country, null, null));
    }
    setSelRegions([]); setSelDistricts([]);
    setRegionFilter(""); setDistrictFilter("");
  };

  const addLabel = !country ? "Select a country to continue"
    : selDistricts.length > 0 ? `Add ${selDistricts.length} district${selDistricts.length !== 1 ? "s" : ""}`
    : selRegions.length > 0 ? `Add ${selRegions.length} region${selRegions.length !== 1 ? "s" : ""}`
    : `Add: ${country.name} (country level)`;

  return (
    <div className="space-y-4">

      {/* ── Country ── */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Country</label>
        {country ? (
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-primary/5 border-primary/30">
            <Globe className="w-3.5 h-3.5 text-primary flex-none" />
            <span className="text-sm font-medium flex-1">{country.name}</span>
            <button onClick={resetCountry} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input autoFocus placeholder="Search country…" value={countryQ} onChange={e => setCountryQ(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="border rounded-md max-h-44 overflow-y-auto bg-card divide-y divide-border">
              {filteredCountries.length === 0
                ? <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                : filteredCountries.map(c => (
                  <button key={c.code} onClick={() => { setCountry(c); setCountryQ(""); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors">{c.name}</button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Regions ── */}
      {country && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Region / State
            <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">optional · select multiple</span>
          </label>
          <MultiCheckList
            items={allRegions} selected={selRegions} onToggle={toggleRegion}
            getLabel={regionDisplayName} loading={regionsLoading}
            filter={regionFilter} onFilter={setRegionFilter}
            placeholder={`Filter regions in ${country.name}…`}
            emptyMsg={regionsLoading ? "Loading…" : "No regions found — try adding the country level instead"}
          />
        </div>
      )}

      {/* ── Districts ── */}
      {selRegions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            District / LGA
            <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">optional · select multiple</span>
          </label>
          <MultiCheckList
            items={allDistricts} selected={selDistricts} onToggle={toggleDistrict}
            getLabel={districtDisplayName} loading={districtsLoading}
            filter={districtFilter} onFilter={setDistrictFilter}
            placeholder="Filter districts…"
            emptyMsg={districtsLoading ? "Loading…" : "No districts found for selected region(s)"}
          />
        </div>
      )}

      {/* ── Add button ── */}
      <Button size="sm" variant="outline" disabled={!country} onClick={handleAdd}
        className="w-full gap-1.5 border-dashed">
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </Button>

      {/* ── Confirmed list ── */}
      {confirmed.length > 0 && (
        <div className="pt-1 space-y-1.5 border-t">
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Added ({confirmed.length})</p>
            <button onClick={() => confirmed.forEach(l => onRemove(l.uid))} className="text-[11px] text-muted-foreground hover:text-destructive underline">Clear all</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
            {confirmed.map(loc => (
              <div key={loc.uid} className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg bg-card text-xs">
                <span className="text-muted-foreground">{loc.level === "admin2" ? "📍" : loc.level === "admin1" ? "🗺️" : "🌍"}</span>
                <span className="font-medium flex-1 min-w-0 truncate">{loc.displayName}</span>
                <LevelBadge level={loc.level} />
                <button onClick={() => onRemove(loc.uid)} className="ml-1 text-muted-foreground hover:text-destructive flex-none"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Print ─────────────────────────────────────────────────────────────────────
const PRINT_SECTIONS = [
  { id: "map",       label: "Map",             desc: "OpenStreetMap showing all location boundaries" },
  { id: "locations", label: "Location list",   desc: "Table of all locations with coordinates" },
  { id: "details",   label: "GIS Details",     desc: "Sector, activity type, beneficiaries, partners" },
  { id: "figures",   label: "Target & Actual", desc: "Figures table per location" },
] as const;

function generatePrintHtml(locations: LocationRecord[], sections: Set<string>, theoryName: string): string {
  const css = `
body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:32px;color:#111;line-height:1.5}
h1{font-size:22px;font-weight:700;margin:0 0 2px}
.meta{color:#6b7280;font-size:12px;margin-bottom:24px}
h2{font-size:15px;font-weight:600;margin:28px 0 10px;padding-bottom:5px;border-bottom:2px solid #e5e7eb}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
th{padding:7px 10px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151;white-space:nowrap}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
tr:last-child td{border-bottom:none}
.bc{background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe}
.br{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
.bd{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.badge{display:inline-block;padding:1px 7px;border-radius:9999px;font-size:10px;font-weight:600}
.sector-badge{display:inline-block;padding:1px 7px;border-radius:9999px;font-size:10px;font-weight:600;color:#fff}
.youth{display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;margin-left:3px}
.chip{display:inline-block;padding:1px 7px;border-radius:9999px;border:1px solid #c7d2fe;color:#4f46e5;font-size:10px;margin:1px 2px 1px 0}
.t{color:#1d4ed8;font-weight:700}
.a{color:#15803d;font-weight:700}
.dim{color:#9ca3af}
.mono{font-family:monospace;font-size:10px}
#_map{width:100%;height:440px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:6px}
.map-note{font-size:10px;color:#9ca3af;margin-bottom:4px}
@media print{
  body{padding:12px}
  #_map{height:360px;page-break-after:always}
  table{page-break-inside:auto}
  tr{page-break-inside:avoid}
  h2{page-break-after:avoid}
}`;

  const sectorColours: Record<string,string> = {Agriculture:"#84cc16",Health:"#ec4899",Education:"#3b82f6",WASH:"#06b6d4",Livelihoods:"#f97316",Governance:"#8b5cf6",Nutrition:"#eab308",Environment:"#10b981",Infrastructure:"#6366f1",Humanitarian:"#ef4444","Market Systems":"#14b8a6",Research:"#a855f7"};

  const mappableLocs = locations.filter(l => l.lat != null && l.lng != null);
  const markerJson = JSON.stringify(
    mappableLocs.map(l => ({ lat: l.lat as number, lng: l.lng as number, emoji: markerEmoji(l.icon), name: shortNameStr(l) }))
  );

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(theoryName || "Pathways")} — Locations</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>${css}</style></head><body>`;
  html += `<h1>${escHtml(theoryName || "Theory of Change")}</h1><p class="meta">Locations · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · ${locations.length} location${locations.length !== 1 ? "s" : ""}</p>`;

  if (sections.has("map") && mappableLocs.length > 0) {
    html += `<h2>Map</h2><div id="_map"></div><p class="map-note">Map shows ${mappableLocs.length} location${mappableLocs.length !== 1 ? "s" : ""} with their assigned icons.</p>
<script>
var _pts=${markerJson};
var _done=false;
function _print(){if(_done)return;_done=true;window.print();}
window.addEventListener('load',function(){
  var map=L.map('_map',{zoomControl:true,attributionControl:false});
  var tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
  var bounds=[];
  _pts.forEach(function(m){
    var icon=L.divIcon({className:'',html:'<span style="font-size:24px;line-height:1;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5))">'+m.emoji+'</span>',iconSize:[28,28],iconAnchor:[14,14]});
    L.marker([m.lat,m.lng],{icon:icon}).addTo(map).bindTooltip(m.name,{direction:'top',permanent:false});
    bounds.push([m.lat,m.lng]);
  });
  if(bounds.length===1){map.setView(bounds[0],8);}
  else if(bounds.length>1){map.fitBounds(L.latLngBounds(bounds),{padding:[50,50]});}
  tiles.once('load',function(){setTimeout(_print,600);});
  setTimeout(_print,4000);
});
<\/script>`;
  }

  if (sections.has("locations")) {
    const levelLabel: Record<string, string> = { country: "Country", admin1: "Region", admin2: "District" };
    const levelCls:   Record<string, string> = { country: "bc", admin1: "br", admin2: "bd" };
    html += `<h2>Locations (${locations.length})</h2><table><tr><th>Location</th><th>Level</th><th>Community</th><th>Region / State</th><th>Country</th><th>Coordinates</th></tr>`;
    locations.forEach(loc => {
      const region = loc.adminLevel2 || loc.adminLevel1 || "—";
      html += `<tr>
<td style="font-weight:600">${escHtml(shortNameStr(loc))}</td>
<td><span class="badge ${levelCls[loc.level] ?? "bc"}">${levelLabel[loc.level] ?? loc.level}</span></td>
<td class="dim">${escHtml(loc.community || "—")}</td>
<td class="dim">${escHtml(region)}</td>
<td>${escHtml(loc.country)}</td>
<td class="mono dim">${loc.lat != null ? loc.lat.toFixed(4) : "—"}, ${loc.lng != null ? loc.lng.toFixed(4) : "—"}</td>
</tr>`;
    });
    html += `</table>`;
  }

  if (sections.has("details")) {
    html += `<h2>GIS Details</h2><table><tr><th>Location</th><th>Sector</th><th>Activity</th><th>Date</th><th>Specification</th><th>Beneficiary Type</th><th>Total</th><th>Males</th><th>Females</th><th>Gender</th><th>Partner</th><th>Funder</th></tr>`;
    locations.forEach(loc => {
      const sectorHtml = loc.sector ? `<span class="sector-badge" style="background:${sectorColours[loc.sector]??'#6366f1'}">${escHtml(loc.sector)}</span>${loc.youthFocused ? '<span class="youth">Youth</span>' : ""}` : (loc.youthFocused ? '<span class="youth">Youth</span>' : '<span class="dim">—</span>');
      const actLabel = loc.activityType ? `${activityEmoji(loc.activityType)} ${escHtml(loc.activityType)}` : '<span class="dim">—</span>';
      const spec = loc.activityOther ? escHtml(loc.activityOther) : loc.activityCommodity ? escHtml(loc.activityCommodity) : '<span class="dim">—</span>';
      html += `<tr>
<td style="font-weight:600">${escHtml(shortNameStr(loc))}</td>
<td>${sectorHtml}</td>
<td class="dim">${actLabel}</td>
<td class="dim">${escHtml(loc.activityDate || "—")}</td>
<td class="dim">${spec}</td>
<td class="dim">${escHtml(loc.beneficiaryType || "—")}</td>
<td class="dim">${loc.numBeneficiaries != null ? loc.numBeneficiaries.toLocaleString() : "—"}</td>
<td style="color:#1d4ed8">${loc.numMale != null ? loc.numMale.toLocaleString() : "—"}</td>
<td style="color:#be185d">${loc.numFemale != null ? loc.numFemale.toLocaleString() : "—"}</td>
<td class="dim">${escHtml(loc.gender || "—")}</td>
<td class="dim">${escHtml(loc.implementingPartner || "—")}</td>
<td class="dim">${escHtml(loc.fundingSource || "—")}</td>
</tr>`;
    });
    html += `</table>`;
    const withNotes = locations.filter(l => l.notes);
    if (withNotes.length) {
      html += `<h2>Notes</h2><table><tr><th>Location</th><th>Notes</th></tr>`;
      withNotes.forEach(loc => { html += `<tr><td style="font-weight:600;white-space:nowrap">${escHtml(shortNameStr(loc))}</td><td>${escHtml(loc.notes)}</td></tr>`; });
      html += `</table>`;
    }
  }

  if (sections.has("figures")) {
    html += `<h2>Target &amp; Actual Figures</h2><table><tr><th>Location</th><th>Target</th><th>Actual</th></tr>`;
    locations.forEach(loc => {
      html += `<tr><td style="font-weight:600">${escHtml(shortNameStr(loc))}</td><td class="t">${escHtml(loc.targetFigure || "—")}</td><td class="a">${escHtml(loc.actualFigure || "—")}</td></tr>`;
    });
    html += `</table>`;
  }

  // If no map section was included, we still need to trigger print after load
  if (!sections.has("map") || mappableLocs.length === 0) {
    html += `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},600);});<\/script>`;
  }
  html += `</body></html>`;
  return html;
}

function PrintDialog({ open, onClose, locations, theoryName }: {
  open: boolean; onClose: () => void;
  locations: LocationRecord[]; theoryName: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["map", "locations", "figures"]));
  const toggle = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const doPrint = () => {
    const html = generatePrintHtml(locations, selected, theoryName);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Printer className="w-4 h-4 text-primary" /> Print Locations
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">Choose which sections to include in the printable document.</p>
          <div className="space-y-1">
            {PRINT_SECTIONS.map(s => {
              const on = selected.has(s.id);
              return (
                <label key={s.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${on ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-muted/50"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-none flex items-center justify-center transition-colors ${on ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                    {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
          {locations.length === 0 && <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2 border border-amber-200">No locations saved yet — add some first.</p>}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={selected.size === 0 || locations.length === 0} onClick={doPrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Open Print Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── GPS Upload dialog ─────────────────────────────────────────────────────────
function GpsUploadDialog({ open, onClose, theory, onSaved }: {
  open: boolean; onClose: () => void; theory: Theory;
  onSaved: (locs: LocationRecord[]) => void;
}) {
  const { toast } = useToast();
  const [rows, setRows]           = useState<GpsRow[]>([]);
  const [skipped, setSkipped]     = useState(0);
  const [colErrors, setColErrors] = useState<string[]>([]);
  const [dragging, setDragging]   = useState(false);
  const [fileName, setFileName]   = useState("");
  const [saving, setSaving]       = useState(false);

  const reset = () => { setRows([]); setSkipped(0); setColErrors([]); setFileName(""); };
  const handleClose = () => { reset(); onClose(); };

  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast({ title: "Unsupported file type", description: "Please upload a .csv or .txt file.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = parseGpsCSV(text);
      setRows(result.rows); setSkipped(result.skipped); setColErrors(result.colErrors);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "gps_locations_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!rows.length) return;
    setSaving(true);
    const created: LocationRecord[] = [];
    try {
      for (const row of rows) {
        const level: LocationRecord["level"] = row.district ? "admin2" : row.region ? "admin1" : row.country ? "country" : "admin2";
        const displayName = row.name ||
          [row.district || row.region || row.country, row.country].filter(Boolean).join(", ") ||
          `GPS (${row.lat.toFixed(4)}, ${row.lon.toFixed(4)})`;
        const body = {
          displayName, country: row.country || "Unknown", countryCode: "",
          adminLevel1: row.region, adminLevel2: row.district,
          lat: row.lat, lng: row.lon, boundaryGeoJson: "",
          level, nominatimId: "",
          icon: "general", figureLabel: "",
          targetFigure: row.targetFigure, actualFigure: row.actualFigure,
          community: row.community, sector: row.sector, activityType: row.activityType,
          activityDate: "", activityOther: "", activityCommodity: "",
          beneficiaryType: "",
          numBeneficiaries: row.numBeneficiaries ? Number(row.numBeneficiaries) : null,
          numMale: null, numFemale: null, gender: "",
          youthFocused: false,
          implementingPartner: row.implementingPartner,
          fundingSource: row.fundingSource, notes: row.notes,
        };
        const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include", body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        created.push(await res.json() as LocationRecord);
      }
      onSaved(created);
      toast({ title: `${created.length} location${created.length !== 1 ? "s" : ""} imported from CSV` });
      handleClose();
    } catch (err) {
      toast({ title: "Import failed", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[660px] p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="w-4 h-4 text-primary flex-none" /> Upload GPS Coordinates
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Import locations from a CSV file. Required columns: <span className="font-mono bg-muted px-1 rounded">lat</span> and <span className="font-mono bg-muted px-1 rounded">lon</span>. All other columns are optional.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">

          {/* ── Drop zone ── */}
          {!rows.length && !colErrors.length && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl flex flex-col items-center gap-3 py-10 px-6 text-center transition-colors cursor-pointer
                ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              onClick={() => { const inp = document.getElementById("gps-file-input") as HTMLInputElement; inp?.click(); }}
            >
              <input id="gps-file-input" type="file" accept=".csv,.txt" className="sr-only" onChange={handleFileChange} />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dragging ? "bg-primary/10" : "bg-muted"}`}>
                <FileText className={`w-6 h-6 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm">{dragging ? "Drop to import" : "Drop a CSV file here"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">or click to browse — .csv or .txt</p>
              </div>
            </div>
          )}

          {/* ── Column error ── */}
          {colErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-none" />
                <p className="text-sm font-medium text-destructive">Could not parse file</p>
              </div>
              {colErrors.map((e, i) => <p key={i} className="text-xs text-destructive/80 pl-6">{e}</p>)}
              <button onClick={reset} className="text-xs text-muted-foreground underline pl-6 mt-1">Try another file</button>
            </div>
          )}

          {/* ── File loaded: preview ── */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800">
                <Check className="w-4 h-4 flex-none" />
                <span className="text-sm font-medium flex-1">{fileName}</span>
                <span className="text-xs">{rows.length} row{rows.length !== 1 ? "s" : ""} ready</span>
                <button onClick={reset} className="ml-1 text-emerald-600 hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>

              {skipped > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                  <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">{skipped} row{skipped !== 1 ? "s" : ""} skipped — missing or invalid coordinates</p>
                    {colErrors.map((e, i) => <p key={i} className="text-[11px] text-amber-700 mt-0.5">{e}</p>)}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                  <Table2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview — first {Math.min(rows.length, 8)} of {rows.length} rows</span>
                </div>
                <div className="overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {["Lat","Lon","Name","Country","Region","District","Community","Sector"].map(h => (
                          <th key={h} className="px-3 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{row.lat.toFixed(4)}</td>
                          <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{row.lon.toFixed(4)}</td>
                          <td className="px-3 py-1.5 max-w-[120px] truncate">{row.name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.country || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.region || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.district || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.community || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{row.sector || <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 8 && (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground text-center border-t">… and {rows.length - 8} more rows</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Template download ── */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <Download className="w-3.5 h-3.5" /> Download CSV template
            </button>
            <span className="text-xs text-muted-foreground">— includes all supported columns</span>
          </div>
        </div>

        <div className="flex-none border-t px-5 py-3 flex items-center justify-between gap-4 bg-card">
          <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
            {rows.length > 0
              ? <span className="font-medium text-foreground">{rows.length} location{rows.length !== 1 ? "s" : ""} ready to import{skipped > 0 ? ` · ${skipped} skipped` : ""}</span>
              : "No file loaded"}
          </p>
          <div className="flex gap-2 flex-none">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" disabled={rows.length === 0 || saving} onClick={handleSave} className="gap-1.5 min-w-[140px]">
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importing…</>
                : <><Upload className="w-3.5 h-3.5" />Import {rows.length > 0 ? rows.length : ""} Location{rows.length !== 1 ? "s" : ""}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add location dialog ───────────────────────────────────────────────────────
function AddLocationDialog({ open, onClose, theory, onSaved, lang }: {
  open: boolean; onClose: () => void; theory: Theory;
  onSaved: (locs: LocationRecord[]) => void; lang: string;
}) {
  const { toast } = useToast();
  const [confirmed, setConfirmed]       = useState<ConfirmedLoc[]>([]);
  const [icon, setIcon]                 = useState("general");
  const [manualTarget, setManualTarget] = useState("");
  const [manualActual, setManualActual] = useState("");
  const [gis, setGis]                   = useState<GisFields>(emptyGis());
  const [saving, setSaving]             = useState(false);
  const [tab, setTab]                   = useState<"locations" | "details" | "target">("locations");

  const resetAll = () => {
    setConfirmed([]); setIcon("general");
    setManualTarget(""); setManualActual("");
    setGis(emptyGis()); setTab("locations");
  };
  const handleClose = () => { resetAll(); onClose(); };

  const handleSave = async () => {
    if (!confirmed.length) return;
    setSaving(true);
    const created: LocationRecord[] = [];
    try {
      for (const loc of confirmed) {
        const body = {
          displayName: loc.displayName, country: loc.country.name, countryCode: loc.country.code.toUpperCase(),
          adminLevel1: loc.region?.address?.state ?? loc.region?.address?.region ?? "",
          adminLevel2: loc.district?.address?.county ?? loc.district?.address?.district ?? loc.district?.address?.municipality ?? "",
          lat: loc.lat, lng: loc.lng, boundaryGeoJson: loc.boundaryGeoJson,
          level: loc.level, nominatimId: String((loc.district ?? loc.region)?.place_id ?? ""),
          icon, figureLabel: "", targetFigure: manualTarget, actualFigure: manualActual,
          community: gis.community, sector: gis.sector, activityType: gis.activityType,
          activityDate: gis.activityDate, activityOther: gis.activityOther, activityCommodity: gis.activityCommodity,
          beneficiaryType: gis.beneficiaryType,
          numBeneficiaries: gis.numBeneficiaries !== "" ? Number(gis.numBeneficiaries) : null,
          numMale: gis.numMale !== "" ? Number(gis.numMale) : null,
          numFemale: gis.numFemale !== "" ? Number(gis.numFemale) : null,
          gender: gis.gender, youthFocused: gis.youthFocused,
          implementingPartner: gis.implementingPartner, fundingSource: gis.fundingSource, notes: gis.notes,
        };
        const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(await res.text());
        created.push(await res.json() as LocationRecord);
      }
      onSaved(created);
      toast({ title: `${created.length} location${created.length > 1 ? "s" : ""} saved` });
      resetAll(); onClose();
    } catch (err) {
      toast({ title: "Failed to save", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const TabBtn = ({ id, label, badge }: { id: typeof tab; label: string; badge?: number }) => (
    <button onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
      {label}
      {badge != null && badge > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === id ? "bg-white/20 text-white" : "bg-muted"}`}>{badge}</span>}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[580px] p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-4 h-4 text-primary flex-none" /> Add Intervention Locations
          </DialogTitle>
          <div className="flex gap-1 mt-2 flex-wrap">
            <TabBtn id="locations" label="Locations" badge={confirmed.length} />
            <TabBtn id="details"   label="Details" />
            <TabBtn id="target"    label="Target &amp; Actual" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {tab === "locations" && (
            <LocationPicker confirmed={confirmed}
              onAdd={loc => setConfirmed(p => [...p, loc])}
              onRemove={uid => setConfirmed(p => p.filter(l => l.uid !== uid))}
              lang={lang} />
          )}
          {tab === "details" && (
            <GisDetailsForm fields={gis} onChange={setGis} onIconChange={id => setIcon(id)} />
          )}
          {tab === "target" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target Figure</label>
                <div className="relative">
                  <Target className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={manualTarget} onChange={e => setManualTarget(e.target.value)}
                    placeholder="e.g. 5,000 households" className="pl-8 h-9 text-sm" />
                </div>
              </div>
              <div className="border-t pt-4 space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actual Figure</label>
                <div className="relative">
                  <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={manualActual} onChange={e => setManualActual(e.target.value)}
                    placeholder="e.g. 4,200 households" className="pl-8 h-9 text-sm" />
                </div>
              </div>
              {gis.gender && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Gender Breakdown · <span className="normal-case font-normal">{gis.gender}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-blue-600">♂ No. of Males</label>
                      <Input type="number" min={0} value={gis.numMale}
                        onChange={e => setGis(g => ({ ...g, numMale: e.target.value }))}
                        placeholder="e.g. 2,400" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-pink-600">♀ No. of Females</label>
                      <Input type="number" min={0} value={gis.numFemale}
                        onChange={e => setGis(g => ({ ...g, numFemale: e.target.value }))}
                        placeholder="e.g. 2,600" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <MarkerPicker value={icon} onChange={setIcon} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-none border-t px-5 py-3 flex items-center justify-between gap-4 bg-card">
          <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {confirmed.length === 0 ? "No locations selected"
              : <span className="font-medium text-foreground">{confirmed.length} location{confirmed.length > 1 ? "s" : ""} selected</span>}
          </p>
          <div className="flex gap-2 flex-none">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" disabled={confirmed.length === 0 || saving} onClick={handleSave} className="gap-1.5 min-w-[130px]">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Check className="w-3.5 h-3.5" />Save {confirmed.length > 0 ? confirmed.length : ""} Location{confirmed.length !== 1 ? "s" : ""}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit location dialog ──────────────────────────────────────────────────────
function EditLocationDialog({ loc, theory, onClose, onSaved }: {
  loc: LocationRecord; theory: Theory;
  onClose: () => void; onSaved: (updated: LocationRecord) => void;
}) {
  const { toast } = useToast();
  const [icon, setIcon]                 = useState(loc.icon || "general");
  const [manualTarget, setManualTarget] = useState(loc.targetFigure || "");
  const [manualActual, setManualActual] = useState(loc.actualFigure || "");
  const [gpsLat, setGpsLat]             = useState(loc.lat?.toString() ?? "");
  const [gpsLng, setGpsLng]             = useState(loc.lng?.toString() ?? "");
  const [gis, setGis]                   = useState<GisFields>(() => gisFromRecord(loc));
  const [saving, setSaving]             = useState(false);
  const [tab, setTab]                   = useState<"location" | "details" | "target">("location");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/theories/${theory.id}/locations/${loc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          icon, targetFigure: manualTarget, actualFigure: manualActual,
          lat: parseFloat(gpsLat) || loc.lat, lng: parseFloat(gpsLng) || loc.lng,
          community: gis.community, sector: gis.sector, activityType: gis.activityType,
          activityDate: gis.activityDate, activityOther: gis.activityOther, activityCommodity: gis.activityCommodity,
          beneficiaryType: gis.beneficiaryType,
          numBeneficiaries: gis.numBeneficiaries !== "" ? Number(gis.numBeneficiaries) : null,
          numMale: gis.numMale !== "" ? Number(gis.numMale) : null,
          numFemale: gis.numFemale !== "" ? Number(gis.numFemale) : null,
          gender: gis.gender, youthFocused: gis.youthFocused,
          implementingPartner: gis.implementingPartner, fundingSource: gis.fundingSource, notes: gis.notes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(await res.json() as LocationRecord);
      toast({ title: "Location updated" });
      onClose();
    } catch (err) {
      toast({ title: "Failed to update", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
      {label}
    </button>
  );

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[580px] p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Pencil className="w-4 h-4 text-primary flex-none" /> Edit Location
          </DialogTitle>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 mt-2 flex items-center gap-2">
            <span className="text-base">{markerEmoji(loc.icon)}</span>
            <span className="font-semibold text-sm flex-1 min-w-0 truncate">{shortNameStr(loc)}</span>
            <LevelBadge level={loc.level} />
          </div>
          <div className="flex gap-1 mt-2">
            <TabBtn id="location" label="Location" />
            <TabBtn id="details"  label="Details" />
            <TabBtn id="target"   label="Target &amp; Actual" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {tab === "location" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">GPS Coordinates</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Navigation className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input value={gpsLat} onChange={e => setGpsLat(e.target.value)} placeholder="Latitude" className="pl-8 h-9 text-sm font-mono" />
                  </div>
                  <div className="relative">
                    <Navigation className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none rotate-90" />
                    <Input value={gpsLng} onChange={e => setGpsLng(e.target.value)} placeholder="Longitude" className="pl-8 h-9 text-sm font-mono" />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <MarkerPicker value={icon} onChange={setIcon} />
              </div>
            </div>
          )}
          {tab === "details" && (
            <GisDetailsForm fields={gis} onChange={setGis} onIconChange={id => setIcon(id)} />
          )}
          {tab === "target" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target Figure</label>
                <div className="relative">
                  <Target className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={manualTarget} onChange={e => setManualTarget(e.target.value)}
                    placeholder="e.g. 5,000 households" className="pl-8 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actual Figure</label>
                <div className="relative">
                  <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input value={manualActual} onChange={e => setManualActual(e.target.value)}
                    placeholder="e.g. 4,200 households" className="pl-8 h-9 text-sm" />
                </div>
              </div>
              {gis.gender && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Gender Breakdown · <span className="normal-case font-normal">{gis.gender}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-blue-600">♂ No. of Males</label>
                      <Input type="number" min={0} value={gis.numMale}
                        onChange={e => setGis(g => ({ ...g, numMale: e.target.value }))}
                        placeholder="e.g. 2,400" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-pink-600">♀ No. of Females</label>
                      <Input type="number" min={0} value={gis.numFemale}
                        onChange={e => setGis(g => ({ ...g, numFemale: e.target.value }))}
                        placeholder="e.g. 2,600" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-none border-t px-5 py-3 flex items-center justify-end gap-2 bg-card">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave} className="gap-1.5 min-w-[110px]">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Check className="w-3.5 h-3.5" />Save Changes</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function LocationsMap({ theory }: { theory: Theory }) {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const [locations, setLocations]     = useState<LocationRecord[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing]       = useState<LocationRecord | null>(null);
  const [showPrint, setShowPrint]   = useState(false);

  const tile = TILE_LAYERS[i18n.language] ?? TILE_LAYERS.default;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, { credentials: "include" });
        if (res.ok) setLocations(await res.json());
      } catch { /* silent */ } finally { setLoadingLocs(false); }
    })();
  }, [theory.id]);

  const handleDelete = async (locId: number) => {
    try {
      await fetch(`${API_BASE}/theories/${theory.id}/locations/${locId}`, { method: "DELETE", credentials: "include" });
      setLocations(prev => prev.filter(l => l.id !== locId));
    } catch { toast({ title: "Failed to remove location", variant: "destructive" }); }
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-80 flex-none border-r bg-card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between flex-none gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-primary flex-none" />
            <span className="font-semibold text-sm">Locations</span>
            {locations.length > 0 && <Badge variant="secondary" className="text-xs h-5 px-1.5">{locations.length}</Badge>}
          </div>
          <div className="flex items-center gap-1 flex-none">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowUpload(true)} title="Upload GPS CSV">
              <Upload className="w-3.5 h-3.5" />
            </Button>
            {locations.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPrint(true)} title="Print locations">
                <Printer className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" className="h-7 gap-1 text-xs px-2.5" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLocs ? (
            <div className="flex items-center justify-center h-20"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No locations yet</p>
              <p className="text-xs text-muted-foreground/70">Click "Add" to pin countries, regions or districts where this intervention operates.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {locations.map((loc, i) => {
                const color = COLOURS[i % COLOURS.length];
                return (
                  <li key={loc.id} className="group px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-7 h-7 rounded-full flex-none flex items-center justify-center text-base"
                        style={{ background: `${color}22`, border: `2px solid ${color}` }}>
                        {markerEmoji(loc.icon)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium leading-tight truncate" title={shortNameStr(loc)}>{shortNameStr(loc)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {loc.community ? `${loc.community} · ` : ""}{loc.level === "admin2" ? `${loc.adminLevel1}, ${loc.country}` : loc.level === "admin1" ? loc.country : "Country level"}
                        </p>
                        <div className="pt-0.5 flex flex-wrap gap-1">
                          <LevelBadge level={loc.level} />
                          {loc.sector && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border text-white"
                              style={{ background: SECTOR_COLOURS[loc.sector] ?? "#6366f1", borderColor: "transparent" }}>
                              {loc.sector}
                            </span>
                          )}
                          {loc.youthFocused && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">Youth</span>
                          )}
                        </div>
                        {(loc.beneficiaryType || loc.numBeneficiaries != null) && (
                          <p className="text-[11px] text-muted-foreground pt-0.5">
                            <Users className="w-2.5 h-2.5 inline mr-0.5" />
                            {[loc.beneficiaryType, loc.numBeneficiaries != null ? `${loc.numBeneficiaries.toLocaleString()} beneficiaries` : ""].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {(loc.numMale != null || loc.numFemale != null) && (
                          <p className="text-[11px] text-muted-foreground pt-0.5 flex items-center gap-2">
                            {loc.numMale != null && <span className="text-blue-600">♂ {loc.numMale.toLocaleString()}</span>}
                            {loc.numFemale != null && <span className="text-pink-600">♀ {loc.numFemale.toLocaleString()}</span>}
                          </p>
                        )}
                        {loc.activityType && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            <span className="mr-0.5">{activityEmoji(loc.activityType)}</span>
                            {loc.activityType}
                            {loc.activityOther && ` — ${loc.activityOther}`}
                            {loc.activityCommodity && ` (${loc.activityCommodity})`}
                            {loc.activityDate && <span className="ml-1 opacity-60">{loc.activityDate}</span>}
                          </p>
                        )}
                        {(loc.targetFigure || loc.actualFigure) && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {loc.targetFigure && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                <Target className="w-2.5 h-2.5" />{loc.targetFigure}
                              </span>
                            )}
                            {loc.actualFigure && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                <TrendingUp className="w-2.5 h-2.5" />{loc.actualFigure}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
                        <button onClick={() => setEditing(loc)} className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(loc.id)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {locations.length > 0 && (
          <div className="flex-none border-t px-4 py-2.5 space-y-1">
            {[
              { level: "country", label: "Country",        col: "#6366f1" },
              { level: "admin1",  label: "Region / State", col: "#f97316" },
              { level: "admin2",  label: "District / LGA", col: "#10b981" },
            ].filter(d => locations.some(l => l.level === d.level)).map(d => (
              <div key={d.level} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: d.col }} />
                {d.label}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer key={tile.url} center={[8, 22]} zoom={4} className="w-full h-full">
          <TileLayer url={tile.url} attribution={tile.attribution} subdomains={(tile.subdomains ?? "abc") as any} maxZoom={19} />
          <FitBounds locations={locations} />
          {locations.map((loc, i) => {
            const color = COLOURS[i % COLOURS.length];
            const emoji = markerEmoji(loc.icon);
            return (
              <span key={loc.id}>
                {loc.boundaryGeoJson && (() => {
                  try { return <GeoJSON key={`geo-${loc.id}`} data={JSON.parse(loc.boundaryGeoJson) as any} style={{ color, weight: 2.5, fillColor: color, fillOpacity: 0.15 }} />; }
                  catch { return null; }
                })()}
                {loc.lat != null && loc.lng != null && (
                  <Marker key={`mk-${loc.id}`} position={[loc.lat, loc.lng]} icon={makeIcon(emoji, color)}>
                    <Popup maxWidth={300}>
                      <div className="space-y-1.5 py-0.5">
                        <p className="font-semibold text-sm flex items-center gap-1.5"><span>{emoji}</span>{shortNameStr(loc)}</p>
                        <p className="text-xs text-gray-500">
                          {loc.community ? `${loc.community} · ` : ""}
                          {loc.level === "admin2" ? `${loc.adminLevel1} · ${loc.country}` : loc.level === "admin1" ? loc.country : "Country level"}
                        </p>
                        {loc.sector && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ background: SECTOR_COLOURS[loc.sector] ?? "#6366f1" }}>
                            {loc.sector}
                          </span>
                        )}
                        {(loc.activityType || loc.beneficiaryType || loc.numBeneficiaries != null || loc.gender || loc.youthFocused) && (
                          <div className="pt-1 border-t border-gray-200 space-y-0.5 text-xs text-gray-600">
                            {loc.activityType  && <p>{activityEmoji(loc.activityType)} <strong>Activity:</strong> {loc.activityType}{loc.activityOther ? ` — ${loc.activityOther}` : ""}{loc.activityCommodity ? ` (${loc.activityCommodity})` : ""}</p>}
                            {loc.activityDate  && <p>📅 <strong>Date:</strong> {loc.activityDate}</p>}
                            {loc.beneficiaryType && <p>👥 <strong>Beneficiaries:</strong> {loc.beneficiaryType}{loc.numBeneficiaries != null ? ` (${loc.numBeneficiaries.toLocaleString()})` : ""}</p>}
                            {loc.gender        && <p>⚧ <strong>Gender:</strong> {loc.gender}</p>}
                            {(loc.numMale != null || loc.numFemale != null) && (
                              <p>
                                {loc.numMale != null && <span className="text-blue-600">♂ {loc.numMale.toLocaleString()} males</span>}
                                {loc.numMale != null && loc.numFemale != null && <span className="text-gray-400"> · </span>}
                                {loc.numFemale != null && <span className="text-pink-600">♀ {loc.numFemale.toLocaleString()} females</span>}
                              </p>
                            )}
                            {loc.youthFocused  && <p>🌱 <strong>Youth-focused</strong></p>}
                          </div>
                        )}
                        {(loc.implementingPartner || loc.fundingSource) && (
                          <div className="pt-1 border-t border-gray-200 space-y-0.5 text-xs text-gray-600">
                            {loc.implementingPartner && <p>🏢 <strong>Partner:</strong> {loc.implementingPartner}</p>}
                            {loc.fundingSource       && <p>💼 <strong>Funder:</strong> {loc.fundingSource}</p>}
                          </div>
                        )}
                        {(loc.targetFigure || loc.actualFigure) && (
                          <div className="pt-1 border-t border-gray-200 space-y-0.5">
                            {loc.targetFigure && <p className="text-xs text-blue-600">🎯 Target: <strong>{loc.targetFigure}</strong></p>}
                            {loc.actualFigure && <p className="text-xs text-emerald-600">📈 Actual: <strong>{loc.actualFigure}</strong></p>}
                          </div>
                        )}
                        {loc.notes && (
                          <div className="pt-1 border-t border-gray-200">
                            <p className="text-xs text-gray-500 italic">{loc.notes}</p>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </span>
            );
          })}
        </MapContainer>

        {locations.length === 0 && !loadingLocs && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none z-[1000]">
            <div className="bg-card/95 backdrop-blur-sm border rounded-xl px-6 py-5 shadow-xl text-center max-w-xs pointer-events-auto">
              <MapPin className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">Add your first location</p>
              <p className="text-xs text-muted-foreground mt-1">Add multiple countries, regions or districts — each gets its own pin on the map.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Locations
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      <GpsUploadDialog open={showUpload} onClose={() => setShowUpload(false)} theory={theory}
        onSaved={locs => setLocations(prev => [...prev, ...locs])} />

      <AddLocationDialog open={showAdd} onClose={() => setShowAdd(false)} theory={theory}
        onSaved={locs => setLocations(prev => [...prev, ...locs])} lang={i18n.language} />

      {editing && (
        <EditLocationDialog loc={editing} theory={theory}
          onClose={() => setEditing(null)}
          onSaved={updated => { setLocations(prev => prev.map(l => l.id === updated.id ? updated : l)); setEditing(null); }} />
      )}

      <PrintDialog open={showPrint} onClose={() => setShowPrint(false)}
        locations={locations} theoryName={theory.name ?? theory.title ?? ""} />
    </div>
  );
}
