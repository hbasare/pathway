import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetTheory,
  useUpdateComponentIndicator,
  getGetTheoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Calculator, Loader2, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_COLORS: Record<string, string> = {
  opportunity: "bg-emerald-100 text-emerald-800 border-emerald-200",
  input:    "bg-blue-100 text-blue-800 border-blue-200",
  activity: "bg-purple-100 text-purple-800 border-purple-200",
  output:   "bg-teal-100 text-teal-800 border-teal-200",
  outcome:  "bg-orange-100 text-orange-800 border-orange-200",
  impact:   "bg-rose-100 text-rose-800 border-rose-200",
};

const COLUMN_ORDER: Record<string, number> = {
  opportunity: 0, input: 1, activity: 2, output: 3, outcome: 4, impact: 5,
};

const PERIOD_OPTIONS = [
  { value: "weekly",        label: "Weekly" },
  { value: "monthly",       label: "Monthly" },
  { value: "semi-annually", label: "Semi-Annually" },
  { value: "annually",      label: "Annually" },
];

const currentYear = new Date().getFullYear();

function getPeriodLabel(val: string | null | undefined) {
  if (!val?.trim()) return "Select Period";
  return PERIOD_OPTIONS.find(o => o.value === val)?.label ?? val;
}

// ── Editable cell ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
}

function EditableCell({ value, placeholder, onSave, multiline = true, className = "" }: EditableCellProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const trigger = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(v), 700);
  };

  if (!multiline) {
    return (
      <input
        className={`w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/40 focus:ring-0 ${className}`}
        placeholder={placeholder}
        value={local}
        onChange={e => { setLocal(e.target.value); trigger(e.target.value); }}
        onBlur={() => { if (timer.current) clearTimeout(timer.current); onSave(local); }}
      />
    );
  }

  return (
    <textarea
      className={`w-full bg-transparent border-none outline-none resize-none text-xs text-foreground placeholder:text-muted-foreground/40 focus:ring-0 leading-relaxed min-h-[36px] ${className}`}
      placeholder={placeholder}
      value={local}
      rows={2}
      onChange={e => {
        setLocal(e.target.value);
        trigger(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
      }}
      onBlur={() => { if (timer.current) clearTimeout(timer.current); onSave(local); }}
    />
  );
}

// ── Period picker ─────────────────────────────────────────────────────────────

interface PeriodPickerProps {
  value: string | null | undefined;
  onChange: (val: string) => void;
}

