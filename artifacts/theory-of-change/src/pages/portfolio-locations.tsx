import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetPortfolioLogframe } from "@workspace/api-client-react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/auth-context";
import { getPermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, MapPin, Globe, Printer, Check,
  Eye, EyeOff, ChevronRight, FolderOpen, Target, TrendingUp,
} from "lucide-react";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  subdomains: "abc",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

// Palette — distinct colours per intervention
const COLOURS = [
  "#6366f1","#f97316","#10b981","#ec4899","#3b82f6",
  "#eab308","#8b5cf6","#14b8a6","#ef4444","#06b6d4",
  "#84cc16","#f43f5e","#0ea5e9","#a855f7","#22d3ee",
];

const MARKER_EMOJIS: Record<string, string> = {
  general:"📍",education:"🏫",health:"🏥",agriculture:"🌾",water:"💧",
  livelihoods:"💼",governance:"🏛️",humanitarian:"🚨",environment:"🌿",
  infrastructure:"🏗️",community:"👥",research:"🔬",
};
const markerEmoji = (id?: string | null) => MARKER_EMOJIS[id ?? "general"] ?? "📍";
const ACTIVITY_TYPE_ICON_MAP: Record<string, string> = {
  "Training":"education","Grant / Cash Transfer":"livelihoods","Input Distribution":"agriculture",
  "Technical Assistance":"general","Capacity Building":"community","Demonstration / Pilot":"research",
  "Community Mobilisation":"community","Market Linkage":"livelihoods","Infrastructure Works":"infrastructure",
  "Research / Survey":"research","Monitoring Visit":"general","Agriculture":"agriculture","Other":"general",
};
const activityEmoji = (t: string) => MARKER_EMOJIS[ACTIVITY_TYPE_ICON_MAP[t] ?? "general"] ?? "📍";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationRecord {
  id: number; theoryId: number;
  displayName: string; country: string; countryCode: string;
  adminLevel1: string; adminLevel2: string; community: string;
  lat: number | null; lng: number | null;
  boundaryGeoJson: string; level: string; nominatimId: string;
  icon: string; figureLabel: string; targetFigure: string; actualFigure: string;
  sector: string; activityType: string; activityDate: string; activityOther: string; activityCommodity: string; beneficiaryType: string;
  numBeneficiaries: number | null; numMale: number | null; numFemale: number | null;
  gender: string; youthFocused: boolean;
  implementingPartner: string; fundingSource: string; notes: string;
}

const SECTOR_COLOURS: Record<string, string> = {
  Agriculture: "#84cc16", Health: "#ec4899", Education: "#3b82f6", WASH: "#06b6d4",
  Livelihoods: "#f97316", Governance: "#8b5cf6", Nutrition: "#eab308", Environment: "#10b981",
  Infrastructure: "#6366f1", Humanitarian: "#ef4444", "Market Systems": "#14b8a6", Research: "#a855f7",
};

interface InterventionEntry {
  id: number;
  title: string;
  color: string;
  locations: LocationRecord[];
  loading: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortName(loc: LocationRecord) {
  return loc.adminLevel2 || loc.adminLevel1 || loc.country;
}
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Leaflet helpers ───────────────────────────────────────────────────────────
function makeIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.9)"><span style="transform:rotate(45deg);font-size:13px;line-height:1">${emoji}</span></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -34],
  });
}

