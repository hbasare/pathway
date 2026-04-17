import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemicChangeEntry {
  id: number;
  theoryId: number;
  dimension: string;
  description: string;
  changeObserved: string;
  level: string;
  status: string;
  position: number;
}

const DIMENSIONS = [
  "Policy & Regulation",
  "Market Systems",
  "Social Norms & Behaviour",
  "Institutional Capacity",
  "Networks & Partnerships",
  "Financial Systems",
  "Technology & Innovation",
  "Other",
];

const LEVELS = [
  { value: "micro",  label: "Micro",  desc: "Individual / household level" },
  { value: "meso",   label: "Meso",   desc: "Community / organisation level" },
  { value: "macro",  label: "Macro",  desc: "System / national level" },
];

const STATUSES = [
  { value: "emerging",    label: "Emerging",    color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "established", label: "Established", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "sustained",   label: "Sustained",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
];

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

function statusColor(status: string) {
  return STATUSES.find(s => s.value === status)?.color ?? "bg-muted text-muted-foreground border-border";
}

// ─── Row (view mode) ─────────────────────────────────────────────────────────
function EntryRow({
  entry,
  rowNum,
  onEdit,
  onDelete,
}: {
  entry: SystemicChangeEntry;
  rowNum: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const levelLabel = LEVELS.find(l => l.value === entry.level)?.label ?? entry.level;
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group align-top">
      <td className="px-3 py-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
          {rowNum}
        </span>
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-foreground">
        {entry.dimension || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {entry.description || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {entry.changeObserved || <span className="italic text-muted-foreground/50">—</span>}
      </td>
      <td className="px-3 py-3">
        <span className="inline-block text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
          {levelLabel}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColor(entry.status)}`}>
          {STATUSES.find(s => s.value === entry.status)?.label ?? entry.status}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Inline edit/create row ───────────────────────────────────────────────────
function EditRow({
  initial,
  rowNum,
  onSave,
  onCancel,
}: {
  initial: Partial<SystemicChangeEntry>;
  rowNum: number;
  onSave: (data: Omit<SystemicChangeEntry, "id" | "theoryId" | "position">) => void;
  onCancel: () => void;
}) {
  const [dimension, setDimension] = useState(initial.dimension ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [changeObserved, setChangeObserved] = useState(initial.changeObserved ?? "");
  const [level, setLevel] = useState(initial.level ?? "meso");
  const [status, setStatus] = useState(initial.status ?? "emerging");

  return (
    <tr className="bg-primary/5 border-b border-border align-top">
      <td className="px-3 py-2 text-sm font-bold text-muted-foreground text-center">{rowNum}</td>
      <td className="px-3 py-2">
        <Select value={dimension} onValueChange={setDimension}>
          <SelectTrigger className="text-sm h-8">
            <SelectValue placeholder="Select dimension…" />
          </SelectTrigger>
          <SelectContent>
            {DIMENSIONS.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="text-sm min-h-[60px]"
          placeholder="Describe the expected systemic change…"
        />
      </td>
      <td className="px-3 py-2">
        <Textarea
          value={changeObserved}
          onChange={e => setChangeObserved(e.target.value)}
          className="text-sm min-h-[60px]"
          placeholder="Evidence of change observed so far…"
        />
      </td>
      <td className="px-3 py-2">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="text-sm h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map(l => (
              <SelectItem key={l.value} value={l.value}>
                <span className="font-medium">{l.label}</span>
                <span className="ml-1 text-xs text-muted-foreground">— {l.desc}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="text-sm h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-emerald-600"
            onClick={() => dimension.trim() && onSave({ dimension, description, changeObserved, level, status })}
          >
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemicChange() {
  const [, params] = useRoute("/theory/:id/systemic-change");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const id = Number(params?.id);
  const { data: theory, isLoading: theoryLoading } = useGetTheory(id);

  const [entries, setEntries] = useState<SystemicChangeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load entries on mount
  const loadEntries = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      setEntries(await res.json());
    } catch (err) {
      toast({ title: "Failed to load systemic changes", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  if (!loaded && !loading && id) loadEntries();

  const handleCreate = async (data: Omit<SystemicChangeEntry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, position: entries.length }),
      });
      if (!res.ok) throw new Error(await res.text());
      const row = await res.json() as SystemicChangeEntry;
      setEntries(prev => [...prev, row]);
      setAddingRow(false);
    } catch (err) {
      toast({ title: "Failed to create entry", description: String(err), variant: "destructive" });
    }
  };

  const handleUpdate = async (entryId: number, data: Omit<SystemicChangeEntry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as SystemicChangeEntry;
      setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      setEditingId(null);
    } catch (err) {
      toast({ title: "Failed to update entry", description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      toast({ title: "Failed to delete entry", description: String(err), variant: "destructive" });
    }
  };

  if (theoryLoading || !theory) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Status summary counts
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.value] = entries.filter(e => e.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setLocation(`/theory/${id}`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight truncate">{theory.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Systemic Change</p>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && STATUSES.map(s => counts[s.value] > 0 && (
            <span
              key={s.value}
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${s.color}`}
            >
              {counts[s.value]} {s.label}
            </span>
          ))}
          <Button size="sm" className="gap-2" onClick={() => { setAddingRow(true); setEditingId(null); }}>
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">

        {/* ── Intro ── */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 flex gap-4">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <GitBranch className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground mb-1">What is Systemic Change?</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Systemic change refers to durable, wide-scale shifts in the rules, norms, relationships,
              and power structures that govern how a system operates — beyond the direct outputs and
              outcomes of a single intervention. Track the dimensions of systemic change your
              intervention is contributing to, the level at which change is occurring, and the
              evidence observed so far.
            </p>
          </div>
        </div>

        {/* ── Table ── */}
        <section>
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-10">#</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-44">Dimension</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Expected / Anticipated Change</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Change Observed (Evidence)</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-28">Level</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-28">Status</th>
                  <th className="w-20 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) =>
                  editingId === entry.id ? (
                    <EditRow
                      key={entry.id}
                      initial={entry}
                      rowNum={i + 1}
                      onSave={data => handleUpdate(entry.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      rowNum={i + 1}
                      onEdit={() => { setEditingId(entry.id); setAddingRow(false); }}
                      onDelete={() => handleDelete(entry.id)}
                    />
                  )
                )}

                {addingRow && (
                  <EditRow
                    initial={{}}
                    rowNum={entries.length + 1}
                    onSave={handleCreate}
                    onCancel={() => setAddingRow(false)}
                  />
                )}

                {entries.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No systemic change entries yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                        Click "Add Entry" to start tracking the systemic changes your intervention is contributing to.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!addingRow && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setAddingRow(true); setEditingId(null); }}
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </Button>
            </div>
          )}
        </section>

        {/* ── Level legend ── */}
        <section className="rounded-xl border border-border bg-muted/20 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Level of Change Reference
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {LEVELS.map(l => (
              <div key={l.value} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-bold text-foreground capitalize mb-0.5">{l.label}</p>
                <p className="text-xs text-muted-foreground">{l.desc}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  {l.value === "micro" && "e.g. changes in individual farmer knowledge, practices, or income"}
                  {l.value === "meso"  && "e.g. changes in how agri-businesses, NGOs or local governments operate"}
                  {l.value === "macro" && "e.g. national policy shifts, industry-wide market norms, regulatory reform"}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