function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const hasValue = value && value.trim();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border transition-colors
            ${hasValue
              ? "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            }`}
        >
          <span>{getPeriodLabel(value)}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 max-h-72 overflow-y-auto">
        <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Frequency
        </div>
        {PERIOD_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={value === opt.value ? "bg-violet-50 text-violet-700 font-medium" : ""}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
        {hasValue && (
          <DropdownMenuItem
            onClick={() => onChange("")}
            className="text-muted-foreground text-xs border-t mt-1"
          >
            Clear
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Year picker ───────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
}

function DatePicker({ value, onChange }: DatePickerProps) {
  const [editing, setEditing] = useState(false);

  // Normalise stored value → yyyy-MM-dd for the input, display as readable label
  const toInputValue = (v: string) => {
    if (!v) return "";
    // Already ISO date
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // Bare year e.g. "2024" → "2024-01-01"
    if (/^\d{4}$/.test(v)) return `${v}-01-01`;
    return "";
  };

  const toDisplay = (v: string) => {
    if (!v) return null;
    const d = new Date(toInputValue(v) || v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={toInputValue(value)}
        className="text-xs font-semibold text-foreground bg-transparent border-b border-primary outline-none w-[130px]"
        onBlur={e => {
          if (e.target.value) onChange(e.target.value);
          setEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      title="Click to change date"
    >
      {value
        ? <span>{toDisplay(value)}</span>
        : <span className="text-muted-foreground font-normal text-xs">Set date…</span>}
      <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
    </button>
  );
}

// ── SC Year row ───────────────────────────────────────────────────────────────

interface ScYear {
  id: number;
  indicatorId: number;
  year: string;
  target: string;
  targetNotes: string;
  actual: string;
  actualDate: string;
  actualNotes: string;
  notes: string;
  position: number;
}

interface ScYearRowProps {
  theoryId: number;
  componentId: number;
  indicatorId: number;
  row: ScYear;
  isLast: boolean;
  shade: boolean;
  onRefresh: () => void;
}

function ScYearRow({ theoryId, indicatorId, row, shade, onRefresh }: ScYearRowProps) {
  const save = useCallback(async (field: string, value: string) => {
    await fetch(`/api/theories/${theoryId}/indicators/${indicatorId}/sc-years/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onRefresh();
  }, [theoryId, indicatorId, row.id, onRefresh]);

  const deleteRow = async () => {
    await fetch(`/api/theories/${theoryId}/indicators/${indicatorId}/sc-years/${row.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    onRefresh();
  };

  return (
    <tr className={`border-b border-border/30 last:border-0 align-middle group ${shade ? "bg-muted/10" : "bg-card"}`}>
      {/* Col 1 — Target date, indented under the indicator */}
      <td className="pl-8 pr-3 py-2 border-r border-border/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600/70 shrink-0">Target</span>
          <DatePicker
            value={row.year}
            onChange={v => save("year", v)}
          />
        </div>
      </td>

      {/* Target */}
      <td className="px-3 py-2 bg-amber-50/40 border-r border-border/30">
        <EditableCell
          value={row.target}
          placeholder="Enter target..."
          onSave={v => save("target", v)}
        />
      </td>

      {/* Target Notes */}
      <td className="px-3 py-2 bg-amber-50/20 border-r border-border/30">
        <EditableCell
          value={row.targetNotes}
          placeholder="Target notes..."
          onSave={v => save("targetNotes", v)}
        />
      </td>

      {/* Actual */}
      <td className="px-3 py-2 bg-emerald-50/40 border-r border-border/30">
        <div className="mb-1">
          <DatePicker
            value={row.actualDate}
            onChange={v => save("actualDate", v)}
          />
        </div>
        <EditableCell
          value={row.actual}
          placeholder="Enter actual..."
          onSave={v => save("actual", v)}
        />
      </td>

      {/* Actual Notes + delete */}
      <td className="px-3 py-2 bg-emerald-50/20">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <EditableCell
              value={row.actualNotes}
              placeholder="Actual notes..."
              onSave={v => save("actualNotes", v)}
            />
          </div>
          <button
            onClick={deleteRow}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 text-muted-foreground hover:text-destructive"
            title="Remove year"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SupportCalculations() {
  const [, params] = useRoute("/theory/:id/support-calculations");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: theory, isLoading, error } = useGetTheory(id, {
    query: { enabled: !!id }
  });

  const updateIndicator = useUpdateComponentIndicator({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(id) }),
    },
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(id) });
  }, [queryClient, id]);

  const addYearRow = async (indicatorId: number, position: number) => {
    const nextYear = String(currentYear);
    await fetch(`/api/theories/${id}/indicators/${indicatorId}/sc-years`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: nextYear, position }),
    });
    refresh();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !theory) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Theory not found.</p>
        <Button onClick={() => setLocation("/")}>Back to Dashboard</Button>
      </div>
    );
  }

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [indAggMode, setIndAggMode] = useState<Record<number, "sum" | "avg" | "count">>({});
  const getAggMode = (indicatorId: number) => indAggMode[indicatorId] ?? "sum";
  const setAggMode = (indicatorId: number, mode: "sum" | "avg" | "count") =>
    setIndAggMode(prev => ({ ...prev, [indicatorId]: mode }));

  const aggregate = (values: string[], mode: "sum" | "avg" | "count"): string => {
    const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (nums.length === 0) return "—";
    if (mode === "count") return String(nums.length);
    const total = nums.reduce((a, b) => a + b, 0);
    if (mode === "avg") return (total / nums.length).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return total.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const toggleCollapse = (compId: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(compId)) next.delete(compId); else next.add(compId);
      return next;
    });
  };

  const sortedComponents = [...(theory.components ?? [])].sort(
    (a, b) => (COLUMN_ORDER[a.type] ?? 99) - (COLUMN_ORDER[b.type] ?? 99)
  );

  const componentGroups = sortedComponents
    .filter(comp => comp.type !== "input")
    .map(comp => ({ component: comp, indicators: comp.componentIndicators ?? [] }));

  const saveIndicator = (componentId: number, indicatorId: number, field: string, value: string) => {
    updateIndicator.mutate({
      theoryId: id,
      componentId,
      id: indicatorId,
      data: { [field]: value },
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b bg-card shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/theory/${id}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Support Calculations</h1>
              <p className="text-xs text-muted-foreground">{theory.title}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </header>

      {/* Print title */}
      <div className="hidden print:block px-6 pt-6 pb-2">
        <h1 className="text-xl font-bold">{theory.title} — Support Calculations</h1>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {componentGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Calculator className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No components yet</p>
            <p className="text-xs text-muted-foreground">
              Add components to your Theory of Change first.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden shadow-sm" style={{ minWidth: 1000 }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="w-56 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                    <div>Indicator / Year</div>
                    <div className="text-[9px] font-normal normal-case text-muted-foreground/60 mt-0.5">Years listed below each indicator</div>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-700 border-r border-border/40">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Target</span>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-600 border-r border-border/40">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" />Target Notes</span>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-emerald-700 border-r border-border/40">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Actual</span>
                  </th>
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />Actual Notes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {componentGroups.map(({ component, indicators }) => {
                  const isCollapsed = collapsed.has(component.id);
                  const typeCls = TYPE_COLORS[component.type] ?? "bg-gray-100 text-gray-800 border-gray-200";

                  return (
                    <Fragment key={component.id}>
                      {/* ── Component (description) header row — collapsible ── */}
                      <tr
                        className="border-b border-border/60 bg-muted/70 cursor-pointer hover:bg-muted/90 transition-colors select-none"
                        onClick={() => toggleCollapse(component.id)}
                      >
                        <td colSpan={5} className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`}
                            />
                            <span className={`shrink-0 inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeCls}`}>
                              {component.type}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{component.title}</span>
                            {component.description && (
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">{component.description}</span>
                            )}
                            <span className="ml-auto text-[10px] text-muted-foreground/60">
                              {indicators.length} indicator{indicators.length !== 1 ? "s" : ""}
                              {isCollapsed ? " — click to expand" : ""}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* ── Indicators (hidden when collapsed) ── */}
                      {!isCollapsed && indicators.length === 0 && (
                        <tr className="border-b border-border/30 bg-card">
                          <td colSpan={5} className="pl-9 pr-4 py-3">
                            <span className="text-[11px] text-muted-foreground/60 italic">
                              No indicators added yet — add them from the Theory of Change tab.
                            </span>
                          </td>
                        </tr>
                      )}
                      {!isCollapsed && indicators.map((indicator, indIdx) => {
                        const isEven = indIdx % 2 === 0;
                        const ind = indicator as any;
                        const scYears: ScYear[] = ind.scYears ?? [];

                        return (
                          <Fragment key={indicator.id}>
                            {/* Indicator summary row — ToC values + year aggregate sub-label */}
                            {(() => {
                              const mode = getAggMode(indicator.id);
                              const targetAgg = aggregate(scYears.map(y => y.target ?? ""), mode);
                              const actualAgg = aggregate(scYears.map(y => y.actual ?? ""), mode);
                              return (
                                <tr className={`border-b border-border/30 ${isEven ? "bg-amber-50/20" : "bg-amber-50/30"}`}>
                                  {/* Col 1 — name, mode toggle, and aggregate set buttons */}
                                  <td className="pl-9 pr-3 py-2 border-r border-border/30">
                                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                      <span className="text-[11px] font-semibold text-foreground">
                                        {indicator.name || <em className="text-muted-foreground font-normal">Unnamed indicator</em>}
                                      </span>
                                      <div className="flex items-center rounded border border-border/60 overflow-hidden text-[9px] font-semibold shrink-0">
                                        {(["sum", "avg", "count"] as const).map(m => (
                                          <button
                                            key={m}
                                            onClick={() => setAggMode(indicator.id, m)}
                                            className={`px-1.5 py-0.5 uppercase tracking-wide transition-colors ${
                                              mode === m
                                                ? "bg-primary/90 text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted"
                                            }`}
                                          >
                                            {m === "sum" ? "Σ" : m === "avg" ? "Ø" : "#"}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Aggregate results with set buttons */}
                                    {(targetAgg !== "—" || actualAgg !== "—") && (
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {targetAgg !== "—" && (
                                          <button
                                            onClick={() => saveIndicator(component.id, indicator.id, "targetFigure", targetAgg)}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 text-[9px] font-semibold transition-colors"
                                            title="Apply as set target"
                                          >
                                            <span className="text-amber-500">T</span> {mode === "sum" ? "Σ" : mode === "avg" ? "Ø" : "#"} {targetAgg} → set target
                                          </button>
                                        )}
                                        {actualAgg !== "—" && (
                                          <button
                                            onClick={() => saveIndicator(component.id, indicator.id, "actualFigure", actualAgg)}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[9px] font-semibold transition-colors"
                                            title="Apply as set actual"
                                          >
                                            <span className="text-emerald-500">A</span> {mode === "sum" ? "Σ" : mode === "avg" ? "Ø" : "#"} {actualAgg} → set actual
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  {/* Target — editable ToC value only */}
                                  <td className="px-3 py-2 bg-amber-100/50 border-r border-border/30">
                                    <EditableCell
                                      value={ind.targetFigure ?? ""}
                                      placeholder="Set target…"
                                      onSave={v => saveIndicator(component.id, indicator.id, "targetFigure", v)}
                                      className="text-[11px] font-semibold text-amber-900"
                                    />
                                  </td>
                                  {/* Target Notes */}
                                  <td className="px-3 py-2 bg-amber-50/30 border-r border-border/30">
                                    <EditableCell
                                      value={ind.targetSourceOfInformation ?? ""}
                                      placeholder="Target notes…"
                                      onSave={v => saveIndicator(component.id, indicator.id, "targetSourceOfInformation", v)}
                                      className="text-[11px] text-muted-foreground"
                                    />
                                  </td>
                                  {/* Actual — editable ToC value only */}
                                  <td className="px-3 py-2 bg-emerald-100/50 border-r border-border/30">
                                    <EditableCell
                                      value={ind.actualFigure ?? ""}
                                      placeholder="Set actual…"
                                      onSave={v => saveIndicator(component.id, indicator.id, "actualFigure", v)}
                                      className="text-[11px] font-semibold text-emerald-900"
                                    />
                                  </td>
                                  {/* Actual Notes */}
                                  <td className="px-3 py-2 bg-emerald-50/20">
                                    <EditableCell
                                      value={ind.actualSourceOfInformation ?? ""}
                                      placeholder="Actual notes…"
                                      onSave={v => saveIndicator(component.id, indicator.id, "actualSourceOfInformation", v)}
                                      className="text-[11px] text-muted-foreground"
                                    />
                                  </td>
                                </tr>
                              );
                            })()}

                            {/* Year sub-rows */}
                            {scYears.map((yr, yi) => (
                              <ScYearRow
                                key={yr.id}
                                theoryId={id}
                                componentId={component.id}
                                indicatorId={indicator.id}
                                row={yr}
                                isLast={yi === scYears.length - 1}
                                shade={yi % 2 === 1}
                                onRefresh={refresh}
                              />
                            ))}

                            {/* Add year row */}
                            <tr className={`border-b border-border/40 ${isEven ? "bg-card" : "bg-muted/15"}`}>
                              <td colSpan={5} className="pl-12 pr-3 py-1.5">
                                <button
                                  onClick={() => addYearRow(indicator.id, scYears.length)}
                                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add year
                                </button>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
