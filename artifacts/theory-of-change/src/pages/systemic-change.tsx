import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useUpdateTheory, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, GitBranch,
  ChevronRight, RefreshCw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Framework definitions ────────────────────────────────────────────────────
type FrameworkKey = "aaer" | "msr" | "oh" | "msc";

interface FrameworkDef {
  key: FrameworkKey;
  label: string;
  abbr: string;
  org: string;
  color: string;
  accent: string;
  description: string;
  useCase: string;
  cols: ColDef[];
  tagOptions: { value: string; label: string; desc?: string }[];
  statusOptions: { value: string; label: string; color: string }[];
  levelOptions: { value: string; label: string }[];
}

interface ColDef {
  key: keyof Entry;
  header: string;
  tooltip?: string;
  width?: string;
  textarea?: boolean;
  isTag?: boolean;
  isLevel?: boolean;
  isStatus?: boolean;
}

const FRAMEWORKS: FrameworkDef[] = [
  {
    key: "aaer",
    label: "Adopt-Adapt-Expand-Respond",
    abbr: "AAER",
    org: "DCED / Springfield Centre",
    color: "border-violet-300 bg-violet-50",
    accent: "bg-violet-600",
    description:
      "Tracks how market actors respond to an intervention by adopting new practices, adapting them to their context, expanding reach, or responding to system-level shifts.",
    useCase: "Best for market systems development (MSD) programmes tracking crowding-in and private sector behaviour change.",
    cols: [
      { key: "dimension",      header: "Actor / SME",             tooltip: "The firm, organisation, or market actor",                         width: "w-36",  textarea: false },
      { key: "frameworkTag",   header: "AAER Stage",              tooltip: "Which stage of the AAER model this entry represents",             width: "w-32",  isTag: true },
      { key: "description",    header: "What Changed",            tooltip: "Describe what the actor adopted, adapted, expanded, or responded", width: "",      textarea: true },
      { key: "changeObserved", header: "Evidence",                tooltip: "Data, observations, or sources confirming the change",            width: "",      textarea: true },
      { key: "level",          header: "Scale",                   tooltip: "How broadly this change has spread",                              width: "w-28",  isLevel: true },
      { key: "status",         header: "Confidence",              tooltip: "How confident you are this change is genuine",                    width: "w-28",  isStatus: true },
    ],
    tagOptions: [
      { value: "adopt",   label: "Adopt",   desc: "Actor directly adopts the new practice / product / service" },
      { value: "adapt",   label: "Adapt",   desc: "Actor modifies the innovation to fit their context" },
      { value: "expand",  label: "Expand",  desc: "Actor scales up or replicates to new markets / geographies" },
      { value: "respond", label: "Respond", desc: "Other actors react to the market shift (crowding-in)" },
    ],
    statusOptions: [
      { value: "confirmed", label: "Confirmed", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
      { value: "likely",    label: "Likely",    color: "bg-blue-100 text-blue-800 border-blue-300" },
      { value: "plausible", label: "Plausible", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
    ],
    levelOptions: [
      { value: "actor",   label: "Individual actor" },
      { value: "sector",  label: "Sector-wide" },
      { value: "market",  label: "Market-wide" },
    ],
  },
  {
    key: "msr",
    label: "Market Systems Resilience",
    abbr: "MSR",
    org: "BEAM Exchange / SDC",
    color: "border-teal-300 bg-teal-50",
    accent: "bg-teal-600",
    description:
      "Assesses the capacity of market systems to absorb shocks, adapt, and transform — going beyond outputs to understand durability of change.",
    useCase: "Best for programmes operating in fragile or crisis-affected contexts where long-term system durability matters.",
    cols: [
      { key: "frameworkTag",   header: "Resilience Dimension",    tooltip: "Which MSR dimension this entry tracks",                  width: "w-44",  isTag: true },
      { key: "dimension",      header: "Market / Subsystem",      tooltip: "Which market or subsystem this applies to",              width: "w-36",  textarea: false },
      { key: "description",    header: "Expected Resilience",     tooltip: "What resilience outcome is anticipated",                 width: "",      textarea: true },
      { key: "changeObserved", header: "Evidence Observed",       tooltip: "What evidence of resilience have you seen?",            width: "",      textarea: true },
      { key: "level",          header: "System Level",            tooltip: "At which level of the system this applies",             width: "w-28",  isLevel: true },
      { key: "status",         header: "Status",                  tooltip: "Current state of this resilience dimension",            width: "w-28",  isStatus: true },
    ],
    tagOptions: [
      { value: "robustness",       label: "Robustness",       desc: "Ability to absorb shocks without major disruption" },
      { value: "redundancy",       label: "Redundancy",       desc: "Backup systems/actors that reduce single points of failure" },
      { value: "rapidity",         label: "Rapidity",         desc: "Speed of recovery after a shock" },
      { value: "adaptability",     label: "Adaptability",     desc: "Capacity to adjust to changing conditions" },
      { value: "transformability", label: "Transformability", desc: "Ability to create fundamentally new system configurations" },
    ],
    statusOptions: [
      { value: "emerging",    label: "Emerging",    color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      { value: "established", label: "Established", color: "bg-blue-100 text-blue-800 border-blue-300" },
      { value: "sustained",   label: "Sustained",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    ],
    levelOptions: [
      { value: "micro", label: "Micro" },
      { value: "meso",  label: "Meso" },
      { value: "macro", label: "Macro" },
    ],
  },
  {
    key: "oh",
    label: "Outcome Harvesting",
    abbr: "OH",
    org: "Wilson-Grau / USAID",
    color: "border-orange-300 bg-orange-50",
    accent: "bg-orange-500",
    description:
      "Works backwards from observed outcomes — collecting evidence of what actually changed and then analysing how the intervention contributed.",
    useCase: "Best for complex, emergent programmes where linear attribution is difficult and stakeholder-driven evidence matters.",
    cols: [
      { key: "dimension",      header: "Who Changed",             tooltip: "The social actor (individual, org, system) that changed",  width: "w-36",  textarea: false },
      { key: "frameworkTag",   header: "Outcome Type",            tooltip: "Category of the outcome",                                  width: "w-36",  isTag: true },
      { key: "description",    header: "Outcome Statement",       tooltip: "What changed, how, and why it is significant",             width: "",      textarea: true },
      { key: "changeObserved", header: "Evidence & Source",       tooltip: "Data or source confirming this outcome occurred",          width: "",      textarea: true },
      { key: "level",          header: "Scope",                   tooltip: "Geographic or organisational scope",                       width: "w-28",  isLevel: true },
      { key: "status",         header: "Verification",            tooltip: "Level of verification of this outcome",                    width: "w-32",  isStatus: true },
    ],
    tagOptions: [
      { value: "practices",     label: "Practices",     desc: "Changes in what actors do" },
      { value: "policies",      label: "Policies",      desc: "Changes in rules, regulations, or strategies" },
      { value: "relationships", label: "Relationships", desc: "Changes in how actors relate to each other" },
      { value: "norms",         label: "Norms",         desc: "Changes in social or cultural expectations" },
      { value: "resources",     label: "Resources",     desc: "Changes in access to or use of resources" },
    ],
    statusOptions: [
      { value: "unverified",   label: "Unverified",   color: "bg-red-100 text-red-800 border-red-300" },
      { value: "partial",      label: "Partly verified", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      { value: "verified",     label: "Verified",     color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    ],
    levelOptions: [
      { value: "local",    label: "Local" },
      { value: "regional", label: "Regional" },
      { value: "national", label: "National" },
    ],
  },
  {
    key: "msc",
    label: "Most Significant Change",
    abbr: "MSC",
    org: "Davies & Dart",
    color: "border-rose-300 bg-rose-50",
    accent: "bg-rose-500",
    description:
      "A participatory technique that collects stories of significant change from stakeholders, which panels then review to select the 'most significant'.",
    useCase: "Best for capturing unexpected or qualitative changes, elevating beneficiary voices, and communicating impact to diverse audiences.",
    cols: [
      { key: "frameworkTag",   header: "Domain",                  tooltip: "Thematic domain of the story",                            width: "w-36",  isTag: true },
      { key: "dimension",      header: "Story Title",             tooltip: "Short title for this change story",                       width: "w-40",  textarea: false },
      { key: "description",    header: "The Story",               tooltip: "Full narrative of the change — what happened, when, where, who was involved", width: "", textarea: true },
      { key: "changeObserved", header: "Why Most Significant?",   tooltip: "Why this change matters above others in this period",     width: "",      textarea: true },
      { key: "level",          header: "Scope",                   tooltip: "Geographic or community scope of the story",              width: "w-28",  isLevel: true },
      { key: "status",         header: "Review Status",           tooltip: "Stage in the MSC panel review process",                   width: "w-32",  isStatus: true },
    ],
    tagOptions: [
      { value: "livelihoods",   label: "Livelihoods",   desc: "Income, assets, economic wellbeing" },
      { value: "access",        label: "Access",        desc: "Access to services, markets, information" },
      { value: "empowerment",   label: "Empowerment",   desc: "Agency, voice, decision-making power" },
      { value: "environment",   label: "Environment",   desc: "Natural resources, climate, land" },
      { value: "wellbeing",     label: "Wellbeing",     desc: "Health, safety, nutrition, happiness" },
      { value: "other",         label: "Other",         desc: "" },
    ],
    statusOptions: [
      { value: "draft",          label: "Draft",          color: "bg-muted text-muted-foreground border-border" },
      { value: "panel-reviewed", label: "Panel reviewed", color: "bg-blue-100 text-blue-800 border-blue-300" },
      { value: "verified",       label: "Selected / Verified", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    ],
    levelOptions: [
      { value: "community", label: "Community" },
      { value: "district",  label: "District" },
      { value: "national",  label: "National" },
    ],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Entry {
  id: number;
  theoryId: number;
  dimension: string;
  description: string;
  changeObserved: string;
  level: string;
  status: string;
  frameworkTag: string;
  position: number;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ─── Tag badge ────────────────────────────────────────────────────────────────
function TagBadge({ value, fw }: { value: string; fw: FrameworkDef }) {
  const opt = fw.tagOptions.find(o => o.value === value);
  const colors: Record<string, string> = {
    // AAER
    adopt: "bg-violet-100 text-violet-800 border-violet-300",
    adapt: "bg-blue-100 text-blue-800 border-blue-300",
    expand: "bg-emerald-100 text-emerald-800 border-emerald-300",
    respond: "bg-orange-100 text-orange-800 border-orange-300",
    // MSR
    robustness: "bg-teal-100 text-teal-800 border-teal-300",
    redundancy: "bg-cyan-100 text-cyan-800 border-cyan-300",
    rapidity: "bg-blue-100 text-blue-800 border-blue-300",
    adaptability: "bg-emerald-100 text-emerald-800 border-emerald-300",
    transformability: "bg-purple-100 text-purple-800 border-purple-300",
    // OH
    practices: "bg-orange-100 text-orange-800 border-orange-300",
    policies: "bg-red-100 text-red-800 border-red-300",
    relationships: "bg-pink-100 text-pink-800 border-pink-300",
    norms: "bg-yellow-100 text-yellow-800 border-yellow-300",
    resources: "bg-green-100 text-green-800 border-green-300",
    // MSC
    livelihoods: "bg-green-100 text-green-800 border-green-300",
    access: "bg-blue-100 text-blue-800 border-blue-300",
    empowerment: "bg-purple-100 text-purple-800 border-purple-300",
    environment: "bg-teal-100 text-teal-800 border-teal-300",
    wellbeing: "bg-rose-100 text-rose-800 border-rose-300",
    other: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors[value] ?? "bg-muted text-muted-foreground border-border"}`}>
      {opt?.label ?? value}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ value, fw }: { value: string; fw: FrameworkDef }) {
  const opt = fw.statusOptions.find(o => o.value === value);
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${opt?.color ?? "bg-muted text-muted-foreground border-border"}`}>
      {opt?.label ?? value}
    </span>
  );
}

// ─── View row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, rowNum, fw, onEdit, onDelete }: {
  entry: Entry; rowNum: number; fw: FrameworkDef;
  onEdit: () => void; onDelete: () => void;
}) {
  const levelLabel = fw.levelOptions.find(l => l.value === entry.level)?.label ?? entry.level;
  const cellVal = (key: keyof Entry) => {
    const val = entry[key] as string;
    return val ? <span className="leading-snug">{val}</span> : <span className="italic text-muted-foreground/40">—</span>;
  };
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group align-top">
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">{rowNum}</span>
      </td>
      {fw.cols.map(col => (
        <td key={col.key} className={`px-3 py-3 text-sm ${col.textarea ? "whitespace-pre-wrap text-muted-foreground" : "font-medium text-foreground"}`}>
          {col.isTag    ? <TagBadge value={entry.frameworkTag} fw={fw} /> :
           col.isStatus ? <StatusBadge value={entry.status} fw={fw} /> :
           col.isLevel  ? <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">{levelLabel}</span> :
           cellVal(col.key)}
        </td>
      ))}
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

// ─── Edit / create row ────────────────────────────────────────────────────────
function EditRow({ initial, rowNum, fw, onSave, onCancel }: {
  initial: Partial<Entry>; rowNum: number; fw: FrameworkDef;
  onSave: (d: Omit<Entry, "id" | "theoryId" | "position">) => void;
  onCancel: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>({
    dimension:      initial.dimension      ?? "",
    description:    initial.description    ?? "",
    changeObserved: initial.changeObserved ?? "",
    level:          initial.level          ?? fw.levelOptions[0].value,
    status:         initial.status         ?? fw.statusOptions[0].value,
    frameworkTag:   initial.frameworkTag   ?? fw.tagOptions[0].value,
  });
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    onSave({
      dimension: vals.dimension, description: vals.description,
      changeObserved: vals.changeObserved, level: vals.level,
      status: vals.status, frameworkTag: vals.frameworkTag,
    });
  };

  return (
    <tr className="bg-primary/5 border-b border-border align-top">
      <td className="px-3 py-2 text-sm font-bold text-muted-foreground text-center">{rowNum}</td>
      {fw.cols.map(col => (
        <td key={col.key} className="px-3 py-2">
          {col.isTag ? (
            <Select value={vals.frameworkTag} onValueChange={v => set("frameworkTag", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.tagOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="font-medium">{o.label}</span>
                    {o.desc && <span className="ml-1 text-xs text-muted-foreground">— {o.desc}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : col.isStatus ? (
            <Select value={vals.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.statusOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : col.isLevel ? (
            <Select value={vals.level} onValueChange={v => set("level", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.levelOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : col.textarea ? (
            <Textarea
              value={vals[col.key as string]}
              onChange={e => set(col.key as string, e.target.value)}
              className="text-sm min-h-[64px]"
              placeholder={col.header + "…"}
            />
          ) : (
            <input
              value={vals[col.key as string]}
              onChange={e => set(col.key as string, e.target.value)}
              className="w-full text-sm h-8 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={col.header + "…"}
            />
          )}
        </td>
      ))}
      <td className="px-3 py-2">
        <div className="flex gap-1 pt-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSave}>
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

// ─── Framework selector screen ────────────────────────────────────────────────
function FrameworkSelector({ onSelect }: { onSelect: (key: FrameworkKey) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <GitBranch className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose a Systemic Change Framework</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Select the industry-standard approach that best fits your programme context. This will shape how you capture and track systemic change for this theory.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FRAMEWORKS.map(fw => (
          <button
            key={fw.key}
            onClick={() => onSelect(fw.key)}
            className={`text-left rounded-xl border-2 p-5 transition-all hover:shadow-md hover:scale-[1.01] active:scale-100 group ${fw.color}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`inline-block text-xs font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full mb-2 ${fw.accent}`}>
                  {fw.abbr}
                </span>
                <h3 className="text-sm font-bold text-foreground leading-snug">{fw.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">By {fw.org}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed mb-3">{fw.description}</p>
            <div className="rounded-lg bg-white/60 border border-white/80 px-3 py-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Best for: </span>{fw.useCase}
              </p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        You can switch frameworks at any time — existing entries will be preserved.
      </p>
    </div>
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
  const updateTheory = useUpdateTheory({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(id) }),
    },
  });

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  // Local framework key — set immediately on click, synced with theory on load
  const [localFrameworkKey, setLocalFrameworkKey] = useState<FrameworkKey | null>(null);

  const loadEntries = async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      setEntries(await res.json());
    } catch (err) {
      toast({ title: "Failed to load entries", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  // Seed local state from server once theory loads
  useEffect(() => {
    const key = (theory as any)?.systemicChangeFramework as FrameworkKey | null | undefined;
    if (key && !localFrameworkKey) setLocalFrameworkKey(key);
  }, [theory]);

  if (!loaded && !loading && id) loadEntries();

  const handleSelectFramework = (key: FrameworkKey) => {
    setLocalFrameworkKey(key);
    setShowSelector(false);
    updateTheory.mutate({ id, data: { systemicChangeFramework: key } as any });
  };

  const handleCreate = async (data: Omit<Entry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, position: entries.length }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as Entry;
      setEntries(prev => [...prev, created]);
      setAddingRow(false);
    } catch (err) {
      toast({ title: "Failed to create entry", description: String(err), variant: "destructive" });
    }
  };

  const handleUpdate = async (entryId: number, data: Omit<Entry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as Entry;
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
        method: "DELETE", credentials: "include",
      });
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      toast({ title: "Failed to delete entry", description: String(err), variant: "destructive" });
    }
  };

  // ── Loading ──
  if (theoryLoading || !theory) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fw = FRAMEWORKS.find(f => f.key === localFrameworkKey);

  // ── Framework selector screen ──
  if (!localFrameworkKey || showSelector) {
    return (
      <div className="flex flex-col h-full overflow-auto bg-background">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => showSelector ? setShowSelector(false) : setLocation(`/theory/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight truncate">{theory.title}</h1>
            <p className="text-xs text-muted-foreground">Systemic Change — Select Framework</p>
          </div>
        </header>
        <FrameworkSelector onSelect={handleSelectFramework} />
      </div>
    );
  }

  // ── Framework tracker ──
  const statusCounts = fw!.statusOptions.reduce((acc, s) => {
    acc[s.value] = entries.filter(e => e.status === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
          onClick={() => setLocation(`/theory/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight truncate">{theory.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">Systemic Change</p>
            <span className={`text-[10px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${fw!.accent}`}>
              {fw!.abbr}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fw!.statusOptions.map(s => (statusCounts[s.value] ?? 0) > 0 && (
            <span key={s.value}
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${s.color}`}>
              {statusCounts[s.value]} {s.label}
            </span>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSelector(true)}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Framework</span>
          </Button>
          <Button size="sm" className="gap-2"
            onClick={() => { setAddingRow(true); setEditingId(null); }}>
            <Plus className="w-4 h-4" />
            Add Entry
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">

        {/* ── Framework info banner ── */}
        <div className={`rounded-xl border-2 p-4 flex gap-4 items-start ${fw!.color}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${fw!.accent}`}>
            <Info className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-foreground">{fw!.label}</span>
              <span className="text-[10px] text-muted-foreground">· {fw!.org}</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{fw!.description}</p>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-10">#</th>
                  {fw!.cols.map(col => (
                    <th key={col.key} className={`text-left px-3 py-3 font-semibold text-muted-foreground text-xs ${col.width ?? ""}`}>
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-xs">
                              {col.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-20 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) =>
                  editingId === entry.id ? (
                    <EditRow key={entry.id} initial={entry} rowNum={i + 1} fw={fw!}
                      onSave={d => handleUpdate(entry.id, d)}
                      onCancel={() => setEditingId(null)} />
                  ) : (
                    <EntryRow key={entry.id} entry={entry} rowNum={i + 1} fw={fw!}
                      onEdit={() => { setEditingId(entry.id); setAddingRow(false); }}
                      onDelete={() => handleDelete(entry.id)} />
                  )
                )}

                {addingRow && (
                  <EditRow initial={{}} rowNum={entries.length + 1} fw={fw!}
                    onSave={handleCreate}
                    onCancel={() => setAddingRow(false)} />
                )}

                {entries.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={fw!.cols.length + 2} className="px-4 py-14 text-center">
                      <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                        Click "Add Entry" to start recording systemic changes using the {fw!.abbr} framework.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!addingRow && entries.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => { setAddingRow(true); setEditingId(null); }}>
            <Plus className="w-4 h-4" />Add Entry
          </Button>
        )}

        {/* ── Tag reference ── */}
        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {fw!.key === "aaer" ? "AAER Stage Reference" :
             fw!.key === "msr"  ? "MSR Resilience Dimensions" :
             fw!.key === "oh"   ? "Outcome Types" : "Story Domains"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fw!.tagOptions.map(tag => (
              <div key={tag.value} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TagBadge value={tag.value} fw={fw!} />
                </div>
                {tag.desc && <p className="text-xs text-muted-foreground leading-relaxed">{tag.desc}</p>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
