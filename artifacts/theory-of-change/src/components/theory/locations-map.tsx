import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Check, Navigation, Target, TrendingUp, Pencil, X,
  ChevronDown,
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

// ── Language-aware tile layers (OSM standard = "more detailed") ───────────────
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

// ── Visual marker icons (map pin appearance only) ─────────────────────────────
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
  adminLevel1: string; adminLevel2: string;
  lat: number | null; lng: number | null;
  boundaryGeoJson: string; level: string; nominatimId: string;
  icon: string; figureLabel: string; targetFigure: string; actualFigure: string;
}
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
interface MeasurementIndicator {
  id: number;
  name: string;
  targetFigure: string;
  componentName: string;
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

// ── Beneficiary parsing (from About → Beneficiaries & Partners text) ──────────
function parseBeneficiaries(text: string): string[] {
  return text
    .split(/[\n;|]/)
    .map(s => s.replace(/^[-–•*\d.)]\s*/, "").trim())
    .filter(s => s.length > 2);
}

// Combine all beneficiary/partner fields from the theory
function theoryBeneficiaries(theory: Theory): string[] {
  const combined = [
    theory.targetBeneficiary ?? "",
    theory.privateSectorPartners ?? "",
    theory.publicSectorPartners ?? "",
    theory.serviceProviders ?? "",
  ].join("\n");
  const items = parseBeneficiaries(combined);
  return [...new Set(items)];  // deduplicate
}

// ── Map helpers ───────────────────────────────────────────────────────────────
function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.3);border:2.5px solid rgba(255,255,255,.95);
    "><span style="transform:rotate(45deg);font-size:15px;line-height:1">${emoji}</span></div>`,
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

// ── Nominatim search hook ─────────────────────────────────────────────────────
function useNominatimSearch(countryCode: string, featureType: "state" | "county", lang: string) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptLang = NOMINATIM_LANG[lang] ?? "en";

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    setQuery(q);
    if (!q.trim() || !countryCode) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, format: "json", polygon_geojson: "1", addressdetails: "1", limit: "12", countrycodes: countryCode });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": acceptLang } });
        const data: NominatimResult[] = await res.json();
        const filter = featureType === "state" ? ["state","province","region","administrative"] : ["county","district","municipality","city","administrative"];
        setResults(data.filter(r => filter.includes(r.type) || r.class === "boundary"));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 450);
  }, [countryCode, featureType, acceptLang]);

  const clear = useCallback(() => { setQuery(""); setResults([]); }, []);
  return { query, results, loading, search, clear };
}

