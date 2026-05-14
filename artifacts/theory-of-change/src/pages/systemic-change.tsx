import { useState, useEffect, useRef, Fragment } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useUpdateTheory, getGetTheoryQueryKey, useAnalyzeSystemicChange } from "@workspace/api-client-react";
import type { SystemicChangeAnalysis, StageAnalysis } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, GitBranch,
  ChevronRight, RefreshCw, Info, Settings, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, TrendingUp,
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
type PilotDuration = "none" | "3mo" | "6mo" | "1yr";

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

/** Generates pilot-phase period labels before Y1 starts. */
function generatePilotPeriods(duration: PilotDuration, granularity: Granularity): string[] {
  if (duration === "none") return [];
  if (granularity === "annual") return ["Pilot"];
  if (granularity === "biannual") return duration === "1yr" ? ["P H1", "P H2"] : ["P H1"];
  // quarterly
  if (duration === "3mo") return ["P Q1"];
  if (duration === "6mo") return ["P Q1", "P Q2"];
  return ["P Q1", "P Q2", "P Q3", "P Q4"]; // 1yr
}

/** Returns true for any period that belongs to the pilot phase. */
function isPilotPeriod(period: string): boolean {
  return period === "Pilot" || period.startsWith("P H") || period.startsWith("P Q");
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
            onClick={() => onSave({ dimension: vals.dimension, description: vals.description, changeObserved: vals.changeObserved, level: vals.level, status: vals.status, frameworkTag: vals.frameworkTag, periodLabel: vals.periodLabel, stageData: "{}" })}>
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
interface CustomQuestion { id: string; label: string; type: "yn" | "number" | "notes" }
interface AaerSettings { startYear: number; endYear: number; granularity: Granularity; pilotDuration: PilotDuration; enabledStages: string[]; periodStageMap: Record<string, string>; customQuestions: Record<string, CustomQuestion[]> }

const PILOT_DURATION_OPTIONS: { value: PilotDuration; label: string; desc: string }[] = [
  { value: "none",  label: "No pilot phase",  desc: "Tracking starts at Y1" },
  { value: "3mo",   label: "3 months",         desc: "Short pilot before Y1" },
  { value: "6mo",   label: "6 months",         desc: "Half-year pilot before Y1" },
  { value: "1yr",   label: "1 year",           desc: "Full-year pilot before Y1" },
];

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

  const pilotPeriods = generatePilotPeriods(local.pilotDuration, local.granularity);
  const regularPeriods = local.startYear && local.endYear
    ? generatePeriods(local.startYear, local.endYear, local.granularity)
    : [];
  const allPeriods = [...pilotPeriods, ...regularPeriods];

  const pilotLabel = PILOT_DURATION_OPTIONS.find(o => o.value === settings.pilotDuration)?.label ?? "No pilot";

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-violet-100 transition-colors">
        <Settings className="w-4 h-4 text-violet-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-violet-900">Intervention Timeline</span>
          {settings.startYear && settings.endYear ? (
            <span className="ml-3 text-xs text-violet-600">
              {settings.startYear}–{settings.endYear} · {settings.granularity} · {generatePeriods(settings.startYear, settings.endYear, settings.granularity).length} tracking periods
              {settings.pilotDuration !== "none" && (
                <span className="ml-1 text-amber-600 font-semibold">· Pilot: {pilotLabel}</span>
              )}
            </span>
          ) : (
            <span className="ml-3 text-xs text-violet-500 italic">Not configured — click to set up</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
      </button>

      {open && (
        <div className="border-t border-violet-200 px-5 py-4 bg-white/70 space-y-4">
          {/* Enabled AAER Phases */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Enabled AAER Phases</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["adopt","adapt","expand","respond"] as const).map(stage => {
                const s = AAER_STAGE_COLORS[stage];
                const isOn = local.enabledStages.includes(stage);
                const isLast = local.enabledStages.length === 1 && isOn;
                const toggle = () => {
                  if (isLast) return; // must keep at least one
                  setLocal(p => ({
                    ...p,
                    enabledStages: isOn
                      ? p.enabledStages.filter(x => x !== stage)
                      : [...p.enabledStages, stage],
                  }));
                };
                return (
                  <button key={stage} onClick={toggle}
                    title={isLast ? "At least one phase must be enabled" : undefined}
                    className={`rounded-lg border-2 px-3 py-2 text-center transition-all relative ${
                      isOn
                        ? `${s.bg} ${s.border} ${s.text} shadow-sm`
                        : "border-border bg-background text-muted-foreground/50 opacity-60"
                    } ${isLast ? "cursor-not-allowed" : "hover:opacity-90"}`}>
                    <div className="text-xs font-bold capitalize">{stage}</div>
                    <div className="text-[10px] mt-0.5 opacity-70 leading-tight">{isOn ? "Included" : "Excluded"}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5">Toggle which stages actors can be assessed against. At least one must remain active.</p>
          </div>

          {/* Pilot duration */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Pilot Phase Duration</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PILOT_DURATION_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setLocal(p => ({ ...p, pilotDuration: opt.value }))}
                  className={`rounded-lg border-2 px-3 py-2 text-center transition-all ${
                    local.pilotDuration === opt.value
                      ? "bg-amber-100 border-amber-400 text-amber-900"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  }`}>
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start / End / Granularity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Intervention Start Year</Label>
              <Select value={String(local.startYear || "")} onValueChange={v => setLocal(p => ({ ...p, startYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Intervention End Year</Label>
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

          {/* Period preview */}
          {allPeriods.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                Full timeline preview ({allPeriods.length} periods
                {pilotPeriods.length > 0 && `, incl. ${pilotPeriods.length} pilot`}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allPeriods.map(p => (
                  <span key={p} className={`text-[11px] px-2 py-0.5 rounded-full font-medium border inline-flex items-center gap-1 ${
                    isPilotPeriod(p)
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-violet-100 text-violet-700 border-violet-200"
                  }`}>
                    {p}
                    {isPilotPeriod(p) && <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">· Pilot</span>}
                  </span>
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
  q1: { value: string; notes: string };
  q2: { value: string; notes: string };
  q3: { answer: string; notes: string };
  q4: { answer: string; notes: string };
  q5: { answer: string; notes: string };
  q6: { answer: string; notes: string };
  q7: { answer: string; notes: string };
  keyQuestion: string;
  keyQuestionNotes: string;
}

const ADOPT_QUESTIONS = [
  { id: "q1", num: 1, type: "number", label: "No. of partner(s) who have adopted the new business model (incremental).", unit: "partners" },
  { id: "q2", num: 2, type: "percent", label: "Partner(s) contribution to the pilot.", unit: "%" },
  { id: "q3", num: 3, type: "ynp", label: "Are the partners satisfied with the pilot? Are they able and willing to continue with the business model?" },
  { id: "q4", num: 4, type: "ynp", label: "Has the pilot resulted in increased revenue/profit for the partner(s)?" },
  { id: "q5", num: 5, type: "ynp", label: "Is the target group benefitting from and satisfied with the business model?" },
  { id: "q6", num: 6, type: "yn", label: "Is there an agent within the organisation who believes in the intervention and champions the cause?" },
  { id: "q7", num: 7, type: "ynu", label: "Will the organisation continue with the intervention in the absence of the champion/change agent?" },
] as const;

const DEFAULT_ADOPT: AdoptData = {
  q1: { value: "", notes: "" }, q2: { value: "", notes: "" },
  q3: { answer: "", notes: "" }, q4: { answer: "", notes: "" },
  q5: { answer: "", notes: "" }, q6: { answer: "", notes: "" },
  q7: { answer: "", notes: "" },
  keyQuestion: "", keyQuestionNotes: "",
};

function parseAdoptData(raw: string): AdoptData {
  try {
    const p = JSON.parse(raw || "{}");
    const d = p.adopt ?? {};
    const q1 = typeof d.q1 === "string" ? { value: d.q1, notes: "" } : (d.q1 ?? { value: "", notes: "" });
    const q2 = typeof d.q2 === "string" ? { value: d.q2, notes: "" } : (d.q2 ?? { value: "", notes: "" });
    return { ...DEFAULT_ADOPT, ...d, q1, q2 };
  } catch { return DEFAULT_ADOPT; }
}

// ─── Adapt data ───────────────────────────────────────────────────────────────
interface AdaptData {
  q1: { answer: string; notes: string };
  q2: { answer: string; notes: string };
  q3: { value: string; notes: string };
  q4: { answer: string; notes: string };
  q5: { value: string; notes: string };
  keyQuestion: string;
  keyQuestionNotes: string;
}
const DEFAULT_ADAPT: AdaptData = {
  q1: { answer: "", notes: "" }, q2: { answer: "", notes: "" },
  q3: { value: "", notes: "" }, q4: { answer: "", notes: "" },
  q5: { value: "", notes: "" },
  keyQuestion: "", keyQuestionNotes: "",
};
function parseAdaptData(raw: string): AdaptData {
  try { const p = JSON.parse(raw || "{}"); return { ...DEFAULT_ADAPT, ...(p.adapt ?? {}) }; }
  catch { return DEFAULT_ADAPT; }
}

// ─── Expansion data ───────────────────────────────────────────────────────────
interface ExpansionData {
  q1: { answer: string; notes: string };
  q2: { value: string; notes: string };
  q3: { value: string; notes: string };
  q4: { answer: string; notes: string };
  q5: { value: string; notes: string };
  keyQuestion: string;
  keyQuestionNotes: string;
}
const DEFAULT_EXPANSION: ExpansionData = {
  q1: { answer: "", notes: "" },
  q2: { value: "", notes: "" }, q3: { value: "", notes: "" },
  q4: { answer: "", notes: "" }, q5: { value: "", notes: "" },
  keyQuestion: "", keyQuestionNotes: "",
};
function parseExpansionData(raw: string): ExpansionData {
  try { const p = JSON.parse(raw || "{}"); return { ...DEFAULT_EXPANSION, ...(p.expand ?? {}) }; }
  catch { return DEFAULT_EXPANSION; }
}

// ─── Response data ────────────────────────────────────────────────────────────
interface ResponseData {
  q1: { answer: string; notes: string };
  q2: { answer: string; notes: string };
  q3: { value: string; notes: string };
  q4: { answer: string; notes: string };
  q5: { notes: string };
  keyQuestion: string;
  keyQuestionNotes: string;
}
const DEFAULT_RESPONSE: ResponseData = {
  q1: { answer: "", notes: "" }, q2: { answer: "", notes: "" },
  q3: { value: "", notes: "" }, q4: { answer: "", notes: "" },
  q5: { notes: "" },
  keyQuestion: "", keyQuestionNotes: "",
};
function parseResponseData(raw: string): ResponseData {
  try { const p = JSON.parse(raw || "{}"); return { ...DEFAULT_RESPONSE, ...(p.respond ?? {}) }; }
  catch { return DEFAULT_RESPONSE; }
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
  const setField = (key: keyof AdoptData, val: any) => onChange({ ...data, [key]: val });
  const setNested = (key: keyof AdoptData, field: string, val: string) =>
    onChange({ ...data, [key]: { ...(data[key] as any), [field]: val } });

  const commentClass = "mt-2 w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-white/70 focus:outline-none focus:ring-1 focus:ring-violet-300 resize-none text-foreground placeholder:text-muted-foreground/50 min-h-[52px]";

  return (
    <div className="space-y-3">
      {/* Key Question */}
      <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">Key Question</p>
        <p className="text-xs font-semibold text-violet-900 leading-snug">
          If you left now, would partners return to their previous way of working?
        </p>
      </div>

      {/* Q1 — number + comments */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black shrink-0">1</span>
          <p className="text-xs text-foreground leading-snug">
            No. of partner(s) who have adopted the new business model (incremental).
          </p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0"
            value={data.q1.value}
            onChange={e => setNested("q1", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 text-center font-bold"
            placeholder="0" />
          <span className="text-xs text-muted-foreground">partners</span>
        </div>
        <textarea
          value={data.q1.notes}
          onChange={e => setNested("q1", "notes", e.target.value)}
          placeholder="Comments — which partners, context, or caveats…"
          className={commentClass}
        />
      </div>

      {/* Q2 — percent + comments */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black shrink-0">2</span>
          <p className="text-xs text-foreground leading-snug">
            Partner(s) contribution to the pilot. (%)
          </p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" max="100"
            value={data.q2.value}
            onChange={e => setNested("q2", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-violet-400 text-center font-bold"
            placeholder="0" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <textarea
          value={data.q2.notes}
          onChange={e => setNested("q2", "notes", e.target.value)}
          placeholder="Comments — how contribution was calculated or estimated…"
          className={commentClass}
        />
      </div>

      {/* Q3–Q7 — toggle + always-visible comments */}
      {ADOPT_QUESTIONS.filter(q => q.type !== "number" && q.type !== "percent").map(q => {
        const qData = data[q.id as keyof AdoptData] as { answer: string; notes: string };
        const opts = q.type === "ynp" ? YNP_OPTS : q.type === "yn" ? YN_OPTS : YNU_OPTS;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex gap-2 mb-2.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-black shrink-0 mt-0.5">
                {q.num}
              </span>
              <p className="text-xs text-foreground leading-snug">{q.label}</p>
            </div>
            <YNButtons value={qData.answer} onChange={v => setNested(q.id as any, "answer", v)} options={opts} />
            <textarea
              value={qData.notes}
              onChange={e => setNested(q.id as any, "notes", e.target.value)}
              placeholder="Comments — explain your answer with evidence or observations…"
              className={commentClass}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Adapt questions panel ────────────────────────────────────────────────────
const ADAPT_KQ_OPTS = [
  { value: "yes", label: "Yes — independently", active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "uncertain", label: "Uncertain", active: "bg-amber-100 text-amber-800 border-amber-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no", label: "No — still need us", active: "bg-red-100 text-red-800 border-red-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];

function AdaptQuestionsPanel({ data, onChange }: { data: AdaptData; onChange: (d: AdaptData) => void }) {
  const setField = (key: keyof AdaptData, val: any) => onChange({ ...data, [key]: val });
  const setNested = (key: keyof AdaptData, field: string, val: string) =>
    onChange({ ...data, [key]: { ...(data[key] as any), [field]: val } });
  const cc = "mt-2 w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-white/70 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none text-foreground placeholder:text-muted-foreground/50 min-h-[52px]";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Key Question</p>
        <p className="text-xs font-semibold text-blue-900 leading-snug">
          If you left now, would partners build upon the changes they've adopted, without us?
        </p>
      </div>

      {[
        { key: "q1" as const, n: 1, type: "yn", label: "Have the partners made any autonomous changes to the model that has been piloted?", ph: "Describe the autonomous changes observed…" },
        { key: "q2" as const, n: 2, type: "yn", label: "Have the partners increased their share of the costs/investment (compared to the pilot)?", ph: "Explain the investment shift…" },
      ].map(q => (
        <div key={q.key} className="rounded-lg border border-border bg-background p-3">
          <div className="flex gap-2 mb-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black shrink-0 mt-0.5">{q.n}</span>
            <p className="text-xs text-foreground leading-snug">{q.label}</p>
          </div>
          <YNButtons value={(data[q.key] as any).answer} onChange={v => setNested(q.key, "answer", v)} options={YN_OPTS} />
          <textarea value={(data[q.key] as any).notes} onChange={e => setNested(q.key, "notes", e.target.value)}
            placeholder={`Comments — ${q.ph}`} className={cc} />
        </div>
      ))}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black shrink-0">3</span>
          <p className="text-xs text-foreground leading-snug">If yes, what is their increased contribution? (%)</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" max="100" value={data.q3.value} onChange={e => setNested("q3", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold" placeholder="0" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <textarea value={data.q3.notes} onChange={e => setNested("q3", "notes", e.target.value)}
          placeholder="Comments — how this was calculated or estimated…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black shrink-0 mt-0.5">4</span>
          <p className="text-xs text-foreground leading-snug">Have the partners autonomously expanded to other areas with reduced or no support from us?</p>
        </div>
        <YNButtons value={data.q4.answer} onChange={v => setNested("q4", "answer", v)} options={YN_OPTS} />
        <textarea value={data.q4.notes} onChange={e => setNested("q4", "notes", e.target.value)}
          placeholder="Comments — describe the areas of expansion…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black shrink-0">5</span>
          <p className="text-xs text-foreground leading-snug">If yes, how many new locations have they expanded to?</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" value={data.q5.value} onChange={e => setNested("q5", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-blue-400 text-center font-bold" placeholder="0" />
          <span className="text-xs text-muted-foreground">locations</span>
        </div>
        <textarea value={data.q5.notes} onChange={e => setNested("q5", "notes", e.target.value)}
          placeholder="Comments — which locations or regions…" className={cc} />
      </div>
    </div>
  );
}

// ─── Expansion questions panel ────────────────────────────────────────────────
const EXPANSION_KQ_OPTS = [
  { value: "yes", label: "Yes — too concentrated", active: "bg-red-100 text-red-800 border-red-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "uncertain", label: "Uncertain", active: "bg-amber-100 text-amber-800 border-amber-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no", label: "No — spread widely", active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];

function ExpansionQuestionsPanel({ data, onChange }: { data: ExpansionData; onChange: (d: ExpansionData) => void }) {
  const setField = (key: keyof ExpansionData, val: any) => onChange({ ...data, [key]: val });
  const setNested = (key: keyof ExpansionData, field: string, val: string) =>
    onChange({ ...data, [key]: { ...(data[key] as any), [field]: val } });
  const cc = "mt-2 w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-white/70 focus:outline-none focus:ring-1 focus:ring-emerald-300 resize-none text-foreground placeholder:text-muted-foreground/50 min-h-[52px]";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Key Question</p>
        <p className="text-xs font-semibold text-emerald-900 leading-snug">
          If you left now, would target group benefits depend on too few people, firms, or organisations?
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0 mt-0.5">1</span>
          <p className="text-xs text-foreground leading-snug">Have competitors or others crowded in?</p>
        </div>
        <YNButtons value={data.q1.answer} onChange={v => setNested("q1", "answer", v)} options={YN_OPTS} />
        <textarea value={data.q1.notes} onChange={e => setNested("q1", "notes", e.target.value)}
          placeholder="Comments — which competitors or players…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0">2</span>
          <p className="text-xs text-foreground leading-snug">If yes, how many have crowded in?</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" value={data.q2.value} onChange={e => setNested("q2", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center font-bold" placeholder="0" />
          <span className="text-xs text-muted-foreground">players</span>
        </div>
        <textarea value={data.q2.notes} onChange={e => setNested("q2", "notes", e.target.value)}
          placeholder="Comments — name or describe the players…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0">3</span>
          <p className="text-xs text-foreground leading-snug">What is the combined market share of the partner(s) and others that have crowded in? (%)</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" max="100" value={data.q3.value} onChange={e => setNested("q3", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center font-bold" placeholder="0" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <textarea value={data.q3.notes} onChange={e => setNested("q3", "notes", e.target.value)}
          placeholder="Comments — how this was estimated…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0 mt-0.5">4</span>
          <p className="text-xs text-foreground leading-snug">Have others, whom we haven't targeted directly, started copying the behaviour change of the target group?</p>
        </div>
        <YNButtons value={data.q4.answer} onChange={v => setNested("q4", "answer", v)} options={YN_OPTS} />
        <textarea value={data.q4.notes} onChange={e => setNested("q4", "notes", e.target.value)}
          placeholder="Comments — describe who is copying and how…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black shrink-0">5</span>
          <p className="text-xs text-foreground leading-snug">What is the ratio of direct to indirect beneficiaries? (e.g. 1:2)</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="text" value={data.q5.value} onChange={e => setNested("q5", "value", e.target.value)}
            className="w-24 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-emerald-400 text-center font-bold" placeholder="1:2" />
        </div>
        <textarea value={data.q5.notes} onChange={e => setNested("q5", "notes", e.target.value)}
          placeholder="Comments — explain the methodology behind this ratio…" className={cc} />
      </div>
    </div>
  );
}

// ─── Response questions panel ─────────────────────────────────────────────────
const RESPONSE_KQ_OPTS = [
  { value: "yes", label: "Yes — supportive", active: "bg-emerald-100 text-emerald-800 border-emerald-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "uncertain", label: "Uncertain", active: "bg-amber-100 text-amber-800 border-amber-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
  { value: "no", label: "No — not yet", active: "bg-red-100 text-red-800 border-red-400", inactive: "border-border bg-background text-muted-foreground hover:bg-muted" },
];

function ResponseQuestionsPanel({ data, onChange }: { data: ResponseData; onChange: (d: ResponseData) => void }) {
  const setField = (key: keyof ResponseData, val: any) => onChange({ ...data, [key]: val });
  const setNested = (key: keyof ResponseData, field: string, val: string) =>
    onChange({ ...data, [key]: { ...(data[key] as any), [field]: val } });
  const cc = "mt-2 w-full text-xs px-2.5 py-1.5 rounded-md border border-input bg-white/70 focus:outline-none focus:ring-1 focus:ring-orange-300 resize-none text-foreground placeholder:text-muted-foreground/50 min-h-[52px]";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Key Question</p>
        <p className="text-xs font-semibold text-orange-900 leading-snug">
          If you left now, would the system be supportive of the changes introduced (allowing them to be upheld, grow, evolve)?
        </p>
      </div>

      {[
        { key: "q1" as const, n: 1, label: "Have there been any changes in policy or the way business is conducted that have impacted the intervention?", ph: "Describe the policy or business conduct changes…" },
        { key: "q2" as const, n: 2, label: "Have others from interconnected/supporting markets reacted/responded to the new business model?", ph: "Describe how related markets have responded…" },
      ].map(q => (
        <div key={q.key} className="rounded-lg border border-border bg-background p-3">
          <div className="flex gap-2 mb-2.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black shrink-0 mt-0.5">{q.n}</span>
            <p className="text-xs text-foreground leading-snug">{q.label}</p>
          </div>
          <YNButtons value={(data[q.key] as any).answer} onChange={v => setNested(q.key, "answer", v)} options={YN_OPTS} />
          <textarea value={(data[q.key] as any).notes} onChange={e => setNested(q.key, "notes", e.target.value)}
            placeholder={`Comments — ${q.ph}`} className={cc} />
        </div>
      ))}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black shrink-0">3</span>
          <p className="text-xs text-foreground leading-snug">If yes, how many have responded?</p>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input type="number" min="0" value={data.q3.value} onChange={e => setNested("q3", "value", e.target.value)}
            className="w-20 text-sm h-8 px-2 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-orange-400 text-center font-bold" placeholder="0" />
          <span className="text-xs text-muted-foreground">players</span>
        </div>
        <textarea value={data.q3.notes} onChange={e => setNested("q3", "notes", e.target.value)}
          placeholder="Comments — name or describe the responding players…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex gap-2 mb-2.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black shrink-0 mt-0.5">4</span>
          <p className="text-xs text-foreground leading-snug">Has the market been able to withstand and cope with shocks?</p>
        </div>
        <YNButtons value={data.q4.answer} onChange={v => setNested("q4", "answer", v)} options={YN_OPTS} />
        <textarea value={data.q4.notes} onChange={e => setNested("q4", "notes", e.target.value)}
          placeholder="Comments — describe shocks encountered and how the market responded…" className={cc} />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black shrink-0">5</span>
          <p className="text-xs text-foreground leading-snug">Other relevant observations about systemic response.</p>
        </div>
        <textarea value={data.q5.notes} onChange={e => setNested("q5", "notes", e.target.value)}
          placeholder="Comments — any other relevant systemic changes or observations…" className={cc} />
      </div>
    </div>
  );
}

// ─── AAER cell modal ──────────────────────────────────────────────────────────
interface CellModalState {
  actor: string;
  period: string;
  entry: Entry | null;
}

const STAGE_LABELS: Record<string, string> = {
  adopt: "Adoption Assessment", adapt: "Adaptation Assessment",
  expand: "Expansion Assessment", respond: "Response Assessment",
};
const STAGE_BORDER_COLOR: Record<string, string> = {
  adopt: "border-violet-200", adapt: "border-blue-200",
  expand: "border-emerald-200", respond: "border-orange-200",
};
const STAGE_LABEL_COLOR: Record<string, string> = {
  adopt: "text-violet-700", adapt: "text-blue-700",
  expand: "text-emerald-700", respond: "text-orange-700",
};

function AaerCellPanel({ state, onClose, onSave, onDelete, fw, customQuestions }: {
  state: CellModalState;
  onClose: () => void;
  onSave: (data: Omit<Entry, "id" | "theoryId" | "position">) => void;
  onDelete: () => void;
  fw: FrameworkDef;
  customQuestions?: CustomQuestion[];
}) {
  const raw = state.entry?.stageData ?? "{}";
  const isPilot = isPilotPeriod(state.period);
  const [vals, setVals] = useState({
    frameworkTag: (() => {
      const tag = state.entry?.frameworkTag ?? (isPilot ? "adopt" : "adapt");
      return !isPilot && tag === "adopt" ? "adapt" : tag;
    })(),
    description:    state.entry?.description    ?? "",
    changeObserved: state.entry?.changeObserved ?? "",
    level:          state.entry?.level          ?? "actor",
    status:         state.entry?.status         ?? "plausible",
  });
  const [adoptData,    setAdoptData]    = useState<AdoptData>(parseAdoptData(raw));
  const [adaptData,    setAdaptData]    = useState<AdaptData>(parseAdaptData(raw));
  const [expansionData, setExpansionData] = useState<ExpansionData>(parseExpansionData(raw));
  const [responseData, setResponseData] = useState<ResponseData>(parseResponseData(raw));
  const [customAnswers, setCustomAnswers] = useState<Record<string, { answer?: string; value?: string; notes?: string }>>(() => {
    try {
      const p = JSON.parse(raw || "{}");
      const stageRaw = p[state.actor] ?? {};
      const result: Record<string, { answer?: string; value?: string; notes?: string }> = {};
      for (const cq of (customQuestions ?? [])) result[cq.id] = stageRaw[cq.id] ?? {};
      return result;
    } catch { return {}; }
  });
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));
  const setCustomAns = (id: string, updates: { answer?: string; value?: string; notes?: string }) =>
    setCustomAnswers(p => ({ ...p, [id]: { ...p[id], ...updates } }));

  const handleSave = () => {
    const stageMap: Record<string, any> = {
      adopt: adoptData, adapt: adaptData, expand: expansionData, respond: responseData,
    };
    stageMap[vals.frameworkTag] = { ...stageMap[vals.frameworkTag], ...customAnswers };
    const stageData = JSON.stringify(stageMap);
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
  const hasGuidedPanel = ["adopt","adapt","expand","respond"].includes(vals.frameworkTag);
  const descLabel: Record<string, string> = {
    adopt: "What did they adopt / narrative summary",
    adapt: "How did they adapt the model",
    expand: "How did expansion occur",
    respond: "What systemic response occurred",
  };

  return (
    <div className="rounded-xl border border-border bg-background shadow-lg flex flex-col" style={{ maxHeight: "calc(100vh - 180px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-sm truncate">{state.actor}</span>
          <span className="text-muted-foreground shrink-0">·</span>
          <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${stage?.bg} ${stage?.text} ${stage?.border}`}>
            {state.period}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
        {/* Stage selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">AAER Stage</Label>
            {(() => {
              const adoptEnabled = fw.tagOptions.some(o => o.value === "adopt");
              if (!adoptEnabled) return null;
              return isPilot
                ? <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">Pilot phase — Adopt available</span>
                : <span className="text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">Adopt is pilot-only · tracked in Y1</span>;
            })()}
          </div>
          <div className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(fw.tagOptions.filter(o => isPilot || o.value !== "adopt").length, 4)}, minmax(0,1fr))` }}>
            {fw.tagOptions.filter(o => isPilot || o.value !== "adopt").map(opt => {
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

        {/* Guided assessment panel per stage */}
        {hasGuidedPanel && (
          <div className={`border-t ${STAGE_BORDER_COLOR[vals.frameworkTag]} pt-4`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${STAGE_LABEL_COLOR[vals.frameworkTag]}`}>
              {STAGE_LABELS[vals.frameworkTag]}
            </p>
            {vals.frameworkTag === "adopt"  && <AdoptQuestionsPanel     data={adoptData}     onChange={setAdoptData} />}
            {vals.frameworkTag === "adapt"  && <AdaptQuestionsPanel     data={adaptData}     onChange={setAdaptData} />}
            {vals.frameworkTag === "expand" && <ExpansionQuestionsPanel data={expansionData} onChange={setExpansionData} />}
            {vals.frameworkTag === "respond"&& <ResponseQuestionsPanel  data={responseData}  onChange={setResponseData} />}
          </div>
        )}

        {/* Custom questions */}
        {(customQuestions?.length ?? 0) > 0 && (
          <div className={`border-t ${STAGE_BORDER_COLOR[vals.frameworkTag]} pt-4 space-y-3`}>
            <p className={`text-xs font-bold uppercase tracking-widest ${STAGE_LABEL_COLOR[vals.frameworkTag]}`}>
              Custom Questions
            </p>
            {customQuestions!.map(cq => {
              const ans = customAnswers[cq.id] ?? {};
              return (
                <div key={cq.id} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground block">{cq.label}</Label>
                  {cq.type === "yn" && (
                    <div className="flex gap-1.5 flex-wrap">
                      {(["yes","no","partial","uncertain"] as const).map(v => (
                        <button key={v} onClick={() => setCustomAns(cq.id, { answer: ans.answer === v ? "" : v })}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                            ans.answer === v ? ANSWER_COLORS[v] : "bg-background border-border text-muted-foreground hover:bg-muted"
                          }`}>
                          {ANSWER_LABELS[v]}
                        </button>
                      ))}
                    </div>
                  )}
                  {cq.type === "number" && (
                    <Input type="number" value={ans.value ?? ""} onChange={e => setCustomAns(cq.id, { value: e.target.value })}
                      className="text-sm h-9" placeholder="Enter value…" />
                  )}
                  {cq.type === "notes" && (
                    <Textarea value={ans.value ?? ""} onChange={e => setCustomAns(cq.id, { value: e.target.value })}
                      className="text-sm min-h-[64px]" placeholder="Enter notes…" />
                  )}
                  {cq.type !== "notes" && (
                    <Textarea value={ans.notes ?? ""} onChange={e => setCustomAns(cq.id, { notes: e.target.value })}
                      className="text-sm min-h-[40px]" placeholder="Notes (optional)…" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Common fields */}
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Additional Notes</p>
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
              {descLabel[vals.frameworkTag] ?? "What changed / what they did"}
            </Label>
            <Textarea value={vals.description} onChange={e => set("description", e.target.value)}
              className="text-sm min-h-[64px]"
              placeholder="Describe what this actor did during this period…" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence / Source</Label>
            <Textarea value={vals.changeObserved} onChange={e => set("changeObserved", e.target.value)}
              className="text-sm min-h-[48px]" placeholder="Data, observations, or sources confirming this change…" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        {state.entry && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive mr-auto" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1.5" />{state.entry ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Stage questions summary (for first column) ───────────────────────────────
const STAGE_QUESTIONS_SUMMARY: Record<string, { keyQ: string; questions: string[] }> = {
  adopt: {
    keyQ: "If you left now, would partners return to their previous way of working?",
    questions: [
      "No. of partners who adopted the new business model",
      "Partner(s) contribution to the pilot (%)",
      "Partners satisfied and willing to continue?",
      "Has the pilot resulted in increased revenue/profit?",
      "Is the target group benefitting from the model?",
      "Is there a champion/change agent in the organisation?",
      "Will the organisation continue without the champion?",
    ],
  },
  adapt: {
    keyQ: "If you left now, would partners build upon the changes they've adopted, without us?",
    questions: [
      "Have partners made autonomous changes to the model?",
      "Have partners increased their share of costs/investment?",
      "If yes, what is their increased contribution (%)?",
      "Have partners autonomously expanded to other areas?",
      "If yes, how many new locations have they expanded to?",
    ],
  },
  expand: {
    keyQ: "If you left now, would target group benefits depend on too few?",
    questions: [
      "Have competitors or others crowded in?",
      "If yes, how many have crowded in?",
      "Combined market share of partners and others (%)",
      "Have others started copying the target group behaviour?",
      "Ratio of direct to indirect beneficiaries (e.g. 1:2)",
    ],
  },
  respond: {
    keyQ: "If you left now, would the system be supportive of the changes introduced?",
    questions: [
      "Have there been any changes in policy or business conduct?",
      "Have others from interconnected markets reacted/responded?",
      "If yes, how many have responded?",
      "Has the market been able to withstand and cope with shocks?",
      "Other relevant observations about systemic response",
    ],
  },
};

// ─── Per-stage question type definitions ──────────────────────────────────────
const STAGE_Q_DEFS: Record<string, { id: string; label: string; type: "number" | "percent" | "ynp" | "yn" | "ynu" | "notes"; unit?: string }[]> = {
  adopt: [
    { id: "q1", type: "number",  label: "No. of partners who adopted the model",            unit: "partners" },
    { id: "q2", type: "percent", label: "Partner contribution to pilot",                     unit: "%" },
    { id: "q3", type: "ynp",     label: "Partners satisfied & willing to continue?" },
    { id: "q4", type: "ynp",     label: "Pilot resulted in increased revenue / profit?" },
    { id: "q5", type: "ynp",     label: "Target group benefitting from model?" },
    { id: "q6", type: "yn",      label: "Champion / change agent present in organisation?" },
    { id: "q7", type: "ynu",     label: "Organisation continues without the champion?" },
  ],
  adapt: [
    { id: "q1", type: "ynp",     label: "Partners made autonomous changes to model?" },
    { id: "q2", type: "ynp",     label: "Partners increased cost / investment share?" },
    { id: "q3", type: "percent", label: "Increased partner contribution",                    unit: "%" },
    { id: "q4", type: "ynp",     label: "Partners autonomously expanded to new areas?" },
    { id: "q5", type: "number",  label: "New locations expanded to",                         unit: "locations" },
  ],
  expand: [
    { id: "q1", type: "ynp",     label: "Competitors or others crowded in?" },
    { id: "q2", type: "number",  label: "Number of players crowded in",                      unit: "players" },
    { id: "q3", type: "percent", label: "Combined market share of partners & others",        unit: "%" },
    { id: "q4", type: "ynp",     label: "Others copying target group behaviour?" },
    { id: "q5", type: "notes",   label: "Direct : indirect beneficiary ratio" },
  ],
  respond: [
    { id: "q1", type: "yn",      label: "Changes in policy or business conduct?" },
    { id: "q2", type: "yn",      label: "Others from interconnected markets responded?" },
    { id: "q3", type: "number",  label: "Number who responded",                              unit: "actors" },
    { id: "q4", type: "yn",      label: "Market withstood and coped with shocks?" },
    { id: "q5", type: "notes",   label: "Other systemic observations" },
  ],
};

const ANSWER_COLORS: Record<string, string> = {
  yes:       "bg-emerald-100 text-emerald-800 border-emerald-300",
  no:        "bg-red-100 text-red-800 border-red-300",
  partial:   "bg-amber-100 text-amber-800 border-amber-300",
  uncertain: "bg-amber-100 text-amber-800 border-amber-300",
};
const ANSWER_LABELS: Record<string, string> = {
  yes: "Yes", no: "No", partial: "Partially", uncertain: "Uncertain",
};

// ─── AAER Matrix view ─────────────────────────────────────────────────────────
function AaerMatrix({ entries, periods, fw, onCellClick, theory, selectedCell, periodStageMap, onPeriodStageChange, customQuestions = {}, onCustomQuestionsChange }: {
  selectedCell?: { actor: string; period: string } | null;
  entries: Entry[];
  periods: string[];
  fw: FrameworkDef;
  onCellClick: (actor: string, period: string, entry: Entry | null) => void;
  theory: any;
  periodStageMap: Record<string, string>;
  onPeriodStageChange: (period: string, stage: string | null) => void;
  customQuestions: Record<string, CustomQuestion[]>;
  onCustomQuestionsChange: (stage: string, questions: CustomQuestion[]) => void;
}) {
  /** Returns the stage locked to a period (pilot→adopt, mapped→that stage, else null=any) */
  const stageForPeriod = (p: string): string | null =>
    isPilotPeriod(p) ? "adopt" : (periodStageMap[p] ?? null);

  const [addingStage, setAddingStage] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<"yn" | "number" | "notes">("yn");

  const saveNewQuestion = (stage: string) => {
    if (!newLabel.trim()) return;
    const id = `cq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onCustomQuestionsChange(stage, [...(customQuestions[stage] ?? []), { id, label: newLabel.trim(), type: newType }]);
    setAddingStage(null);
    setNewLabel("");
  };
  // Index entries by frameworkTag::period
  const index: Record<string, Entry> = {};
  entries.forEach(e => {
    if (e.frameworkTag && e.periodLabel) index[`${e.frameworkTag}::${e.periodLabel}`] = e;
  });

  if (periods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/50 p-10 text-center">
        <Settings className="w-8 h-8 text-violet-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-violet-700">Configure the intervention timeline above</p>
        <p className="text-xs text-violet-500 mt-1">Set start year, end year, and granularity to generate your tracking matrix.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ minWidth: `${Math.max(540, 240 + periods.length * 120)}px` }}>
          <thead>
            <tr className="bg-muted/70 border-b-2 border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/70 z-10 w-60 min-w-[240px]">
                Question
              </th>
              {periods.map(p => (
                <th key={p} className={`px-3 py-3 text-center text-[11px] font-bold min-w-[110px] ${isPilotPeriod(p) ? "text-amber-700 bg-amber-50/60" : "text-muted-foreground"}`}>
                  {p}
                  {isPilotPeriod(p) && (
                    <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5 opacity-80">Pilot</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fw.tagOptions.map((stageOpt) => {
              const sc = AAER_STAGE_COLORS[stageOpt.value];
              const qDefs = STAGE_Q_DEFS[stageOpt.value] ?? [];
              const summary = STAGE_QUESTIONS_SUMMARY[stageOpt.value];
              const periodEntries = periods.map(p => index[`${stageOpt.value}::${p}`] ?? null);

              // Parse each period's stageData once
              const parsedData = periodEntries.map(e => {
                if (!e?.stageData) return null;
                switch (stageOpt.value) {
                  case "adopt":   return parseAdoptData(e.stageData);
                  case "adapt":   return parseAdaptData(e.stageData);
                  case "expand":  return parseExpansionData(e.stageData);
                  case "respond": return parseResponseData(e.stageData);
                  default: return null;
                }
              });

              return (
                <Fragment key={stageOpt.value}>
                  {/* ── Stage header row ── */}
                  <tr className={`border-t-2 ${sc.border} ${sc.bg}`}>
                    <td colSpan={periods.length + 1} className={`px-4 py-2.5`}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-black ${sc.bg} ${sc.text} ${sc.border}`}>
                          {stageOpt.label}
                        </span>
                        <span className={`text-[11px] font-semibold italic ${sc.text} opacity-80 leading-snug`}>
                          {summary?.keyQ}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* ── Per-question rows ── */}
                  {qDefs.map((qDef, qi) => (
                    <tr key={qDef.id} className={`border-b border-border/20 ${qi % 2 === 0 ? "bg-white" : "bg-muted/10"} hover:bg-violet-50/20 transition-colors`}>
                      {/* Question label */}
                      <td className="px-4 py-2.5 sticky left-0 z-10 border-r border-border/20 align-top"
                        style={{ background: qi % 2 === 0 ? "white" : "rgb(249 250 251 / 0.8)" }}>
                        <div className="flex gap-2 items-start">
                          <span className={`text-[10px] font-black shrink-0 mt-0.5 ${sc.text} opacity-50`}>{qi + 1}.</span>
                          <span className="text-[11px] text-foreground leading-snug">{qDef.label}</span>
                        </div>
                      </td>

                      {/* Answer per period */}
                      {periods.map((period, pi) => {
                        const locked = stageForPeriod(period);
                        const isBlocked = locked !== null && locked !== stageOpt.value;
                        if (isBlocked) return (
                          <td key={period} className={`px-2 py-1 align-top ${qi % 2 === 0 ? "bg-muted/5" : "bg-muted/10"}`}>
                            <div className="min-h-[36px] flex items-center justify-center opacity-15">
                              <span className="text-xs text-muted-foreground">—</span>
                            </div>
                          </td>
                        );
                        const d = parsedData[pi] as any;
                        const qData = d?.[qDef.id] ?? null;
                        const entry = periodEntries[pi];
                        const isSelected = selectedCell?.actor === stageOpt.value && selectedCell?.period === period;

                        let mainDisplay: React.ReactNode = null;
                        if (qData) {
                          if (qDef.type === "number" || qDef.type === "percent") {
                            if (qData.value) {
                              mainDisplay = (
                                <span className="font-bold text-sm text-foreground">
                                  {qData.value}{qDef.unit === "%" ? "%" : ""}
                                  {qDef.unit && qDef.unit !== "%" && (
                                    <span className="text-[9px] font-normal text-muted-foreground ml-0.5">{qDef.unit}</span>
                                  )}
                                </span>
                              );
                            }
                          } else if (qDef.type !== "notes" && qData.answer) {
                            const col = ANSWER_COLORS[qData.answer] ?? "bg-muted text-muted-foreground border-border";
                            mainDisplay = (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${col}`}>
                                {ANSWER_LABELS[qData.answer] ?? qData.answer}
                              </span>
                            );
                          }
                        }

                        const hasContent = mainDisplay || qData?.notes || qData?.value;

                        return (
                          <td key={period} className="px-2 py-2 align-top">
                            <button onClick={() => onCellClick(stageOpt.value, period, entry ?? null)}
                              className={`w-full min-h-[36px] rounded-md px-2 py-1.5 text-left transition-all hover:ring-1 hover:ring-violet-300 hover:bg-violet-50/40 ${
                                isSelected ? `ring-2 ring-offset-1 ${sc.border.replace("border-", "ring-")} ${sc.bg}` : ""
                              }`}>
                              {hasContent ? (
                                <div className="flex flex-col gap-1">
                                  {mainDisplay}
                                  {qData?.notes && (
                                    <p className="text-[10px] text-muted-foreground italic leading-snug">{qData.notes}</p>
                                  )}
                                  {qDef.type === "notes" && qData?.value && (
                                    <p className="text-[11px] text-foreground leading-snug">{qData.value}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-5">
                                  <span className="text-muted-foreground/25 text-xs">—</span>
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* ── Custom question rows ── */}
                  {(customQuestions[stageOpt.value] ?? []).map((cq, cqi) => {
                    const qi = qDefs.length + cqi;
                    return (
                      <tr key={cq.id} className={`group border-b border-border/20 ${qi % 2 === 0 ? "bg-white" : "bg-muted/10"} hover:bg-violet-50/20 transition-colors`}>
                        <td className="px-4 py-2.5 sticky left-0 z-10 border-r border-border/20 align-top"
                          style={{ background: qi % 2 === 0 ? "white" : "rgb(249 250 251 / 0.8)" }}>
                          <div className="flex gap-2 items-start justify-between">
                            <div className="flex gap-2 items-start min-w-0">
                              <span className={`text-[10px] font-black shrink-0 mt-0.5 ${sc.text} opacity-50`}>{qi + 1}.</span>
                              <span className="text-[11px] text-foreground leading-snug">{cq.label}</span>
                            </div>
                            <button
                              onClick={() => onCustomQuestionsChange(stageOpt.value, (customQuestions[stageOpt.value] ?? []).filter(q => q.id !== cq.id))}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {periods.map((period, pi) => {
                          const locked = stageForPeriod(period);
                          const isBlocked = locked !== null && locked !== stageOpt.value;
                          if (isBlocked) return (
                            <td key={period} className={`px-2 py-1 align-top ${qi % 2 === 0 ? "bg-muted/5" : "bg-muted/10"}`}>
                              <div className="min-h-[36px] flex items-center justify-center opacity-15">
                                <span className="text-xs text-muted-foreground">—</span>
                              </div>
                            </td>
                          );
                          const d = parsedData[pi] as any;
                          const qData = d?.[cq.id] ?? null;
                          const entry = periodEntries[pi];
                          const isSelected = selectedCell?.actor === stageOpt.value && selectedCell?.period === period;
                          let mainDisplay: React.ReactNode = null;
                          if (qData) {
                            if (cq.type === "number" && qData.value) {
                              mainDisplay = <span className="font-bold text-sm text-foreground">{qData.value}</span>;
                            } else if (cq.type === "yn" && qData.answer) {
                              const col = ANSWER_COLORS[qData.answer] ?? "bg-muted text-muted-foreground border-border";
                              mainDisplay = <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${col}`}>{ANSWER_LABELS[qData.answer] ?? qData.answer}</span>;
                            }
                          }
                          const hasContent = mainDisplay || qData?.notes || qData?.value;
                          return (
                            <td key={period} className="px-2 py-2 align-top">
                              <button onClick={() => onCellClick(stageOpt.value, period, entry ?? null)}
                                className={`w-full min-h-[36px] rounded-md px-2 py-1.5 text-left transition-all hover:ring-1 hover:ring-violet-300 hover:bg-violet-50/40 ${
                                  isSelected ? `ring-2 ring-offset-1 ${sc.border.replace("border-", "ring-")} ${sc.bg}` : ""
                                }`}>
                                {hasContent ? (
                                  <div className="flex flex-col gap-1">
                                    {mainDisplay}
                                    {qData?.notes && <p className="text-[10px] text-muted-foreground italic leading-snug">{qData.notes}</p>}
                                    {cq.type === "notes" && qData?.value && <p className="text-[11px] text-foreground leading-snug">{qData.value}</p>}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-5">
                                    <span className="text-muted-foreground/25 text-xs">—</span>
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* ── Add question row ── */}
                  {addingStage === stageOpt.value ? (
                    <tr className="border-b border-border/20 bg-violet-50/30">
                      <td colSpan={periods.length + 1} className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            autoFocus
                            type="text"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="Question label…"
                            className="flex-1 min-w-[200px] text-sm rounded border border-border px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-background"
                            onKeyDown={e => {
                              if (e.key === "Enter") saveNewQuestion(stageOpt.value);
                              if (e.key === "Escape") { setAddingStage(null); setNewLabel(""); }
                            }}
                          />
                          <select value={newType} onChange={e => setNewType(e.target.value as any)}
                            className="text-sm rounded border border-border px-2 py-1.5 bg-background focus:outline-none">
                            <option value="yn">Yes / No</option>
                            <option value="number">Number</option>
                            <option value="notes">Notes</option>
                          </select>
                          <button onClick={() => saveNewQuestion(stageOpt.value)}
                            className={`text-sm font-semibold ${sc.text} px-3 py-1.5 rounded border ${sc.border} ${sc.bg} hover:opacity-80 transition-opacity`}>
                            Add
                          </button>
                          <button onClick={() => { setAddingStage(null); setNewLabel(""); }}
                            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1.5">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-border/10 bg-muted/5">
                      <td colSpan={periods.length + 1} className="px-4 py-2">
                        <button
                          onClick={() => { setAddingStage(stageOpt.value); setNewLabel(""); setNewType("yn"); }}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold ${sc.text} opacity-50 hover:opacity-100 transition-opacity`}
                        >
                          <Plus className="w-3 h-3" />
                          Add question
                        </button>
                      </td>
                    </tr>
                  )}

                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────
const STAGE_AI_CONFIG: Record<string, {
  label: string; stroke: string; trackStroke: string; bg: string; text: string;
  border: string; badgeBg: string; headingColor: string;
}> = {
  adopt: {
    label: "Adopt", stroke: "#7c3aed", trackStroke: "#ede9fe",
    bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200",
    badgeBg: "bg-violet-100", headingColor: "text-violet-700",
  },
  adapt: {
    label: "Adapt", stroke: "#1d4ed8", trackStroke: "#dbeafe",
    bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200",
    badgeBg: "bg-blue-100", headingColor: "text-blue-700",
  },
  expand: {
    label: "Expand", stroke: "#059669", trackStroke: "#d1fae5",
    bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200",
    badgeBg: "bg-emerald-100", headingColor: "text-emerald-700",
  },
  respond: {
    label: "Respond", stroke: "#c2410c", trackStroke: "#ffedd5",
    bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200",
    badgeBg: "bg-orange-100", headingColor: "text-orange-700",
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  strong:   { label: "Strong",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  moderate: { label: "Moderate", color: "bg-amber-100 text-amber-800 border-amber-300" },
  emerging: { label: "Emerging", color: "bg-blue-100 text-blue-800 border-blue-300" },
  nascent:  { label: "Nascent",  color: "bg-slate-100 text-slate-600 border-slate-300" },
  "no-data":{ label: "No data",  color: "bg-muted text-muted-foreground border-border" },
};

function StageRing({ score, stageKey, size = 96 }: { score: number; stageKey: string; size?: number }) {
  const cfg = STAGE_AI_CONFIG[stageKey];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.trackStroke} strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.stroke} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function PathwayDiagram({ analysis }: { analysis: SystemicChangeAnalysis }) {
  const stages = ["adopt", "adapt", "expand", "respond"] as const;
  const stageData: Record<string, StageAnalysis> = {
    adopt: analysis.adopt, adapt: analysis.adapt,
    expand: analysis.expand, respond: analysis.respond,
  };
  const totalScore = analysis.overallScore;

  return (
    <div className="space-y-4">
      {/* Overall score bar */}
      <div className="flex items-center gap-4 bg-muted/30 rounded-xl border border-border p-4">
        <div className="shrink-0 text-center w-20">
          <div className="text-3xl font-black text-foreground">{totalScore}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-foreground">Pathway to Sustainable Change</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              totalScore >= 76 ? STATUS_LABELS.strong.color :
              totalScore >= 51 ? STATUS_LABELS.moderate.color :
              totalScore >= 26 ? STATUS_LABELS.emerging.color :
              totalScore > 0  ? STATUS_LABELS.nascent.color :
              STATUS_LABELS["no-data"].color
            }`}>
              {totalScore >= 76 ? "Strong" : totalScore >= 51 ? "Moderate" : totalScore >= 26 ? "Emerging" : totalScore > 0 ? "Nascent" : "No data"}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${totalScore}%`,
                background: "linear-gradient(to right, #7c3aed, #1d4ed8, #059669, #c2410c)",
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug italic">{analysis.pathwayNarrative}</p>
        </div>
      </div>

      {/* 4-stage node diagram */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute top-[52px] left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-gradient-to-r from-violet-300 via-blue-300 via-emerald-300 to-orange-300 z-0" />
        <div className="grid grid-cols-4 gap-3 relative z-10">
          {stages.map((stage, i) => {
            const cfg = STAGE_AI_CONFIG[stage];
            const sd = stageData[stage];
            const statusCfg = STATUS_LABELS[sd.status] ?? STATUS_LABELS["no-data"];
            return (
              <div key={stage} className="flex flex-col items-center gap-2">
                {/* Ring + score */}
                <div className="relative">
                  <StageRing score={sd.score} stageKey={stage} size={104} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-black ${cfg.text}`}>{sd.score}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">/ 100</span>
                  </div>
                </div>
                {/* Stage label */}
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.badgeBg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>
                {/* Status badge */}
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                  {statusCfg.label}
                </span>
                {/* Arrow between stages */}
                {i < stages.length - 1 && (
                  <div className="hidden" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage headlines grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stages.map(stage => {
          const cfg = STAGE_AI_CONFIG[stage];
          const sd = stageData[stage];
          return (
            <div key={stage} className={`rounded-lg border p-2.5 ${cfg.bg} ${cfg.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${cfg.headingColor}`}>{cfg.label}</p>
              <p className="text-[11px] text-foreground/80 leading-snug">{sd.headline}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageAnalysisCard({ stageKey, data }: { stageKey: string; data: StageAnalysis }) {
  const cfg = STAGE_AI_CONFIG[stageKey];
  const statusCfg = STATUS_LABELS[data.status] ?? STATUS_LABELS["no-data"];
  const [expanded, setExpanded] = useState(false);
  const hasContent = data.findings.length > 0 || data.recommendations.length > 0;
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${cfg.border}`}>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${cfg.bg} hover:brightness-95 transition-all`}
        onClick={() => setExpanded(p => !p)}
        disabled={!hasContent}
      >
        <div className="shrink-0">
          <StageRing score={data.score} stageKey={stageKey} size={52} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="text-[11px] text-foreground/75 leading-snug line-clamp-2">{data.headline}</p>
        </div>
        {hasContent && (
          expanded ? <ChevronUp className={`w-4 h-4 shrink-0 ${cfg.text}`} /> : <ChevronDown className={`w-4 h-4 shrink-0 ${cfg.text}`} />
        )}
      </button>

      {expanded && hasContent && (
        <div className="px-4 py-3 bg-white/60 border-t border-border/40 space-y-3">
          {data.findings.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Key Findings</p>
              <ul className="space-y-1">
                {data.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <span className={`shrink-0 font-black mt-0.5 ${cfg.headingColor}`}>·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.recommendations.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-relaxed">
                    <TrendingUp className={`w-3 h-3 shrink-0 mt-0.5 ${cfg.headingColor}`} />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SystemicChangeAIAnalysis({ theoryId, hasEntries }: { theoryId: number; hasEntries: boolean }) {
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<SystemicChangeAnalysis | null>(null);
  const mutation = useAnalyzeSystemicChange();

  const generate = async () => {
    try {
      const result = await mutation.mutateAsync({ theoryId });
      setAnalysis(result as SystemicChangeAnalysis);
    } catch (err) {
      toast({ title: "Analysis failed", description: String(err), variant: "destructive" });
    }
  };

  const stages = ["adopt", "adapt", "expand", "respond"] as const;

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-background to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-violet-200 bg-white/60">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">AI Progress Analysis</h3>
          <p className="text-xs text-muted-foreground">AI-powered assessment of your progress towards sustainable systemic change</p>
        </div>
        <Button
          size="sm"
          onClick={generate}
          disabled={mutation.isPending || !hasEntries}
          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1.5"
        >
          {mutation.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analysing…</>
            : <><Sparkles className="w-3.5 h-3.5" />{analysis ? "Regenerate" : "Generate Analysis"}</>
          }
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-5">
        {!hasEntries && !analysis && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No entries yet</p>
            <p className="text-xs text-muted-foreground/70">Add AAER entries to the matrix above, then generate an AI analysis.</p>
          </div>
        )}

        {hasEntries && !analysis && !mutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ready to analyse</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Click "Generate Analysis" to have AI study your AAER data and produce a visual pathway diagram with per-stage findings and recommendations.
              </p>
            </div>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm font-semibold text-foreground">Analysing your progress…</p>
            <p className="text-xs text-muted-foreground">Studying AAER evidence across all stages and periods</p>
          </div>
        )}

        {analysis && !mutation.isPending && (
          <>
            {/* Pathway diagram */}
            <PathwayDiagram analysis={analysis} />

            {/* Overall assessment */}
            <div className="rounded-xl border border-border bg-white/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Overall Assessment</p>
              <p className="text-sm text-foreground leading-relaxed">{analysis.overallAssessment}</p>
            </div>

            {/* Per-stage cards */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Stage-by-Stage Analysis</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stages.map(stage => (
                  <StageAnalysisCard key={stage} stageKey={stage} data={(analysis as unknown as Record<string, StageAnalysis>)[stage]} />
                ))}
              </div>
            </div>

            {/* Priority actions */}
            {analysis.nextPriorityActions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">Next Priority Actions</p>
                <ul className="space-y-1.5">
                  {analysis.nextPriorityActions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-amber-900 leading-relaxed">
                      <span className="shrink-0 font-black text-amber-600">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
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
  const [localSettings, setLocalSettings] = useState<AaerSettings>({ startYear: 0, endYear: 0, granularity: "annual", pilotDuration: "none", enabledStages: ["adopt","adapt","expand","respond"], periodStageMap: {}, customQuestions: {} });
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
        startYear:      t.interventionStartYear ?? 0,
        endYear:        t.interventionEndYear   ?? 0,
        granularity:    (t.periodGranularity as Granularity) ?? "annual",
        pilotDuration:  (t.pilotDuration as PilotDuration)  ?? "none",
        enabledStages:  t.enabledStages ? String(t.enabledStages).split(",").filter(Boolean) : ["adopt","adapt","expand","respond"],
        periodStageMap: (() => { try { return JSON.parse(String(t.periodStageMap ?? "{}")); } catch { return {}; } })(),
        customQuestions: (() => { try { return JSON.parse(String((t as any).customQuestions ?? "{}")); } catch { return {}; } })(),
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
        pilotDuration: s.pilotDuration,
        enabledStages: s.enabledStages.join(","),
        periodStageMap: JSON.stringify(s.periodStageMap),
        customQuestions: JSON.stringify(s.customQuestions),
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

  // Filter fw.tagOptions to only the stages the user has enabled
  const effectiveFw = fw ? {
    ...fw,
    tagOptions: fw.tagOptions.filter(o => localSettings.enabledStages.includes(o.value)),
  } : null;

  const periods = localSettings.startYear && localSettings.endYear
    ? [
        ...generatePilotPeriods(localSettings.pilotDuration, localSettings.granularity),
        ...generatePeriods(localSettings.startYear, localSettings.endYear, localSettings.granularity),
      ]
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

        {/* AAER: Settings + Matrix + Side Panel */}
        {isAaer && (
          <>
            <AaerSettingsPanel settings={localSettings} onSave={saveSettings} />
            <div className={cellModal ? "flex gap-4 items-start" : ""}>
              <div className={cellModal ? "flex-1 min-w-0 overflow-x-auto" : ""}>
                <AaerMatrix
                  entries={entries}
                  periods={periods}
                  fw={effectiveFw!}
                  theory={theory}
                  selectedCell={cellModal}
                  onCellClick={(actor, period, entry) => setCellModal({ actor, period, entry })}
                  periodStageMap={localSettings.periodStageMap}
                  onPeriodStageChange={(period, stage) => {
                    const next = { ...localSettings.periodStageMap };
                    if (stage) next[period] = stage; else delete next[period];
                    setLocalSettings(s => ({ ...s, periodStageMap: next }));
                    updateTheory.mutate({ id, data: { periodStageMap: JSON.stringify(next) } as any });
                  }}
                  customQuestions={localSettings.customQuestions}
                  onCustomQuestionsChange={(stage, questions) => {
                    const next = { ...localSettings.customQuestions, [stage]: questions };
                    setLocalSettings(s => ({ ...s, customQuestions: next }));
                    updateTheory.mutate({ id, data: { customQuestions: JSON.stringify(next) } as any });
                  }}
                />
              </div>
              {cellModal && effectiveFw && (
                <div className="w-[380px] shrink-0 sticky top-4">
                  <AaerCellPanel
                    state={cellModal}
                    fw={effectiveFw}
                    onClose={() => setCellModal(null)}
                    onSave={handleCellSave}
                    onDelete={() => { cellModal.entry && handleDelete(cellModal.entry.id); setCellModal(null); }}
                    customQuestions={localSettings.customQuestions[cellModal.actor] ?? []}
                  />
                </div>
              )}
            </div>
            <SystemicChangeAIAnalysis theoryId={id} hasEntries={entries.length > 0} />
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

    </div>
  );
}
