import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useUpdateTheory, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, GitBranch,
  ChevronRight, RefreshCw, Info, Settings, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── Framework definitions ────────────────────────────────────────────────────
type FrameworkKey = "aaer" | "msr" | "oh" | "msc";
type Granularity = "annual" | "biannual" | "quarterly";

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

// ── AAER stage colours ──
const AAER_STAGE_COLORS: Record<string, { bg: string; text: string; border: string; label: string; abbr: string }> = {
  adopt:   { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300", label: "Adopt",   abbr: "A" },
  adapt:   { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   label: "Adapt",   abbr: "Ad" },
  expand:  { bg: "bg-emerald-100",text: "text-emerald-800",border: "border-emerald-300",label: "Expand",  abbr: "E" },
  respond: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", label: "Respond", abbr: "R" },
};

const FRAMEWORKS: FrameworkDef[] = [
  {
    key: "aaer",
    label: "Adopt-Adapt-Expand-Respond",
    abbr: "AAER",
    org: "DCED / Springfield Centre",
    color: "border-violet-300 bg-violet-50",
    accent: "bg-violet-600",
    description: "Tracks how market actors respond to an intervention by adopting new practices, adapting them, expanding reach, or responding to system-level shifts.",
    useCase: "Best for market systems development (MSD) programmes tracking crowding-in and private sector behaviour change.",
    cols: [],
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
      { value: "actor",  label: "Individual actor" },
      { value: "sector", label: "Sector-wide" },
      { value: "market", label: "Market-wide" },
    ],
  },
  {
    key: "msr",
    label: "Market Systems Resilience",
    abbr: "MSR",
    org: "BEAM Exchange / SDC",
    color: "border-teal-300 bg-teal-50",
    accent: "bg-teal-600",
    description: "Assesses the capacity of market systems to absorb shocks, adapt, and transform — going beyond outputs to understand durability of change.",
    useCase: "Best for programmes in fragile or crisis-affected contexts where long-term system durability matters.",
    cols: [
      { key: "frameworkTag",   header: "Resilience Dimension",  tooltip: "Which MSR dimension this tracks",              width: "w-44", isTag: true },
      { key: "dimension",      header: "Market / Subsystem",    tooltip: "Which market or subsystem",                    width: "w-36" },
      { key: "description",    header: "Expected Resilience",   tooltip: "What resilience outcome is anticipated",       width: "",     textarea: true },
      { key: "changeObserved", header: "Evidence Observed",     tooltip: "What evidence have you seen?",                 width: "",     textarea: true },
      { key: "level",          header: "System Level",          tooltip: "Level of the system",                          width: "w-28", isLevel: true },
      { key: "status",         header: "Status",                tooltip: "Current state of this resilience dimension",   width: "w-28", isStatus: true },
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
    description: "Works backwards from observed outcomes — collecting evidence of what actually changed and how the intervention contributed.",
    useCase: "Best for complex, emergent programmes where linear attribution is difficult and stakeholder-driven evidence matters.",
    cols: [
      { key: "dimension",      header: "Who Changed",         tooltip: "The social actor that changed",                  width: "w-36" },
      { key: "frameworkTag",   header: "Outcome Type",        tooltip: "Category of the outcome",                        width: "w-36", isTag: true },
      { key: "description",    header: "Outcome Statement",   tooltip: "What changed, how, and why it is significant",   width: "",     textarea: true },
      { key: "changeObserved", header: "Evidence & Source",   tooltip: "Data or source confirming this outcome",         width: "",     textarea: true },
      { key: "level",          header: "Scope",               tooltip: "Geographic or organisational scope",             width: "w-28", isLevel: true },
      { key: "status",         header: "Verification",        tooltip: "Level of verification",                          width: "w-32", isStatus: true },
    ],
    tagOptions: [
      { value: "practices",     label: "Practices",     desc: "Changes in what actors do" },
      { value: "policies",      label: "Policies",      desc: "Changes in rules, regulations, or strategies" },
      { value: "relationships", label: "Relationships", desc: "Changes in how actors relate to each other" },
      { value: "norms",         label: "Norms",         desc: "Changes in social or cultural expectations" },
      { value: "resources",     label: "Resources",     desc: "Changes in access to or use of resources" },
    ],
    statusOptions: [
      { value: "unverified", label: "Unverified",      color: "bg-red-100 text-red-800 border-red-300" },
      { value: "partial",    label: "Partly verified", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      { value: "verified",   label: "Verified",        color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
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
    description: "A participatory technique that collects stories of significant change from stakeholders, which panels then review to select the 'most significant'.",
    useCase: "Best for capturing unexpected or qualitative changes, elevating beneficiary voices, and communicating impact.",
    cols: [
      { key: "frameworkTag",   header: "Domain",              tooltip: "Thematic domain of the story",                   width: "w-36", isTag: true },
      { key: "dimension",      header: "Story Title",         tooltip: "Short title for this change story",              width: "w-40" },
      { key: "description",    header: "The Story",           tooltip: "Full narrative of the change",                   width: "",     textarea: true },
      { key: "changeObserved", header: "Why Most Significant?",tooltip: "Why this change matters above others",          width: "",     textarea: true },
      { key: "level",          header: "Scope",               tooltip: "Geographic or community scope",                  width: "w-28", isLevel: true },
      { key: "status",         header: "Review Status",       tooltip: "Stage in the MSC panel review process",          width: "w-32", isStatus: true },
    ],
    tagOptions: [
      { value: "livelihoods", label: "Livelihoods", desc: "Income, assets, economic wellbeing" },
      { value: "access",      label: "Access",      desc: "Access to services, markets, information" },
      { value: "empowerment", label: "Empowerment", desc: "Agency, voice, decision-making power" },
      { value: "environment", label: "Environment", desc: "Natural resources, climate, land" },
      { value: "wellbeing",   label: "Wellbeing",   desc: "Health, safety, nutrition, happiness" },
      { value: "other",       label: "Other",       desc: "" },
    ],
    statusOptions: [
      { value: "draft",          label: "Draft",               color: "bg-muted text-muted-foreground border-border" },
      { value: "panel-reviewed", label: "Panel reviewed",      color: "bg-blue-100 text-blue-800 border-blue-300" },
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
  periodLabel: string;
  stageData: string; // JSON: stage-specific guided answers
  position: number;
}

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

// ─── Period generation ────────────────────────────────────────────────────────
function generatePeriods(startYear: number, endYear: number, granularity: Granularity): string[] {
  const periods: string[] = [];
  const totalYears = endYear - startYear + 1;
  for (let y = 1; y <= totalYears; y++) {
    if (granularity === "annual") {
      periods.push(`Y${y}`);
    } else if (granularity === "biannual") {
      periods.push(`H1 Y${y}`, `H2 Y${y}`);
    } else {
      periods.push(`Q1 Y${y}`, `Q2 Y${y}`, `Q3 Y${y}`, `Q4 Y${y}`);
    }
  }
  return periods;
}

// ─── Tag / status badge helpers ───────────────────────────────────────────────
function TagBadge({ value, fw }: { value: string; fw: FrameworkDef }) {
  const opt = fw.tagOptions.find(o => o.value === value);
  const colors: Record<string, string> = {
    adopt: "bg-violet-100 text-violet-800 border-violet-300",
    adapt: "bg-blue-100 text-blue-800 border-blue-300",
    expand: "bg-emerald-100 text-emerald-800 border-emerald-300",
    respond: "bg-orange-100 text-orange-800 border-orange-300",
    robustness: "bg-teal-100 text-teal-800 border-teal-300",
    redundancy: "bg-cyan-100 text-cyan-800 border-cyan-300",
    rapidity: "bg-blue-100 text-blue-800 border-blue-300",
    adaptability: "bg-emerald-100 text-emerald-800 border-emerald-300",
    transformability: "bg-purple-100 text-purple-800 border-purple-300",
    practices: "bg-orange-100 text-orange-800 border-orange-300",
    policies: "bg-red-100 text-red-800 border-red-300",
    relationships: "bg-pink-100 text-pink-800 border-pink-300",
    norms: "bg-yellow-100 text-yellow-800 border-yellow-300",
    resources: "bg-green-100 text-green-800 border-green-300",
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

function StatusBadge({ value, fw }: { value: string; fw: FrameworkDef }) {
  const opt = fw.statusOptions.find(o => o.value === value);
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${opt?.color ?? "bg-muted text-muted-foreground border-border"}`}>
      {opt?.label ?? value}
    </span>
  );
}

// ─── Generic table entry row ──────────────────────────────────────────────────
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
    periodLabel:    initial.periodLabel    ?? "",
  });
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));
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
                {fw.statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : col.isLevel ? (
            <Select value={vals.level} onValueChange={v => set("level", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.levelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : col.textarea ? (
            <Textarea value={vals[col.key as string]} onChange={e => set(col.key as string, e.target.value)}
              className="text-sm min-h-[64px]" placeholder={col.header + "…"} />
          ) : (
            <input value={vals[col.key as string]} onChange={e => set(col.key as string, e.target.value)}
              className="w-full text-sm h-8 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={col.header + "…"} />
          )}
        </td>
      ))}
      <td className="px-3 py-2">
        <div className="flex gap-1 pt-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600"
            onClick={() => onSave({ dimension: vals.dimension, description: vals.description, changeObserved: vals.changeObserved, level: vals.level, status: vals.status, frameworkTag: vals.frameworkTag, periodLabel: vals.periodLabel })}>
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

// ─── Framework selector ───────────────────────────────────────────────────────
function FrameworkSelector({ onSelect }: { onSelect: (key: FrameworkKey) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <GitBranch className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Choose a Systemic Change Framework</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Select the industry-standard approach that best fits your programme context. You can switch at any time — existing entries are preserved.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FRAMEWORKS.map(fw => (
          <button key={fw.key} onClick={() => onSelect(fw.key)}
            className={`text-left rounded-xl border-2 p-5 transition-all hover:shadow-md hover:scale-[1.01] active:scale-100 group ${fw.color}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`inline-block text-xs font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full mb-2 ${fw.accent}`}>{fw.abbr}</span>
                <h3 className="text-sm font-bold leading-snug">{fw.label}</h3>
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
    </div>
  );
}

// ─── AAER Settings panel ──────────────────────────────────────────────────────
interface AaerSettings { startYear: number; endYear: number; granularity: Granularity }

function AaerSettingsPanel({ settings, onSave }: {
  settings: AaerSettings;
  onSave: (s: AaerSettings) => void;
}) {
  const [open, setOpen] = useState(!settings.startYear);
  const [local, setLocal] = useState(settings);
  const curYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => curYear - 5 + i);

  const handleSave = () => {
    if (local.startYear && local.endYear && local.endYear >= local.startYear) {
      onSave(local);
      setOpen(false);
    }
  };

  const periods = local.startYear && local.endYear
    ? generatePeriods(local.startYear, local.endYear, local.granularity)
    : [];

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-violet-100 transition-colors">
        <Settings className="w-4 h-4 text-violet-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-violet-900">Intervention Timeline</span>
          {settings.startYear && settings.endYear ? (
            <span className="ml-3 text-xs text-violet-600">
              {settings.startYear}–{settings.endYear} · {settings.granularity} · {generatePeriods(settings.startYear, settings.endYear, settings.granularity).length} periods
            </span>
          ) : (
            <span className="ml-3 text-xs text-violet-500 italic">Not configured — click to set up</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
      </button>

      {open && (
        <div className="border-t border-violet-200 px-5 py-4 bg-white/70">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Start Year</Label>
              <Select value={String(local.startYear || "")} onValueChange={v => setLocal(p => ({ ...p, startYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">End Year</Label>
              <Select value={String(local.endYear || "")} onValueChange={v => setLocal(p => ({ ...p, endYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Period Granularity</Label>
              <Select value={local.granularity} onValueChange={v => setLocal(p => ({ ...p, granularity: v as Granularity }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual (Y1, Y2…)</SelectItem>
                  <SelectItem value="biannual">Bi-annual (H1 Y1, H2 Y1…)</SelectItem>
                  <SelectItem value="quarterly">Quarterly (Q1 Y1, Q2 Y1…)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {periods.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">Generated periods ({periods.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {periods.map(p => (
                  <span key={p} className="text-[11px] bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">{p}</span>
                ))}
              </div>
            </div>
          )}
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSave}
            disabled={!local.startYear || !local.endYear || local.endYear < local.startYear}>
            <Check className="w-3.5 h-3.5 mr-1.5" />Apply Timeline
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Adopt guided questions ───────────────────────────────────────────────────
interface AdoptData {
  q1: string;
  q2: string;
  q3: { answer: string; notes: string };
  q4: { answer: string; notes: string };
  q5: { answer: string; notes: string };
  q6: { answer: string; notes: string };
  q7: { answer: string; notes: string };
  keyQuestion: string;
}

const ADOPT_QUESTIONS = [
  { id: "q1", num: 1, type: "number", label: "No. of partner(s)/market player(s) who have adopted the new business model (incremental).", unit: "partners" },
  { id: "q2", num: 2, type: "percent", label: "Partner(s) contribution to the pilot.", unit: "%" },
  { id: "q3", num: 3, type: "ynp", label: "Are the partners satisfied with the pilot? Are they able and willing to continue with the business model?" },
  { id: "q4", num: 4, type: "ynp", label: "Has the pilot resulted in increased revenue/profit for the partner(s)?" },
  { id: "q5", num: 5, type: "ynp", label: "Is the target group benefitting from and satisfied with the business model?" },
  { id: "q6", num: 6, type: "yn", label: "Is there an agent within the organisation who believes in the intervention and champions the cause?" },
  { id: "q7", num: 7, type: "ynu", label: "Will the organisation continue with the intervention in the absence of the champion/change agent?" },
] as const;

const DEFAULT_ADOPT: AdoptData = {
  q1: "", q2: "",
  q3: { answer: "", notes: "" }, q4: { answer: "", notes: "" },
  q5: { answer: "", notes: "" }, q6: { answer: "", notes: "" },
  q7: { answer: "", notes: "" },
  keyQuestion: "",
};

function parseAdoptData(raw: string): AdoptData {
  try {
    const p = JSON.parse(raw || "{}");
    return p.adopt ?? DEFAULT_ADOPT;
  } catch { return DEFAULT_ADOPT; }
}

function YNButtons({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; active: string; inactive: string }[];
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(value === o.value ? "" : o.value)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border-2 transition-all ${value === o.value ? o.active : o.inactive}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const YNP_OPTS = [
  { value: "yes",     label: "Yes",       active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "partial", label: "Partially", active: "bg-amber-100 text-amber-800 border-amber-400",       inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no",      label: "No",        active: "bg-red-100 text-red-800 border-red-400",             inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];
const YN_OPTS = [
  { value: "yes", label: "Yes", active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no",  label: "No",  active: "bg-red-100 text-red-800 border-red-400",             inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];
const YNU_OPTS = [
  { value: "yes",       label: "Yes",       active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "uncertain", label: "Uncertain", active: "bg-amber-100 text-amber-800 border-amber-400",       inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no",        label: "No",        active: "bg-red-100 text-red-800 border-red-400",             inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];
const KQ_OPTS = [
  { value: "yes",       label: "Yes — likely to revert",   active: "bg-red-100 text-red-800 border-red-400",             inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "uncertain", label: "Uncertain",                active: "bg-amber-100 text-amber-800 border-amber-400",       inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no",        label: "No — they'd continue",     active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];

function AdoptQuestionsPanel({ data, onChange }: { data: AdoptData; onChange: (d: AdoptData) => void }) {
  const set = (key: keyof AdoptData, val: any) => onChange({ ...data, [key]: val });
  const setQA = (key: keyof AdoptData, field: "answer" | "notes", val: string) =>
    onChange({ ...data, [key]: { ...(data[key] as any), [field]: val } });

  return (
    <div className="space-y-3">
      {/* Key Question */}
      <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">Key Question</p>
        <p className="text-xs font-semibold text-violet-900 mb-2.5 leading-snug">
          If you left now, would partners return to their previous way of working?
        </p>
        <YNButtons value={data.keyQuestion} onChange={v => set("keyQuestion", v)} options={KQ_OPTS} />
      </div>

      {/* Q1 & Q2 side by side */}
      <div className="grid grid-cols-2 gap-3">
        {[{ id: "q1" as const, label: "Partners adopted", unit: "no." }, { id: "q2" as const, label: "Pilot contribution", unit: "%" }].map(q => (
          <div key={q.id} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
              {q.id === "q1" ? "Q1" : "Q2"}
            </p>
            <p className="text-[11px] text-foreground leading-snug mb-2">
              {q.id === "q1"
                ? "No. of partners/market players who have adopted the new business model (incremental)"
                : "Partner(s) contribution to the pilot"}
            </p>
            <div className="flex items-center gap-2">
              <input type="number" min="0"
                value={data[q.id]}
                onChange={e => set(q.id, e.target.value)}
                className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 text-center font-bold"
                placeholder="0" />
              <span className="text-xs text-muted-foreground">{q.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Q3–Q7 */}
      {ADOPT_QUESTIONS.filter(q => q.type !== "number" && q.type !== "percent").map(q => {
        const qData = data[q.id as keyof AdoptData] as { answer: string; notes: string };
        const opts = q.type === "ynp" ? YNP_OPTS : q.type === "yn" ? YN_OPTS : YNU_OPTS;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black shrink-0 mt-0.5">
                {q.num}
              </span>
              <p className="text-xs text-foreground leading-snug">{q.label}</p>
            </div>
            <YNButtons value={qData.answer} onChange={v => setQA(q.id as any, "answer", v)} options={opts} />
            {qData.answer && (
              <input
                value={qData.notes}
                onChange={e => setQA(q.id as any, "notes", e.target.value)}
                placeholder="Add notes (optional)…"
                className="mt-2 w-full text-xs h-7 px-2 rounded border border-input bg-muted/40 focus:outline-none focus:ring-1 focus:ring-violet-300 text-muted-foreground placeholder:text-muted-foreground/50"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AAER cell modal ──────────────────────────────────────────────────────────
interface CellModalState {
  actor: string;
  period: string;
  entry: Entry | null;
}

function AaerCellModal({ state, onClose, onSave, onDelete, fw }: {
  state: CellModalState;
  onClose: () => void;
  onSave: (data: Omit<Entry, "id" | "theoryId" | "position">) => void;
  onDelete: () => void;
  fw: FrameworkDef;
}) {
  const existingAdopt = parseAdoptData(state.entry?.stageData ?? "{}");
  const [vals, setVals] = useState({
    frameworkTag:   state.entry?.frameworkTag   ?? "adopt",
    description:    state.entry?.description    ?? "",
    changeObserved: state.entry?.changeObserved ?? "",
    level:          state.entry?.level          ?? "actor",
    status:         state.entry?.status         ?? "plausible",
  });
  const [adoptData, setAdoptData] = useState<AdoptData>(existingAdopt);
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const stageData = vals.frameworkTag === "adopt"
      ? JSON.stringify({ adopt: adoptData })
      : state.entry?.stageData ?? "{}";
    onSave({
      dimension:      state.actor,
      frameworkTag:   vals.frameworkTag,
      description:    vals.description,
      changeObserved: vals.changeObserved,
      level:          vals.level,
      status:         vals.status,
      periodLabel:    state.period,
      stageData,
    });
  };

  const stage = AAER_STAGE_COLORS[vals.frameworkTag];
  const isAdopt = vals.frameworkTag === "adopt";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`${isAdopt ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] flex flex-col`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="font-bold truncate">{state.actor}</span>
            <span className="text-muted-foreground shrink-0">·</span>
            <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${stage?.bg} ${stage?.text} ${stage?.border}`}>
              {state.period}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-1 pr-1">
          {/* Stage selector */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">AAER Stage</Label>
            <div className="grid grid-cols-4 gap-2">
              {fw.tagOptions.map(opt => {
                const s = AAER_STAGE_COLORS[opt.value];
                const active = vals.frameworkTag === opt.value;
                return (
                  <button key={opt.value} onClick={() => set("frameworkTag", opt.value)}
                    className={`rounded-lg border-2 px-3 py-2 text-center transition-all ${active
                      ? `${s.bg} ${s.text} ${s.border} shadow-sm`
                      : "border-border bg-background hover:bg-muted text-muted-foreground"}`}>
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-[10px] mt-0.5 leading-tight opacity-75">{opt.desc?.split(" ").slice(0, 4).join(" ")}…</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adopt: guided questions */}
          {isAdopt && (
            <div className="border-t border-violet-200 pt-4">
              <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-3">Adoption Assessment</p>
              <AdoptQuestionsPanel data={adoptData} onChange={setAdoptData} />
            </div>
          )}

          {/* Common fields */}
          <div className={`${isAdopt ? "border-t border-border pt-4" : ""} space-y-3`}>
            {isAdopt && <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Additional Notes</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Scale / Reach</Label>
                <Select value={vals.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fw.levelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confidence</Label>
                <Select value={vals.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fw.statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                {isAdopt ? "What did they adopt / narrative summary" : "What changed / what they did"}
              </Label>
              <Textarea value={vals.description} onChange={e => set("description", e.target.value)}
                className="text-sm min-h-[64px]"
                placeholder={isAdopt ? "Describe what this actor adopted and how…" : "Describe what this actor did during this period…"} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Source</Label>
              <Textarea value={vals.changeObserved} onChange={e => set("changeObserved", e.target.value)}
                className="text-sm min-h-[48px]" placeholder="Data, observations, or sources confirming this change…" />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2 shrink-0 pt-2 border-t border-border">
          {state.entry && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive mr-auto" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Check className="w-3.5 h-3.5 mr-1.5" />{state.entry ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AAER Matrix view ─────────────────────────────────────────────────────────
function AaerMatrix({ entries, periods, fw, onCellClick, theory }: {
  entries: Entry[];
  periods: string[];
  fw: FrameworkDef;
  onCellClick: (actor: string, period: string, entry: Entry | null) => void;
  theory: any;
}) {
  // Derive unique actors from entries (preserving order of first appearance)
  const actorOrder = useRef<string[]>([]);
  const [newActor, setNewActor] = useState("");
  const [addingActor, setAddingActor] = useState(false);

  // Collect actors from entries + any locally added ones
  const entryActors = entries.map(e => e.dimension).filter(Boolean);
  entryActors.forEach(a => {
    if (!actorOrder.current.includes(a)) actorOrder.current.push(a);
  });
  const actors = actorOrder.current.length > 0 ? actorOrder.current : [];

  // Index entries by actor::period
  const index: Record<string, Entry> = {};
  entries.forEach(e => {
    if (e.dimension && e.periodLabel) index[`${e.dimension}::${e.periodLabel}`] = e;
  });

  const handleAddActor = () => {
    const name = newActor.trim();
    if (name && !actorOrder.current.includes(name)) {
      actorOrder.current = [...actorOrder.current, name];
      // Trigger a click on the first period for this actor
      if (periods.length > 0) onCellClick(name, periods[0], null);
    }
    setNewActor("");
    setAddingActor(false);
  };

  if (periods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-10 text-center">
        <Settings className="w-8 h-8 text-violet-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-violet-700">Configure the intervention timeline above</p>
        <p className="text-xs text-violet-500 mt-1">Set start year, end year, and granularity to generate your tracking matrix.</p>
      </div>
    );
  }

  // Stage progression arrow for a row
  const getRowStages = (actor: string) =>
    periods.map(p => index[`${actor}::${p}`]?.frameworkTag ?? null);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-muted-foreground mr-1">AAER Stages:</span>
        {fw.tagOptions.map(opt => {
          const s = AAER_STAGE_COLORS[opt.value];
          return (
            <span key={opt.value} className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
              {opt.label}
            </span>
          );
        })}
        <span className="text-[11px] border border-dashed border-border text-muted-foreground/50 px-2.5 py-0.5 rounded-full">No data</span>
      </div>

      {/* Matrix table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full" style={{ minWidth: `${Math.max(600, 160 + periods.length * 80)}px` }}>
            <thead>
              <tr className="bg-muted/70 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/70 z-10 w-40 min-w-[160px]">
                  Actor / Market Firm
                </th>
                {periods.map(p => (
                  <th key={p} className="px-2 py-3 text-center text-[11px] font-bold text-muted-foreground min-w-[72px]">
                    {p}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[11px] font-semibold text-muted-foreground w-24">Progress</th>
              </tr>
            </thead>
            <tbody>
              {actors.map((actor, ai) => {
                const rowStages = getRowStages(actor);
                const nonEmpty = rowStages.filter(Boolean);
                const latestStage = nonEmpty[nonEmpty.length - 1];
                const latestColor = latestStage ? AAER_STAGE_COLORS[latestStage] : null;
                return (
                  <tr key={actor} className={`border-b border-border/50 last:border-0 ${ai % 2 === 0 ? "bg-background" : "bg-muted/20"} hover:bg-violet-50/40 transition-colors`}>
                    <td className="px-4 py-3 sticky left-0 z-10 border-r border-border/30"
                      style={{ background: ai % 2 === 0 ? "white" : "rgb(249 250 251 / 0.8)" }}>
                      <div className="text-sm font-semibold text-foreground leading-tight">{actor}</div>
                      {latestColor && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border mt-1 inline-block ${latestColor.bg} ${latestColor.text} ${latestColor.border}`}>
                          Currently: {latestColor.label}
                        </span>
                      )}
                    </td>
                    {periods.map(period => {
                      const entry = index[`${actor}::${period}`];
                      const stage = entry ? AAER_STAGE_COLORS[entry.frameworkTag] : null;
                      const confOpt = entry ? fw.statusOptions.find(s => s.value === entry.status) : null;
                      return (
                        <td key={period} className="px-1.5 py-2 text-center">
                          <button onClick={() => onCellClick(actor, period, entry ?? null)}
                            className={`w-full min-h-[52px] rounded-lg border-2 transition-all hover:shadow-sm flex flex-col items-center justify-center gap-1 px-1 py-1.5 ${
                              stage
                                ? `${stage.bg} ${stage.border} hover:opacity-80`
                                : "border-dashed border-border/40 bg-transparent hover:border-violet-300 hover:bg-violet-50/50"
                            }`}>
                            {stage ? (
                              <>
                                <span className={`text-xs font-black ${stage.text}`}>{stage.abbr}</span>
                                {confOpt && (
                                  <span className="text-[9px] leading-none text-center opacity-70 font-medium">
                                    {confOpt.label}
                                  </span>
                                )}
                              </>
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-muted-foreground/30" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                    {/* Progress column */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {rowStages.map((s, i) => {
                          const col = s ? AAER_STAGE_COLORS[s] : null;
                          return col ? (
                            <span key={i} className={`w-2.5 h-2.5 rounded-full ${col.bg.replace("bg-", "bg-").replace("-100", "-400")}`} title={col.label} />
                          ) : (
                            <span key={i} className="w-2.5 h-2.5 rounded-full bg-muted/40" />
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{nonEmpty.length}/{periods.length}</span>
                    </td>
                  </tr>
                );
              })}

              {/* Add actor row */}
              <tr className="border-t border-dashed border-border/40 bg-muted/10">
                <td colSpan={periods.length + 2} className="px-4 py-3">
                  {addingActor ? (
                    <div className="flex items-center gap-2">
                      <input autoFocus value={newActor} onChange={e => setNewActor(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleAddActor(); if (e.key === "Escape") setAddingActor(false); }}
                        className="text-sm h-8 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 w-64"
                        placeholder="Actor or firm name…" />
                      <Button size="sm" className="h-8 bg-violet-600 hover:bg-violet-700 text-white" onClick={handleAddActor}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingActor(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingActor(true)}
                      className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors">
                      <Plus className="w-4 h-4" />Add Actor / Market Firm
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail cards for entries */}
      {entries.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Entry Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {entries.map(e => {
              const s = AAER_STAGE_COLORS[e.frameworkTag];
              const levelLabel = fw.levelOptions.find(l => l.value === e.level)?.label ?? e.level;
              const isAdopt = e.frameworkTag === "adopt";
              const adoptD = isAdopt ? parseAdoptData(e.stageData ?? "{}") : null;
              const kqColors: Record<string, string> = {
                yes: "bg-red-100 text-red-700 border-red-300",
                uncertain: "bg-amber-100 text-amber-700 border-amber-300",
                no: "bg-emerald-100 text-emerald-700 border-emerald-300",
              };
              const kqLabels: Record<string, string> = {
                yes: "Would revert", uncertain: "Uncertain", no: "Would continue",
              };
              const answerColor = (a: string) =>
                a === "yes" ? "text-emerald-700" : a === "partial" ? "text-amber-700" : a === "no" ? "text-red-700" : a === "uncertain" ? "text-amber-700" : "text-muted-foreground";
              const answerLabel = (a: string) =>
                a === "yes" ? "Yes" : a === "partial" ? "Partially" : a === "no" ? "No" : a === "uncertain" ? "Uncertain" : "—";
              const hasAdoptContent = adoptD && (adoptD.q1 || adoptD.q2 || adoptD.q3.answer || adoptD.q4.answer || adoptD.q5.answer || adoptD.q6.answer || adoptD.q7.answer || adoptD.keyQuestion);
              const hasBasicContent = e.description || e.changeObserved;
              if (!hasAdoptContent && !hasBasicContent) return null;
              return (
                <div key={e.id} className={`rounded-lg border p-3 ${s?.bg ?? "bg-muted/30"} ${s?.border ?? "border-border"}`}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${s?.bg} ${s?.text} ${s?.border}`}>{s?.label}</span>
                    <span className="text-xs font-semibold text-foreground">{e.dimension}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{e.periodLabel}</span>
                  </div>

                  {/* Adopt assessment summary */}
                  {adoptD && hasAdoptContent && (
                    <div className="mb-2 space-y-1.5">
                      {/* Key question */}
                      {adoptD.keyQuestion && (
                        <div className={`rounded-lg border px-2.5 py-1.5 ${kqColors[adoptD.keyQuestion] ?? "bg-muted border-border"}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-60 mb-0.5">Key Question</p>
                          <p className="text-xs font-semibold">{kqLabels[adoptD.keyQuestion] ?? adoptD.keyQuestion}</p>
                        </div>
                      )}
                      {/* Q1 & Q2 */}
                      {(adoptD.q1 || adoptD.q2) && (
                        <div className="flex gap-2">
                          {adoptD.q1 && (
                            <div className="bg-white/60 border border-white/80 rounded px-2 py-1 flex-1 text-center">
                              <p className="text-[10px] text-muted-foreground font-semibold">Partners Adopted</p>
                              <p className="text-sm font-black text-foreground">{adoptD.q1}</p>
                            </div>
                          )}
                          {adoptD.q2 && (
                            <div className="bg-white/60 border border-white/80 rounded px-2 py-1 flex-1 text-center">
                              <p className="text-[10px] text-muted-foreground font-semibold">Pilot Contribution</p>
                              <p className="text-sm font-black text-foreground">{adoptD.q2}%</p>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Q3–Q7 compact */}
                      {(["q3","q4","q5","q6","q7"] as const).some(k => (adoptD[k] as any).answer) && (
                        <div className="bg-white/50 rounded border border-white/80 divide-y divide-white/80">
                          {([
                            { k: "q3", short: "Partners satisfied & willing to continue?" },
                            { k: "q4", short: "Increased revenue/profit?" },
                            { k: "q5", short: "Target group benefitting?" },
                            { k: "q6", short: "Champion/change agent in org?" },
                            { k: "q7", short: "Org continues without champion?" },
                          ] as const).filter(row => (adoptD[row.k] as any).answer).map(row => {
                            const qd = adoptD[row.k] as { answer: string; notes: string };
                            return (
                              <div key={row.k} className="px-2 py-1 flex items-start gap-2">
                                <span className={`text-[10px] font-black shrink-0 mt-0.5 ${answerColor(qd.answer)}`}>{answerLabel(qd.answer)}</span>
                                <span className="text-[11px] text-foreground/75 leading-snug">{row.short}</span>
                                {qd.notes && <span className="text-[10px] text-muted-foreground italic ml-auto shrink-0 max-w-[100px] truncate" title={qd.notes}>{qd.notes}</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {e.description && <p className="text-xs text-foreground/80 leading-relaxed mb-1.5">{e.description}</p>}
                  {e.changeObserved && (
                    <p className="text-[11px] text-muted-foreground bg-white/60 rounded px-2 py-1 border border-white/80">
                      <span className="font-semibold">Evidence: </span>{e.changeObserved}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground bg-white/60 border border-white/80 px-2 py-0.5 rounded-full">{levelLabel}</span>
                    {(() => { const c = fw.statusOptions.find(o => o.value === e.status); return c ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.color}`}>{c.label}</span> : null; })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(id) }) },
  });

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [localFrameworkKey, setLocalFrameworkKey] = useState<FrameworkKey | null>(null);
  const [cellModal, setCellModal] = useState<CellModalState | null>(null);
  const [localSettings, setLocalSettings] = useState<AaerSettings>({ startYear: 0, endYear: 0, granularity: "annual" });
  const [settingsSynced, setSettingsSynced] = useState(false);

  const loadEntries = async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      setEntries(await res.json());
    } catch (err) {
      toast({ title: "Failed to load entries", description: String(err), variant: "destructive" });
    } finally { setLoading(false); setLoaded(true); }
  };

  useEffect(() => {
    const t = theory as any;
    if (!t) return;
    const key = t.systemicChangeFramework as FrameworkKey | null | undefined;
    if (key && !localFrameworkKey) setLocalFrameworkKey(key);
    if (!settingsSynced && (t.interventionStartYear || t.interventionEndYear)) {
      setLocalSettings({
        startYear:   t.interventionStartYear ?? 0,
        endYear:     t.interventionEndYear   ?? 0,
        granularity: (t.periodGranularity as Granularity) ?? "annual",
      });
      setSettingsSynced(true);
    }
  }, [theory]);

  if (!loaded && !loading && id) loadEntries();

  const handleSelectFramework = (key: FrameworkKey) => {
    setLocalFrameworkKey(key);
    setShowSelector(false);
    updateTheory.mutate({ id, data: { systemicChangeFramework: key } as any });
  };

  const saveSettings = (s: AaerSettings) => {
    setLocalSettings(s);
    setSettingsSynced(true);
    updateTheory.mutate({
      id, data: {
        interventionStartYear: s.startYear,
        interventionEndYear: s.endYear,
        periodGranularity: s.granularity,
      } as any,
    });
  };

  const handleCreate = async (data: Omit<Entry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...data, position: entries.length }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json() as Entry;
      setEntries(prev => [...prev, created]);
      setAddingRow(false);
      setCellModal(null);
    } catch (err) {
      toast({ title: "Failed to create entry", description: String(err), variant: "destructive" });
    }
  };

  const handleUpdate = async (entryId: number, data: Omit<Entry, "id" | "theoryId" | "position">) => {
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json() as Entry;
      setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      setEditingId(null);
      setCellModal(null);
    } catch (err) {
      toast({ title: "Failed to update entry", description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, { method: "DELETE", credentials: "include" });
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setCellModal(null);
    } catch (err) {
      toast({ title: "Failed to delete", description: String(err), variant: "destructive" });
    }
  };

  const handleCellSave = (data: Omit<Entry, "id" | "theoryId" | "position">) => {
    if (cellModal?.entry) {
      handleUpdate(cellModal.entry.id, data);
    } else {
      handleCreate(data);
    }
  };

  if (theoryLoading || !theory) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const fw = FRAMEWORKS.find(f => f.key === localFrameworkKey);
  if (!localFrameworkKey || showSelector) {
    return (
      <div className="flex flex-col h-full overflow-auto bg-background">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-10">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => showSelector ? setShowSelector(false) : setLocation(`/theory/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{theory.title}</h1>
            <p className="text-xs text-muted-foreground">Systemic Change — Select Framework</p>
          </div>
        </header>
        <FrameworkSelector onSelect={handleSelectFramework} />
      </div>
    );
  }

  const isAaer = localFrameworkKey === "aaer";
  const periods = localSettings.startYear && localSettings.endYear
    ? generatePeriods(localSettings.startYear, localSettings.endYear, localSettings.granularity)
    : [];

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">

      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border bg-background/95 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLocation(`/theory/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight truncate">{theory.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground">Systemic Change</p>
            <span className={`text-[10px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${fw!.accent}`}>{fw!.abbr}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSelector(true)}>
            <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Switch Framework</span>
          </Button>
          {!isAaer && (
            <Button size="sm" className="gap-2" onClick={() => { setAddingRow(true); setEditingId(null); }}>
              <Plus className="w-4 h-4" />Add Entry
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">

        {/* Framework info */}
        <div className={`rounded-xl border-2 p-4 flex gap-4 items-start ${fw!.color}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${fw!.accent}`}>
            <Info className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold">{fw!.label}</span>
              <span className="text-[10px] text-muted-foreground">· {fw!.org}</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{fw!.description}</p>
          </div>
        </div>

        {/* AAER: Settings + Matrix */}
        {isAaer && (
          <>
            <AaerSettingsPanel settings={localSettings} onSave={saveSettings} />
            <AaerMatrix
              entries={entries}
              periods={periods}
              fw={fw!}
              theory={theory}
              onCellClick={(actor, period, entry) => setCellModal({ actor, period, entry })}
            />
          </>
        )}

        {/* Non-AAER: Table */}
        {!isAaer && fw!.cols.length > 0 && (
          <>
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
                                <TooltipContent side="top" className="max-w-[200px] text-xs">{col.tooltip}</TooltipContent>
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
                          onSave={d => handleUpdate(entry.id, d)} onCancel={() => setEditingId(null)} />
                      ) : (
                        <EntryRow key={entry.id} entry={entry} rowNum={i + 1} fw={fw!}
                          onEdit={() => { setEditingId(entry.id); setAddingRow(false); }}
                          onDelete={() => handleDelete(entry.id)} />
                      )
                    )}
                    {addingRow && (
                      <EditRow initial={{}} rowNum={entries.length + 1} fw={fw!}
                        onSave={handleCreate} onCancel={() => setAddingRow(false)} />
                    )}
                    {entries.length === 0 && !addingRow && (
                      <tr>
                        <td colSpan={fw!.cols.length + 2} className="px-4 py-14 text-center">
                          <GitBranch className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Click "Add Entry" to start recording systemic changes.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {!addingRow && entries.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setAddingRow(true); setEditingId(null); }}>
                <Plus className="w-4 h-4" />Add Entry
              </Button>
            )}
          </>
        )}

      </div>

      {/* AAER cell modal */}
      {cellModal && (
        <AaerCellModal
          state={cellModal}
          fw={fw!}
          onClose={() => setCellModal(null)}
          onSave={handleCellSave}
          onDelete={() => cellModal.entry && handleDelete(cellModal.entry.id)}
        />
      )}
    </div>
  );
}
