import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Check, X, Loader2, ChevronDown,
  Link2, ArrowRight, LayoutList, Eye, Info, Globe,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MarketSystem {
  id: number; theoryId: number; title: string; description: string;
  marketFocus: string; color: string; position: number;
}
interface MarketElement {
  id: number; marketSystemId: number; theoryId: number;
  ring: string; category: string; title: string; description: string;
  actors: string; constraints: string; opportunities: string;
  color: string; position: number; linkedMarketSystemId: number | null;
}
interface SelectedSeg { ring: string; category: string; label: string; color: string; }

// ── Constants ─────────────────────────────────────────────────────────────────
const SUPPORT_COLORS = [
  "#3b82f6","#84cc16","#a855f7","#06b6d4",
  "#f97316","#eab308","#ec4899","#14b8a6","#f43f5e","#8b5cf6",
];
const DEFAULT_SUPPORT_CATS = [
  { cat: "Agricultural Inputs", color: "#84cc16" },
  { cat: "Finance & Credit",    color: "#3b82f6" },
  { cat: "Extension Services",  color: "#a855f7" },
  { cat: "Market Information",  color: "#eab308" },
  { cat: "Transport & Logistics",color: "#06b6d4" },
  { cat: "Processing & Storage",color: "#f97316" },
];
const MARKET_COLORS = ["#6366f1","#ec4899","#f97316","#22c55e","#06b6d4","#a855f7","#eab308","#ef4444"];

// ── SVG helpers ───────────────────────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function slicePath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number) {
  const p1 = polar(cx, cy, ro, a1), p2 = polar(cx, cy, ro, a2);
  const p3 = polar(cx, cy, ri, a2), p4 = polar(cx, cy, ri, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A${ro} ${ro} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L${p3.x.toFixed(2)} ${p3.y.toFixed(2)} A${ri} ${ri} 0 ${large} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}Z`;
}
function depthPath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number, dy: number) {
  const p1 = polar(cx, cy, ro, a1), p2 = polar(cx, cy, ro, a2);
  const p3 = polar(cx, cy, ri, a2), p4 = polar(cx, cy, ri, a1);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${p1.x.toFixed(2)} ${(p1.y + dy).toFixed(2)} A${ro} ${ro} 0 ${large} 1 ${p2.x.toFixed(2)} ${(p2.y + dy).toFixed(2)} L${p3.x.toFixed(2)} ${(p3.y + dy).toFixed(2)} A${ri} ${ri} 0 ${large} 0 ${p4.x.toFixed(2)} ${(p4.y + dy).toFixed(2)}Z`;
}
function darken(hex: string, factor = 0.55): string {
  const c = hex.replace("#", "");
  const r = Math.round(parseInt(c.slice(0,2),16)*factor);
  const g = Math.round(parseInt(c.slice(2,4),16)*factor);
  const b = Math.round(parseInt(c.slice(4,6),16)*factor);
  return `rgb(${r},${g},${b})`;
}
function lighten(hex: string, factor = 1.25): string {
  const c = hex.replace("#","");
  const r = Math.min(255,Math.round(parseInt(c.slice(0,2),16)*factor));
  const g = Math.min(255,Math.round(parseInt(c.slice(2,4),16)*factor));
  const b = Math.min(255,Math.round(parseInt(c.slice(4,6),16)*factor));
  return `rgb(${r},${g},${b})`;
}

// ── 3D Doughnut ───────────────────────────────────────────────────────────────
const CX = 250, CY = 250, DEPTH = 18;
const R = {
  centerR: 52,
  coreI: 56,   coreO: 116,
  suppI: 122,  suppO: 190,
  rulesI: 196, rulesO: 243,
};

