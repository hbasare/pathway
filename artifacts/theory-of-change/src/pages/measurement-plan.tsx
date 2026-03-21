import React from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory } from "@workspace/api-client-react";
import {
  ArrowLeft, Printer, CalendarClock, CheckCircle2, Clock,
  AlertCircle, MinusCircle, MessageSquare, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

type StatusInfo = { label: string; color: string; icon: React.ElementType };

function getStatus(targetDate?: string | null, targetFigure?: string | null, actualFigure?: string | null): StatusInfo {
  if (actualFigure && actualFigure.trim()) {
    return { label: "Achieved", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2 };
  }
  if (targetDate && targetDate.trim()) {
    const target = new Date(targetDate);
    const now = new Date();
    if (target < now) {
      return { label: "Overdue", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle };
    }
    return { label: "Planned", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock };
  }
  if (targetFigure && targetFigure.trim()) {
    return { label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-200", icon: CalendarClock };
  }
  return { label: "Not Set", color: "bg-gray-100 text-gray-500 border-gray-200", icon: MinusCircle };
}

export default function MeasurementPlan() {
  const [, params] = useRoute("/theory/:id/measurement-plan");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();

  const { data: theory, isLoading, error } = useGetTheory(id, {
    query: { enabled: !!id }
  });

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
        <h2 className="text-2xl font-bold mb-2">Theory Not Found</h2>
        <Button onClick={() => setLocation("/")}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      </div>
    );
  }

  const sorted = [...theory.components].sort((a, b) => {
    const colDiff = (COLUMN_ORDER[a.type] ?? 99) - (COLUMN_ORDER[b.type] ?? 99);
    return colDiff !== 0 ? colDiff : a.id - b.id;
  });

  const sortedById = [...theory.components].sort((a, b) => a.id - b.id);
  const boxNum = (id: number) => sortedById.findIndex(c => c.id === id) + 1;

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const totalIndicators = sorted.reduce((sum, c) => sum + (c.componentIndicators?.length ?? 0), 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <header className="print:hidden flex-none flex items-center justify-between px-6 py-4 border-b bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/theory/${id}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Canvas
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{theory.title}</h1>
            <p className="text-xs text-muted-foreground">Measurement Plan</p>
          </div>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Print / Export PDF
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-8 print:px-4 print:py-6">

          {/* Document header */}
          <div className="mb-8 print:mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Measurement Plan</p>
                <h2 className="text-3xl font-bold text-foreground mb-2 print:text-2xl">{theory.title}</h2>
                {theory.description && (
                  <p className="text-sm text-muted-foreground max-w-2xl">{theory.description}</p>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0 ml-6">
                <p>Generated: {today}</p>
                <p>{sorted.length} component{sorted.length !== 1 ? "s" : ""}</p>
                <p>{totalIndicators} indicator{totalIndicators !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="print:hidden mb-4 flex flex-wrap gap-3 text-xs">
            {[
              { label: "Achieved", color: "bg-emerald-100 text-emerald-800" },
              { label: "Planned", color: "bg-amber-100 text-amber-800" },
              { label: "Overdue", color: "bg-red-100 text-red-800" },
              { label: "In Progress", color: "bg-blue-100 text-blue-800" },
              { label: "Not Set", color: "bg-gray-100 text-gray-500" },
            ].map(s => (
              <span key={s.label} className={`px-2 py-1 rounded-full font-medium border ${s.color}`}>{s.label}</span>
            ))}
            <span className="ml-2 flex items-center gap-1.5 text-violet-600 font-medium">
              <MessageSquare className="w-3 h-3" /> Qualitative
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 font-medium">
              <BarChart3 className="w-3 h-3" /> Quantitative
            </span>
          </div>

          {/* Main table */}
          <div className="rounded-xl border border-border overflow-hidden shadow-sm print:shadow-none print:border print:rounded-none overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ minWidth: "1060px" }}>
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10 text-xs">#</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-20 text-xs">Type</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs" style={{ minWidth: "150px" }}>Component / Title</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs" style={{ minWidth: "140px" }}>Indicator</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs" style={{ minWidth: "160px" }}>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />
                      Measurement Question
                    </div>
                  </th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs" style={{ minWidth: "100px" }}>Assumptions</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-24">Target Date</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-24">Target Figure</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-24">Actual Date</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-24">Actual Figure</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-22">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((comp, compIdx) => {
                  const indicators = comp.componentIndicators ?? [];
                  const isEven = compIdx % 2 === 0;
                  const rowBg = isEven ? "bg-background" : "bg-muted/20";

                  if (indicators.length === 0) {
                    return (
                      <tr key={comp.id} className={`border-b border-border/50 last:border-0 ${rowBg}`}>
                        <td className="px-3 py-3 align-top">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
                            {boxNum(comp.id)}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_COLORS[comp.type] ?? ""}`}>
                            {comp.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <p className="font-semibold text-foreground leading-snug mb-0.5">{comp.title}</p>
                          {comp.description && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{comp.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-muted-foreground italic">No indicators</td>
                        <td className="px-3 py-3 align-top"><span className="text-xs text-muted-foreground/50 italic">—</span></td>
                        <td className="px-3 py-3 align-top text-xs text-muted-foreground leading-relaxed">
                          {comp.assumptions || <span className="italic text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-3 py-3 align-top"><span className="text-xs text-muted-foreground/50 italic">—</span></td>
                        <td className="px-3 py-3 align-top"><span className="text-xs text-muted-foreground/50 italic">—</span></td>
                        <td className="px-3 py-3 align-top"><span className="text-xs text-muted-foreground/50 italic">—</span></td>
                        <td className="px-3 py-3 align-top"><span className="text-xs text-muted-foreground/50 italic">—</span></td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${getStatus().color}`}>
                            {React.createElement(getStatus().icon, { className: "w-3 h-3" })}
                            {getStatus().label}
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <React.Fragment key={comp.id}>
                      {indicators.map((ind, indIdx) => {
                        const status = getStatus(ind.targetDate, ind.targetFigure, ind.actualFigure);
                        const StatusIcon = status.icon;

                        return (
                          <tr
                            key={ind.id}
                            className={`border-b border-border/50 last:border-0 ${rowBg}`}
                          >
                            {/* Box number */}
                            <td className="px-3 py-3 align-top">
                              {indIdx === 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-[11px] font-bold">
                                  {boxNum(comp.id)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border/40 text-muted-foreground/50 text-[10px]">
                                  ↳
                                </span>
                              )}
                            </td>

                            {/* Type */}
                            <td className="px-3 py-3 align-top">
                              {indIdx === 0 && (
                                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${TYPE_COLORS[comp.type] ?? ""}`}>
                                  {comp.type}
                                </span>
                              )}
                            </td>

                            {/* Component info */}
                            <td className="px-3 py-3 align-top">
                              {indIdx === 0 ? (
                                <>
                                  <p className="font-semibold text-foreground leading-snug mb-0.5">{comp.title}</p>
                                  {comp.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{comp.description}</p>
                                  )}
                                </>
                              ) : null}
                            </td>

                            {/* Indicator name */}
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-start gap-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">{indIdx + 1}.</span>
                                <p className="text-xs text-foreground leading-relaxed">
                                  {ind.name || <span className="italic text-muted-foreground/60">Unnamed</span>}
                                </p>
                              </div>
                            </td>

                            {/* Measurement questions */}
                            <td className="px-3 py-3 align-top">
                              {(ind.qualitativeQuestion?.trim() || ind.quantitativeQuestion?.trim()) ? (
                                <div className="space-y-2">
                                  {ind.qualitativeQuestion?.trim() && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <MessageSquare className="w-2.5 h-2.5 text-violet-600 shrink-0" />
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-violet-600">Qualitative</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{ind.qualitativeQuestion}</p>
                                    </div>
                                  )}
                                  {ind.quantitativeQuestion?.trim() && (
                                    <div>
                                      <div className="flex items-center gap-1 mb-0.5">
                                        <BarChart3 className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600">Quantitative</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{ind.quantitativeQuestion}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 italic">—</span>
                              )}
                            </td>

                            {/* Assumptions */}
                            <td className="px-3 py-3 align-top text-xs text-muted-foreground leading-relaxed">
                              {indIdx === 0
                                ? (comp.assumptions || <span className="italic text-muted-foreground/50">—</span>)
                                : null}
                            </td>

                            {/* Target date */}
                            <td className="px-3 py-3 align-top">
                              {ind.targetDate ? (
                                <span className="text-xs font-medium text-amber-700">{formatDate(ind.targetDate)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">—</span>
                              )}
                            </td>

                            {/* Target figure */}
                            <td className="px-3 py-3 align-top text-xs text-foreground font-medium">
                              {ind.targetFigure || <span className="italic text-muted-foreground/50">—</span>}
                            </td>

                            {/* Actual date */}
                            <td className="px-3 py-3 align-top">
                              {ind.actualDate ? (
                                <span className="text-xs font-medium text-emerald-700">{formatDate(ind.actualDate)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50 italic">—</span>
                              )}
                            </td>

                            {/* Actual figure */}
                            <td className="px-3 py-3 align-top text-xs text-emerald-700 font-medium">
                              {ind.actualFigure || <span className="italic text-muted-foreground/50 font-normal">—</span>}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-3 align-top">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${status.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground italic text-sm">
                      No components added yet. Go back to the canvas and add components to your theory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary counts */}
          {sorted.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-6 gap-3 print:mt-4">
              {["opportunity","input","activity","output","outcome","impact"].map(type => {
                const count = sorted.filter(c => c.type === type).length;
                return (
                  <div key={type} className={`rounded-lg border px-4 py-3 ${TYPE_COLORS[type]}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">{type}</p>
                    <p className="text-2xl font-bold print:text-xl">{count}</p>
                    <p className="text-[10px] opacity-70">component{count !== 1 ? "s" : ""}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-border/50 text-xs text-muted-foreground print:mt-6">
            <p>Generated from the Theory of Change platform · {theory.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
