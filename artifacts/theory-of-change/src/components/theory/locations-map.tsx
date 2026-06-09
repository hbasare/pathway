import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Plus, Trash2, Loader2, Search, X, Globe, ChevronRight
} from "lucide-react";
import type { Theory } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// Fix Leaflet default icon paths broken by Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
  };
  type: string;
  class: string;
  importance: number;
}

// Palette for polygon outlines
const COLOURS = [
  "#6366f1","#f97316","#10b981","#ec4899","#3b82f6","#eab308","#8b5cf6","#14b8a6",
];

// Fits the map to all current boundary boxes / markers
function FitBounds({ locations }: { locations: LocationRecord[] }) {
  const map = useMap();
  useEffect(() => {
    if (!locations.length) return;
    const bounds: [number, number][] = [];
    locations.forEach(loc => {
      if (loc.lat != null && loc.lng != null) bounds.push([loc.lat, loc.lng]);
      if (loc.boundaryGeoJson) {
        try {
          const layer = L.geoJSON(JSON.parse(loc.boundaryGeoJson));
          const b = layer.getBounds();
          if (b.isValid()) {
            bounds.push([b.getNorth(), b.getEast()]);
            bounds.push([b.getSouth(), b.getWest()]);
          }
        } catch { /* skip */ }
      }
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [locations, map]);
  return null;
}

function levelLabel(loc: LocationRecord) {
  if (loc.adminLevel2) return loc.adminLevel2;
  if (loc.adminLevel1) return `${loc.adminLevel1}, ${loc.country}`;
  return loc.country;
}

function levelBadge(level: string) {
  const map: Record<string, { label: string; cls: string }> = {
    country: { label: "Country",  cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    admin1:  { label: "State / Province", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    admin2:  { label: "District / LGA",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const d = map[level] ?? { label: level, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${d.cls}`}>{d.label}</span>;
}

export function LocationsMap({ theory }: { theory: Theory }) {
  const { toast } = useToast();
  const [locations, setLocations]   = useState<LocationRecord[]>([]);
  const [loadingLocs, setLoadingLocs] = useState(true);

  // Search panel state
  const [showSearch, setShowSearch]   = useState(false);
  const [query, setQuery]             = useState("");
  const [searching, setSearching]     = useState(false);
  const [results, setResults]         = useState<NominatimResult[]>([]);
  const [adding, setAdding]           = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved locations
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, { credentials: "include" });
        if (res.ok) setLocations(await res.json());
      } catch { /* silent */ } finally { setLoadingLocs(false); }
    })();
  }, [theory.id]);

  // Nominatim search (debounced 500 ms)
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&addressdetails=1&limit=8&featuretype=country,state,county,municipality`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data: NominatimResult[] = await res.json();
        // Filter to only geographic admin areas
        const geo = data.filter(r =>
          ["country","state","county","province","municipality","city","administrative"].includes(r.type) ||
          r.class === "boundary"
        );
        setResults(geo);
      } catch {
        setResults([]);
      } finally { setSearching(false); }
    }, 500);
  }, []);

  const handleQueryChange = (v: string) => { setQuery(v); search(v); };

  const resolveLevel = (r: NominatimResult) => {
    if (r.type === "country" || r.class === "country") return "country";
    if (["state","province","region"].includes(r.type)) return "admin1";
    return "admin2";
  };

  const handleAddResult = async (r: NominatimResult) => {
    if (adding === r.place_id) return;
    setAdding(r.place_id);
    const addr = r.address ?? {};
    const level = resolveLevel(r);

    const body = {
      displayName:    r.display_name,
      country:        addr.country        ?? "",
      countryCode:    (addr.country_code  ?? "").toUpperCase(),
      adminLevel1:    addr.state          ?? "",
      adminLevel2:    addr.county         ?? addr.municipality ?? addr.city ?? "",
      lat:            parseFloat(r.lat),
      lng:            parseFloat(r.lon),
      boundaryGeoJson: r.geojson ? JSON.stringify(r.geojson) : "",
      level,
      nominatimId:    String(r.place_id),
    };

    try {
      const res = await fetch(`${API_BASE}/theories/${theory.id}/locations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as LocationRecord;
      setLocations(prev => [...prev, created]);
      setShowSearch(false);
      setQuery("");
      setResults([]);
      toast({ title: "Location added", description: created.displayName });
    } catch (err) {
      toast({ title: "Failed to add location", description: String(err), variant: "destructive" });
    } finally { setAdding(null); }
  };

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
      <aside className="w-72 flex-none border-r bg-card flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between flex-none">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Locations</span>
            {locations.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{locations.length}</Badge>
            )}
          </div>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => { setShowSearch(s => !s); setQuery(""); setResults([]); }}
          >
            {showSearch ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showSearch ? "Cancel" : "Add"}
          </Button>
        </div>

        {/* Search panel */}
        {showSearch && (
          <div className="flex-none border-b bg-muted/40 px-3 py-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                placeholder="Search country, state, district…"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {results.length > 0 && (
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {results.map(r => (
                  <button
                    key={r.place_id}
                    onClick={() => handleAddResult(r)}
                    disabled={!!adding}
                    className="w-full text-left px-2.5 py-2 rounded-md hover:bg-background border border-transparent hover:border-border text-sm flex items-start gap-2 transition-colors disabled:opacity-50"
                  >
                    {adding === r.place_id
                      ? <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin text-primary" />
                      : <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    }
                    <span className="leading-snug line-clamp-2">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <p className="text-xs text-muted-foreground px-1">No results found.</p>
            )}
          </div>
        )}

        {/* Location list */}
        <div className="flex-1 overflow-y-auto">
          {loadingLocs ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 px-4 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No locations yet</p>
              <p className="text-xs text-muted-foreground/70">Use "Add" to pin countries, states or districts where this intervention is active.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {locations.map((loc, i) => (
                <li
                  key={loc.id}
                  className="group px-4 py-3 flex items-start gap-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span
                    className="mt-1 w-2.5 h-2.5 rounded-full flex-none"
                    style={{ backgroundColor: COLOURS[i % COLOURS.length] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight truncate" title={levelLabel(loc)}>
                      {levelLabel(loc)}
                    </p>
                    <div className="mt-0.5">{levelBadge(loc.level)}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Legend */}
        {locations.length > 0 && (
          <div className="flex-none border-t px-4 py-3 space-y-1">
            {[
              { level: "country", label: "Country" },
              { level: "admin1",  label: "State / Province" },
              { level: "admin2",  label: "District / LGA" },
            ].filter(d => locations.some(l => l.level === d.level)).map(d => (
              <div key={d.level} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-3 h-0.5 inline-block rounded" style={{ backgroundColor: d.level === "country" ? "#6366f1" : d.level === "admin1" ? "#f97316" : "#10b981" }} />
                {d.label}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={[15, 20]}
          zoom={2}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitBounds locations={locations} />

          {locations.map((loc, i) => {
            const color = COLOURS[i % COLOURS.length];
            return (
              <div key={loc.id}>
                {loc.boundaryGeoJson && (() => {
                  try {
                    const geo = JSON.parse(loc.boundaryGeoJson);
                    return (
                      <GeoJSON
                        key={`geo-${loc.id}`}
                        data={geo}
                        style={{ color, weight: 2, fillColor: color, fillOpacity: 0.12 }}
                      />
                    );
                  } catch { return null; }
                })()}

                {loc.lat != null && loc.lng != null && (
                  <Marker key={`mk-${loc.id}`} position={[loc.lat, loc.lng]}>
                    <Popup>
                      <div className="text-sm font-semibold">{levelLabel(loc)}</div>
                      {loc.adminLevel1 && <div className="text-xs text-gray-500">{loc.country}</div>}
                    </Popup>
                  </Marker>
                )}
              </div>
            );
          })}
        </MapContainer>

        {/* Map attribution overlay */}
        {locations.length === 0 && !loadingLocs && (
          <div className="absolute inset-0 flex items-end justify-center pb-20 pointer-events-none z-[1000]">
            <div className="bg-card/90 backdrop-blur-sm border rounded-xl px-5 py-4 shadow-lg text-center max-w-xs pointer-events-auto">
              <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Add your first location</p>
              <p className="text-xs text-muted-foreground mt-1">
                Search for a country, state, province or district where this intervention operates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