function FitBounds({ locations }: { locations: (LocationRecord & { _color: string })[] }) {
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

// ── Level badge ───────────────────────────────────────────────────────────────
function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    country: { label: "Country",        cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    admin1:  { label: "Region / State", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    admin2:  { label: "District / LGA", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  };
  const d = map[level] ?? { label: level, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${d.cls}`}>{d.label}</span>;
}

// ── Print ─────────────────────────────────────────────────────────────────────
const PRINT_SECTIONS = [
  { id: "map",       label: "Map",             desc: "OpenStreetMap view of all visible locations" },
  { id: "locations", label: "Location list",   desc: "All locations grouped by intervention" },
  { id: "details",   label: "GIS Details",     desc: "Sector, activity type, beneficiaries, partners" },
  { id: "figures",   label: "Target & Actual", desc: "Figures per location by intervention" },
] as const;

function generatePrintHtml(entries: InterventionEntry[], visible: Set<number>, sections: Set<string>, name: string): string {
  const vis = entries.filter(e => visible.has(e.id) && e.locations.length > 0);
  const allLocs = vis.flatMap(e => e.locations);
  const sectorColours: Record<string,string> = {Agriculture:"#84cc16",Health:"#ec4899",Education:"#3b82f6",WASH:"#06b6d4",Livelihoods:"#f97316",Governance:"#8b5cf6",Nutrition:"#eab308",Environment:"#10b981",Infrastructure:"#6366f1",Humanitarian:"#ef4444","Market Systems":"#14b8a6",Research:"#a855f7"};
  const css = `
body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:32px;color:#111;line-height:1.5}
h1{font-size:22px;font-weight:700;margin:0 0 2px}h2{font-size:15px;font-weight:600;margin:28px 0 10px;padding-bottom:5px;border-bottom:2px solid #e5e7eb}
h3{font-size:13px;font-weight:600;margin:16px 0 6px;display:flex;align-items:center;gap:6px}
.meta{color:#6b7280;font-size:12px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px}
th{padding:6px 10px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151}
td{padding:5px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top}
.bc{background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe}.br{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}.bd{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0}
.badge{display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600}
.sector-badge{display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;color:#fff}
.youth{display:inline-block;padding:1px 5px;border-radius:9999px;font-size:10px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;margin-left:2px}
.chip{display:inline-block;padding:1px 6px;border-radius:9999px;border:1px solid #c7d2fe;color:#4f46e5;font-size:10px;margin:1px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
.t{color:#1d4ed8;font-weight:700}.a{color:#15803d;font-weight:700}.dim{color:#9ca3af}.mono{font-family:monospace;font-size:10px}
#_map{width:100%;height:420px;border:1px solid #e5e7eb;border-radius:6px;display:block;margin-bottom:4px}
.map-note{font-size:10px;color:#9ca3af;margin-bottom:4px}
@media print{body{padding:12px}#_map{height:340px;page-break-after:always}h2{page-break-after:avoid}h3{page-break-after:avoid}tr{page-break-inside:avoid}}`;

  const mappableLocs = allLocs.filter(l => l.lat != null && l.lng != null);
  const markerJson = JSON.stringify(
    vis.flatMap(e => e.locations.filter(l => l.lat != null && l.lng != null).map(l => ({
      lat: l.lat as number, lng: l.lng as number, color: e.color, name: shortName(l), title: e.title,
    })))
  );

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(name)} — Locations</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>${css}</style></head><body>`;
  html += `<h1>${esc(name)}</h1><p class="meta">Programme Locations · ${new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})} · ${vis.length} intervention${vis.length!==1?"s":""} · ${allLocs.length} location${allLocs.length!==1?"s":""}</p>`;

  if (sections.has("map") && mappableLocs.length > 0) {
    html += `<h2>Map</h2><div id="_map"></div><p class="map-note">Map shows ${mappableLocs.length} location${mappableLocs.length!==1?"s":""} colour-coded by intervention.</p>
<script>
var _pts=${markerJson};
var _done=false;
function _print(){if(_done)return;_done=true;window.print();}
window.addEventListener('load',function(){
  var map=L.map('_map',{zoomControl:true,attributionControl:false});
  var tiles=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
  var bounds=[];
  _pts.forEach(function(m){
    L.circleMarker([m.lat,m.lng],{radius:9,color:'#fff',weight:2,fillColor:m.color,fillOpacity:0.9}).addTo(map).bindTooltip('<strong>'+m.name+'</strong><br><span style="color:#6b7280;font-size:11px">'+m.title+'</span>',{direction:'top'});
    bounds.push([m.lat,m.lng]);
  });
  if(bounds.length===1){map.setView(bounds[0],8);}
  else if(bounds.length>1){map.fitBounds(L.latLngBounds(bounds),{padding:[50,50]});}
  tiles.once('load',function(){setTimeout(_print,600);});
  setTimeout(_print,4000);
});
<\/script>`;
  }

  const levelLabel: Record<string,string> = {country:"Country",admin1:"Region",admin2:"District"};
  const levelCls:   Record<string,string> = {country:"bc",admin1:"br",admin2:"bd"};

  if (sections.has("locations")) {
    html += `<h2>Locations by Intervention</h2>`;
    vis.forEach(e => {
      html += `<h3><span class="dot" style="background:${esc(e.color)}"></span>${esc(e.title)} <span class="dim" style="font-size:11px;font-weight:400">(${e.locations.length})</span></h3>`;
      html += `<table><tr><th>Location</th><th>Level</th><th>Community</th><th>Region / State</th><th>Country</th><th>Coordinates</th></tr>`;
      e.locations.forEach(loc => {
        html += `<tr><td style="font-weight:600">${esc(shortName(loc))}</td><td><span class="badge ${levelCls[loc.level]??"bc"}">${levelLabel[loc.level]??loc.level}</span></td><td class="dim">${esc(loc.community||"—")}</td><td class="dim">${esc(loc.adminLevel2||loc.adminLevel1||"—")}</td><td>${esc(loc.country)}</td><td class="mono dim">${loc.lat!=null?loc.lat.toFixed(4):"—"}, ${loc.lng!=null?loc.lng.toFixed(4):"—"}</td></tr>`;
      });
      html += `</table>`;
    });
  }

  if (sections.has("details")) {
    html += `<h2>GIS Details by Intervention</h2>`;
    vis.forEach(e => {
      html += `<h3><span class="dot" style="background:${esc(e.color)}"></span>${esc(e.title)}</h3>`;
      html += `<table><tr><th>Location</th><th>Sector</th><th>Activity</th><th>Date</th><th>Specification</th><th>Beneficiary Type</th><th>Total</th><th>Males</th><th>Females</th><th>Gender</th><th>Partner</th><th>Funder</th></tr>`;
      e.locations.forEach(loc => {
        const sectorHtml = loc.sector ? `<span class="sector-badge" style="background:${sectorColours[loc.sector]??'#6366f1'}">${esc(loc.sector)}</span>${loc.youthFocused?'<span class="youth">Youth</span>':""}` : (loc.youthFocused?'<span class="youth">Youth</span>':'<span class="dim">—</span>');
        const actLabel = loc.activityType ? `${activityEmoji(loc.activityType)} ${esc(loc.activityType)}` : '<span class="dim">—</span>';
        const spec = loc.activityOther ? esc(loc.activityOther) : loc.activityCommodity ? esc(loc.activityCommodity) : '<span class="dim">—</span>';
        html += `<tr><td style="font-weight:600">${esc(shortName(loc))}</td><td>${sectorHtml}</td><td class="dim">${actLabel}</td><td class="dim">${esc(loc.activityDate||"—")}</td><td class="dim">${spec}</td><td class="dim">${esc(loc.beneficiaryType||"—")}</td><td class="dim">${loc.numBeneficiaries!=null?loc.numBeneficiaries.toLocaleString():"—"}</td><td style="color:#1d4ed8">${loc.numMale!=null?loc.numMale.toLocaleString():"—"}</td><td style="color:#be185d">${loc.numFemale!=null?loc.numFemale.toLocaleString():"—"}</td><td class="dim">${esc(loc.gender||"—")}</td><td class="dim">${esc(loc.implementingPartner||"—")}</td><td class="dim">${esc(loc.fundingSource||"—")}</td></tr>`;
      });
      html += `</table>`;
      const withNotes = e.locations.filter(l => l.notes);
      if (withNotes.length) {
        html += `<table style="margin-top:4px"><tr><th>Location</th><th>Notes</th></tr>`;
        withNotes.forEach(loc => { html += `<tr><td style="font-weight:600;white-space:nowrap">${esc(shortName(loc))}</td><td>${esc(loc.notes)}</td></tr>`; });
        html += `</table>`;
      }
    });
  }

  if (sections.has("figures")) {
    html += `<h2>Target &amp; Actual Figures</h2>`;
    vis.forEach(e => {
      html += `<h3><span class="dot" style="background:${esc(e.color)}"></span>${esc(e.title)}</h3><table><tr><th>Location</th><th>Target</th><th>Actual</th></tr>`;
      e.locations.forEach(loc => {
        html += `<tr><td style="font-weight:600">${esc(shortName(loc))}</td><td class="t">${esc(loc.targetFigure||"—")}</td><td class="a">${esc(loc.actualFigure||"—")}</td></tr>`;
      });
      html += `</table>`;
    });
  }

  // If no map section was included, we still need to trigger print after load
  if (!sections.has("map") || mappableLocs.length === 0) {
    html += `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},600);});<\/script>`;
  }
  html += `</body></html>`;
  return html;
}

function PrintDialog({ open, onClose, entries, visible, name }: {
  open: boolean; onClose: () => void;
  entries: InterventionEntry[]; visible: Set<number>; name: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["map","locations","figures"]));
  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const visCount = entries.filter(e => visible.has(e.id) && e.locations.length > 0).length;
  const totalLocs = entries.filter(e => visible.has(e.id)).reduce((a,e) => a + e.locations.length, 0);
  const doPrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(generatePrintHtml(entries, visible, selected, name));
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
          <p className="text-xs text-muted-foreground">
            Will include <strong>{visCount}</strong> visible intervention{visCount!==1?"s":""} · <strong>{totalLocs}</strong> location{totalLocs!==1?"s":""}.
          </p>
          <div className="space-y-1">
            {PRINT_SECTIONS.map(s => {
              const on = selected.has(s.id);
              return (
                <label key={s.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${on ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-muted/50"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-none flex items-center justify-center transition-colors ${on ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                    {on && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s.id)} />
                  <div><p className="text-sm font-medium leading-tight">{s.label}</p><p className="text-[11px] text-muted-foreground">{s.desc}</p></div>
                </label>
              );
            })}
          </div>
          {totalLocs === 0 && <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2 border border-amber-200">No visible locations — toggle interventions on in the sidebar.</p>}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={selected.size===0||totalLocs===0} onClick={doPrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Open Print Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioLocations() {
  const { id } = useParams<{ id: string }>();
  const portfolioId = Number(id);
  const { user } = useAuth();
  const [, setNavLocation] = useLocation();
  useEffect(() => {
    if (user && !getPermissions(user.role).canViewDetail) setNavLocation("/");
  }, [user?.role]);

  const { data, isLoading, error } = useGetPortfolioLogframe(portfolioId);
  const [entries, setEntries]   = useState<InterventionEntry[]>([]);
  const [visible, setVisible]   = useState<Set<number>>(new Set());
  const [showPrint, setShowPrint] = useState(false);

  // Bootstrap entries and fetch locations for all interventions in parallel
  useEffect(() => {
    if (!data?.theories?.length) return;
    const initial: InterventionEntry[] = data.theories.map((t, i) => ({
      id: t.id, title: t.title, color: COLOURS[i % COLOURS.length],
      locations: [], loading: true,
    }));
    setEntries(initial);
    setVisible(new Set(data.theories.map(t => t.id)));

    data.theories.forEach(async t => {
      try {
        const res = await fetch(`${API_BASE}/theories/${t.id}/locations`, { credentials: "include" });
        const locs: LocationRecord[] = res.ok ? await res.json() : [];
        setEntries(prev => prev.map(e => e.id === t.id ? { ...e, locations: locs, loading: false } : e));
      } catch {
        setEntries(prev => prev.map(e => e.id === t.id ? { ...e, loading: false } : e));
      }
    });
  }, [data?.theories]);

  const toggleVisible = (id: number) => setVisible(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const visibleLocs = useMemo(() =>
    entries
      .filter(e => visible.has(e.id))
      .flatMap(e => e.locations.map(l => ({ ...l, _color: e.color, _title: e.title }))),
    [entries, visible]
  );

  const totalLocs   = entries.reduce((a, e) => a + e.locations.length, 0);
  const loadingAny  = entries.some(e => e.loading);

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-muted-foreground">Portfolio not found.</p>
      <Link href="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
    </div>
  );

  const { portfolio } = data;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b bg-background flex-none gap-3">
        <nav className="flex items-center gap-1 min-w-0 text-sm">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-none" />
          <Link href={`/portfolio/${portfolioId}/logframe`}>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground gap-1 text-xs">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="max-w-[160px] truncate">{portfolio.name}</span>
            </Button>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-none" />
          <span className="flex items-center gap-1.5 font-semibold text-foreground text-xs px-2">
            <Globe className="w-3.5 h-3.5 text-primary" /> Locations Map
          </span>
        </nav>
        <div className="flex items-center gap-2 flex-none">
          {loadingAny && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <Badge variant="secondary" className="text-xs">{totalLocs} location{totalLocs !== 1 ? "s" : ""}</Badge>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
            onClick={() => setShowPrint(true)} disabled={totalLocs === 0}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-72 flex-none border-r bg-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex-none">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Interventions</span>
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setVisible(new Set(entries.map(e => e.id)))}
                  className="text-primary hover:underline">All</button>
                <span className="text-muted-foreground/40">·</span>
                <button onClick={() => setVisible(new Set())}
                  className="text-muted-foreground hover:underline">None</button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entries.length} intervention{entries.length !== 1 ? "s" : ""} · click to toggle visibility
            </p>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {entries.length === 0 ? (
              <li className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No interventions in this portfolio.</p>
              </li>
            ) : entries.map(e => {
              const on = visible.has(e.id);
              return (
                <li key={e.id}>
                  <button onClick={() => toggleVisible(e.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${on ? "hover:bg-muted/30" : "opacity-50 hover:opacity-70 hover:bg-muted/20"}`}>
                    {/* Colour indicator + eye */}
                    <div className="flex-none flex flex-col items-center gap-1.5 pt-0.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: e.color }} />
                      {on
                        ? <Eye className="w-3 h-3 text-muted-foreground" />
                        : <EyeOff className="w-3 h-3 text-muted-foreground/40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.loading
                          ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading…</span>
                          : `${e.locations.length} location${e.locations.length !== 1 ? "s" : ""}`}
                      </p>
                      {/* Mini location list when visible */}
                      {on && !e.loading && e.locations.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {e.locations.slice(0, 4).map(loc => (
                            <li key={loc.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="w-2.5 h-2.5 flex-none" style={{ color: e.color }} />
                              <span className="truncate">{shortName(loc)}</span>
                              {(loc.targetFigure || loc.actualFigure) && (
                                <span className="flex-none flex items-center gap-0.5 ml-auto">
                                  {loc.targetFigure && <span className="text-blue-500">🎯{loc.targetFigure}</span>}
                                  {loc.actualFigure && <span className="text-emerald-500">📈{loc.actualFigure}</span>}
                                </span>
                              )}
                            </li>
                          ))}
                          {e.locations.length > 4 && (
                            <li className="text-[10px] text-muted-foreground pl-3.5">+{e.locations.length - 4} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Legend */}
          {totalLocs > 0 && (
            <div className="flex-none border-t px-4 py-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Admin Level</p>
              {[
                { level: "country", label: "Country",        cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
                { level: "admin1",  label: "Region / State", cls: "bg-orange-100 text-orange-700 border-orange-200" },
                { level: "admin2",  label: "District / LGA", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
              ].filter(d => entries.some(e => e.locations.some(l => l.level === d.level))).map(d => (
                <div key={d.level} className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${d.cls}`}>{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Map ── */}
        <div className="flex-1 relative">
          <MapContainer center={[8, 22]} zoom={4} className="w-full h-full">
            <TileLayer url={TILE.url} attribution={TILE.attribution}
              subdomains={TILE.subdomains as any} maxZoom={19} />
            <FitBounds locations={visibleLocs} />

            {visibleLocs.map(loc => {
              const emoji = markerEmoji(loc.icon);
              const color = loc._color;
              return (
                <span key={`${loc.theoryId}-${loc.id}`}>
                  {loc.boundaryGeoJson && (() => {
                    try {
                      return (
                        <GeoJSON
                          key={`geo-${loc.theoryId}-${loc.id}`}
                          data={JSON.parse(loc.boundaryGeoJson) as any}
                          style={{ color, weight: 2, fillColor: color, fillOpacity: 0.12, dashArray: "4 2" }}
                        />
                      );
                    } catch { return null; }
                  })()}
                  {loc.lat != null && loc.lng != null && (
                    <Marker key={`mk-${loc.theoryId}-${loc.id}`}
                      position={[loc.lat, loc.lng]} icon={makeIcon(emoji, color)}>
                      <Popup maxWidth={300}>
                        <div className="space-y-1.5 py-0.5">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
                              style={{ background: color }}>
                              {loc._title}
                            </span>
                          </div>
                          <p className="font-semibold text-sm flex items-center gap-1.5">
                            <span>{emoji}</span>{shortName(loc)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {loc.community ? `${loc.community} · ` : ""}
                            {loc.level === "admin2"
                              ? `${loc.adminLevel1} · ${loc.country}`
                              : loc.level === "admin1" ? loc.country : "Country level"}
                          </p>
                          {loc.sector && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                              style={{ background: SECTOR_COLOURS[loc.sector] ?? "#6366f1" }}>
                              {loc.sector}
                            </span>
                          )}
                          {(loc.activityType || loc.beneficiaryType || loc.numBeneficiaries != null || loc.gender || loc.youthFocused) && (
                            <div className="pt-1 border-t border-gray-200 space-y-0.5 text-xs text-gray-600">
                              {loc.activityType   && <p>{activityEmoji(loc.activityType)} <strong>Activity:</strong> {loc.activityType}{loc.activityOther ? ` — ${loc.activityOther}` : ""}{loc.activityCommodity ? ` (${loc.activityCommodity})` : ""}</p>}
                              {loc.activityDate   && <p>📅 <strong>Date:</strong> {loc.activityDate}</p>}
                              {loc.beneficiaryType && <p>👥 <strong>Beneficiaries:</strong> {loc.beneficiaryType}{loc.numBeneficiaries != null ? ` (${loc.numBeneficiaries.toLocaleString()})` : ""}</p>}
                              {loc.gender         && <p>⚧ <strong>Gender:</strong> {loc.gender}</p>}
                              {(loc.numMale != null || loc.numFemale != null) && (
                                <p>
                                  {loc.numMale != null && <span className="text-blue-600">♂ {loc.numMale.toLocaleString()} males</span>}
                                  {loc.numMale != null && loc.numFemale != null && <span className="text-gray-400"> · </span>}
                                  {loc.numFemale != null && <span className="text-pink-600">♀ {loc.numFemale.toLocaleString()} females</span>}
                                </p>
                              )}
                              {loc.youthFocused   && <p>🌱 <strong>Youth-focused</strong></p>}
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
                              {loc.targetFigure && (
                                <p className="text-xs text-blue-600 flex items-center gap-1">
                                  <Target className="w-3 h-3" /> Target: <strong>{loc.targetFigure}</strong>
                                </p>
                              )}
                              {loc.actualFigure && (
                                <p className="text-xs text-emerald-600 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Actual: <strong>{loc.actualFigure}</strong>
                                </p>
                              )}
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

          {/* Empty-state overlay */}
          {visibleLocs.length === 0 && !loadingAny && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
              <div className="bg-card/95 backdrop-blur-sm border rounded-xl px-6 py-5 shadow-xl text-center max-w-xs pointer-events-auto">
                <Globe className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                {totalLocs === 0 ? (
                  <>
                    <p className="font-semibold text-sm">No locations added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Open individual interventions and add locations — they'll appear here automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm">All interventions hidden</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Toggle interventions on in the sidebar to see their locations.
                    </p>
                    <Button size="sm" variant="outline" className="mt-3"
                      onClick={() => setVisible(new Set(entries.map(e => e.id)))}>
                      Show All
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <PrintDialog
        open={showPrint} onClose={() => setShowPrint(false)}
        entries={entries} visible={visible} name={portfolio.name}
      />
    </div>
  );
}