function DoughnutSVG({
  elements, selected, onSelect, marketTitle,
}: {
  elements: MarketElement[];
  selected: SelectedSeg | null;
  onSelect: (seg: SelectedSeg) => void;
  marketTitle: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const key = (ring: string, cat: string) => `${ring}::${cat}`;
  const isSelected = (ring: string, cat: string) => selected?.ring === ring && selected?.category === cat;
  const isHov = (ring: string, cat: string) => hovered === key(ring, cat);

  // Build supporting segments
  const suppElements = elements.filter(e => e.ring === "supporting");
  const suppCats: { cat: string; color: string; elem?: MarketElement }[] = [];
  if (suppElements.length === 0) {
    DEFAULT_SUPPORT_CATS.forEach(d => suppCats.push({ cat: d.cat, color: d.color }));
  } else {
    const seen = new Set<string>();
    suppElements.forEach((e, i) => {
      if (!seen.has(e.category)) {
        seen.add(e.category);
        suppCats.push({ cat: e.category, color: e.color || SUPPORT_COLORS[i % SUPPORT_COLORS.length], elem: e });
      }
    });
  }
  const suppTotal = suppCats.length;
  const suppAngle = suppTotal > 0 ? 360 / suppTotal : 60;
  const GAP = suppTotal > 6 ? 1.5 : 2.5;

  const gradId = (ring: string, cat: string) => `g-${ring.replace(" ","")}-${cat.replace(/[^a-z0-9]/gi,"")}`;

  const renderSeg = (
    ring: string, cat: string, color: string, label: string,
    ro: number, ri: number, a1: number, a2: number,
  ) => {
    const sel = isSelected(ring, cat);
    const hov = isHov(ring, cat);
    const fill = sel ? lighten(color, 1.15) : hov ? lighten(color, 1.08) : color;
    const side = darken(color, sel ? 0.5 : 0.42);
    const gid = gradId(ring, cat);
    const p = slicePath(CX, CY, ro, ri, a1, a2);
    const dp = depthPath(CX, CY, ro, ri, a1, a2, DEPTH);
    const stroke = sel ? "#fff" : "rgba(255,255,255,0.6)";
    const sw = sel ? 2.5 : 1;
    return (
      <g key={gid} style={{ cursor: "pointer" }}
        onClick={() => onSelect({ ring, category: cat, label, color })}
        onMouseEnter={() => setHovered(key(ring, cat))}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lighten(color, 1.1)} />
            <stop offset="100%" stopColor={darken(color, 0.85)} />
          </linearGradient>
        </defs>
        {/* Depth / side wall */}
        <path d={dp} fill={side} opacity="0.85" />
        {/* Top face */}
        <path d={p} fill={`url(#${gid})`} stroke={stroke} strokeWidth={sw} />
        {sel && <path d={p} fill="rgba(255,255,255,0.18)" />}
      </g>
    );
  };

  const rulesSegs = [
    { cat: "formal",   label: "Formal Rules",    color: "#64748b", a1: -90, a2: 90  },
    { cat: "informal", label: "Informal Norms",  color: "#7c3aed", a1: 90,  a2: 270 },
  ];
  const coreSegs = [
    { cat: "demand", label: "Demand Side",  color: "#f97316", a1: -90, a2: 90  },
    { cat: "supply", label: "Supply Side",  color: "#22c55e", a1: 90,  a2: 270 },
  ];

  const words = marketTitle.split(" ");
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
  const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");

  return (
    <div className="relative select-none" style={{ width: 500, height: 520 }}>
      {/* 3D transform wrapper */}
      <div style={{
        transform: "perspective(700px) rotateX(44deg) scaleY(0.95)",
        transformOrigin: "50% 52%",
        filter: "drop-shadow(0px 28px 22px rgba(0,0,0,0.38))",
        position: "absolute", top: 0, left: 0, width: 500, height: 500,
      }}>
        <svg viewBox="0 0 500 500" width={500} height={500}>
          {/* ── Rules ring ── */}
          {rulesSegs.map(s => renderSeg("rules", s.cat, s.color, s.label, R.rulesO, R.rulesI, s.a1, s.a2))}
          {/* White gap ring */}
          <circle cx={CX} cy={CY} r={R.rulesI - 1} fill="white" />
          {/* ── Supporting ring ── */}
          {suppCats.map((s, i) => {
            const a1 = -90 + i * suppAngle + GAP / 2;
            const a2 = -90 + (i + 1) * suppAngle - GAP / 2;
            return renderSeg("supporting", s.cat, s.color, s.cat, R.suppO, R.suppI, a1, a2);
          })}
          {/* White gap ring */}
          <circle cx={CX} cy={CY} r={R.suppI - 1} fill="white" />
          {/* ── Core ring ── */}
          {coreSegs.map(s => renderSeg("core", s.cat, s.color, s.label, R.coreO, R.coreI, s.a1, s.a2))}
          {/* White gap ring */}
          <circle cx={CX} cy={CY} r={R.coreI - 1} fill="white" />
          {/* ── Centre disc ── */}
          <defs>
            <radialGradient id="cg" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#818cf8"/>
              <stop offset="100%" stopColor="#4338ca"/>
            </radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R.centerR} fill="url(#cg)" />
          <text x={CX} y={CY - 6} textAnchor="middle" fill="white" fontSize={line2 ? 9 : 10}
            fontWeight="700" fontFamily="system-ui, sans-serif">{line1}</text>
          {line2 && <text x={CX} y={CY + 8} textAnchor="middle" fill="white" fontSize={9}
            fontWeight="700" fontFamily="system-ui, sans-serif">{line2}</text>}
          <text x={CX} y={CY + 20} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7.5}
            fontFamily="system-ui, sans-serif">Market Exchange</text>
          {/* ── Ring dividers ── */}
          <circle cx={CX} cy={CY} r={R.rulesO} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R.suppO} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R.coreO} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
        </svg>
      </div>
      {/* Ground shadow */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 400, height: 22,
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.22) 0%, transparent 70%)",
        filter: "blur(6px)",
      }} />
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function DoughnutLegend({ elements }: { elements: MarketElement[] }) {
  const suppElements = elements.filter(e => e.ring === "supporting");
  const cats = suppElements.length === 0 ? DEFAULT_SUPPORT_CATS
    : [...new Set(suppElements.map(e => e.category))].map((cat, i) => ({
        cat, color: suppElements.find(e => e.category === cat)?.color || SUPPORT_COLORS[i % SUPPORT_COLORS.length],
      }));
  const fixed = [
    { cat: "Demand Side",    color: "#f97316", ring: "Core Market" },
    { cat: "Supply Side",    color: "#22c55e", ring: "Core Market" },
    { cat: "Formal Rules",   color: "#64748b", ring: "Rules" },
    { cat: "Informal Norms", color: "#7c3aed", ring: "Rules" },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
      {fixed.map(f => (
        <span key={f.cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-3 h-3 rounded-sm flex-none" style={{ background: f.color }} />
          {f.cat}
        </span>
      ))}
      {cats.map(c => (
        <span key={c.cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="w-3 h-3 rounded-sm flex-none" style={{ background: c.color }} />
          {c.cat}
        </span>
      ))}
    </div>
  );
}

// ── Element Panel ──────────────────────────────────────────────────────────────
function ElementPanel({
  selected, elements, markets, theoryId, marketId, onRefresh,
}: {
  selected: SelectedSeg | null;
  elements: MarketElement[];
  markets: MarketSystem[];
  theoryId: number;
  marketId: number;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", actors: "", constraints: "", opportunities: "",
    linkedMarketSystemId: "" as string | number,
  });

  const ringElements = selected
    ? elements.filter(e => e.ring === selected.ring && e.category === selected.category)
    : [];

  const openNew = () => {
    setEditingId(null);
    setForm({ title: "", description: "", actors: "", constraints: "", opportunities: "", linkedMarketSystemId: "" });
    setShowForm(true);
  };
  const openEdit = (e: MarketElement) => {
    setEditingId(e.id);
    setForm({
      title: e.title, description: e.description, actors: e.actors,
      constraints: e.constraints, opportunities: e.opportunities,
      linkedMarketSystemId: e.linkedMarketSystemId ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const color = selected.color;
    const body = {
      ring: selected.ring, category: selected.category, color,
      title: form.title, description: form.description,
      actors: form.actors, constraints: form.constraints, opportunities: form.opportunities,
      linkedMarketSystemId: form.linkedMarketSystemId !== "" ? Number(form.linkedMarketSystemId) : null,
    };
    try {
      const url = editingId
        ? `${API_BASE}/theories/${theoryId}/market-systems/${marketId}/elements/${editingId}`
        : `${API_BASE}/theories/${theoryId}/market-systems/${marketId}/elements`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: editingId ? "Element updated" : "Element added" });
      setShowForm(false); onRefresh();
    } catch (err) {
      toast({ title: "Failed to save", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${API_BASE}/theories/${theoryId}/market-systems/${marketId}/elements/${id}`, {
        method: "DELETE", credentials: "include",
      });
      onRefresh();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally { setDeletingId(null); }
  };

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Click any ring segment</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
          Select a segment in the doughnut to add actors, constraints, and opportunities for that part of the market system.
        </p>
        <div className="mt-3 space-y-2 text-left w-full max-w-xs">
          {[
            { color: "#f97316", label: "Core Market", desc: "Demand & supply side actors" },
            { color: "#3b82f6", label: "Supporting Functions", desc: "Finance, inputs, extension…" },
            { color: "#64748b", label: "Rules & Regulations", desc: "Formal laws & informal norms" },
          ].map(g => (
            <div key={g.label} className="flex items-start gap-2.5">
              <span className="w-3 h-3 rounded-sm mt-0.5 flex-none" style={{ background: g.color }} />
              <div>
                <p className="text-xs font-medium text-foreground">{g.label}</p>
                <p className="text-[11px] text-muted-foreground">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-none px-5 pt-4 pb-3 border-b">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm flex-none" style={{ background: selected.color }} />
          <span className="text-sm font-semibold">{selected.label}</span>
          <span className="text-[11px] text-muted-foreground capitalize">· {selected.ring} ring</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {showForm ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Back
              </button>
              <span className="text-xs font-semibold">{editingId ? "Edit Entry" : "New Entry"}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Title</label>
              <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Smallholder farmers" className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Key Actors</label>
              <Textarea value={form.actors} onChange={e => setForm(f => ({...f, actors: e.target.value}))}
                placeholder="Who are the main actors in this segment?" rows={2} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Constraints</label>
              <Textarea value={form.constraints} onChange={e => setForm(f => ({...f, constraints: e.target.value}))}
                placeholder="Key barriers and constraints…" rows={2} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Opportunities</label>
              <Textarea value={form.opportunities} onChange={e => setForm(f => ({...f, opportunities: e.target.value}))}
                placeholder="Opportunities for systemic change…" rows={2} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Additional context…" rows={2} className="text-sm resize-none" />
            </div>
            {selected.ring === "supporting" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Linked Market System
                </label>
                <select
                  value={form.linkedMarketSystemId}
                  onChange={e => setForm(f => ({...f, linkedMarketSystemId: e.target.value}))}
                  className="w-full rounded-md border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">None</option>
                  {markets.filter(m => m.id !== marketId).map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Link this function to another market system (e.g. Inputs Market → Agri Inputs Market System)</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" disabled={saving || !form.title.trim()} onClick={handleSave} className="gap-1.5 flex-1">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingId ? "Update" : "Add Entry"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button size="sm" variant="outline" className="w-full gap-1.5 border-dashed" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> Add Entry
            </Button>
            {ringElements.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No entries yet for this segment.</p>
              </div>
            ) : ringElements.map(e => (
              <div key={e.id} className="rounded-lg border bg-card p-3 space-y-2 group">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">{e.title}</p>
                  <div className="flex gap-1 flex-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                      {deletingId === e.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {e.actors && <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Actors:</span> {e.actors}</p>}
                {e.constraints && <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Constraints:</span> {e.constraints}</p>}
                {e.opportunities && <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Opportunities:</span> {e.opportunities}</p>}
                {e.description && <p className="text-[11px] text-muted-foreground italic">{e.description}</p>}
                {e.linkedMarketSystemId && (
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Link2 className="w-3 h-3 text-primary flex-none" />
                    <span className="text-[11px] text-primary font-medium">Linked market system</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
function TableView({ elements, markets }: { elements: MarketElement[]; markets: MarketSystem[] }) {
  const rings = [
    { key: "core",       label: "Core Market",         color: "#f97316" },
    { key: "supporting", label: "Supporting Functions", color: "#3b82f6" },
    { key: "rules",      label: "Rules & Regulations",  color: "#64748b" },
  ];
  return (
    <div className="overflow-auto h-full px-6 py-4 space-y-6">
      {rings.map(r => {
        const rows = elements.filter(e => e.ring === r.key);
        if (rows.length === 0) return null;
        return (
          <div key={r.key}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"
              style={{ color: r.color }}>
              <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 border border-border font-semibold">Category</th>
                  <th className="text-left px-3 py-2 border border-border font-semibold">Title</th>
                  <th className="text-left px-3 py-2 border border-border font-semibold">Actors</th>
                  <th className="text-left px-3 py-2 border border-border font-semibold">Constraints</th>
                  <th className="text-left px-3 py-2 border border-border font-semibold">Opportunities</th>
                  {r.key === "supporting" && <th className="text-left px-3 py-2 border border-border font-semibold">Linked Market</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(e => {
                  const linked = e.linkedMarketSystemId ? markets.find(m => m.id === e.linkedMarketSystemId) : null;
                  return (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 border border-border">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-sm flex-none" style={{ background: e.color || r.color }} />
                          {e.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 border border-border font-medium">{e.title}</td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">{e.actors || "—"}</td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">{e.constraints || "—"}</td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">{e.opportunities || "—"}</td>
                      {r.key === "supporting" && (
                        <td className="px-3 py-2 border border-border">
                          {linked ? (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <Link2 className="w-3 h-3" />{linked.title}
                            </span>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {elements.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-10">No elements added yet. Switch to Visual view and click a segment.</p>
      )}
    </div>
  );
}

// ── Market Form Dialog ────────────────────────────────────────────────────────
function MarketFormDialog({ theoryId, market, onClose, onSaved }: {
  theoryId: number; market?: MarketSystem; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(market?.title ?? "");
  const [description, setDescription] = useState(market?.description ?? "");
  const [marketFocus, setMarketFocus] = useState(market?.marketFocus ?? "");
  const [color, setColor] = useState(market?.color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const url = market
        ? `${API_BASE}/theories/${theoryId}/market-systems/${market.id}`
        : `${API_BASE}/theories/${theoryId}/market-systems`;
      const res = await fetch(url, {
        method: market ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ title, description, marketFocus, color }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: market ? "Market updated" : "Market system created" });
      onSaved();
    } catch (err) {
      toast({ title: "Failed to save", description: String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">
            {market ? "Edit Market System" : "New Market System"}
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Market Name *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Maize Market" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Market Focus</label>
            <Input value={marketFocus} onChange={e => setMarketFocus(e.target.value)} placeholder="e.g. Smallholder farmers accessing maize buyers" className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Brief description of this market system…" className="text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Colour</label>
            <div className="flex flex-wrap gap-2">
              {MARKET_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent scale-100 hover:scale-105"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving || !title.trim()} onClick={handleSave} className="gap-1.5 min-w-[100px]">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {market ? "Save Changes" : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function MarketSystemAnalysis({ theory }: { theory: { id: number; title: string } }) {
  const { toast } = useToast();
  const [markets, setMarkets] = useState<MarketSystem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [elements, setElements] = useState<MarketElement[]>([]);
  const [selected, setSelected] = useState<SelectedSeg | null>(null);
  const [view, setView] = useState<"visual" | "table">("visual");
  const [loading, setLoading] = useState(true);
  const [showMarketForm, setShowMarketForm] = useState(false);
  const [editingMarket, setEditingMarket] = useState<MarketSystem | undefined>(undefined);
  const [deletingMkt, setDeletingMkt] = useState(false);
  const [showMarketDrop, setShowMarketDrop] = useState(false);

  const activeMarket = markets.find(m => m.id === activeId);

  const fetchMarkets = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/theories/${theory.id}/market-systems`, { credentials: "include" });
      if (!r.ok) return;
      const list: MarketSystem[] = await r.json();
      setMarkets(list);
      setActiveId(id => id && list.find(m => m.id === id) ? id : (list[0]?.id ?? null));
    } catch { /* silent */ } finally { setLoading(false); }
  }, [theory.id]);

  const fetchElements = useCallback(async (mktId: number) => {
    try {
      const r = await fetch(`${API_BASE}/theories/${theory.id}/market-systems/${mktId}/elements`, { credentials: "include" });
      if (r.ok) setElements(await r.json());
    } catch { /* silent */ }
  }, [theory.id]);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);
  useEffect(() => { if (activeId) fetchElements(activeId); else setElements([]); }, [activeId, fetchElements]);

  const handleDeleteMarket = async () => {
    if (!activeMarket || !window.confirm(`Delete "${activeMarket.title}"?`)) return;
    setDeletingMkt(true);
    try {
      await fetch(`${API_BASE}/theories/${theory.id}/market-systems/${activeMarket.id}`, {
        method: "DELETE", credentials: "include",
      });
      setSelected(null);
      await fetchMarkets();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally { setDeletingMkt(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Globe className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Market System Analysis</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Map the M4P market system doughnut — core market exchanges, supporting functions (inputs, finance, extension…) and the rules that govern them.
          </p>
        </div>
        <Button onClick={() => { setEditingMarket(undefined); setShowMarketForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Create Market System
        </Button>
        {showMarketForm && (
          <MarketFormDialog theoryId={theory.id} onClose={() => setShowMarketForm(false)}
            onSaved={() => { setShowMarketForm(false); fetchMarkets(); }} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header bar ── */}
      <div className="flex-none flex items-center gap-3 px-5 py-3 border-b bg-card">
        {/* Market selector */}
        <div className="relative">
          <button
            onClick={() => setShowMarketDrop(d => !d)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-muted/40 hover:bg-muted text-sm font-semibold transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: activeMarket?.color ?? "#6366f1" }} />
            {activeMarket?.title ?? "Select market"}
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
          </button>
          {showMarketDrop && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border rounded-lg shadow-lg min-w-[200px] py-1">
              {markets.map(m => (
                <button key={m.id} onClick={() => { setActiveId(m.id); setSelected(null); setShowMarketDrop(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${m.id === activeId ? "font-semibold text-primary" : ""}`}>
                  <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: m.color }} />
                  {m.title}
                  {m.id === activeId && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                </button>
              ))}
              <div className="border-t mt-1 pt-1">
                <button onClick={() => { setShowMarketDrop(false); setEditingMarket(undefined); setShowMarketForm(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-primary">
                  <Plus className="w-3.5 h-3.5" /> Add market system
                </button>
              </div>
            </div>
          )}
        </div>

        {activeMarket && (
          <>
            <button onClick={() => { setEditingMarket(activeMarket); setShowMarketForm(true); }}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDeleteMarket} disabled={deletingMkt}
              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
              {deletingMkt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            {activeMarket.marketFocus && (
              <p className="text-xs text-muted-foreground truncate max-w-[280px] ml-1">
                <Info className="w-3 h-3 inline mr-1" />{activeMarket.marketFocus}
              </p>
            )}
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Interconnected market links */}
          {markets.filter(m => m.id !== activeId).length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <span className="text-[11px] text-muted-foreground">Connected:</span>
              {markets.filter(m => m.id !== activeId).slice(0, 4).map(m => (
                <button key={m.id} onClick={() => { setActiveId(m.id); setSelected(null); }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] hover:bg-muted transition-colors"
                  style={{ borderColor: m.color, color: m.color }}>
                  <ArrowRight className="w-2.5 h-2.5" /> {m.title}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setView("visual")}
            className={`p-1.5 rounded text-xs transition-colors ${view === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView("table")}
            className={`p-1.5 rounded text-xs transition-colors ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <LayoutList className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {view === "table" ? (
        <TableView elements={elements} markets={markets} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: doughnut */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start pt-6 pb-4 px-4">
            {activeMarket && (
              <>
                <DoughnutSVG
                  elements={elements}
                  selected={selected}
                  onSelect={setSelected}
                  marketTitle={activeMarket.title}
                />
                <DoughnutLegend elements={elements} />
              </>
            )}
          </div>
          {/* Right: panel */}
          <div className="w-[340px] flex-none border-l bg-card overflow-hidden flex flex-col">
            <ElementPanel
              selected={selected}
              elements={elements}
              markets={markets}
              theoryId={theory.id}
              marketId={activeId!}
              onRefresh={() => activeId && fetchElements(activeId)}
            />
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showMarketDrop && <div className="fixed inset-0 z-40" onClick={() => setShowMarketDrop(false)} />}

      {showMarketForm && (
        <MarketFormDialog
          theoryId={theory.id}
          market={editingMarket}
          onClose={() => { setShowMarketForm(false); setEditingMarket(undefined); }}
          onSaved={() => { setShowMarketForm(false); setEditingMarket(undefined); fetchMarkets(); }}
        />
      )}
    </div>
  );
}
