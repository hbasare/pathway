import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MapPin, Plus, Trash2, Loader2, Search, Globe, ChevronDown,
  Check, Navigation, Target, TrendingUp, Palette, X,
} from "lucide-react";
import type { Theory } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface LocationRecord {
  id: number;
  theoryId: number;
  displayName: string;
  country: string;
  countryCode: string;
  adminLevel1: string;
  adminLevel2: string;
  lat: number | null;
  lng: number | null;
  boundaryGeoJson: string;
  level: string;
  nominatimId: string;
  icon: string;
  figureLabel: string;
  targetFigure: string;
  actualFigure: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  geojson?: object;
  address?: {
    country?: string;
    country_code?: string;
    state?: string;
    county?: string;
    municipality?: string;
    city?: string;
    district?: string;
    region?: string;
  };
  type: string;
  class: string;
}

interface Country { name: string; code: string; }

// ── Constants ────────────────────────────────────────────────────────────────

const COLOURS = [
  "#6366f1","#f97316","#10b981","#ec4899","#3b82f6",
  "#eab308","#8b5cf6","#14b8a6","#ef4444","#06b6d4",
];

const ICONS: { id: string; emoji: string; label: string }[] = [
  { id: "general",        emoji: "📍", label: "General" },
  { id: "education",      emoji: "🏫", label: "Education" },
  { id: "health",         emoji: "🏥", label: "Health" },
  { id: "agriculture",    emoji: "🌾", label: "Agriculture" },
  { id: "water",          emoji: "💧", label: "Water & Sanitation" },
  { id: "community",      emoji: "👥", label: "Community" },
  { id: "infrastructure", emoji: "🏗️", label: "Infrastructure" },
  { id: "environment",    emoji: "🌿", label: "Environment" },
  { id: "livelihoods",    emoji: "💼", label: "Livelihoods" },
  { id: "governance",     emoji: "🏛️", label: "Governance" },
  { id: "gender",         emoji: "♀️", label: "Gender & Inclusion" },
  { id: "youth",          emoji: "🧑", label: "Youth" },
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

const emojiFor = (icon: string) =>
  ICONS.find(i => i.id === icon)?.emoji ?? "📍";

// ── Map helpers ───────────────────────────────────────────────────────────────

function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid white;
    "><span style="transform:rotate(45deg);font-size:16px;line-height:1">${emoji}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
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
          if (b.isValid()) {
            pts.push([b.getNorth(), b.getEast()]);
            pts.push([b.getSouth(), b.getWest()]);
          }
        } catch { /* skip */ }
      }
    });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 10 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

// ── Sidebar helpers ───────────────────────────────────────────────────────────

function shortName(loc: LocationRecord) {
  if (loc.adminLevel2) return loc.adminLevel2;
  if (loc.adminLevel1) return loc.adminLevel1;
  return loc.country;
}