// ── Sidebar helpers ───────────────────────────────────────────────────────────
function shortName(loc: LocationRecord) {
  if (loc.adminLevel2) return loc.adminLevel2;
  if (loc.adminLevel1) return loc.adminLevel1;
  return loc.country;
}
function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    country: { label: "Country",        cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    admin1:  { label: "Region / State", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    admin2:  { label: "District / LGA", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const d = map[level] ?? { label: level, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${d.cls}`}>{d.label}</span>;
}

// ── Location Picker (multi-add) ───────────────────────────────────────────────
function makeConfirmedLoc(country: Country, region: NominatimResult | null, district: NominatimResult | null): ConfirmedLoc {
  const src  = district ?? region;
  const lat  = src ? parseFloat(src.lat) : 0;
  const lng  = src ? parseFloat(src.lon) : 0;
  const level: ConfirmedLoc["level"] = district ? "admin2" : region ? "admin1" : "country";
  const parts: string[] = [];
  if (district) parts.push(district.address?.county ?? district.address?.district ?? district.address?.municipality ?? district.display_name.split(",")[0]);
  else if (region) parts.push(region.address?.state ?? region.address?.region ?? region.display_name.split(",")[0]);
  parts.push(country.name);
  return { uid: `${Date.now()}-${Math.random()}`, country, region, district, lat, lng, boundaryGeoJson: src?.geojson ? JSON.stringify(src.geojson) : "", level, displayName: parts.filter(Boolean).join(", ") };
}

function LocationPicker({ confirmed, onAdd, onRemove, lang }: {
  confirmed: ConfirmedLoc[];
  onAdd: (loc: ConfirmedLoc) => void;
  onRemove: (uid: string) => void;
  lang: string;
}) {
  const [country, setCountry]   = useState<Country | null>(null);
  const [region, setRegion]     = useState<NominatimResult | null>(null);
  const [district, setDistrict] = useState<NominatimResult | null>(null);
  const [countryQ, setCountryQ] = useState("");

  const regionHook   = useNominatimSearch(country?.code ?? "", "state", lang);
  const districtHook = useNominatimSearch(country?.code ?? "", "county", lang);

  const filteredCountries = useMemo(
    () => COUNTRIES.filter(c => c.name.toLowerCase().includes(countryQ.toLowerCase())),
    [countryQ],
  );

  const addAndReset = () => {
    if (!country) return;
    onAdd(makeConfirmedLoc(country, region, district));
    setRegion(null); setDistrict(null);
    regionHook.clear(); districtHook.clear();
  };

  return (
    <div className="space-y-3">
      {/* Country */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Country</label>
        {country ? (
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-primary/5 border-primary/30">
            <Globe className="w-3.5 h-3.5 text-primary flex-none" />
            <span className="text-sm font-medium flex-1">{country.name}</span>
            <button onClick={() => { setCountry(null); setRegion(null); setDistrict(null); setCountryQ(""); regionHook.clear(); districtHook.clear(); }} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input autoFocus placeholder="Search country…" value={countryQ} onChange={e => setCountryQ(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
            <div className="border rounded-md max-h-36 overflow-y-auto bg-card divide-y divide-border">
              {filteredCountries.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                : filteredCountries.map(c => (
                  <button key={c.code} onClick={() => { setCountry(c); setCountryQ(""); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors">{c.name}</button>
                ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Region */}
      {country && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Region / State <span className="normal-case font-normal">(optional)</span></label>
          {region ? (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-orange-50 border-orange-200">
              <Check className="w-3.5 h-3.5 text-orange-600 flex-none" />
              <span className="text-sm font-medium flex-1 text-orange-800">{region.address?.state ?? region.address?.region ?? region.display_name.split(",")[0]}</span>
              <button onClick={() => { setRegion(null); setDistrict(null); regionHook.clear(); districtHook.clear(); }} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input placeholder={`Search region in ${country.name}…`} value={regionHook.query} onChange={e => regionHook.search(e.target.value)} className="pl-8 h-8 text-sm" />
                {regionHook.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>
              {regionHook.results.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto bg-card divide-y divide-border">
                  {regionHook.results.map(r => (
                    <button key={r.place_id} onClick={() => { setRegion(r); regionHook.clear(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors">
                      {r.address?.state ?? r.address?.region ?? r.display_name.split(",")[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* District */}
      {region && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">District / LGA <span className="normal-case font-normal">(optional)</span></label>
          {district ? (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-emerald-50 border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600 flex-none" />
              <span className="text-sm font-medium flex-1 text-emerald-800">{district.address?.county ?? district.address?.district ?? district.address?.municipality ?? district.display_name.split(",")[0]}</span>
              <button onClick={() => { setDistrict(null); districtHook.clear(); }} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input placeholder={`Search district in ${region.address?.state ?? country?.name}…`} value={districtHook.query} onChange={e => districtHook.search(e.target.value)} className="pl-8 h-8 text-sm" />
                {districtHook.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>
              {districtHook.results.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto bg-card divide-y divide-border">
                  {districtHook.results.map(r => (
                    <button key={r.place_id} onClick={() => { setDistrict(r); districtHook.clear(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors">
                      {r.address?.county ?? r.address?.district ?? r.address?.municipality ?? r.display_name.split(",")[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Button size="sm" variant="outline" disabled={!country} onClick={addAndReset} className="w-full gap-1.5 border-dashed">
        <Plus className="w-3.5 h-3.5" />
        {country ? `Add: ${district ? (district.address?.county ?? district.address?.district ?? district.display_name.split(",")[0]) : region ? (region.address?.state ?? region.address?.region ?? region.display_name.split(",")[0]) : country.name}` : "Select a country to add"}
      </Button>

      {confirmed.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected ({confirmed.length})</p>
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

// ── Beneficiary Picker ────────────────────────────────────────────────────────
function BeneficiaryPicker({ allBeneficiaries, selected, onChange }: {
  allBeneficiaries: string[];
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  const toggle = (b: string) =>
    onChange(selected.includes(b) ? selected.filter(s => s !== b) : [...selected, b]);

  if (allBeneficiaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-xs text-muted-foreground space-y-1">
        <p className="font-medium">No beneficiaries defined yet</p>
        <p>Go to the <span className="font-semibold">About</span> tab → <span className="font-semibold">Beneficiaries &amp; Partners</span> and fill in the Target Beneficiary Group field. Those entries will appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Select the groups from the About section that this location serves.</p>
      <div className="flex flex-wrap gap-2">
        {allBeneficiaries.map(b => {
          const on = selected.includes(b);
          return (
            <button
              key={b}
              onClick={() => toggle(b)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                on ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Indicator Picker (from measurement plan) ──────────────────────────────────
function IndicatorDropdown({ indicators, selectedId, onSelect, manualFigure, onManualChange }: {
  indicators: MeasurementIndicator[];
  selectedId: number | null;
  onSelect: (ind: MeasurementIndicator | null) => void;
  manualFigure: string;
  onManualChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const sel = indicators.find(i => i.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target (from Measurement Plan)</label>
      {indicators.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No indicators found in the Measurement Plan for this theory.</p>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-md text-sm bg-card hover:bg-muted/40 transition-colors"
          >
            {sel ? (
              <span className="flex-1 text-left truncate">
                <span className="font-medium">{sel.name}</span>
                {sel.targetFigure && <span className="ml-2 text-muted-foreground text-xs">({sel.targetFigure})</span>}
              </span>
            ) : (
              <span className="text-muted-foreground flex-1 text-left">Select an indicator…</span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-none" />
          </button>
          {open && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 border rounded-md bg-card shadow-md max-h-48 overflow-y-auto divide-y divide-border">
              <button onClick={() => { onSelect(null); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60">
                — None —
              </button>
              {indicators.map(ind => (
                <button key={ind.id} onClick={() => { onSelect(ind); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 ${ind.id === selectedId ? "bg-primary/5 font-medium text-primary" : ""}`}>
                  <span className="block truncate">{ind.name}</span>
                  <span className="text-[10px] text-muted-foreground">{ind.componentName}{ind.targetFigure ? ` · Target: ${ind.targetFigure}` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target figure</label>
          <div className="relative">
            <Target className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input value={sel?.targetFigure ?? manualFigure} onChange={e => onManualChange(e.target.value)}
              disabled={!!sel} placeholder="e.g. 5,000" className="pl-8 h-9 text-sm" />
          </div>
          {sel && <p className="text-[10px] text-muted-foreground pl-1">From measurement plan — deselect indicator to override.</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actual figure</label>
          <div className="relative">
            <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input value={sel?.targetFigure ? "" : undefined} placeholder="e.g. 3,812" className="pl-8 h-9 text-sm" readOnly={false} id="actual-figure-add" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Marker icon picker ────────────────────────────────────────────────────────
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

// ── Shared: fetch measurement indicators for a theory ─────────────────────────
async function fetchIndicators(theoryId: number): Promise<MeasurementIndicator[]> {
  try {
    const res = await fetch(`${API_BASE}/theories/${theoryId}`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    const list: MeasurementIndicator[] = [];
    for (const comp of (data.components ?? [])) {
      for (const ind of (comp.componentIndicators ?? [])) {
        if (ind.name?.trim()) {
          list.push({ id: ind.id, name: ind.name, targetFigure: ind.targetFigure ?? "", componentName: comp.title ?? comp.name ?? "" });
        }
      }
    }
    return list;
  } catch { return []; }
}

// ── Add Location Dialog ───────────────────────────────────────────────────────
function AddLocationDialog({ open, onClose, theory, onSaved, lang }: {
  open: boolean; onClose: () => void;
  theory: Theory; onSaved: (locs: LocationRecord[]) => void; lang: string;
}) {
  const { toast } = useToast();
  const [confirmed, setConfirmed]   = useState<ConfirmedLoc[]>([]);
  const [benef, setBenef]           = useState<string[]>([]);
  const [icon, setIcon]             = useState("general");
  const [indicators, setIndicators] = useState<MeasurementIndicator[]>([]);
  const [selIndId, setSelIndId]     = useState<number | null>(null);
  const [manualTarget, setManualTarget] = useState("");
  const [actualFigure, setActualFigure] = useState("");
  const [saving, setSaving]         = useState(false);
  const [tab, setTab]               = useState<"locations" | "beneficiaries" | "target">("locations");

  const allBenef = useMemo(() => theoryBeneficiaries(theory), [theory]);
  const selInd   = indicators.find(i => i.id === selIndId) ?? null;

  useEffect(() => {
    if (open) fetchIndicators(theory.id).then(setIndicators);
  }, [open, theory.id]);

  const resetAll = () => {
    setConfirmed([]); setBenef([]); setIcon("general");
    setSelIndId(null); setManualTarget(""); setActualFigure(""); setTab("locations");
  };
  const handleClose = () => { resetAll(); onClose(); };

  const handleSave = async () => {
    if (!confirmed.length) return;
    setSaving(true);
    const figureLabel  = benef.join("; ");
    const targetFigure = selInd?.targetFigure ?? manualTarget;
    const created: LocationRecord[] = [];
    try {
      for (const loc of confirmed) {
        const body = {
          displayName: loc.displayName, country: loc.country.name,
          countryCode: loc.country.code.toUpperCase(),
          adminLevel1: loc.region?.address?.state ?? loc.region?.address?.region ?? "",
          adminLevel2: loc.district?.address?.county ?? loc.district?.address?.district ?? loc.district?.address?.municipality ?? "",
          lat: loc.lat, lng: loc.lng, boundaryGeoJson: loc.boundaryGeoJson,
          level: loc.level, nominatimId: String((loc.district ?? loc.region)?.place_id ?? ""),
          icon, figureLabel, targetFigure, actualFigure,
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

  const Tab = ({ id, label, badge }: { id: typeof tab; label: string; badge?: number }) => (
    <button onClick={() => setTab(id)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === id ? "bg-white/20 text-white" : "bg-muted"}`}>{badge}</span>
      )}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[560px] p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="w-4 h-4 text-primary flex-none" /> Add Intervention Locations
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            <Tab id="locations"     label="Locations"     badge={confirmed.length} />
            <Tab id="beneficiaries" label="Beneficiaries" badge={benef.length || undefined} />
            <Tab id="target"        label="Target & Actual" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {tab === "locations" && (
            <LocationPicker confirmed={confirmed}
              onAdd={loc => setConfirmed(p => [...p, loc])}
              onRemove={uid => setConfirmed(p => p.filter(l => l.uid !== uid))}
              lang={lang} />
          )}

          {tab === "beneficiaries" && (
            <div className="space-y-5">
              <BeneficiaryPicker allBeneficiaries={allBenef} selected={benef} onChange={setBenef} />
              <div className="border-t pt-4">
                <MarkerPicker value={icon} onChange={setIcon} />
              </div>
            </div>
          )}

          {tab === "target" && (
            <div className="space-y-4">
              <IndicatorDropdown
                indicators={indicators}
                selectedId={selIndId}
                onSelect={ind => setSelIndId(ind?.id ?? null)}
                manualFigure={manualTarget}
                onManualChange={setManualTarget}
              />
              <div className="space-y-1 border-t pt-3">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actual figure (optional)</label>
                <div className="relative">
                  <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input placeholder="e.g. 3,812" value={actualFigure} onChange={e => setActualFigure(e.target.value)} className="pl-8 h-9 text-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-none border-t px-5 py-3 flex items-center justify-between gap-4 bg-card">
          <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {confirmed.length === 0 ? "No locations selected" : <><span className="font-medium text-foreground">{confirmed.length} location{confirmed.length > 1 ? "s" : ""}</span>{benef.length > 0 && <> · {benef.slice(0, 2).join(", ")}{benef.length > 2 ? "…" : ""}</>}</>}
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

// ── Edit Location Dialog ──────────────────────────────────────────────────────
function EditLocationDialog({ loc, theory, indicators, onClose, onSaved }: {
  loc: LocationRecord;
  theory: Theory;
  indicators: MeasurementIndicator[];
  onClose: () => void;
  onSaved: (updated: LocationRecord) => void;
}) {
  const { toast } = useToast();
  const allBenef = useMemo(() => theoryBeneficiaries(theory), [theory]);

  // Parse stored figureLabel back into selected beneficiaries
  const [benef, setBenef]       = useState<string[]>(() => loc.figureLabel ? loc.figureLabel.split(";").map(s => s.trim()).filter(Boolean) : []);
  const [icon, setIcon]         = useState(loc.icon || "general");
  const [selIndId, setSelIndId] = useState<number | null>(null);
  const [manualTarget, setManualTarget] = useState(loc.targetFigure || "");
  const [actualFigure, setActualFigure] = useState(loc.actualFigure || "");
  const [gpsLat, setGpsLat]     = useState(loc.lat?.toString() ?? "");
  const [gpsLng, setGpsLng]     = useState(loc.lng?.toString() ?? "");
  const [saving, setSaving]     = useState(false);

  const selInd = indicators.find(i => i.id === selIndId) ?? null;

  const handleSave = async () => {
    setSaving(true);
    const figureLabel  = benef.join("; ");
    const targetFigure = selInd?.targetFigure ?? manualTarget;
    try {
      const res = await fetch(`${API_BASE}/theories/${theory.id}/locations/${loc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ icon, figureLabel, targetFigure, actualFigure, lat: parseFloat(gpsLat) || loc.lat, lng: parseFloat(gpsLng) || loc.lng }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(await res.json() as LocationRecord);
      toast({ title: "Location updated" });
      onClose();
    } catch (err) {
      toast({ title: "Failed to update", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[540px] p-0 flex flex-col gap-0 max-h-[90vh]">
        <DialogHeader className="px-5 pt-4 pb-3 border-b flex-none">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Pencil className="w-4 h-4 text-primary flex-none" /> Edit Location
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-5">
          {/* Location info (read-only) */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">{markerEmoji(loc.icon)}</span>
              <span className="font-semibold text-sm">{shortName(loc)}</span>
              <LevelBadge level={loc.level} />
            </div>
            <p className="text-xs text-muted-foreground">
              {loc.level === "admin2" ? `${loc.adminLevel1} · ${loc.country}` : loc.level === "admin1" ? loc.country : "Country level"}
            </p>
          </div>

          {/* GPS */}
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

          {/* Beneficiaries */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Beneficiary Groups</label>
            <BeneficiaryPicker allBeneficiaries={allBenef} selected={benef} onChange={setBenef} />
          </div>

          {/* Marker */}
          <div className="border-t pt-4">
            <MarkerPicker value={icon} onChange={setIcon} />
          </div>

          {/* Target & Actual */}
          <div className="border-t pt-4 space-y-3">
            <IndicatorDropdown
              indicators={indicators}
              selectedId={selIndId}
              onSelect={ind => { setSelIndId(ind?.id ?? null); if (!ind) setManualTarget(loc.targetFigure || ""); }}
              manualFigure={manualTarget}
              onManualChange={setManualTarget}
            />
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actual figure</label>
              <div className="relative">
                <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input value={actualFigure} onChange={e => setActualFigure(e.target.value)} placeholder="e.g. 3,812" className="pl-8 h-9 text-sm" />
              </div>
            </div>
          </div>
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

// ── Main Component ────────────────────────────────────────────────────────────
export function LocationsMap({ theory }: { theory: Theory }) {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const [locations, setLocations]     = useState<LocationRecord[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [editing, setEditing]         = useState<LocationRecord | null>(null);
  const [indicators, setIndicators]   = useState<MeasurementIndicator[]>([]);

  const tile = TILE_LAYERS[i18n.language] ?? TILE_LAYERS.default;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, { credentials: "include" });
        if (res.ok) setLocations(await res.json());
      } catch { /* silent */ } finally { setLoadingLocs(false); }
    })();
  }, [theory.id]);

  // Pre-load indicators so edit dialog opens instantly
  useEffect(() => {
    fetchIndicators(theory.id).then(setIndicators);
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
        <div className="px-4 py-3 border-b flex items-center justify-between flex-none">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Locations</span>
            {locations.length > 0 && <Badge variant="secondary" className="text-xs h-5 px-1.5">{locations.length}</Badge>}
          </div>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
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
                const benefGroups = loc.figureLabel ? loc.figureLabel.split(";").map(s => s.trim()).filter(Boolean) : [];
                return (
                  <li key={loc.id} className="group px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 w-7 h-7 rounded-full flex-none flex items-center justify-center text-base"
                        style={{ background: `${COLOURS[i % COLOURS.length]}22`, border: `2px solid ${COLOURS[i % COLOURS.length]}` }}>
                        {markerEmoji(loc.icon)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium leading-tight truncate" title={shortName(loc)}>{shortName(loc)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {loc.level === "admin2" ? `${loc.adminLevel1}, ${loc.country}` : loc.level === "admin1" ? loc.country : "Country level"}
                        </p>
                        <div className="pt-0.5"><LevelBadge level={loc.level} /></div>
                        {benefGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {benefGroups.slice(0, 3).map(b => (
                              <span key={b} className="text-[10px] px-1.5 py-0.5 bg-primary/8 border border-primary/20 text-primary rounded-full">{b}</span>
                            ))}
                            {benefGroups.length > 3 && <span className="text-[10px] text-muted-foreground">+{benefGroups.length - 3}</span>}
                          </div>
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
                    <Popup maxWidth={280}>
                      <div className="space-y-1.5 py-0.5">
                        <p className="font-semibold text-sm flex items-center gap-1.5"><span>{emoji}</span>{shortName(loc)}</p>
                        <p className="text-xs text-gray-500">{loc.level === "admin2" ? `${loc.adminLevel1} · ${loc.country}` : loc.level === "admin1" ? loc.country : "Country level"}</p>
                        {loc.figureLabel && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {loc.figureLabel.split(";").map(b => b.trim()).filter(Boolean).map(b => (
                              <span key={b} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full">{b}</span>
                            ))}
                          </div>
                        )}
                        {(loc.targetFigure || loc.actualFigure) && (
                          <div className="pt-1 border-t border-gray-200 space-y-0.5">
                            {loc.targetFigure && <p className="text-xs text-blue-600">🎯 Target: <strong>{loc.targetFigure}</strong></p>}
                            {loc.actualFigure && <p className="text-xs text-emerald-600">📈 Actual: <strong>{loc.actualFigure}</strong></p>}
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
      <AddLocationDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        theory={theory}
        onSaved={locs => setLocations(prev => [...prev, ...locs])}
        lang={i18n.language}
      />

      {editing && (
        <EditLocationDialog
          loc={editing}
          theory={theory}
          indicators={indicators}
          onClose={() => setEditing(null)}
          onSaved={updated => {
            setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
