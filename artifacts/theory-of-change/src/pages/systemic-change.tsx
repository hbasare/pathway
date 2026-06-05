import { useState, useEffect, useRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { getPermissions } from "@/lib/permissions";
import { useGetTheory, useUpdateTheory, getGetTheoryQueryKey, useAnalyzeSystemicChange } from "@workspace/api-client-react";
import type { SystemicChangeAnalysis, StageAnalysis } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Pencil, Check, X, Loader2, GitBranch,
  ChevronRight, RefreshCw, Info, Settings, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, TrendingUp, ListChecks, Users, BookOpen,
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
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from "recharts";
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
  const { t } = useTranslation();
  const label = opt ? t(`systemicChange.frameworks.${fw.key}.tags.${opt.value}`, { defaultValue: opt.label }) : value;
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colors[value] ?? "bg-muted text-muted-foreground border-border"}`}>
      {label}
    </span>
  );
}

function StatusBadge({ value, fw }: { value: string; fw: FrameworkDef }) {
  const { t } = useTranslation();
  const opt = fw.statusOptions.find(o => o.value === value);
  const label = opt ? t(`systemicChange.frameworks.${fw.key}.status.${opt.value}`, { defaultValue: opt.label }) : value;
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${opt?.color ?? "bg-muted text-muted-foreground border-border"}`}>
      {label}
    </span>
  );
}