function levelBadge(level: string) {
  const map: Record<string, string> = {
    country: "bg-indigo-100 text-indigo-700 border-indigo-200",
    admin1:  "bg-orange-100 text-orange-700 border-orange-200",
    admin2:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, string> = {
    country: "Country", admin1: "Region / State", admin2: "District / LGA",
  };
  const cls = map[level] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cls}`}>
      {labels[level] ?? level}
    </span>
  );
}

// ── Nominatim search hook ─────────────────────────────────────────────────────

function useNominatimSearch(countryCode: string, featureType: "state" | "county") {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    setQuery(q);
    if (!q.trim() || !countryCode) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q, format: "json", polygon_geojson: "1",
          addressdetails: "1", limit: "10",
          countrycodes: countryCode,
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { "Accept-Language": "en" },
        });
        const data: NominatimResult[] = await res.json();
        const filter = featureType === "state"
          ? ["state","province","region","administrative"]
          : ["county","district","municipality","city","suburb","administrative"];
        setResults(data.filter(r =>
          filter.includes(r.type) || r.class === "boundary"
        ));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 450);
  }, [countryCode, featureType]);

  const clear = useCallback(() => { setQuery(""); setResults([]); }, []);

  return { query, results, loading, search, clear };
}

// ── Draft state ───────────────────────────────────────────────────────────────

interface Draft {
  country: Country | null;
  region: NominatimResult | null;
  district: NominatimResult | null;
  gpsLat: string;
  gpsLng: string;
  icon: string;
  figureLabel: string;
  targetFigure: string;
  actualFigure: string;
}

const EMPTY_DRAFT: Draft = {
  country: null, region: null, district: null,
  gpsLat: "", gpsLng: "",
  icon: "general",
  figureLabel: "", targetFigure: "", actualFigure: "",
};

// ── Add Location Sheet ────────────────────────────────────────────────────────

function AddLocationSheet({
  open, onClose, theoryId, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  theoryId: number;
  onSaved: (loc: LocationRecord) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const regionHook    = useNominatimSearch(draft.country?.code ?? "", "state");
  const districtHook  = useNominatimSearch(draft.country?.code ?? "", "county");

  // Auto-fill GPS when a district or region is chosen
  useEffect(() => {
    const src = draft.district ?? draft.region;
    if (src) { set("gpsLat", parseFloat(src.lat).toFixed(5)); set("gpsLng", parseFloat(src.lon).toFixed(5)); }
  }, [draft.district, draft.region]);

  const filteredCountries = useMemo(() =>
    COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())),
    [countrySearch]);

  const resolveLevel = () => {
    if (draft.district) return "admin2";
    if (draft.region)   return "admin1";
    return "country";
  };

  const displayName = () => {
    const parts: string[] = [];
    if (draft.district) parts.push(draft.district.address?.county ?? draft.district.address?.district ?? draft.district.address?.municipality ?? "");
    else if (draft.region) parts.push(draft.region.address?.state ?? draft.region.address?.region ?? "");
    if (draft.country) parts.push(draft.country.name);
    return parts.filter(Boolean).join(", ");
  };

  const canSave = !!draft.country && !!draft.gpsLat && !!draft.gpsLng;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const src = draft.district ?? draft.region;
    const level = resolveLevel();
    const body = {
      displayName:     displayName(),
      country:         draft.country!.name,
      countryCode:     draft.country!.code.toUpperCase(),
      adminLevel1:     draft.region?.address?.state ?? draft.region?.address?.region ?? "",
      adminLevel2:     draft.district?.address?.county ?? draft.district?.address?.district ?? draft.district?.address?.municipality ?? "",
      lat:             parseFloat(draft.gpsLat),
      lng:             parseFloat(draft.gpsLng),
      boundaryGeoJson: src?.geojson ? JSON.stringify(src.geojson) : "",
      level,
      nominatimId:     String(src?.place_id ?? ""),
      icon:            draft.icon,
      figureLabel:     draft.figureLabel,
      targetFigure:    draft.targetFigure,
      actualFigure:    draft.actualFigure,
    };
    try {
      const res = await fetch(`${API_BASE}/theories/${theoryId}/locations`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as LocationRecord;
      onSaved(created);
      toast({ title: "Location saved", description: created.displayName });
      setDraft(EMPTY_DRAFT);
      setCountrySearch("");
      regionHook.clear();
      districtHook.clear();
      onClose();
    } catch (err) {
      toast({ title: "Failed to save", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const Section = ({ step, title, children }: { step: number; title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-none">{step}</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b flex-none">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-primary" />
            Add Intervention Location
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ── Step 1: Country ── */}
          <Section step={1} title="Country of Operation">
            {draft.country ? (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-primary/5 border-primary/30">
                <Globe className="w-4 h-4 text-primary flex-none" />
                <span className="text-sm font-medium flex-1">{draft.country.name}</span>
                <button onClick={() => { set("country", null); set("region", null); set("district", null); regionHook.clear(); districtHook.clear(); }}
                  className="text-muted-foreground hover:text-destructive p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search country…"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="border rounded-md max-h-44 overflow-y-auto bg-card divide-y divide-border">
                  {filteredCountries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { set("country", c); setCountrySearch(""); }}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                    >
                      {c.name}
                    </button>
                  ))}
                  {filteredCountries.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Step 2: Region / State / Province ── */}
          <Section step={2} title="Region / State / Province">
            {!draft.country ? (
              <p className="text-xs text-muted-foreground">Select a country first.</p>
            ) : draft.region ? (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-orange-50 border-orange-200">
                <Check className="w-4 h-4 text-orange-600 flex-none" />
                <span className="text-sm font-medium flex-1 text-orange-800">
                  {draft.region.address?.state ?? draft.region.address?.region ?? draft.region.display_name}
                </span>
                <button onClick={() => { set("region", null); set("district", null); regionHook.clear(); districtHook.clear(); }}
                  className="text-muted-foreground hover:text-destructive p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={`Search region in ${draft.country.name}…`}
                    value={regionHook.query}
                    onChange={e => regionHook.search(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {regionHook.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                {regionHook.results.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto bg-card divide-y divide-border">
                    {regionHook.results.map(r => (
                      <button
                        key={r.place_id}
                        onClick={() => { set("region", r); regionHook.clear(); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                      >
                        {r.address?.state ?? r.address?.region ?? r.display_name.split(",")[0]}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => set("region", null)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Skip (country-level only)
                </button>
              </div>
            )}
          </Section>

          {/* ── Step 3: District / LGA ── */}
          <Section step={3} title="District / Local Government Area">
            {!draft.region ? (
              <p className="text-xs text-muted-foreground">Select a region first, or skip this step.</p>
            ) : draft.district ? (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-emerald-50 border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 flex-none" />
                <span className="text-sm font-medium flex-1 text-emerald-800">
                  {draft.district.address?.county ?? draft.district.address?.district ?? draft.district.address?.municipality ?? draft.district.display_name.split(",")[0]}
                </span>
                <button onClick={() => { set("district", null); districtHook.clear(); }}
                  className="text-muted-foreground hover:text-destructive p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder={`Search district in ${draft.region.address?.state ?? draft.country?.name}…`}
                    value={districtHook.query}
                    onChange={e => districtHook.search(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {districtHook.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>
                {districtHook.results.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto bg-card divide-y divide-border">
                    {districtHook.results.map(r => (
                      <button
                        key={r.place_id}
                        onClick={() => { set("district", r); districtHook.clear(); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 transition-colors"
                      >
                        {r.address?.county ?? r.address?.district ?? r.address?.municipality ?? r.display_name.split(",")[0]}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => set("district", null)}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Skip (region-level only)
                </button>
              </div>
            )}
          </Section>

          {/* ── Step 4: GPS Coordinates ── */}
          <Section step={4} title="GPS Coordinates">
            <p className="text-xs text-muted-foreground">Auto-filled from your selection above. Override if needed.</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Latitude</label>
                <div className="relative mt-0.5">
                  <Navigation className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="e.g. 7.9465"
                    value={draft.gpsLat}
                    onChange={e => set("gpsLat", e.target.value)}
                    className="pl-8 h-8 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Longitude</label>
                <div className="relative mt-0.5">
                  <Navigation className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none rotate-90" />
                  <Input
                    placeholder="e.g. -1.0232"
                    value={draft.gpsLng}
                    onChange={e => set("gpsLng", e.target.value)}
                    className="pl-8 h-8 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Step 5: Icon ── */}
          <Section step={5} title="Intervention Type Icon">
            <div className="grid grid-cols-4 gap-1.5">
              {ICONS.map(ic => (
                <button
                  key={ic.id}
                  onClick={() => set("icon", ic.id)}
                  title={ic.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                    draft.icon === ic.id
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{ic.emoji}</span>
                  <span className="leading-tight text-center line-clamp-1">{ic.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* ── Step 6: Target & Actual Figures ── */}
          <Section step={6} title="Target & Actual Figures">
            <p className="text-xs text-muted-foreground">Optional. Attach numeric targets and results to this location.</p>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Figure Label</label>
              <div className="relative mt-0.5">
                <Palette className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="e.g. Beneficiaries reached"
                  value={draft.figureLabel}
                  onChange={e => set("figureLabel", e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Target</label>
                <div className="relative mt-0.5">
                  <Target className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="e.g. 5,000"
                    value={draft.targetFigure}
                    onChange={e => set("targetFigure", e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Actual</label>
                <div className="relative mt-0.5">
                  <TrendingUp className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="e.g. 3,812"
                    value={draft.actualFigure}
                    onChange={e => set("actualFigure", e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex-none border-t px-5 py-4 flex items-center justify-between gap-3 bg-card">
          <p className="text-xs text-muted-foreground">
            {draft.country
              ? <span className="font-medium text-foreground">{displayName() || draft.country.name}</span>
              : "No country selected"
            }
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" disabled={!canSave || saving} onClick={handleSave} className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Location
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function LocationsMap({ theory }: { theory: Theory }) {
  const { toast } = useToast();
  const [locations, setLocations]     = useState<LocationRecord[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(true);
  const [showSheet, setShowSheet]     = useState(false);

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
      await fetch(`${API_BASE}/theories/${theory.id}/locations/${locId}`, {
        method: "DELETE", credentials: "include",
      });
      setLocations(prev => prev.filter(l => l.id !== locId));
    } catch {
      toast({ title: "Failed to remove location", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-80 flex-none border-r bg-card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between flex-none">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Locations</span>
            {locations.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{locations.length}</Badge>
            )}
          </div>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowSheet(true)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLocs ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No locations yet</p>
              <p className="text-xs text-muted-foreground/70">
                Click "Add" to pin countries, regions or districts where this intervention operates.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {locations.map((loc, i) => (
                <li key={loc.id} className="group px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="mt-0.5 w-7 h-7 rounded-full flex-none flex items-center justify-center text-sm"
                      style={{ backgroundColor: COLOURS[i % COLOURS.length] + "22", border: `2px solid ${COLOURS[i % COLOURS.length]}` }}
                    >
                      <span>{emojiFor(loc.icon)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate" title={shortName(loc)}>
                        {shortName(loc)}
                      </p>
                      {loc.adminLevel1 && loc.level !== "admin1" && (
                        <p className="text-xs text-muted-foreground truncate">{loc.adminLevel1}, {loc.country}</p>
                      )}
                      {loc.level === "admin1" && (
                        <p className="text-xs text-muted-foreground truncate">{loc.country}</p>
                      )}
                      {loc.level === "country" && (
                        <p className="text-xs text-muted-foreground truncate">Country level</p>
                      )}
                      <div className="mt-1">{levelBadge(loc.level)}</div>
                      {(loc.targetFigure || loc.actualFigure) && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {loc.figureLabel && (
                            <span className="text-[10px] text-muted-foreground">{loc.figureLabel}:</span>
                          )}
                          {loc.targetFigure && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                              <Target className="w-2.5 h-2.5" />{loc.targetFigure}
                            </span>
                          )}
                          {loc.actualFigure && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              <TrendingUp className="w-2.5 h-2.5" />{loc.actualFigure}
                            </span>
                          )}
                        </div>
                      )}
                      {loc.lat != null && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                          {loc.lat.toFixed(4)}, {loc.lng?.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(loc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex-none mt-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {locations.length > 0 && (
          <div className="flex-none border-t px-4 py-2.5 space-y-1">
            {[
              { level: "country", label: "Country",           col: "#6366f1" },
              { level: "admin1",  label: "Region / State",    col: "#f97316" },
              { level: "admin2",  label: "District / LGA",    col: "#10b981" },
            ].filter(d => locations.some(l => l.level === d.level)).map(d => (
              <div key={d.level} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-3 h-0.5 rounded inline-block" style={{ backgroundColor: d.col }} />
                {d.label}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer center={[10, 15]} zoom={3} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds locations={locations} />

          {locations.map((loc, i) => {
            const color = COLOURS[i % COLOURS.length];
            const emoji = emojiFor(loc.icon);
            return (
              <span key={loc.id}>
                {loc.boundaryGeoJson && (() => {
                  try {
                    return (
                      <GeoJSON
                        key={`geo-${loc.id}`}
                        data={JSON.parse(loc.boundaryGeoJson)}
                        style={{ color, weight: 2.5, fillColor: color, fillOpacity: 0.14 }}
                      />
                    );
                  } catch { return null; }
                })()}
                {loc.lat != null && loc.lng != null && (
                  <Marker
                    key={`mk-${loc.id}`}
                    position={[loc.lat, loc.lng]}
                    icon={makeIcon(emoji, color)}
                  >
                    <Popup maxWidth={240}>
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{emoji}</span>
                          <span>{shortName(loc)}</span>
                        </div>
                        {loc.level !== "country" && (
                          <div className="text-xs text-gray-500">{loc.country}</div>
                        )}
                        <div className="text-xs text-gray-400 font-mono">
                          {loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}
                        </div>
                        {(loc.targetFigure || loc.actualFigure) && (
                          <div className="pt-1 border-t border-gray-200 space-y-0.5">
                            {loc.figureLabel && (
                              <div className="text-xs font-medium text-gray-600">{loc.figureLabel}</div>
                            )}
                            {loc.targetFigure && (
                              <div className="text-xs text-blue-600">🎯 Target: <strong>{loc.targetFigure}</strong></div>
                            )}
                            {loc.actualFigure && (
                              <div className="text-xs text-emerald-600">📈 Actual: <strong>{loc.actualFigure}</strong></div>
                            )}
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
              <p className="text-xs text-muted-foreground mt-1">
                Select country → region → district, set GPS coordinates, choose an icon and attach target/actual figures.
              </p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowSheet(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Location
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Location Sheet ── */}
      <AddLocationSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        theoryId={theory.id}
        onSaved={loc => setLocations(prev => [...prev, loc])}
      />
    </div>
  );
}
