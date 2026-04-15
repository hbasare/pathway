import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetTheory,
  useUpdateComponentIndicator,
  getGetTheoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Calculator, Loader2, ChevronDown, Plus, Trash2 } from "lucide-react";
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
const YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => {
  const y = currentYear - 10 + i;
  return { value: String(y), label: String(y) };
});

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

interface YearPickerProps {
  value: string;
  onChange: (val: string) => void;
}

function YearPicker({ value, onChange }: YearPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors min-w-[52px]"
          title="Change year"
        >
          <span>{value || <span className="text-muted-foreground font-normal text-xs">Year</span>}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-24 max-h-64 overflow-y-auto">
        {YEAR_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={value === opt.value ? "bg-primary/10 text-primary font-semibold" : ""}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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

function ScYearRow({ theoryId, componentId, indicatorId, row, shade, onRefresh }: ScYearRowProps) {
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
    <tr className={`border-b border-border/30 last:border-0 align-top group ${shade ? "bg-muted/10" : "bg-card"}`}>
      {/* Year */}
      <td className="px-3 py-2.5 border-r border-border/30 w-[80px]">
        <YearPicker
          value={row.year}
          onChange={v => save("year", v)}
        />
      </td>

      {/* Target */}
      <td className="px-3 py-2.5 bg-amber-50/40 border-r border-border/30">
        <EditableCell
          value={row.target}
          placeholder="Enter target..."
          onSave={v => save("target", v)}
        />
      </td>

      {/* Target assumptions */}
      <td className="px-3 py-2.5 bg-amber-50/20 border-r border-border/30">
        <EditableCell
          value={row.targetNotes}
          placeholder="Assumptions / source..."
          onSave={v => save("targetNotes", v)}
        />
      </td>

      {/* Actual */}
      <td className="px-3 py-2.5 bg-emerald-50/40 border-r border-border/30">
        <EditableCell
          value={row.actual}
          placeholder="Enter actual..."
          onSave={v => save("actual", v)}
        />
      </td>

      {/* Actual assumptions */}
      <td className="px-3 py-2.5 bg-emerald-50/20 border-r border-border/30">
        <EditableCell
          value={row.actualNotes}
          placeholder="Assumptions / source..."
          onSave={v => save("actualNotes", v)}
        />
      </td>

      {/* Notes + delete */}
      <td className="px-3 py-2.5">
        <div className="flex items-start gap-1">
          <div className="flex-1">
            <EditableCell
              value={row.notes}
              placeholder="Notes..."
              onSave={v => save("notes", v)}
            />
          </div>
          <button
            onClick={deleteRow}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5 text-muted-foreground hover:text-destructive"
            title="Remove year row"
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

  const sortedComponents = [...(theory.components ?? [])].sort(
    (a, b) => (COLUMN_ORDER[a.type] ?? 99) - (COLUMN_ORDER[b.type] ?? 99)
  );

  const rows: Array<{
    component: typeof sortedComponents[number];
    indicator: NonNullable<typeof sortedComponents[number]["componentIndicators"]>[number];
  }> = [];

  for (const comp of sortedComponents) {
    for (const ind of comp.componentIndicators ?? []) {
      rows.push({ component: comp, indicator: ind });
    }
  }

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
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Calculator className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No indicators yet</p>
            <p className="text-xs text-muted-foreground">
              Add indicators to your components via the Theory of Change tab.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden shadow-sm" style={{ minWidth: 1000 }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  {/* Description & Indicator */}
                  <th className="w-72 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                    <div>Description &amp; Indicator</div>
                    <div className="text-[9px] font-normal normal-case text-muted-foreground/60 mt-0.5">From Theory of Change</div>
                  </th>

                  {/* Year */}
                  <th className="w-20 px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                    Year
                  </th>

                  {/* Target */}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-700 border-r border-border/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      Target
                    </span>
                  </th>

                  {/* Target assumptions */}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-amber-600 border-r border-border/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-300 inline-block" />
                      Assumptions / Source
                    </span>
                  </th>

                  {/* Actual */}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-emerald-700 border-r border-border/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      Actual
                    </span>
                  </th>

                  {/* Actual assumptions */}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-emerald-600 border-r border-border/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
                      Assumptions / Source
                    </span>
                  </th>

                  {/* Notes */}
                  <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                      Notes
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ component, indicator }, rowIdx) => {
                  const isEven = rowIdx % 2 === 0;
                  const typeCls = TYPE_COLORS[component.type] ?? "bg-gray-100 text-gray-800 border-gray-200";
                  const ind = indicator as any;
                  const scYears: ScYear[] = ind.scYears ?? [];

                  return (
                    <>
                      {/* ── Indicator header row ── */}
                      <tr
                        key={`ind-${indicator.id}`}
                        className={`border-b border-border/50 align-top ${isEven ? "bg-card" : "bg-muted/20"}`}
                      >
                        {/* Description col — spans all year sub-rows + header + add-year row */}
                        <td
                          className="px-4 py-3 border-r border-border/40 align-top"
                          rowSpan={scYears.length + 2}
                        >
                          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mb-1.5 ${typeCls}`}>
                            {component.type}
                          </span>
                          <p className="text-xs font-semibold text-foreground leading-snug">{component.title}</p>
                          {component.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2 leading-relaxed">{component.description}</p>
                          )}
                          <div className="border-t border-border/40 my-2" />
                          <p className="text-xs text-foreground font-medium leading-relaxed mb-2">
                            {indicator.name || <em className="text-muted-foreground">Unnamed indicator</em>}
                          </p>
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                              Frequency
                            </p>
                            <PeriodPicker
                              value={ind.measurementFrequency ?? ""}
                              onChange={v => saveIndicator(component.id, indicator.id, "measurementFrequency", v)}
                            />
                          </div>
                        </td>

                        {/* Empty cells for the header row (Year + data cols) */}
                        <td colSpan={6} className={`px-3 py-1.5 ${isEven ? "bg-card" : "bg-muted/20"}`}>
                          <span className="text-[10px] text-muted-foreground/50 italic">
                            {scYears.length === 0 ? "No year rows yet — add one below" : ""}
                          </span>
                        </td>
                      </tr>

                      {/* ── Year sub-rows ── */}
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

                      {/* ── Add year row ── */}
                      <tr key={`add-${indicator.id}`} className={`border-b border-border/50 ${isEven ? "bg-card" : "bg-muted/20"}`}>
                        <td colSpan={6} className="px-3 py-1.5">
                          <button
                            onClick={() => addYearRow(indicator.id, scYears.length)}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add year
                          </button>
                        </td>
                      </tr>
                    </>
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