// ─── Generic table entry row ──────────────────────────────────────────────────
function EntryRow({ entry, rowNum, fw, onEdit, onDelete }: {
  entry: Entry; rowNum: number; fw: FrameworkDef;
  onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const rawLevel = fw.levelOptions.find(l => l.value === entry.level);
  const levelLabel = rawLevel ? t(`systemicChange.frameworks.${fw.key}.levels.${rawLevel.value}`, { defaultValue: rawLevel.label }) : entry.level;
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
  const { t } = useTranslation();
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
                    <span className="font-medium">{t(`systemicChange.frameworks.${fw.key}.tags.${o.value}`, { defaultValue: o.label })}</span>
                    {o.desc && <span className="ml-1 text-xs text-muted-foreground">— {o.desc}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : col.isStatus ? (
            <Select value={vals.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{t(`systemicChange.frameworks.${fw.key}.status.${o.value}`, { defaultValue: o.label })}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : col.isLevel ? (
            <Select value={vals.level} onValueChange={v => set("level", v)}>
              <SelectTrigger className="text-sm h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {fw.levelOptions.map(o => <SelectItem key={o.value} value={o.value}>{t(`systemicChange.frameworks.${fw.key}.levels.${o.value}`, { defaultValue: o.label })}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : col.textarea ? (
            <Textarea value={vals[col.key as string]} onChange={e => set(col.key as string, e.target.value)}
              className="text-sm min-h-[64px]" placeholder={t(`systemicChange.frameworks.${fw.key}.cols.${col.key}`, { defaultValue: col.header }) + "…"} />
          ) : (
            <input value={vals[col.key as string]} onChange={e => set(col.key as string, e.target.value)}
              className="w-full text-sm h-8 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t(`systemicChange.frameworks.${fw.key}.cols.${col.key}`, { defaultValue: col.header }) + "…"} />
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
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <GitBranch className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t("systemicChange.frameworks.chooseTitle")}</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t("systemicChange.frameworks.chooseSub")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FRAMEWORKS.map(fw => (
          <button key={fw.key} onClick={() => onSelect(fw.key)}
            className={`text-left rounded-xl border-2 p-5 transition-all hover:shadow-md hover:scale-[1.01] active:scale-100 group ${fw.color}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className={`inline-block text-xs font-bold uppercase tracking-widest text-white px-2.5 py-1 rounded-full mb-2 ${fw.accent}`}>{fw.abbr}</span>
                <h3 className="text-sm font-bold leading-snug">{t(`systemicChange.frameworks.${fw.key}.label`)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("systemicChange.frameworks.byOrg")} {fw.org}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-foreground transition-colors" />
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed mb-3">{t(`systemicChange.frameworks.${fw.key}.description`)}</p>
            <div className="rounded-lg bg-white/60 border border-white/80 px-3 py-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{t("systemicChange.frameworks.bestFor")} </span>{t(`systemicChange.frameworks.${fw.key}.useCase`)}
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
interface AaerSettings { startYear: number; endYear: number; granularity: Granularity; pilotDuration: PilotDuration; enabledStages: string[]; periodStageMap: Record<string, string>; customQuestions: Record<string, CustomQuestion[]>; pilotPeriods: string[] }

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
  const { t } = useTranslation();
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
          <span className="text-sm font-semibold text-violet-900">{t("systemicChange.timeline.title")}</span>
          {settings.startYear && settings.endYear ? (
            <span className="ml-3 text-xs text-violet-600">
              {settings.startYear}–{settings.endYear} · {settings.granularity} · {generatePeriods(settings.startYear, settings.endYear, settings.granularity).length} {t("systemicChange.timeline.trackingPeriods")}
              {settings.pilotDuration !== "none" && (
                <span className="ml-1 text-amber-600 font-semibold">· {t("systemicChange.timeline.pilotIndicator")}: {pilotLabel}</span>
              )}
            </span>
          ) : (
            <span className="ml-3 text-xs text-violet-500 italic">{t("systemicChange.timeline.notConfigured")}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
      </button>

      {open && (
        <div className="border-t border-violet-200 px-5 py-4 bg-white/70 space-y-4">
          {/* Enabled AAER Phases */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">{t("systemicChange.timeline.enabledPhases")}</Label>
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
                    title={isLast ? t("systemicChange.timeline.atLeastOneHint") : undefined}
                    className={`rounded-lg border-2 px-3 py-2 text-center transition-all relative ${
                      isOn
                        ? `${s.bg} ${s.border} ${s.text} shadow-sm`
                        : "border-border bg-background text-muted-foreground/50 opacity-60"
                    } ${isLast ? "cursor-not-allowed" : "hover:opacity-90"}`}>
                    <div className="text-xs font-bold capitalize">{stage}</div>
                    <div className="text-[10px] mt-0.5 opacity-70 leading-tight">{isOn ? t("systemicChange.timeline.included") : t("systemicChange.timeline.excluded")}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5">{t("systemicChange.timeline.atLeastOneHint")}</p>
          </div>

          {/* Pilot periods */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{t("systemicChange.timeline.pilotPhase")}</Label>
            <p className="text-[11px] text-muted-foreground/70 mb-2">{t("systemicChange.timeline.pilotHint")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PILOT_DURATION_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setLocal(p => ({
                  ...p,
                  pilotDuration: opt.value,
                  pilotPeriods: opt.value === "none" ? [] : generatePilotPeriods(opt.value, p.granularity),
                }))}
                  className={`rounded-lg border-2 px-3 py-2 text-center transition-all ${
                    local.pilotDuration === opt.value
                      ? "bg-amber-100 border-amber-400 text-amber-900"
                      : "border-border bg-background hover:bg-muted text-muted-foreground"
                  }`}>
                  <div className="text-xs font-bold">{t(`systemicChange.pilotDuration.${opt.value}.label`, { defaultValue: opt.label })}</div>
                  <div className="text-[10px] mt-0.5 opacity-70 leading-tight">{t(`systemicChange.pilotDuration.${opt.value}.desc`, { defaultValue: opt.desc })}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start / End / Granularity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{t("systemicChange.timeline.startYear")}</Label>
              <Select value={String(local.startYear || "")} onValueChange={v => setLocal(p => ({ ...p, startYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder={t("systemicChange.timeline.selectYear")} /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{t("systemicChange.timeline.endYear")}</Label>
              <Select value={String(local.endYear || "")} onValueChange={v => setLocal(p => ({ ...p, endYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder={t("systemicChange.timeline.selectYear")} /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{t("systemicChange.timeline.granularity")}</Label>
              <Select value={local.granularity} onValueChange={v => setLocal(p => ({ ...p, granularity: v as Granularity }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{t("systemicChange.timeline.annual")}</SelectItem>
                  <SelectItem value="biannual">{t("systemicChange.timeline.biannual")}</SelectItem>
                  <SelectItem value="quarterly">{t("systemicChange.timeline.quarterly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Period preview — clickable toggles */}
          {allPeriods.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                {t("systemicChange.timeline.fullTimeline")} ({allPeriods.length} {t("systemicChange.timeline.periods")}
                {local.pilotPeriods.length > 0 && `, ${local.pilotPeriods.length} ${t("systemicChange.timeline.pilotPeriods")}`}) — {t("systemicChange.timeline.clickToToggle")}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allPeriods.map(p => {
                  const isP = local.pilotPeriods.includes(p);
                  return (
                    <button key={p}
                      onClick={() => setLocal(prev => ({
                        ...prev,
                        pilotPeriods: isP
                          ? prev.pilotPeriods.filter(x => x !== p)
                          : [...prev.pilotPeriods, p],
                        pilotDuration: "none", // custom selection overrides preset
                      }))}
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium border inline-flex items-center gap-1 transition-all cursor-pointer select-none ${
                        isP
                          ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                          : "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200"
                      }`}>
                      {p}
                      {isP && <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">· {t("systemicChange.timeline.pilotIndicator")}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleSave}
            disabled={!local.startYear || !local.endYear || local.endYear < local.startYear}>
            <Check className="w-3.5 h-3.5 mr-1.5" />{t("systemicChange.timeline.applyTimeline")}
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

function AaerCellPanel({ state, onClose, onSave, onDelete, fw, customQuestions, pilotPeriods = [] }: {
  state: CellModalState;
  onClose: () => void;
  onSave: (data: Omit<Entry, "id" | "theoryId" | "position">) => void;
  onDelete: () => void;
  fw: FrameworkDef;
  customQuestions?: CustomQuestion[];
  pilotPeriods?: string[];
}) {
  const { t: tCommon } = useTranslation();
  const raw = state.entry?.stageData ?? "{}";
  const isPilot = pilotPeriods.includes(state.period);
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
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{tCommon("systemicChange.entry.additionalNotes")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{tCommon("systemicChange.entry.scaleReach")}</Label>
              <Select value={vals.level} onValueChange={v => set("level", v)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fw.levelOptions.map(o => <SelectItem key={o.value} value={o.value}>{tCommon(`systemicChange.frameworks.${fw.key}.levels.${o.value}`, { defaultValue: o.label })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{tCommon("systemicChange.entry.confidence")}</Label>
              <Select value={vals.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fw.statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{tCommon(`systemicChange.frameworks.${fw.key}.status.${o.value}`, { defaultValue: o.label })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Partner name reminder */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-amber-500 text-sm shrink-0 mt-0.5">💡</span>
            <p className="text-[11px] text-amber-800 leading-snug">
              <span className="font-semibold">{tCommon("systemicChange.entry.nameYourPartners")}</span> — {vals.frameworkTag === "respond"
                ? tCommon("systemicChange.entry.nameYourPartnersHintRespond")
                : tCommon("systemicChange.entry.nameYourPartnersHint")}
            </p>
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
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{tCommon("systemicChange.entry.evidenceSource")}</Label>
            <Textarea value={vals.changeObserved} onChange={e => set("changeObserved", e.target.value)}
              className="text-sm min-h-[48px]" placeholder="Data, observations, or sources confirming this change…" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        {state.entry && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive mr-auto" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />{tCommon("common.delete")}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>{tCommon("common.cancel")}</Button>
        <Button size="sm" onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1.5" />{state.entry ? tCommon("systemicChange.update") : tCommon("common.save")}
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
function AaerMatrix({ entries, periods, fw, onCellClick, theory, selectedCell, periodStageMap, onPeriodStageChange, customQuestions = {}, onCustomQuestionsChange, pilotPeriods = [] }: {
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
  pilotPeriods?: string[];
}) {
  const isPilot = (p: string) => pilotPeriods.includes(p);
  /** Returns the stage locked to a period (pilot→adopt, mapped→that stage, else null=any) */
  const stageForPeriod = (p: string): string | null =>
    isPilot(p) ? "adopt" : (periodStageMap[p] ?? null);

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
                <th key={p} className={`px-3 py-3 text-center text-[11px] font-bold min-w-[110px] ${isPilot(p) ? "text-amber-700 bg-amber-50/60" : "text-muted-foreground"}`}>
                  {p}
                  {isPilot(p) && (
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
  border: string; accentBorder: string; badgeBg: string; headingColor: string;
}> = {
  adopt: {
    label: "Adopt", stroke: "#7c3aed", trackStroke: "#ede9fe",
    bg: "bg-white", text: "text-violet-700", border: "border-border",
    accentBorder: "border-l-violet-400",
    badgeBg: "bg-violet-50", headingColor: "text-violet-600",
  },
  adapt: {
    label: "Adapt", stroke: "#1d4ed8", trackStroke: "#dbeafe",
    bg: "bg-white", text: "text-blue-700", border: "border-border",
    accentBorder: "border-l-blue-400",
    badgeBg: "bg-blue-50", headingColor: "text-blue-600",
  },
  expand: {
    label: "Expand", stroke: "#059669", trackStroke: "#d1fae5",
    bg: "bg-white", text: "text-emerald-700", border: "border-border",
    accentBorder: "border-l-emerald-400",
    badgeBg: "bg-emerald-50", headingColor: "text-emerald-600",
  },
  respond: {
    label: "Respond", stroke: "#c2410c", trackStroke: "#ffedd5",
    bg: "bg-white", text: "text-orange-700", border: "border-border",
    accentBorder: "border-l-orange-400",
    badgeBg: "bg-orange-50", headingColor: "text-orange-600",
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

// DCED quadrant colours — matching the AAER table stage palette (pastel tints)
const DCED_QUAD: Record<string, { bg: string; text: string; subText: string; label: string }> = {
  adopt:   { bg: "#ede9fe", text: "#5b21b6", subText: "#6d28d9", label: "Adopt" },
  adapt:   { bg: "#dbeafe", text: "#1e40af", subText: "#1d4ed8", label: "Adapt" },
  expand:  { bg: "#d1fae5", text: "#065f46", subText: "#059669", label: "Expand" },
  respond: { bg: "#ffedd5", text: "#9a3412", subText: "#c2410c", label: "Respond" },
};

function PathwayDiagram({ analysis }: { analysis: SystemicChangeAnalysis }) {
  const { t } = useTranslation();
  const stageDataMap: Record<string, StageAnalysis> = {
    adopt: analysis.adopt, adapt: analysis.adapt,
    expand: analysis.expand, respond: analysis.respond,
  };
  const totalScore = analysis.overallScore;

  // Layout: top-left=Adapt, top-right=Respond, bottom-left=Adopt, bottom-right=Expand
  const quadrants: Array<{ stage: string; row: number; col: number }> = [
    { stage: "adapt",   row: 0, col: 0 },
    { stage: "respond", row: 0, col: 1 },
    { stage: "adopt",   row: 1, col: 0 },
    { stage: "expand",  row: 1, col: 1 },
  ];

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
            <span className="text-xs font-bold text-foreground">{t("systemicChange.pathwayToSustainableChange")}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              totalScore >= 76 ? STATUS_LABELS.strong.color :
              totalScore >= 51 ? STATUS_LABELS.moderate.color :
              totalScore >= 26 ? STATUS_LABELS.emerging.color :
              totalScore > 0  ? STATUS_LABELS.nascent.color :
              STATUS_LABELS["no-data"].color
            }`}>
              {totalScore >= 76 ? t("systemicChange.status.strong") : totalScore >= 51 ? t("systemicChange.status.moderate") : totalScore >= 26 ? t("systemicChange.status.emerging") : totalScore > 0 ? t("systemicChange.status.nascent") : t("systemicChange.status.noData")}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${totalScore}%`, background: "linear-gradient(to right, #5b21b6, #1e40af, #059669, #c2410c)" }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug italic">{analysis.pathwayNarrative}</p>
        </div>
      </div>

      {/* DCED Quadrant */}
      <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm">
        <div className="flex">
          {/* Y-axis — Sustainability */}
          <div className="flex flex-col items-center justify-between py-3 px-1.5 bg-zinc-900 shrink-0 w-9">
            <span className="text-amber-400 font-black text-lg leading-none">↑</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-100/80"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.18em" }}>
              Sustainability
            </span>
            <span className="opacity-0 text-lg">↑</span>
          </div>

          {/* Main grid + X-axis */}
          <div className="flex-1 flex flex-col bg-zinc-900">
            {/* 2×2 grid */}
            <div className="grid grid-cols-2 flex-1">
              {quadrants.map(({ stage }) => {
                const sd = stageDataMap[stage];
                const qc = DCED_QUAD[stage];
                const statusCfg = STATUS_LABELS[sd.status] ?? STATUS_LABELS["no-data"];
                return (
                  <div key={stage} className="relative p-4 flex flex-col gap-1.5 min-h-[130px]"
                    style={{ backgroundColor: qc.bg }}>
                    <div className="font-black text-base tracking-wide" style={{ color: qc.text }}>{t("systemicChange.aaer."+stage)}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black" style={{ color: qc.text }}>{sd.score}</span>
                      <span className="text-[9px] font-bold" style={{ color: qc.subText }}>/100</span>
                    </div>
                    <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit border"
                      style={{ backgroundColor: "rgba(255,255,255,0.55)", color: qc.text, borderColor: qc.subText + "55" }}>
                      {t("systemicChange.status." + (sd.status === "no-data" ? "noData" : sd.status))}
                    </span>
                    <p className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: qc.subText }}>{sd.headline}</p>
                    {/* Partner chips */}
                    {sd.partners && sd.partners.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sd.partners.map((p, i) => (
                          <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                            style={{ backgroundColor: "rgba(255,255,255,0.65)", color: qc.text, border: `1px solid ${qc.subText}44` }}>
                            {stage === "respond" && <span className="opacity-60 mr-0.5">↗</span>}{p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* X-axis — Scale */}
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900">
              <div className="flex-1 h-px bg-amber-400/30" />
              <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-100/80">Scale</span>
              <span className="text-amber-400 font-black text-lg leading-none">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageAnalysisCard({ stageKey, data }: { stageKey: string; data: StageAnalysis }) {
  const { t } = useTranslation();
  const cfg = STAGE_AI_CONFIG[stageKey];
  const statusCfg = STATUS_LABELS[data.status] ?? STATUS_LABELS["no-data"];
  const [expanded, setExpanded] = useState(false);
  const hasContent = data.findings.length > 0 || data.recommendations.length > 0;
  return (
    <div className={`rounded-xl border overflow-hidden border-l-4 ${cfg.border} ${cfg.accentBorder}`}>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${cfg.bg} hover:bg-muted/30 transition-all`}
        onClick={() => setExpanded(p => !p)}
        disabled={!hasContent}
      >
        <div className="shrink-0">
          <StageRing score={data.score} stageKey={stageKey} size={52} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-bold ${cfg.text}`}>{t("systemicChange.aaer."+stageKey)}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
              {t("systemicChange.status." + (data.status === "no-data" ? "noData" : data.status))}
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{t("systemicChange.keyFindings")}</p>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{t("systemicChange.recommendations")}</p>
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
  const { t } = useTranslation();
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
          <h3 className="text-sm font-bold text-foreground">{t("systemicChange.aiProgressAnalysis")}</h3>
          <p className="text-xs text-muted-foreground">{t("systemicChange.aiProgressAnalysisDesc")}</p>
        </div>
        <Button
          size="sm"
          onClick={generate}
          disabled={mutation.isPending || !hasEntries}
          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1.5"
        >
          {mutation.isPending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("systemicChange.analysing")}</>
            : <><Sparkles className="w-3.5 h-3.5" />{analysis ? t("systemicChange.regenerate") : t("systemicChange.generateAnalysis")}</>
          }
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-5">
        {!hasEntries && !analysis && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{t("systemicChange.noEntriesYet")}</p>
            <p className="text-xs text-muted-foreground/70">{t("systemicChange.noEntriesDesc")}</p>
          </div>
        )}

        {hasEntries && !analysis && !mutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("systemicChange.readyToAnalyse")}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {t("systemicChange.readyToAnalyseDescAaer")}
              </p>
            </div>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm font-semibold text-foreground">{t("systemicChange.analysingAaer")}</p>
            <p className="text-xs text-muted-foreground">{t("systemicChange.analysingAaerDesc")}</p>
          </div>
        )}

        {analysis && !mutation.isPending && (
          <>
            {/* Pathway diagram */}
            <PathwayDiagram analysis={analysis} />

            {/* Overall assessment */}
            <div className="rounded-xl border border-border bg-white/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("systemicChange.overallAssessment")}</p>
              <p className="text-sm text-foreground leading-relaxed">{analysis.overallAssessment}</p>
            </div>

            {/* Per-stage cards */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("systemicChange.stageAnalysis")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stages.map(stage => (
                  <StageAnalysisCard key={stage} stageKey={stage} data={(analysis as unknown as Record<string, StageAnalysis>)[stage]} />
                ))}
              </div>
            </div>

            {/* Priority actions */}
            {analysis.nextPriorityActions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">{t("systemicChange.nextPriorityActions")}</p>
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

// ─── MSR Module ───────────────────────────────────────────────────────────────

const MSR_SCALE = [
  { value: 1, label: "Much more reactive",     short: "1",  bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  { value: 2, label: "Sometimes reactive",     short: "2",  bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  { value: 3, label: "Somewhat proactive",     short: "3",  bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  { value: 4, label: "Much more proactive",    short: "4",  bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },
];

interface MsrIndicator { id: string; label: string; type?: "F" | "S" }
interface MsrIndicatorGroup { group: string; indicators: MsrIndicator[] }
interface MsrComponent { key: string; label: string; desc: string; indicatorGroups: MsrIndicatorGroup[] }
interface MsrDomain { key: string; label: string; bg: string; text: string; border: string; components: MsrComponent[] }

const MSR_DOMAINS: MsrDomain[] = [
  {
    key: "structural",
    label: "Structural Domain",
    bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-300",
    components: [
      {
        key: "connectivity",
        label: "Connectivity",
        desc: "Linkages and relationships between market actors and support systems",
        indicatorGroups: [
          {
            group: "Number of connections",
            indicators: [
              { id: "conn_nc_1", label: "Number of suppliers/distributors/customers", type: "F" },
            ],
          },
          {
            group: "Types of Cooperation",
            indicators: [
              { id: "conn_tc_1", label: "Number of joint initiatives/partnerships", type: "F" },
              { id: "conn_tc_2", label: "Agent response pattern to cooperation pressures (i.e. add value or extract)", type: "F" },
              { id: "conn_tc_3", label: "Co-investment alliances", type: "F" },
              { id: "conn_tc_4", label: "Investment in suppliers and service providers", type: "F" },
              { id: "conn_tc_5", label: "Emergence of industry associations", type: "F" },
              { id: "conn_tc_6", label: "Extent of practice of collective bargaining agreements", type: "S" },
              { id: "conn_tc_7", label: "Incidence of joint efforts around threats and opportunities", type: "F" },
            ],
          },
          {
            group: "Motivation for Cooperation",
            indicators: [
              { id: "conn_mc_1", label: "Cooperation to gain unfair advantage (e.g. fix prices, shift grades, other)", type: "F" },
              { id: "conn_mc_2", label: "Cooperation to add value (e.g. joint marketing or branding, advocacy to improve policies and regulations, agreements on standards to increase industry)" },
              { id: "conn_mc_3", label: "Emergence of specialised business-to-business services", type: "S" },
              { id: "conn_mc_4", label: "Cooperation to gain fair advantage (level the playing field)" },
              { id: "conn_mc_5", label: "Collective response patterns to joint threats and opportunities", type: "S" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "conn_mf_1", label: "Stringency of anti-trust laws", type: "S" },
              { id: "conn_mf_2", label: "Level of perceived collusion", type: "S" },
              { id: "conn_mf_3", label: "Extent to which freedom of association is practised", type: "S" },
              { id: "conn_mf_4", label: "Formalisation of alliances via co-investment, joint ownership, formal agreements etc." },
            ],
          },
        ],
      },
      {
        key: "diversity",
        label: "Diversity",
        desc: "Variety of actors, approaches, and options within the system",
        indicatorGroups: [
          {
            group: "Variation",
            indicators: [
              { id: "div_vr_1", label: "Count of different sizes of businesses", type: "F" },
              { id: "div_vr_2", label: "Number of different categories of business risk profiles" },
              { id: "div_vr_3", label: "Redundancy rate", type: "F" },
              { id: "div_vr_4", label: "Business failure rate", type: "S" },
              { id: "div_vr_5", label: "Business start up rate", type: "F" },
            ],
          },
          {
            group: "Diversity of Types and Kinds",
            indicators: [
              { id: "div_tk_1", label: "Level of business model diversity", type: "S" },
              { id: "div_tk_2", label: "Diversity of types of products services, etc in a sector", type: "F" },
              { id: "div_tk_3", label: "Level of investments value addition within key value chains (i.e. processing, increasing segmentation/specialization)" },
              { id: "div_tk_4", label: "Growth of specialised services targeting businesses within an industry", type: "F" },
            ],
          },
          {
            group: "Diversity of Composition",
            indicators: [
              { id: "div_dc_1", label: "Diversity of channels", type: "S" },
              { id: "div_dc_2", label: "Count of different supply and distribution channels" },
              { id: "div_dc_3", label: "Count of different marketing channels" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "div_mf_1", label: "Variation in financial services" },
              { id: "div_mf_2", label: "Innovation Index", type: "S" },
              { id: "div_mf_3", label: "Perception about risk taking", type: "S" },
              { id: "div_mf_4", label: "Fragmentation of land", type: "S" },
              { id: "div_mf_5", label: "Sedentarization" },
              { id: "div_mf_6", label: "Social Norms regarding gender, age, wealth, ethnicity" },
              { id: "div_mf_7", label: "Financial flows — public investment, private investment" },
              { id: "div_mf_8", label: "Roads/infrastructure" },
              { id: "div_mf_9", label: "Labour markets (labour shortages or surplus)" },
              { id: "div_mf_10", label: "Variety of ways businesses are structurally related (slow)" },
              { id: "div_mf_11", label: "Number of geographic production nodes (slow)" },
            ],
          },
        ],
      },
      {
        key: "power_dynamics",
        label: "Power Dynamics",
        desc: "Distribution of power and ability to influence rules and norms",
        indicatorGroups: [
          {
            group: "Concentration of Power",
            indicators: [
              { id: "pow_cp_1", label: "Extent of stakeholder participation in development and review of policies" },
              { id: "pow_cp_2", label: "Counter-balancing forces", type: "F" },
              { id: "pow_cp_3", label: "Existence/reach of special interest groups", type: "S" },
              { id: "pow_cp_4", label: "Influence of investigative journalism/media", type: "F" },
              { id: "pow_cp_5", label: "Existence of independent advocacy services", type: "F" },
              { id: "pow_cp_6", label: "Market structure", type: "S" },
            ],
          },
          {
            group: "Exercise of Power",
            indicators: [
              { id: "pow_ep_1", label: "Perceived levels of corruption", type: "F" },
              { id: "pow_ep_2", label: "Government investment in formal social safety net programs", type: "F" },
              { id: "pow_ep_3", label: "Level of pricing control", type: "S" },
              { id: "pow_ep_4", label: "Government investment in road utilities, health education", type: "F" },
            ],
          },
          {
            group: "Inequality",
            indicators: [
              { id: "pow_in_1", label: "Income inequality", type: "S" },
              { id: "pow_in_2", label: "Geographic concentration of wealth", type: "S" },
            ],
          },
          {
            group: "Inclusiveness",
            indicators: [
              { id: "pow_ic_1", label: "Government orientation", type: "S" },
              { id: "pow_ic_2", label: "Liberal Democracy Index", type: "S" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "pow_mf_1", label: "Health of civil society", type: "S" },
            ],
          },
        ],
      },
      {
        key: "rule_of_law",
        label: "Rule of Law",
        desc: "Functioning of formal rules, regulations, and enforcement",
        indicatorGroups: [
          {
            group: "Regulations and Standards",
            indicators: [
              { id: "rol_rs_1", label: "Existence of uniform grades and standards", type: "F" },
              { id: "rol_rs_2", label: "World Justice Project Rule of Law Index", type: "S" },
              { id: "rol_rs_3", label: "Awareness of laws and regulations", type: "F" },
            ],
          },
          {
            group: "Supporting Services",
            indicators: [
              { id: "rol_ss_1", label: "Viability of advocacy services", type: "F" },
              { id: "rol_ss_2", label: "Investment in research on judiciary", type: "F" },
              { id: "rol_ss_3", label: "Access to legal services", type: "F" },
              { id: "rol_ss_4", label: "Press Freedom Index", type: "S" },
            ],
          },
          {
            group: "Practices",
            indicators: [
              { id: "rol_pr_1", label: "Adherence" },
              { id: "rol_pr_2", label: "Level of corruption in regulatory interactions with market actors", type: "F" },
              { id: "rol_pr_3", label: "Cost/fairness of formal judiciary interactions with market actors", type: "F" },
              { id: "rol_pr_4", label: "Government hiring practices", type: "F" },
              { id: "rol_pr_5", label: "Diagonal Accountability Index", type: "S" },
              { id: "rol_pr_6", label: "Corruption Perceptions", type: "S" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "rol_mf_1", label: "Orientation to equity — an index around consumer protection, number, management orientation, funding etc." },
              { id: "rol_mf_2", label: "System legitimacy (perception of courts, obeying the law)", type: "S" },
              { id: "rol_mf_3", label: "Level of horizontal accountability (perception of checks and balances on Executive branch)" },
              { id: "rol_mf_4", label: "Media business orientation (audience driven as opposed to owners interest driven)", type: "S" },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "behavioural",
    label: "Behavioural Domain",
    bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-300",
    components: [
      {
        key: "cooperation",
        label: "Cooperation",
        desc: "Collaborative behaviours, joint action, and information sharing among market actors",
        indicatorGroups: [
          {
            group: "Types of Cooperation",
            indicators: [
              { id: "coo_tc_1", label: "Number of joint initiatives/partnerships", type: "F" },
              { id: "coo_tc_2", label: "Agent response pattern to cooperation pressures (i.e. add value or extract)", type: "F" },
              { id: "coo_tc_3", label: "Co-investment alliances", type: "F" },
              { id: "coo_tc_4", label: "Investment in suppliers and service providers", type: "F" },
              { id: "coo_tc_5", label: "Emergence of industry associations", type: "F" },
              { id: "coo_tc_6", label: "Extent of practice of collective bargaining agreements", type: "S" },
              { id: "coo_tc_7", label: "Incidence of joint efforts around threats and opportunities", type: "F" },
            ],
          },
          {
            group: "Motivation for Cooperation",
            indicators: [
              { id: "coo_mc_1", label: "Cooperation to gain unfair advantage (e.g. fix prices, shift grades, other)", type: "F" },
              { id: "coo_mc_2", label: "Cooperation to add value (e.g. joint marketing or branding, advocacy to improve policies and regulations, agreements on standards to increase industry)" },
              { id: "coo_mc_3", label: "Emergence of specialised business-to-business services", type: "S" },
              { id: "coo_mc_4", label: "Cooperation to gain fair advantage (level the playing field)" },
              { id: "coo_mc_5", label: "Collective response patterns to joint threats and opportunities", type: "S" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "coo_mf_1", label: "Stringency of anti-trust laws", type: "S" },
              { id: "coo_mf_2", label: "Level of perceived collusion", type: "S" },
              { id: "coo_mf_3", label: "Extent to which freedom of association is practised", type: "S" },
              { id: "coo_mf_4", label: "Formalisation of alliances via co-investment, joint ownership, formal agreements etc.", type: "S" },
            ],
          },
        ],
      },
      {
        key: "competition",
        label: "Competition",
        desc: "Competitive dynamics, market contestability, and rivalry that drives innovation and quality",
        indicatorGroups: [
          {
            group: "Zero Sum Competition",
            indicators: [
              { id: "com_zs_1", label: "Growth in alternative dispute services", type: "F" },
              { id: "com_zs_2", label: "Number and nature of transactional disputes", type: "F" },
              { id: "com_zs_3", label: "Proportion of disputes fairly resolved", type: "S" },
              { id: "com_zs_4", label: "Incidence of zero sum tactics in spot markets", type: "F" },
              { id: "com_zs_5", label: "Availability of alternative dispute resolution options — mediation, arbitration etc." },
              { id: "com_zs_6", label: "Perceptions of outcomes from disputes", type: "F" },
              { id: "com_zs_7", label: "Extent of labour violations" },
              { id: "com_zs_8", label: "Level of Protectionism", type: "S" },
              { id: "com_zs_9", label: "Perceptions of being cheated (perceptions of trust by consumers)", type: "S" },
              { id: "com_zs_10", label: "Transactional fraud (rates of adulteration, fake, misinformation, practices etc.)" },
              { id: "com_zs_11", label: "Perceived subsidy capture", type: "S" },
            ],
          },
          {
            group: "Value Creating Competition",
            indicators: [
              { id: "com_vc_1", label: "Number of new market entrants", type: "F" },
              { id: "com_vc_2", label: "Co-investment along value chains", type: "F" },
              { id: "com_vc_3", label: "Existence of/level of adherence to trading standards", type: "F" },
              { id: "com_vc_4", label: "Number of repeat customers", type: "F" },
              { id: "com_vc_5", label: "Collective response patterns to competitive response (pace of innovation versus lack of innovation)" },
            ],
          },
        ],
      },
      {
        key: "evidence_decision",
        label: "Evidence-based Decision Making",
        desc: "Extent to which actors use data and evidence to inform choices",
        indicatorGroups: [
          {
            group: "Investments in Evidence to Support Decision-Making",
            indicators: [
              { id: "edm_ie_1", label: "Level of spend on market research", type: "F" },
              { id: "edm_ie_2", label: "Investments in information gathering and analysis at agent/firm level", type: "F" },
              { id: "edm_ie_3", label: "Presence of industry journals, networks and meetings", type: "F" },
              { id: "edm_ie_4", label: "Number of alliances between academia and businesses", type: "F" },
              { id: "edm_ie_5", label: "Extent to which companies segment customers by socio-economic demographic" },
            ],
          },
          {
            group: "Use of Evidence in Decision-Making",
            indicators: [
              { id: "edm_ue_1", label: "Use of digital Customer Relationship Management (CRM) systems", type: "F" },
              { id: "edm_ue_2", label: "Depth of market for evidence-based services", type: "S" },
              { id: "edm_ue_3", label: "Influence of science on social and market systems", type: "S" },
            ],
          },
          {
            group: "Information Flows",
            indicators: [
              { id: "edm_if_1", label: "Collective response patterns to information flows — customer feedback response" },
              { id: "edm_if_2", label: "Level of academic connectivity to private sector", type: "S" },
              { id: "edm_if_3", label: "Patterns of information flows", type: "S" },
            ],
          },
          {
            group: "Quality of Evidence",
            indicators: [
              { id: "edm_qe_1", label: "Level of academic orientation to value addition and away from political patronage" },
              { id: "edm_qe_2", label: "Management of content by media on journalism ethics", type: "S" },
              { id: "edm_qe_3", label: "Maturity of ICT B2B market (targeting SMEs)", type: "S" },
            ],
          },
        ],
      },
      {
        key: "business_strategy",
        label: "Business Strategy",
        desc: "Quality and long-term orientation of strategic planning",
        indicatorGroups: [
          {
            group: "Growth Orientation",
            indicators: [
              { id: "bst_go_1", label: "YTD R&D expenditure", type: "F" },
              { id: "bst_go_2", label: "YTD capital expenditure", type: "F" },
              { id: "bst_go_3", label: "Investment in data gathering and analysis", type: "F" },
              { id: "bst_go_4", label: "Reinvestment rates by owner", type: "F" },
              { id: "bst_go_5", label: "Capital expenditure (5/10 year trend)", type: "S" },
              { id: "bst_go_6", label: "R&D expenditure (5/10 year trend)", type: "S" },
              { id: "bst_go_7", label: "Maintenance-growth ratio", type: "S" },
            ],
          },
          {
            group: "Formalization",
            indicators: [
              { id: "bst_fm_1", label: "Existence of specialised hiring services", type: "F" },
              { id: "bst_fm_2", label: "Maturity of public equity markets", type: "S" },
              { id: "bst_fm_3", label: "Level of SME informality", type: "F" },
              { id: "bst_fm_4", label: "Level of sophistication in branding", type: "F" },
            ],
          },
          {
            group: "Customer Orientation",
            indicators: [
              { id: "bst_co_1", label: "Investment in customer service", type: "F" },
              { id: "bst_co_2", label: "Customer loyalty trends", type: "S" },
              { id: "bst_co_3", label: "Maturity of market for stakeholder/customer centric solutions", type: "S" },
            ],
          },
          {
            group: "Employee Orientation",
            indicators: [
              { id: "bst_eo_1", label: "Unemployment rate", type: "S" },
              { id: "bst_eo_2", label: "Job satisfaction level", type: "S" },
              { id: "bst_eo_3", label: "Level of investment in staff/organisational capacity development and retention" },
              { id: "bst_eo_4", label: "Staff turnover", type: "F" },
              { id: "bst_eo_5", label: "Coverage of merit-based performance incentives", type: "S" },
            ],
          },
          {
            group: "Mediating Factors",
            indicators: [
              { id: "bst_mf_1", label: "Access to finance", type: "S" },
              { id: "bst_mf_2", label: "Access to premises, utilities, other services", type: "S" },
              { id: "bst_mf_3", label: "Tax system", type: "F" },
              { id: "bst_mf_4", label: "Labour markets", type: "S" },
            ],
          },
        ],
      },
    ],
  },
];

// Per-indicator score for one period
interface MsrScore { score: number | null; notes: string }
// Actor from the Business Model section (Drizzle maps actor_name → actorName)
interface BusinessModelActor { id: number; actorName: string; role?: string }
// Convenience alias: period → indicatorId → score
type PeriodScores = Record<string, Record<string, MsrScore>>;
// Top-level data for the whole MSR assessment (v3: per-actor scores)
interface MsrData {
  v: 3;
  sel: Record<string, string[]>;             // componentKey → selected indicatorId[] (shared across actors)
  selectedActorIds: string[];                // actor IDs currently being assessed
  actorScores: Record<string, PeriodScores>; // actorId → period → indicatorId → score
}
const MSR_DATA_EMPTY: MsrData = { v: 3, sel: {}, selectedActorIds: [], actorScores: {} };

function msrIndicatorAvg(scores: PeriodScores, indicatorId: string, periods: string[]): number | null {
  const vals = periods.map(p => scores[p]?.[indicatorId]?.score).filter((v): v is number => v != null);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

function msrComponentAvg(sel: Record<string, string[]>, scores: PeriodScores, componentKey: string, periods: string[]): number | null {
  const ids = sel[componentKey] ?? [];
  if (!ids.length) return null;
  const vals: number[] = ids.flatMap(id =>
    periods.map(p => scores[p]?.[id]?.score).filter((v): v is number => v != null)
  );
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

function MsrScoreChip({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "lg" }) {
  if (score == null) return <span className="text-muted-foreground/30 text-[11px]">—</span>;
  const cfg = MSR_SCALE[score - 1];
  const cls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : size === "lg" ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5";
  return (
    <span className={`inline-flex items-center rounded-full font-bold border leading-none ${cls}`}
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
      {cfg.short}
    </span>
  );
}

function MsrScoreCell({ score, onClick, isSelected }: {
  score: MsrScore | undefined;
  onClick: () => void;
  isSelected: boolean;
}) {
  const s = score?.score ?? null;
  const cfg = s != null ? MSR_SCALE[s - 1] : null;
  return (
    <td className="px-1 py-0.5 text-center border-b border-border/20">
      <button onClick={onClick}
        className={`w-full min-w-[72px] rounded-md px-1 py-2 text-center transition-all border ${
          isSelected ? "ring-2 ring-teal-400 ring-offset-1" : ""
        } ${cfg ? "" : "border-dashed border-border/30 hover:border-border/60 hover:bg-muted/20"}`}
        style={cfg ? { backgroundColor: cfg.bg, borderColor: cfg.border } : undefined}>
        {cfg
          ? <span className="text-sm font-black leading-none" style={{ color: cfg.text }}>{s}</span>
          : <span className="text-[10px] text-muted-foreground/30">+</span>
        }
      </button>
    </td>
  );
}

function MsrIndicatorSelectPanel({ component, domain, selectedIds, onSave, onClose }: {
  component: MsrComponent;
  domain: MsrDomain;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const allIds = component.indicatorGroups.flatMap(g => g.indicators.map(i => i.id));

  const toggle = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleGroup = (grp: MsrIndicatorGroup) => {
    const ids = grp.indicators.map(i => i.id);
    const allOn = ids.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => allOn ? n.delete(id) : n.add(id)); return n; });
  };

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-white overflow-hidden flex flex-col shadow-lg">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border bg-violet-50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${domain.bg} ${domain.text}`}>
              {domain.label.replace(" Domain", "")}
            </span>
            <span className="text-xs text-muted-foreground">· Select Indicators</span>
          </div>
          <h3 className="text-sm font-bold">{component.label}</h3>
          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{component.desc}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
      </div>

      <div className="px-4 py-2 border-b border-border/40 flex items-center gap-3 bg-muted/20">
        <p className="text-[11px] text-muted-foreground flex-1 leading-snug">
          Tick the indicators relevant to this intervention — they will appear as rows in the matrix.
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setSelected(new Set(allIds))} className="text-[10px] font-semibold text-violet-600 hover:text-violet-800 underline underline-offset-2">All</button>
          <button onClick={() => setSelected(new Set())} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground underline underline-offset-2">None</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {component.indicatorGroups.map(grp => {
          const grpIds = grp.indicators.map(i => i.id);
          const allOn = grpIds.every(id => selected.has(id));
          const someOn = grpIds.some(id => selected.has(id));
          return (
            <div key={grp.group} className="rounded-lg border border-border/60 overflow-hidden">
              <button onClick={() => toggleGroup(grp)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  allOn ? "bg-violet-50 border-b border-violet-100" : someOn ? "bg-amber-50 border-b border-amber-100" : "bg-muted/30 border-b border-border/40"
                }`}>
                <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                  allOn ? "bg-violet-500 border-violet-500" : someOn ? "bg-amber-400 border-amber-400" : "border-border bg-white"
                }`}>
                  {(allOn || someOn) && <Check className="w-2 h-2 text-white" />}
                </span>
                <span className="text-[11px] font-bold text-foreground/80 flex-1">{grp.group}</span>
                <span className="text-[10px] text-muted-foreground">{grpIds.filter(id => selected.has(id)).length}/{grpIds.length}</span>
              </button>
              <ul className="divide-y divide-border/30">
                {grp.indicators.map(ind => {
                  const on = selected.has(ind.id);
                  return (
                    <li key={ind.id}>
                      <button onClick={() => toggle(ind.id)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/20 transition-colors ${on ? "bg-violet-50/50" : ""}`}>
                        <span className={`mt-0.5 w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${on ? "bg-violet-500 border-violet-500" : "border-border bg-white"}`}>
                          {on && <Check className="w-2 h-2 text-white" />}
                        </span>
                        <span className={`text-[11px] leading-snug flex-1 ${on ? "text-foreground font-medium" : "text-foreground/55"}`}>{ind.label}</span>
                        {ind.type && (
                          <span className={`text-[9px] font-black px-1 py-0.5 rounded shrink-0 mt-0.5 ${ind.type === "F" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>{ind.type}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        <span className="text-[11px] text-muted-foreground flex-1">{selected.size} indicator{selected.size !== 1 ? "s" : ""} selected</span>
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => { onSave(Array.from(selected)); onClose(); }}>
          <Check className="w-3.5 h-3.5 mr-1.5" />Apply
        </Button>
      </div>
    </div>
  );
}

function MsrIndicatorScorePanel({ period, indicator, groupLabel, domain, component, score, onSave, onClose }: {
  period: string;
  indicator: MsrIndicator;
  groupLabel: string;
  domain: MsrDomain;
  component: MsrComponent;
  score: MsrScore;
  onSave: (s: MsrScore) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState<number | null>(score.score);
  const [notes, setNotes] = useState(score.notes ?? "");

  return (
    <div className="rounded-xl border-2 border-teal-200 bg-white overflow-hidden flex flex-col shadow-lg">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border bg-teal-50">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${domain.bg} ${domain.text}`}>
              {domain.label.replace(" Domain", "")}
            </span>
            <span className="text-[10px] text-muted-foreground">· {component.label} · {period}</span>
          </div>
          <h3 className="text-sm font-bold leading-snug">{indicator.label}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground/70">{groupLabel}</span>
            {indicator.type && (
              <span className={`text-[9px] font-black px-1 py-0.5 rounded ${indicator.type === "F" ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                {indicator.type}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Score — Reactive → Proactive</Label>
          <div className="grid grid-cols-2 gap-2">
            {MSR_SCALE.map(s => (
              <button key={s.value} onClick={() => setVal(val === s.value ? null : s.value)}
                className={`rounded-lg border-2 px-3 py-2.5 text-left transition-all ${val === s.value ? "ring-2 ring-offset-1 ring-teal-400" : "opacity-70 hover:opacity-100"}`}
                style={{ backgroundColor: s.bg, borderColor: s.border }}>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black leading-none" style={{ color: s.text }}>{s.value}</span>
                  <span className="text-[10px] font-semibold leading-snug" style={{ color: s.text }}>{s.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Evidence & Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[80px]"
            placeholder="Describe the evidence for this score…" />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white ml-auto" onClick={() => onSave({ score: val, notes })}>
          <Check className="w-3.5 h-3.5 mr-1.5" />Save
        </Button>
      </div>
    </div>
  );
}

function MsrActorSelector({
  actors, selectedIds, onChange,
}: { actors: BusinessModelActor[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  if (actors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm font-medium text-muted-foreground">No actors found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Add actors in the Business Model section to assess them here.</p>
      </div>
    );
  }
  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="text-sm font-semibold text-indigo-900">Actors Being Assessed</span>
        {selectedIds.length > 0 && (
          <span className="ml-auto text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
            {selectedIds.length} selected
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {actors.map(actor => {
          const id = String(actor.id);
          const sel = selectedIds.includes(id);
          return (
            <button key={id} onClick={() => toggle(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                sel
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-foreground border-border hover:border-indigo-300 hover:bg-indigo-50/80"
              }`}>
              {sel && <Check className="w-3 h-3 shrink-0" />}
              {actor.actorName}
            </button>
          );
        })}
      </div>
      {selectedIds.length === 0 && (
        <p className="text-xs text-muted-foreground/60 mt-2">Select at least one actor to begin scoring indicators.</p>
      )}
    </div>
  );
}

function MsrMatrix({ periods, sel, scores, scoringCell, selectingFor, onSelectCell, onEditIndicators }: {
  periods: string[];
  sel: Record<string, string[]>;
  scores: PeriodScores;
  scoringCell: { period: string; indicatorId: string } | null;
  selectingFor: string | null;
  onSelectCell: (period: string, indicatorId: string, componentKey: string) => void;
  onEditIndicators: (componentKey: string) => void;
}) {
  // Tracks which "componentKey::groupName" pairs are collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  if (periods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <Settings className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No timeline configured</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Set up the assessment timeline above to begin scoring.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: `${320 + periods.length * 90}px` }}>
          <thead>
            <tr className="bg-muted/70 border-b-2 border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-muted/70 z-10 w-80 min-w-[320px]">
                Indicator
              </th>
              <th className="px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground min-w-[52px]">Avg</th>
              {periods.map(p => (
                <th key={p} className="px-2 py-3 text-center text-[11px] font-bold text-muted-foreground min-w-[80px]">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MSR_DOMAINS.map(domain => (
              <Fragment key={domain.key}>
                {/* Domain header */}
                <tr>
                  <td colSpan={2 + periods.length}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-y border-border ${domain.bg} ${domain.text}`}>
                    {domain.label}
                  </td>
                </tr>

                {domain.components.map(comp => {
                  const selectedIds = sel[comp.key] ?? [];
                  const compAvg = msrComponentAvg(sel, scores, comp.key, periods);
                  const isSelectingThis = selectingFor === comp.key;

                  // Build a lookup: indicatorId → { indicator, groupLabel }
                  const indMap = new Map<string, { indicator: MsrIndicator; groupLabel: string }>();
                  comp.indicatorGroups.forEach(g => g.indicators.forEach(i => indMap.set(i.id, { indicator: i, groupLabel: g.group })));

                  return (
                    <Fragment key={comp.key}>
                      {/* Component header row */}
                      <tr className={`border-b border-border/50 ${isSelectingThis ? "bg-violet-50/70" : "bg-muted/20"}`}>
                        <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 border-r border-border/30">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground">{comp.label}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground/60 hidden sm:inline">{comp.desc}</span>
                            </div>
                            <button
                              onClick={() => onEditIndicators(comp.key)}
                              className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                                isSelectingThis
                                  ? "bg-violet-600 text-white border-violet-600"
                                  : selectedIds.length > 0
                                    ? "text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100"
                                    : "text-muted-foreground border-border hover:border-violet-300 hover:text-violet-600"
                              }`}>
                              <ListChecks className="w-3 h-3" />
                              {selectedIds.length > 0 ? `${selectedIds.length} indicators` : "Select indicators"}
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center border-r border-border/30">
                          <MsrScoreChip score={compAvg != null ? Math.round(compAvg) : null} size="sm" />
                        </td>
                        {periods.map(p => {
                          const pVals = selectedIds.map(id => scores[p]?.[id]?.score).filter((v): v is number => v != null);
                          const pAvg = pVals.length ? Math.round(pVals.reduce((a, b) => a + b, 0) / pVals.length) : null;
                          return (
                            <td key={p} className="px-1 py-1.5 text-center border-b border-border/20">
                              <div className="flex items-center justify-center min-h-[28px]">
                                <MsrScoreChip score={pAvg} size="sm" />
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Indicator sub-rows — grouped */}
                      {selectedIds.length === 0 ? (
                        <tr>
                          <td colSpan={2 + periods.length}
                            className="pl-10 pr-4 py-2 text-[11px] text-muted-foreground/40 italic border-b border-border/20 bg-background">
                            No indicators selected — click "Select indicators" to add rows for this component
                          </td>
                        </tr>
                      ) : comp.indicatorGroups.map(grp => {
                        const grpSelected = grp.indicators.filter(i => selectedIds.includes(i.id));
                        if (grpSelected.length === 0) return null;

                        const grpAvg = (() => {
                          const vals: number[] = grpSelected.flatMap(i =>
                            periods.map(p => scores[p]?.[i.id]?.score).filter((v): v is number => v != null)
                          );
                          return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                        })();

                        const collapseKey = `${comp.key}::${grp.group}`;
                        const isCollapsed = collapsed.has(collapseKey);

                        return (
                          <Fragment key={`grp-${comp.key}-${grp.group}`}>
                            {/* Group sub-header — click to collapse */}
                            <tr
                              className="border-b border-border/30 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                              onClick={() => toggleGroup(collapseKey)}>
                              <td className="pl-6 pr-3 py-1 sticky left-0 bg-slate-50 z-10 border-r border-border/20">
                                <div className="flex items-center gap-1.5">
                                  {isCollapsed
                                    ? <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                    : <ChevronDown className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                  }
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                    {grp.group}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/40 ml-0.5">
                                    ({grpSelected.length})
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-1 text-center border-r border-border/20 bg-slate-50">
                                <MsrScoreChip score={grpAvg} size="sm" />
                              </td>
                              {periods.map(p => {
                                const pVals = grpSelected.map(i => scores[p]?.[i.id]?.score).filter((v): v is number => v != null);
                                const pAvg = pVals.length ? Math.round(pVals.reduce((a, b) => a + b, 0) / pVals.length) : null;
                                return (
                                  <td key={p} className="px-1 py-1 text-center border-b border-border/20 bg-slate-50">
                                    <div className="flex items-center justify-center min-h-[22px]">
                                      <MsrScoreChip score={pAvg} size="sm" />
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            {/* Indicator rows — hidden when group is collapsed */}
                            {!isCollapsed && grpSelected.map(indicator => {
                              const indAvg = msrIndicatorAvg(scores, indicator.id, periods);
                              return (
                                <tr key={indicator.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors bg-background">
                                  <td className="pl-10 pr-3 py-1.5 sticky left-0 bg-background z-10 border-r border-border/20">
                                    <div className="flex items-start gap-1.5">
                                      <span className="text-muted-foreground/25 text-xs mt-0.5 shrink-0">↳</span>
                                      <div className="min-w-0">
                                        <span className="text-[11px] text-foreground/80 leading-snug block">{indicator.label}</span>
                                      </div>
                                      {indicator.type && (
                                        <span className={`text-[8px] font-black px-1 py-0.5 rounded shrink-0 mt-0.5 ${indicator.type === "F" ? "bg-blue-100 text-blue-500" : "bg-purple-100 text-purple-500"}`}>
                                          {indicator.type}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-center border-r border-border/20">
                                    <MsrScoreChip score={indAvg != null ? Math.round(indAvg) : null} size="sm" />
                                  </td>
                                  {periods.map(p => (
                                    <MsrScoreCell key={p}
                                      score={scores[p]?.[indicator.id]}
                                      isSelected={scoringCell?.period === p && scoringCell?.indicatorId === indicator.id}
                                      onClick={() => onSelectCell(p, indicator.id, comp.key)}
                                    />
                                  ))}
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// MSR-specific settings — completely independent of AAER
interface MsrSettings { startYear: number; endYear: number; granularity: Granularity }
const MSR_SETTINGS_EMPTY: MsrSettings = { startYear: 0, endYear: 0, granularity: "annual" };

function MsrSettingsPanel({ settings, onSave }: { settings: MsrSettings; onSave: (s: MsrSettings) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!settings.startYear);
  const [local, setLocal] = useState(settings);
  const curYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => curYear - 5 + i);

  const regularPeriods = local.startYear && local.endYear
    ? generatePeriods(local.startYear, local.endYear, local.granularity)
    : [];

  const handleSave = () => {
    if (local.startYear && local.endYear && local.endYear >= local.startYear) {
      onSave(local);
      setOpen(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 overflow-hidden mb-4">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-teal-100 transition-colors">
        <Settings className="w-4 h-4 text-teal-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-teal-900">Assessment Timeline</span>
          {settings.startYear && settings.endYear ? (
            <span className="ml-3 text-xs text-teal-600">
              {settings.startYear}–{settings.endYear} · {settings.granularity} · {generatePeriods(settings.startYear, settings.endYear, settings.granularity).length} periods
            </span>
          ) : (
            <span className="ml-3 text-xs text-teal-500 italic">Not configured — click to set up</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-teal-500" /> : <ChevronDown className="w-4 h-4 text-teal-500" />}
      </button>

      {open && (
        <div className="border-t border-teal-200 px-5 py-4 bg-white/70 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Start Year</Label>
              <Select value={String(local.startYear || "")} onValueChange={v => setLocal(p => ({ ...p, startYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">End Year</Label>
              <Select value={String(local.endYear || "")} onValueChange={v => setLocal(p => ({ ...p, endYear: Number(v) }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{t("systemicChange.timeline.granularity")}</Label>
              <Select value={local.granularity} onValueChange={v => setLocal(p => ({ ...p, granularity: v as Granularity }))}>
                <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{t("systemicChange.timeline.annual")}</SelectItem>
                  <SelectItem value="biannual">{t("systemicChange.timeline.biannual")}</SelectItem>
                  <SelectItem value="quarterly">{t("systemicChange.timeline.quarterly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {regularPeriods.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                Assessment periods ({regularPeriods.length}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {regularPeriods.map(p => (
                  <span key={p} className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-teal-100 text-teal-700 border-teal-200">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSave}
            disabled={!local.startYear || !local.endYear || local.endYear < local.startYear}>
            <Check className="w-3.5 h-3.5 mr-1.5" />Apply Timeline
          </Button>
        </div>
      )}
    </div>
  );
}

function useMsrData(theoryId: number, apiBase: string) {
  const { toast } = useToast();
  const [msrData, setMsrData] = useState<MsrData>(MSR_DATA_EMPTY);
  const [msrSettings, setMsrSettings] = useState<MsrSettings>(MSR_SETTINGS_EMPTY);
  const [msrEntryId, setMsrEntryId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [actors, setActors] = useState<BusinessModelActor[]>([]);

  const load = async () => {
    try {
      const [scRes, actRes] = await Promise.all([
        fetch(`${apiBase}/theories/${theoryId}/systemic-changes`, { credentials: "include" }),
        fetch(`${apiBase}/theories/${theoryId}/business-model/actors`, { credentials: "include" }),
      ]);
      if (actRes.ok) setActors((await actRes.json()) as BusinessModelActor[]);
      if (!scRes.ok) return;
      const rows: any[] = await scRes.json();
      const msrRow = rows.find(r => r.frameworkTag === "__msr__");
      if (msrRow) {
        setMsrEntryId(msrRow.id);
        try {
          const parsed = JSON.parse(msrRow.stageData ?? "{}");
          if (parsed.v === 3) {
            setMsrData(parsed as MsrData);
          } else if (parsed.v === 2) {
            // Migrate v2 → v3: keep indicator selection, discard old flat scores (different shape)
            setMsrData({ v: 3, sel: parsed.sel ?? {}, selectedActorIds: [], actorScores: {} });
          } else {
            setMsrData(MSR_DATA_EMPTY);
          }
        } catch {}
        try {
          const s = JSON.parse(msrRow.description ?? "{}");
          if (s.startYear) setMsrSettings(s as MsrSettings);
        } catch {}
      }
    } finally { setLoaded(true); }
  };

  const persist = async (data: MsrData, settings: MsrSettings) => {
    const body = {
      frameworkTag: "__msr__", dimension: "msr",
      description: JSON.stringify(settings),
      changeObserved: "", level: "", status: "",
      stageData: JSON.stringify(data),
    };
    try {
      if (msrEntryId) {
        await fetch(`${apiBase}/theories/${theoryId}/systemic-changes/${msrEntryId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch(`${apiBase}/theories/${theoryId}/systemic-changes`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify(body),
        });
        if (res.ok) { const row = await res.json(); setMsrEntryId(row.id); }
      }
    } catch (err) {
      toast({ title: "Failed to save MSR data", description: String(err), variant: "destructive" });
    }
  };

  const saveData = (data: MsrData) => { setMsrData(data); persist(data, msrSettings); };
  const saveSettings = (s: MsrSettings) => { setMsrSettings(s); persist(msrData, s); };

  return { msrData, msrSettings, loaded, load, saveData, saveSettings, actors };
}

const RADAR_COLORS = ["#6366f1","#f43f5e","#f59e0b","#10b981","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

function MsrRadarCharts({ sel, scores, periods }: { sel: Record<string, string[]>; scores: PeriodScores; periods: string[] }) {
  const [open, setOpen] = useState(false);

  const shortLabel = (label: string) => label.length > 14 ? label.slice(0, 13) + "…" : label;

  // Only include periods that actually have at least one score anywhere
  const activePeriods = periods.filter(p =>
    MSR_DOMAINS.some(d => d.components.some(comp => {
      const ids = sel[comp.key] ?? [];
      return ids.some(id => scores[p]?.[id]?.score != null);
    }))
  );

  const hasScores = activePeriods.length > 0;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border">
        <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold flex-1">Domain Radar Charts</span>
        <span className="text-[10px] text-muted-foreground mr-1">
          {hasScores
            ? `${activePeriods.length} period${activePeriods.length !== 1 ? "s" : ""} with scores`
            : "Score indicators above to generate charts"}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {!hasScores ? (
            <div className="text-center py-10">
              <TrendingUp className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Score some indicators in the matrix to generate radar charts.</p>
            </div>
          ) : (
            <>
              {/* Combined radar — all components from both domains */}
              {(() => {
                const allComponents = MSR_DOMAINS.flatMap(d => d.components);
                const combinedData = allComponents.map(comp => {
                  const entry: Record<string, string | number> = { subject: shortLabel(comp.label) };
                  activePeriods.forEach(p => {
                    const ids = sel[comp.key] ?? [];
                    const vals = ids.map(id => scores[p]?.[id]?.score).filter((v): v is number => v != null);
                    entry[p] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
                  });
                  return entry;
                });
                return (
                  <div className="rounded-xl border border-border bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Combined — All Domains</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <RadarChart data={combinedData} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                        {activePeriods.map((p, i) => (
                          <Radar key={p} name={p} dataKey={p}
                            stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                            fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                            fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 } as any}
                          />
                        ))}
                        <RechartsLegend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                        <RechartsTooltip formatter={(v: number) => [`${Number(v).toFixed(1)} / 4`]}
                          contentStyle={{ fontSize: 11, padding: "6px 10px", borderRadius: 8 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              {/* Per-domain charts */}
              <div className="grid grid-cols-2 gap-3">
                {MSR_DOMAINS.map(domain => {
                  const domainHasScores = domain.components.some(comp => {
                    const ids = sel[comp.key] ?? [];
                    return ids.some(id => activePeriods.some(p => scores[p]?.[id]?.score != null));
                  });
                  const data = domain.components.map(comp => {
                    const entry: Record<string, string | number> = { subject: shortLabel(comp.label) };
                    activePeriods.forEach(p => {
                      const ids = sel[comp.key] ?? [];
                      const vals = ids.map(id => scores[p]?.[id]?.score).filter((v): v is number => v != null);
                      entry[p] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
                    });
                    return entry;
                  });
                  return (
                    <div key={domain.key} className={`rounded-xl border p-3 space-y-1 ${domain.bg}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${domain.text}`}>{domain.label}</p>
                      {!domainHasScores ? (
                        <div className="flex items-center justify-center h-[140px]">
                          <p className="text-[11px] text-muted-foreground/50 italic">No scores yet</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={170}>
                          <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                            <PolarGrid stroke="#cbd5e1" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }} />
                            <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fontSize: 8, fill: "#94a3b8" }} />
                            {activePeriods.map((p, i) => (
                              <Radar key={p} name={p} dataKey={p}
                                stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                                fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                                fillOpacity={0.12} strokeWidth={2} dot={{ r: 3 } as any}
                              />
                            ))}
                            <RechartsLegend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                            <RechartsTooltip formatter={(v: number) => [`${Number(v).toFixed(1)} / 4`]}
                              contentStyle={{ fontSize: 11, padding: "6px 10px", borderRadius: 8 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MSR AI Analysis ──────────────────────────────────────────────────────────

interface MsrDomainAnalysis {
  score: number;
  status: "reactive" | "emerging" | "transitioning" | "proactive" | "no-data";
  headline: string;
  findings: string[];
  recommendations: string[];
  strongComponents: string[];
  weakComponents: string[];
}

interface MsrAnalysisResult {
  overallScore: number;
  overallAssessment: string;
  trajectoryNarrative: string;
  structural: MsrDomainAnalysis;
  behavioural: MsrDomainAnalysis;
  enablingEnvironment: MsrDomainAnalysis;
  relational: MsrDomainAnalysis;
  priorityActions: string[];
}

const MSR_DOMAIN_AI_CONFIG: Record<string, {
  label: string; stroke: string; trackStroke: string;
  bg: string; text: string; border: string; accentBorder: string;
  badgeBg: string; headingColor: string;
  quadBg: string; quadText: string; quadSub: string;
}> = {
  structural: {
    label: "Structural", stroke: "#7c3aed", trackStroke: "#ede9fe",
    bg: "bg-white", text: "text-violet-700", border: "border-border",
    accentBorder: "border-l-violet-400", badgeBg: "bg-violet-50", headingColor: "text-violet-600",
    quadBg: "#ede9fe", quadText: "#5b21b6", quadSub: "#6d28d9",
  },
  behavioural: {
    label: "Behavioural", stroke: "#b45309", trackStroke: "#fef3c7",
    bg: "bg-white", text: "text-amber-700", border: "border-border",
    accentBorder: "border-l-amber-400", badgeBg: "bg-amber-50", headingColor: "text-amber-600",
    quadBg: "#fef3c7", quadText: "#78350f", quadSub: "#b45309",
  },
  enablingEnvironment: {
    label: "Enabling Environment", stroke: "#047857", trackStroke: "#d1fae5",
    bg: "bg-white", text: "text-emerald-700", border: "border-border",
    accentBorder: "border-l-emerald-400", badgeBg: "bg-emerald-50", headingColor: "text-emerald-600",
    quadBg: "#d1fae5", quadText: "#064e3b", quadSub: "#047857",
  },
  relational: {
    label: "Relational", stroke: "#1d4ed8", trackStroke: "#dbeafe",
    bg: "bg-white", text: "text-blue-700", border: "border-border",
    accentBorder: "border-l-blue-400", badgeBg: "bg-blue-50", headingColor: "text-blue-600",
    quadBg: "#dbeafe", quadText: "#1e3a8a", quadSub: "#1d4ed8",
  },
};

const MSR_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  proactive:    { label: "Proactive",    color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  transitioning:{ label: "Transitioning",color: "bg-amber-100 text-amber-800 border-amber-300" },
  emerging:     { label: "Emerging",     color: "bg-blue-100 text-blue-800 border-blue-300" },
  reactive:     { label: "Reactive",     color: "bg-rose-100 text-rose-700 border-rose-300" },
  "no-data":    { label: "No data",      color: "bg-muted text-muted-foreground border-border" },
};

function MsrDomainRing({ score, domainKey, size = 52 }: { score: number; domainKey: string; size?: number }) {
  const cfg = MSR_DOMAIN_AI_CONFIG[domainKey];
  const cx = size / 2, cy = size / 2, r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.trackStroke} strokeWidth={7} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={cfg.stroke} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function MsrContinuum({ analysis }: { analysis: MsrAnalysisResult }) {
  const { t } = useTranslation();

  const domains: { key: string; data: MsrDomainAnalysis }[] = [
    { key: "structural",  data: analysis.structural },
    { key: "behavioural", data: analysis.behavioural },
  ];

  const stageFor = (score: number) =>
    score >= 76 ? "proactive" : score >= 51 ? "transitioning" : score >= 26 ? "emerging" : score > 0 ? "reactive" : "no-data";

  const stageLabel = (score: number) => {
    const s = stageFor(score);
    return t("systemicChange.status." + (s === "no-data" ? "noData" : s));
  };

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="flex items-center gap-4 bg-muted/30 rounded-xl border border-border p-4">
        <div className="shrink-0 text-center w-20">
          <div className="text-3xl font-black text-foreground">{analysis.overallScore}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-foreground">{t("systemicChange.marketSystemResilience")}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              analysis.overallScore >= 76 ? MSR_STATUS_LABELS.proactive.color :
              analysis.overallScore >= 51 ? MSR_STATUS_LABELS.transitioning.color :
              analysis.overallScore >= 26 ? MSR_STATUS_LABELS.emerging.color :
              analysis.overallScore > 0   ? MSR_STATUS_LABELS.reactive.color :
              MSR_STATUS_LABELS["no-data"].color
            }`}>
              {stageLabel(analysis.overallScore)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${analysis.overallScore}%`, background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e)" }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug italic">{analysis.trajectoryNarrative}</p>
        </div>
      </div>

      {/* Resilience continuum */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Stage zone header */}
        <div className="grid grid-cols-4 border-b border-border/60">
          {[
            { key: "reactive",      bg: "bg-red-50",    text: "text-red-600"    },
            { key: "emerging",      bg: "bg-orange-50", text: "text-orange-600" },
            { key: "transitioning", bg: "bg-amber-50",  text: "text-amber-600"  },
            { key: "proactive",     bg: "bg-green-50",  text: "text-green-600"  },
          ].map(s => (
            <div key={s.key}
              className={`py-1.5 text-center text-[9px] font-bold uppercase tracking-widest border-r last:border-r-0 border-border/30 ${s.bg} ${s.text}`}>
              {t("systemicChange.status." + s.key)}
            </div>
          ))}
        </div>

        {/* Domain rows */}
        <div className="px-5 py-4 space-y-5">
          {domains.map(({ key, data }) => {
            const cfg = MSR_DOMAIN_AI_CONFIG[key];
            const pct = Math.max(0, Math.min(100, data.score));
            const statusCfg = MSR_STATUS_LABELS[stageFor(data.score)] ?? MSR_STATUS_LABELS["no-data"];
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-bold ${cfg.text}`}>{t("systemicChange.msrDomains." + key)}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-black text-foreground">{data.score}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {stageLabel(data.score)}
                    </span>
                  </div>
                </div>

                {/* Gradient track */}
                <div className="relative h-5 rounded-full"
                  style={{ background: "linear-gradient(to right, #fca5a5 0%, #fdba74 33%, #fde68a 66%, #86efac 100%)" }}>
                  {/* Stage dividers */}
                  {[25, 50, 75].map(x => (
                    <div key={x} className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${x}%` }} />
                  ))}
                  {/* Score marker */}
                  {pct > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                      style={{ left: `${pct}%`, border: `2.5px solid ${cfg.stroke}` }}
                    >
                      <span className="text-[8px] font-black leading-none" style={{ color: cfg.stroke }}>{data.score}</span>
                    </div>
                  )}
                </div>

                {data.headline && (
                  <p className="text-[10px] text-muted-foreground leading-snug">{data.headline}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Axis labels */}
        <div className="flex justify-between px-5 py-2 border-t border-border/40 bg-muted/20">
          <span className="text-[10px] font-semibold text-red-500">← Reactive</span>
          <span className="text-[10px] font-semibold text-muted-foreground">Resilience Continuum</span>
          <span className="text-[10px] font-semibold text-green-600">Proactive →</span>
        </div>
      </div>
    </div>
  );
}

function MsrDomainCard({ domainKey, data }: { domainKey: string; data: MsrDomainAnalysis }) {
  const { t } = useTranslation();
  const cfg = MSR_DOMAIN_AI_CONFIG[domainKey];
  const statusCfg = MSR_STATUS_LABELS[data.status] ?? MSR_STATUS_LABELS["no-data"];
  const [expanded, setExpanded] = useState(false);
  const hasContent = data.findings.length > 0 || data.recommendations.length > 0;
  return (
    <div className={`rounded-xl border overflow-hidden border-l-4 ${cfg.border} ${cfg.accentBorder}`}>
      <button
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${cfg.bg} hover:bg-muted/30 transition-all`}
        onClick={() => setExpanded(p => !p)}
        disabled={!hasContent}
      >
        <div className="shrink-0">
          <MsrDomainRing score={data.score} domainKey={domainKey} size={52} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-bold ${cfg.text}`}>{t("systemicChange.msrDomains."+domainKey)}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusCfg.color}`}>
              {t("systemicChange.status." + (data.status === "no-data" ? "noData" : data.status))}
            </span>
          </div>
          <p className="text-[11px] text-foreground/75 leading-snug line-clamp-2">{data.headline}</p>
        </div>
        {hasContent && (
          expanded
            ? <ChevronUp className={`w-4 h-4 shrink-0 ${cfg.text}`} />
            : <ChevronDown className={`w-4 h-4 shrink-0 ${cfg.text}`} />
        )}
      </button>
      {expanded && hasContent && (
        <div className="px-4 py-3 bg-white/60 border-t border-border/40 space-y-3">
          {data.findings.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{t("systemicChange.keyFindings")}</p>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{t("systemicChange.recommendations")}</p>
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
          {(data.weakComponents && data.weakComponents.length > 0) && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{t("systemicChange.componentsToPrioritise")}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.weakComponents.map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MsrFrameworkDiagram({
  actor,
  scores,
  sel,
  periods,
}: {
  actor?: BusinessModelActor | null;
  scores?: PeriodScores;
  sel?: Record<string, string[]>;
  periods?: string[];
}) {
  const [open, setOpen] = useState(false);

  // Compute average score for a component key across all periods
  const compAvg = (compKey: string): number | null => {
    if (!scores || !sel || !periods) return null;
    const ids = sel[compKey] ?? [];
    const vals = periods.flatMap(p =>
      ids.map(id => scores[p]?.[id]?.score).filter((v): v is number => v != null)
    );
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  const allCompKeys = ["connectivity","diversity","power_dynamics","rule_of_law","cooperation","competition","evidence_decision","business_strategy"];
  const allVals = allCompKeys.map(compAvg).filter((v): v is number => v != null);
  const overallAvg = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
  const positionPct = overallAvg != null ? Math.min(100, Math.max(0, Math.round((overallAvg / 4) * 100))) : null;

  const dotCls = (s: number | null) =>
    s == null ? "bg-slate-200" : s < 1 ? "bg-red-400" : s < 2 ? "bg-orange-400" : s < 3 ? "bg-yellow-400" : "bg-blue-500";
  const scoreLabel = (s: number) =>
    s < 1 ? "Reactive" : s < 2 ? "Reactive-leaning" : s < 3 ? "Proactive-leaning" : "Proactive";
  const scoreLabelColor = (s: number) =>
    s < 1 ? "text-red-600" : s < 2 ? "text-orange-500" : s < 3 ? "text-yellow-600" : "text-blue-600";

  // SVG circle label: actor name split across ≤2 lines
  const svgLines: [string, string | null] = (() => {
    const name = actor?.actorName;
    if (!name) return ["Agent", "Behavior"];
    const words = name.split(" ");
    if (name.length <= 11 || words.length === 1) return [name.slice(0, 12), null];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" ").slice(0, 13), words.slice(mid).join(" ").slice(0, 13)];
  })();

  // Build flat indicator label map from MSR_DOMAINS
  const indicatorLabels: Record<string, string> = {};
  MSR_DOMAINS.forEach(d => d.components.forEach(c =>
    c.indicatorGroups.forEach(g => g.indicators.forEach(ind => {
      indicatorLabels[ind.id] = ind.label;
    }))
  ));

  // Return scored indicators for a component key, sorted best→worst
  const getScoredInds = (compKey: string): { id: string; label: string; avg: number }[] => {
    if (!scores || !sel || !periods) return [];
    const ids = sel[compKey] ?? [];
    return ids
      .map(id => {
        const vals = periods.map(p => scores[p]?.[id]?.score).filter((v): v is number => v != null);
        return { id, label: indicatorLabels[id] ?? id, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
      })
      .filter((x): x is { id: string; label: string; avg: number } => x.avg !== null)
      .sort((a, b) => b.avg - a.avg);
  };

  // Collect unique, non-empty evidence notes across all periods for a component's indicators
  const compNotes = (compKey: string): string[] => {
    if (!scores || !sel || !periods) return [];
    const ids = sel[compKey] ?? [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of ids) {
      for (const p of [...periods].reverse()) { // most-recent period first
        const n = scores[p]?.[id]?.notes?.trim();
        if (n && !seen.has(n)) { seen.add(n); out.push(n); }
      }
    }
    return out;
  };

  // Generate a concise score-only statement for a component (evidence shown separately)
  const compSummary = (compKey: string): string | null => {
    const avg = compAvg(compKey);
    if (avg === null) return null;
    const inds = getScoredInds(compKey);
    if (inds.length === 0) return null;
    const direction =
      avg < 1.5 ? "strongly reactive" :
      avg < 2.0 ? "reactive-leaning" :
      avg < 2.5 ? "transitioning" :
      avg < 3.0 ? "proactive-leaning" : "strongly proactive";
    const top = inds[0];
    const bottom = inds[inds.length - 1];
    const range = inds.length > 1 && Math.abs(top.avg - bottom.avg) > 0.1
      ? ` Range: ${bottom.avg.toFixed(1)}–${top.avg.toFixed(1)}/4.` : "";
    return `Avg ${avg.toFixed(1)}/4 (${direction}).${range}`;
  };

  // All component metadata for evidence panel
  const ALL_COMP_META: { compKey: string; label: string }[] = MSR_DOMAINS.flatMap(d =>
    d.components.map(c => ({ compKey: c.key, label: c.label }))
  );

  // Collect all evidence notes across every component, grouped by component label
  const allEvidenceItems: { label: string; notes: string[] }[] = ALL_COMP_META
    .map(({ compKey, label }) => ({ label, notes: compNotes(compKey) }))
    .filter(x => x.notes.length > 0);

  const cols = {
    reactive: {
      structural: [
        { term: "Connectivity", compKey: "connectivity", desc: "tends to be overly structured or overly atomized." },
        { term: "Diversity", compKey: "diversity", desc: "is limited and specialization is minimal." },
        { term: "Power", compKey: "power_dynamics", desc: "is overly concentrated." },
        { term: "Rule of law", compKey: "rule_of_law", desc: "is informal, group based, with patronage driven access to judiciary." },
      ],
      behavioral: [
        { term: "Cooperation", compKey: "cooperation", desc: "is based on loyalty to group and oriented toward resource capture." },
        { term: "Competition", compKey: "competition", desc: "is externally oriented with aim of damaging competitors." },
        { term: "Decision making", compKey: "evidence_decision", desc: "is based on tradition, beliefs or myths rather than evidence." },
        { term: "Business strategies", compKey: "business_strategy", desc: "are extractive, i.e., based on short-term margin capture." },
      ],
    },
    proactive: {
      structural: [
        { term: "Connectivity", compKey: "connectivity", desc: "tends to fluctuate within a range that is not overly or under connected or isolated." },
        { term: "Diversity", compKey: "diversity", desc: "and specialization are increasing over time." },
        { term: "Power", compKey: "power_dynamics", desc: "tends to fluctuate within a range that allows for multiple power nodes to emerge, i.e., the decentralization of power." },
        { term: "Rule of law", compKey: "rule_of_law", desc: "across groups is institutionalized with a relatively fair judiciary process." },
      ],
      behavioral: [
        { term: "Cooperation", compKey: "cooperation", desc: "is driven by value creation and addition." },
        { term: "Competition", compKey: "competition", desc: "is based on internally driven improvements in performance." },
        { term: "Decision making", compKey: "evidence_decision", desc: "is evidence based." },
        { term: "Business strategies", compKey: "business_strategy", desc: "are focused on delivering value for customers, suppliers and staff." },
      ],
    },
  };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-b border-slate-100"
      >
        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600 flex-1">MSR Framework Reference</span>
        <span className="text-[10px] text-slate-400 mr-1 italic">DAI/USAID · Market Systems Resilience: A Framework for Measurement</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="bg-white p-4 space-y-4">

          {/* Gradient bar + position marker */}
          <div className="space-y-1.5">
            <div className="relative flex items-center h-8 rounded-lg overflow-hidden select-none">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-purple-400 to-blue-600" />
              <span className="relative text-white text-xs font-bold px-4 drop-shadow">← Reactive</span>
              <div className="flex-1" />
              <span className="relative text-white text-xs font-bold px-4 drop-shadow">Proactive →</span>
              {positionPct != null && (
                <div className="absolute top-0 bottom-0 w-px bg-white/90 pointer-events-none" style={{ left: `${positionPct}%` }} />
              )}
            </div>
            {positionPct != null && overallAvg != null && (
              <div className="relative h-5">
                <div className="absolute -translate-x-1/2 flex items-center gap-1.5"
                  style={{ left: `${Math.min(Math.max(positionPct, 10), 90)}%` }}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotCls(overallAvg)}`} />
                  <span className={`text-[11px] font-bold whitespace-nowrap ${scoreLabelColor(overallAvg)}`}>
                    {actor?.actorName ? `${actor.actorName} — ` : ""}{scoreLabel(overallAvg)} ({overallAvg.toFixed(1)}/4)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3-column body */}
          <div className="grid grid-cols-[1fr_190px_1fr] gap-4 items-start">

            {/* Left: Reactive */}
            <div className="space-y-4 text-[11px] text-slate-700">
              {(["structural", "behavioral"] as const).map(dom => (
                <div key={dom}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
                    {dom === "structural" ? "Structural" : "Behavioral"}
                  </p>
                  <ul className="space-y-2.5">
                    {cols.reactive[dom].map(({ term, compKey, desc }) => {
                      const s = compAvg(compKey);
                      const inds = getScoredInds(compKey);
                      return (
                        <li key={term} className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className={`w-2 h-2 rounded-full mt-[2px] shrink-0 border border-white shadow-sm ${dotCls(s)}`}
                              title={s != null ? `${s.toFixed(1)}/4` : "Not scored"} />
                            <span className="leading-snug">
                              <strong className="text-slate-900">{term}</strong> {desc}
                            </span>
                          </div>
                          {compSummary(compKey) && (
                            <p className="ml-3.5 text-[10px] text-slate-500 leading-snug italic">
                              {compSummary(compKey)}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Centre diamond */}
            <div className="flex flex-col items-stretch gap-1.5">
              <div className="grid grid-cols-2 gap-1">
                <div className="text-[10px] leading-snug text-center bg-red-50 border border-red-200 rounded p-2 text-red-800 font-medium">
                  Reinforces group loyalty to cope with current risks
                </div>
                <div className="text-[10px] leading-snug text-center bg-blue-50 border border-blue-200 rounded p-2 text-blue-800 font-medium">
                  Innovates to navigate future risk with new norms
                </div>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-400 tracking-wide shrink-0 select-none"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  Emergent Behaviors
                </span>
                <svg viewBox="0 0 200 120" className="flex-1 h-auto">
                  <defs>
                    <linearGradient id="msrTopGrad2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="50%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#93c5fd" />
                    </linearGradient>
                  </defs>
                  <polygon points="100,6 6,60 100,114" fill="#e2e8f0" />
                  <polygon points="100,6 194,60 100,114" fill="#e2e8f0" />
                  <polygon points="100,6 6,60 194,60" fill="url(#msrTopGrad2)" />
                  <polygon points="6,60 194,60 100,114" fill="#1e293b" />
                  <circle cx="100" cy="60" r="30" fill="white" stroke="#cbd5e1" strokeWidth="1.5" />
                  {svgLines[1] ? (
                    <>
                      <text x="100" y="53" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="700">{svgLines[0]}</text>
                      <text x="100" y="64" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="700">{svgLines[1]}</text>
                      {overallAvg != null && <text x="100" y="75" textAnchor="middle" fill="#64748b" fontSize="8">{overallAvg.toFixed(1)}/4</text>}
                    </>
                  ) : (
                    <>
                      <text x="100" y="57" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700">{svgLines[0]}</text>
                      {overallAvg != null
                        ? <text x="100" y="70" textAnchor="middle" fill="#64748b" fontSize="9">{overallAvg.toFixed(1)}/4</text>
                        : <text x="100" y="70" textAnchor="middle" fill="#94a3b8" fontSize="9">actor</text>
                      }
                    </>
                  )}
                </svg>
                <span className="text-[9px] font-semibold text-slate-400 tracking-wide shrink-0 select-none"
                  style={{ writingMode: "vertical-rl" }}>
                  Emergent Behaviors
                </span>
              </div>

              <div className="text-[10px] leading-snug text-center bg-slate-800 text-slate-100 rounded px-3 py-2 font-medium">
                System evolution is shaped by whether agents are biased toward reactive or proactive risk management
                <div className="mt-1 text-slate-400 tracking-widest">⟵ ⟶</div>
              </div>
            </div>

            {/* Right: Proactive */}
            <div className="space-y-4 text-[11px] text-slate-700">
              {(["structural", "behavioral"] as const).map(dom => (
                <div key={dom}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">
                    {dom === "structural" ? "Structural" : "Behavioral"}
                  </p>
                  <ul className="space-y-2.5">
                    {cols.proactive[dom].map(({ term, compKey, desc }) => {
                      const s = compAvg(compKey);
                      const inds = getScoredInds(compKey);
                      return (
                        <li key={term} className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <span className={`w-2 h-2 rounded-full mt-[2px] shrink-0 border border-white shadow-sm ${dotCls(s)}`}
                              title={s != null ? `${s.toFixed(1)}/4` : "Not scored"} />
                            <span className="leading-snug">
                              <strong className="text-slate-900">{term}</strong> {desc}
                            </span>
                          </div>
                          {compSummary(compKey) && (
                            <p className="ml-3.5 text-[10px] text-slate-500 leading-snug italic">
                              {compSummary(compKey)}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

          </div>

          {/* Combined evidence & notes visual summary */}
          {allEvidenceItems.length > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                Evidence &amp; Notes Summary
              </p>
              <div className="space-y-1.5">
                {allEvidenceItems.map(({ label, notes }) => (
                  <div key={label} className="flex gap-2 items-start">
                    <span className="shrink-0 text-[9px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-sm mt-[1px] leading-tight whitespace-nowrap">
                      {label}
                    </span>
                    <p className="text-[11px] text-slate-700 leading-snug">
                      {notes.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function MsrAIAnalysis({
  msrData, periods, apiBase, theoryId, actors, activeActorId,
}: {
  msrData: MsrData; periods: string[]; apiBase: string; theoryId: number;
  actors: BusinessModelActor[]; activeActorId: string | null;
}) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [analysisMap, setAnalysisMap] = useState<Record<string, MsrAnalysisResult>>({});
  const [pending, setPending] = useState(false);

  const domainKeys = ["structural", "behavioural"] as const;

  const buildActorSummaries = () =>
    msrData.selectedActorIds.map(actorId => {
      const actor = actors.find(a => String(a.id) === actorId);
      const actorScores = msrData.actorScores[actorId] ?? {};
      return {
        actorId,
        actorName: actor?.actorName ?? actorId,
        scoreSummary: MSR_DOMAINS
          .filter(d => ["structural", "behavioural"].includes(d.key))
          .map(domain => ({
            domain: domain.label,
            components: domain.components.map(comp => {
              const ids = msrData.sel[comp.key] ?? [];
              const allVals = periods.flatMap(p =>
                ids.map(id => actorScores[p]?.[id]?.score).filter((v): v is number => v != null)
              );
              const overallAvg = allVals.length
                ? Math.round((allVals.reduce((a, b) => a + b, 0) / allVals.length) * 10) / 10
                : null;
              const byPeriod: Record<string, number | null> = {};
              periods.forEach(p => {
                const vals = ids.map(id => actorScores[p]?.[id]?.score).filter((v): v is number => v != null);
                byPeriod[p] = vals.length
                  ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
                  : null;
              });
              return { component: comp.label, overallAvg, byPeriod };
            }),
          })),
      };
    });

  const noActors = msrData.selectedActorIds.length === 0;
  const hasScores = !noActors && msrData.selectedActorIds.some(actorId => {
    const as = msrData.actorScores[actorId] ?? {};
    return MSR_DOMAINS.some(domain =>
      domain.components.some(comp => {
        const ids = msrData.sel[comp.key] ?? [];
        return periods.some(p => ids.some(id => as[p]?.[id]?.score != null));
      })
    );
  });

  const generate = async () => {
    setPending(true);
    try {
      const res = await fetch(`${apiBase}/theories/${theoryId}/msr-ai-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actorSummaries: buildActorSummaries() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as Record<string, MsrAnalysisResult>;
      setAnalysisMap(data);
    } catch (err) {
      toast({ title: t("systemicChange.analysisFailed"), description: String(err), variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const hasResults = Object.keys(analysisMap).length > 0;

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-background to-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-violet-200 bg-white/60">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">{t("systemicChange.aiResilienceAnalysis")}</h3>
          <p className="text-xs text-muted-foreground">{t("systemicChange.aiResilienceAnalysisDesc")}</p>
        </div>
        <Button
          size="sm"
          onClick={generate}
          disabled={pending || !hasScores}
          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1.5"
        >
          {pending
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("systemicChange.analysing")}</>
            : <><Sparkles className="w-3.5 h-3.5" />{hasResults ? t("systemicChange.regenerate") : t("systemicChange.generateAnalysis")}</>
          }
        </Button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-5">
        {(() => {
          const shownId = activeActorId ?? msrData.selectedActorIds[0] ?? null;
          const shownActor = actors.find(a => String(a.id) === shownId) ?? null;
          const actorPeriodScores = shownId ? (msrData.actorScores[shownId] ?? {}) : {};
          return (
            <MsrFrameworkDiagram
              actor={shownActor}
              scores={actorPeriodScores}
              sel={msrData.sel}
              periods={periods}
            />
          );
        })()}

        {noActors && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No actors selected</p>
            <p className="text-xs text-muted-foreground/70">Select actors above to generate a per-actor resilience analysis.</p>
          </div>
        )}

        {!noActors && !hasScores && !hasResults && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">{t("systemicChange.noScoresYet")}</p>
            <p className="text-xs text-muted-foreground/70">{t("systemicChange.noScoresDesc")}</p>
          </div>
        )}

        {hasScores && !hasResults && !pending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("systemicChange.readyToAnalyse")}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {t("systemicChange.readyToAnalyseDescMsr")}
              </p>
            </div>
          </div>
        )}

        {pending && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm font-semibold text-foreground">{t("systemicChange.analysingMsr")}</p>
            <p className="text-xs text-muted-foreground">{t("systemicChange.analysingMsrDesc")}</p>
          </div>
        )}

        {hasResults && !pending && (() => {
          const shownId = activeActorId ?? msrData.selectedActorIds[0];
          const actor = actors.find(a => String(a.id) === shownId);
          const analysis = shownId ? analysisMap[shownId] : undefined;

          if (!analysis) {
            return (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">
                  No analysis yet for <strong>{actor?.actorName ?? shownId}</strong>
                </p>
                <p className="text-xs text-muted-foreground/70">Click Generate Analysis to run it for all selected actors.</p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {/* Actor label */}
              <div className="flex items-center gap-2 pb-1 border-b border-violet-200">
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-sm font-bold text-foreground">{actor?.actorName ?? shownId}</span>
                <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  MSR_STATUS_LABELS[analysis.structural?.status ?? "no-data"]?.color ?? ""
                }`}>
                  Overall {analysis.overallScore}%
                </span>
              </div>

              {/* Continuum */}
              <MsrContinuum analysis={analysis} />

              {/* Assessment */}
              <div className="rounded-xl border border-border bg-white/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("systemicChange.overallAssessment")}</p>
                <p className="text-sm text-foreground leading-relaxed">{analysis.overallAssessment}</p>
              </div>

              {/* Domain cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {domainKeys.map(k => (
                  <MsrDomainCard key={k} domainKey={k} data={analysis[k]} />
                ))}
              </div>

              {/* Priority actions */}
              {analysis.priorityActions && analysis.priorityActions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">{t("systemicChange.priorityActions")}</p>
                  <ul className="space-y-1.5">
                    {analysis.priorityActions.map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-900 leading-relaxed">
                        <span className="shrink-0 font-black text-amber-600">{i + 1}.</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MsrView({ theoryId, apiBase }: { theoryId: number; apiBase: string }) {
  const { msrData, msrSettings, loaded, load, saveData, saveSettings, actors } = useMsrData(theoryId, apiBase);

  const [scoringCell, setScoringCell] = useState<{ period: string; indicatorId: string; componentKey: string } | null>(null);
  const [selectingFor, setSelectingFor] = useState<string | null>(null);
  const [activeActorId, setActiveActorId] = useState<string | null>(null);

  useEffect(() => { load(); }, [theoryId]);

  // Keep activeActorId in sync with selectedActorIds
  useEffect(() => {
    const ids = msrData.selectedActorIds;
    if (ids.length === 0) { setActiveActorId(null); return; }
    setActiveActorId(prev => ids.includes(prev ?? "") ? prev : ids[0]);
  }, [msrData.selectedActorIds]);

  const periods = msrSettings.startYear && msrSettings.endYear
    ? generatePeriods(msrSettings.startYear, msrSettings.endYear, msrSettings.granularity)
    : [];

  // Scores for the active actor only (used by the matrix)
  const activeScores: PeriodScores = activeActorId ? (msrData.actorScores[activeActorId] ?? {}) : {};

  // Aggregate scores across all selected actors (used by radar charts)
  const aggregatedScores: PeriodScores = {};
  msrData.selectedActorIds.forEach(actorId => {
    Object.entries(msrData.actorScores[actorId] ?? {}).forEach(([p, indMap]) => {
      if (!aggregatedScores[p]) aggregatedScores[p] = {};
      Object.entries(indMap).forEach(([id, s]) => {
        const ex = aggregatedScores[p][id];
        if (!ex || ex.score == null) { aggregatedScores[p][id] = s; }
        else if (s.score != null) { aggregatedScores[p][id] = { score: (ex.score + s.score) / 2, notes: "" }; }
      });
    });
  });

  const hasSidePanel = !!(scoringCell || selectingFor);

  const scoringMeta = (() => {
    if (!scoringCell) return null;
    const domain = MSR_DOMAINS.find(d => d.components.some(c => c.key === scoringCell.componentKey));
    if (!domain) return null;
    const component = domain.components.find(c => c.key === scoringCell.componentKey);
    if (!component) return null;
    let indicator: MsrIndicator | null = null;
    let groupLabel = "";
    for (const g of component.indicatorGroups) {
      const found = g.indicators.find(i => i.id === scoringCell.indicatorId);
      if (found) { indicator = found; groupLabel = g.group; break; }
    }
    if (!indicator) return null;
    return { domain, component, indicator, groupLabel };
  })();

  const selectingMeta = (() => {
    if (!selectingFor) return null;
    const domain = MSR_DOMAINS.find(d => d.components.some(c => c.key === selectingFor));
    if (!domain) return null;
    const component = domain.components.find(c => c.key === selectingFor);
    if (!component) return null;
    return { domain, component };
  })();

  const handleSaveActorIds = (ids: string[]) => {
    saveData({ ...msrData, selectedActorIds: ids });
  };

  const handleEditIndicators = (componentKey: string) => {
    setScoringCell(null);
    setSelectingFor(prev => prev === componentKey ? null : componentKey);
  };

  const handleSelectCell = (period: string, indicatorId: string, componentKey: string) => {
    if (!activeActorId) return;
    setSelectingFor(null);
    setScoringCell(prev =>
      prev?.period === period && prev?.indicatorId === indicatorId ? null : { period, indicatorId, componentKey }
    );
  };

  const handleSaveIndicators = (componentKey: string, ids: string[]) => {
    saveData({ ...msrData, sel: { ...msrData.sel, [componentKey]: ids } });
  };

  const handleSaveScore = (period: string, indicatorId: string, score: MsrScore) => {
    if (!activeActorId) return;
    saveData({
      ...msrData,
      actorScores: {
        ...msrData.actorScores,
        [activeActorId]: {
          ...(msrData.actorScores[activeActorId] ?? {}),
          [period]: { ...(msrData.actorScores[activeActorId]?.[period] ?? {}), [indicatorId]: score },
        },
      },
    });
    setScoringCell(null);
  };

  if (!loaded) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <MsrSettingsPanel settings={msrSettings} onSave={saveSettings} />

      {/* Actor selector */}
      <MsrActorSelector
        actors={actors}
        selectedIds={msrData.selectedActorIds}
        onChange={handleSaveActorIds}
      />

      {/* Scale legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mr-1">Scale:</span>
        {MSR_SCALE.map(s => (
          <span key={s.value} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border"
            style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
            <span className="font-black">{s.value}</span> = {s.label}
          </span>
        ))}
      </div>

      {/* Legend for indicator types */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Indicator types:</span>
        <span className="bg-blue-100 text-blue-600 font-black px-1.5 py-0.5 rounded">F</span>
        <span className="-ml-1.5">Function</span>
        <span className="bg-purple-100 text-purple-600 font-black px-1.5 py-0.5 rounded">S</span>
        <span className="-ml-1.5">Structure</span>
      </div>

      {/* Actor tabs (when multiple actors selected) */}
      {msrData.selectedActorIds.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mr-1">Scoring for:</span>
          {msrData.selectedActorIds.map(id => {
            const actor = actors.find(a => String(a.id) === id);
            const isActive = id === activeActorId;
            return (
              <button key={id} onClick={() => { setActiveActorId(id); setScoringCell(null); setSelectingFor(null); }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                  isActive ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-foreground border-border hover:border-indigo-300"
                }`}>
                {actor?.actorName ?? id}
              </button>
            );
          })}
        </div>
      )}
      {msrData.selectedActorIds.length === 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>Scoring indicators for <strong className="text-foreground">{actors.find(a => String(a.id) === activeActorId)?.actorName ?? activeActorId}</strong></span>
        </div>
      )}

      {/* Matrix + side panel */}
      {msrData.selectedActorIds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Select actors above to start scoring</p>
        </div>
      ) : (
        <div className={hasSidePanel ? "flex gap-4 items-start" : ""}>
          <div className={hasSidePanel ? "flex-1 min-w-0 overflow-x-auto" : ""}>
            <MsrMatrix
              periods={periods}
              sel={msrData.sel}
              scores={activeScores}
              scoringCell={scoringCell}
              selectingFor={selectingFor}
              onSelectCell={handleSelectCell}
              onEditIndicators={handleEditIndicators}
            />
          </div>

          {scoringCell && scoringMeta && (
            <div className="w-[380px] shrink-0 sticky top-4">
              <MsrIndicatorScorePanel
                period={scoringCell.period}
                indicator={scoringMeta.indicator}
                groupLabel={scoringMeta.groupLabel}
                domain={scoringMeta.domain}
                component={scoringMeta.component}
                score={activeScores[scoringCell.period]?.[scoringCell.indicatorId] ?? { score: null, notes: "" }}
                onSave={s => handleSaveScore(scoringCell.period, scoringCell.indicatorId, s)}
                onClose={() => setScoringCell(null)}
              />
            </div>
          )}

          {selectingFor && selectingMeta && (
            <div className="w-[420px] shrink-0 sticky top-4 max-h-[80vh] flex flex-col">
              <MsrIndicatorSelectPanel
                component={selectingMeta.component}
                domain={selectingMeta.domain}
                selectedIds={msrData.sel[selectingFor] ?? []}
                onSave={ids => handleSaveIndicators(selectingFor, ids)}
                onClose={() => setSelectingFor(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Radar charts — aggregated across all selected actors */}
      <MsrRadarCharts sel={msrData.sel} scores={aggregatedScores} periods={periods} />

      {/* AI resilience analysis — shows active actor's result */}
      <MsrAIAnalysis
        msrData={msrData}
        periods={periods}
        apiBase={apiBase}
        theoryId={theoryId}
        actors={actors}
        activeActorId={activeActorId}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemicChange() {
  const { t } = useTranslation();
  const [, params] = useRoute("/theory/:id/systemic-change");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  useEffect(() => {
    if (user && !getPermissions(user.role).canViewDetail) setLocation("/");
  }, [user?.role]);
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
  const [localSettings, setLocalSettings] = useState<AaerSettings>({ startYear: 0, endYear: 0, granularity: "annual", pilotDuration: "none", enabledStages: ["adopt","adapt","expand","respond"], periodStageMap: {}, customQuestions: {}, pilotPeriods: [] });
  const [settingsSynced, setSettingsSynced] = useState(false);

  const loadEntries = async () => {
    if (!id || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/theories/${id}/systemic-changes`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      setEntries(await res.json());
    } catch (err) {
      toast({ title: t("systemicChange.failedToLoad"), description: String(err), variant: "destructive" });
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
        pilotPeriods: (() => {
          try {
            const arr = JSON.parse(String((t as any).pilotPeriods ?? "[]"));
            if (Array.isArray(arr) && arr.length > 0) return arr;
          } catch { /* fall through */ }
          const dur = (t.pilotDuration as PilotDuration) ?? "none";
          const gran = (t.periodGranularity as Granularity) ?? "annual";
          return generatePilotPeriods(dur, gran);
        })(),
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
        pilotPeriods: JSON.stringify(s.pilotPeriods),
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
      toast({ title: t("systemicChange.failedToCreate"), description: String(err), variant: "destructive" });
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
      toast({ title: t("systemicChange.failedToUpdate"), description: String(err), variant: "destructive" });
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!window.confirm(t("systemicChange.deleteConfirm"))) return;
    try {
      await fetch(`${API_BASE}/theories/${id}/systemic-changes/${entryId}`, { method: "DELETE", credentials: "include" });
      setEntries(prev => prev.filter(e => e.id !== entryId));
      setCellModal(null);
    } catch (err) {
      toast({ title: t("systemicChange.failedToDelete"), description: String(err), variant: "destructive" });
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
            <p className="text-xs text-muted-foreground">{t("theory.systemicChange")} — {t("systemicChange.selectFramework")}</p>
          </div>
        </header>
        <FrameworkSelector onSelect={handleSelectFramework} />
      </div>
    );
  }

  const isAaer = localFrameworkKey === "aaer";
  const isMsr  = localFrameworkKey === "msr";

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
            <p className="text-xs text-muted-foreground">{t("theory.systemicChange")}</p>
            <span className={`text-[10px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-full ${fw!.accent}`}>{fw!.abbr}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSelector(true)}>
            <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t("systemicChange.switchFramework")}</span>
          </Button>
          {!isAaer && !isMsr && (
            <Button size="sm" className="gap-2" onClick={() => { setAddingRow(true); setEditingId(null); }}>
              <Plus className="w-4 h-4" />{t("systemicChange.addEntry")}
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
              <span className="text-sm font-bold">{t(`systemicChange.frameworks.${fw!.key}.label`)}</span>
              <span className="text-[10px] text-muted-foreground">· {fw!.org}</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{t(`systemicChange.frameworks.${fw!.key}.description`)}</p>
          </div>
        </div>

        {/* MSR: independent heatmap — settings are managed inside MsrView */}
        {isMsr && (
          <MsrView theoryId={id} apiBase={API_BASE} />
        )}

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
                  pilotPeriods={localSettings.pilotPeriods}
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
                    pilotPeriods={localSettings.pilotPeriods}
                  />
                </div>
              )}
            </div>
            <SystemicChangeAIAnalysis theoryId={id} hasEntries={entries.length > 0} />
          </>
        )}

        {/* Non-AAER / Non-MSR: Table */}
        {!isAaer && !isMsr && fw!.cols.length > 0 && (
          <>
            <div className="rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-10">{t("systemicChange.rowNum")}</th>
                      {fw!.cols.map(col => (
                        <th key={col.key} className={`text-left px-3 py-3 font-semibold text-muted-foreground text-xs ${col.width ?? ""}`}>
                          <div className="flex items-center gap-1">
                            {t(`systemicChange.frameworks.${fw!.key}.cols.${col.key}`, { defaultValue: col.header })}
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
                          <p className="text-sm font-medium text-muted-foreground">{t("systemicChange.noEntriesYet")}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">{t("systemicChange.noEntriesHintTable")}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {!addingRow && entries.length > 0 && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { setAddingRow(true); setEditingId(null); }}>
                <Plus className="w-4 h-4" />{t("systemicChange.addEntry")}
              </Button>
            )}
          </>
        )}

      </div>

    </div>
  );
}
