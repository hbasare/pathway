import { useRoute, useLocation } from "wouter";
import { useGetTheory } from "@workspace/api-client-react";
import {
  ArrowLeft, Printer, ArrowRight, CheckCircle2, Clock, AlertCircle,
  MinusCircle, Target, TrendingUp, Users, Lightbulb, Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const TYPE_COLORS: Record<string, string> = {
  opportunity: "bg-emerald-50 text-emerald-800 border-emerald-200",
  input:    "bg-blue-50 text-blue-800 border-blue-200",
  activity: "bg-purple-50 text-purple-800 border-purple-200",
  output:   "bg-teal-50 text-teal-800 border-teal-200",
  outcome:  "bg-orange-50 text-orange-800 border-orange-200",
  impact:   "bg-rose-50 text-rose-800 border-rose-200",
};

const TYPE_HEADER: Record<string, string> = {
  opportunity: "bg-emerald-500",
  input:    "bg-blue-500",
  activity: "bg-purple-500",
  output:   "bg-teal-500",
  outcome:  "bg-orange-500",
  impact:   "bg-rose-500",
};

const COLUMN_ORDER: Record<string, number> = {
  opportunity: 0, input: 1, activity: 2, output: 3, outcome: 4, impact: 5,
};

const TYPES = ["opportunity", "input", "activity", "output", "outcome", "impact"] as const;

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getStatusInfo(targetDate?: string | null, targetFigure?: string | null, actualFigure?: string | null) {
  if (actualFigure && actualFigure.trim()) return "achieved";
  if (targetDate && targetDate.trim()) {
    const target = new Date(targetDate);
    if (target < new Date()) return "overdue";
    return "planned";
  }
  if (targetFigure && targetFigure.trim()) return "in-progress";
  return "not-set";
}

function getComponentStatus(indicators: { targetDate?: string | null; targetFigure?: string | null; actualFigure?: string | null }[]) {
  if (indicators.length === 0) return "not-set";
  const order = ["overdue", "in-progress", "planned", "achieved", "not-set"];
  const statuses = indicators.map(ind => getStatusInfo(ind.targetDate, ind.targetFigure, ind.actualFigure));
  return order.find(s => statuses.includes(s)) ?? "not-set";
}

export default function Summary() {
  const { t } = useTranslation();
  const [, params] = useRoute("/theory/:id/summary");
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
        <h2 className="text-2xl font-bold mb-2">{t("summary.theoryNotFound")}</h2>
        <Button onClick={() => setLocation("/")}><ArrowLeft className="w-4 h-4 mr-2" />{t("common.back")}</Button>
      </div>
    );
  }

  const components = theory.components;
  const connections = theory.connections;

  const sortedById = [...components].sort((a, b) => a.id - b.id);
  const boxNum = (cid: number) => sortedById.findIndex(c => c.id === cid) + 1;

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const allIndicators = components.flatMap(c => c.componentIndicators ?? []);
  const indicatorStatuses = allIndicators.length > 0
    ? allIndicators.map(ind => getStatusInfo(ind.targetDate, ind.targetFigure, ind.actualFigure))
    : components.map(c => getComponentStatus(c.componentIndicators ?? []));
  const statusCounts = {
    achieved: indicatorStatuses.filter(s => s === "achieved").length,
    planned: indicatorStatuses.filter(s => s === "planned").length,
    overdue: indicatorStatuses.filter(s => s === "overdue").length,
    "in-progress": indicatorStatuses.filter(s => s === "in-progress").length,
    "not-set": indicatorStatuses.filter(s => s === "not-set").length,
  };
  const statusTotal = allIndicators.length || components.length;

  const byType = TYPES.reduce((acc, tp) => {
    acc[tp] = components.filter(c => c.type === tp).sort((a, b) => a.id - b.id);
    return acc;
  }, {} as Record<string, typeof components>);

  const allAssumptions = components
    .sort((a, b) => (COLUMN_ORDER[a.type] ?? 99) - (COLUMN_ORDER[b.type] ?? 99) || a.id - b.id)
    .filter(c => c.assumptions && c.assumptions.trim());

  type IndicatorWithComp = (typeof allIndicators)[number] & { comp: (typeof components)[number] };
  const withTargets: IndicatorWithComp[] = components
    .flatMap(comp =>
      (comp.componentIndicators ?? [])
        .filter(ind => ind.targetDate && ind.targetDate.trim())
        .map(ind => ({ ...ind, comp }))
    )
    .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime());

  const statusConfig = {
    achieved:    { labelKey: "summary.status.achieved",   color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
    planned:     { labelKey: "summary.status.planned",    color: "text-amber-700 bg-amber-50 border-amber-200",       icon: Clock },
    overdue:     { labelKey: "summary.status.overdue",    color: "text-red-700 bg-red-50 border-red-200",             icon: AlertCircle },
    "in-progress":{ labelKey: "summary.status.inProgress",color: "text-blue-700 bg-blue-50 border-blue-200",         icon: Target },
    "not-set":   { labelKey: "summary.status.notSet",     color: "text-gray-500 bg-gray-50 border-gray-200",         icon: MinusCircle },
  };

  const legendItems = [
    { key: "achieved",    labelKey: "summary.status.achieved",   color: "bg-emerald-500" },
    { key: "planned",     labelKey: "summary.status.planned",    color: "bg-amber-400" },
    { key: "in-progress", labelKey: "summary.status.inProgress", color: "bg-blue-400" },
    { key: "overdue",     labelKey: "summary.status.overdue",    color: "bg-red-400" },
    { key: "not-set",     labelKey: "summary.status.notSet",     color: "bg-muted-foreground/30" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <header className="print:hidden flex-none flex items-center justify-between px-6 py-4 border-b bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/theory/${id}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t("summary.backToCanvas")}
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{theory.title}</h1>
            <p className="text-xs text-muted-foreground">{t("summary.interventionSummary")}</p>
          </div>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          {t("summary.printExport")}
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 print:px-4 print:py-6 space-y-10">

          {/* ── Document header ── */}
          <div className="flex items-start justify-between pb-6 border-b border-border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("summary.interventionSummary")}</p>
              <h2 className="text-3xl font-bold text-foreground mb-3 print:text-2xl">{theory.title}</h2>
              {theory.description && (
                <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">{theory.description}</p>
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground shrink-0 ml-6">
              <p>{t("summary.generated")}: {today}</p>
              <p>{t("summary.components", { count: components.length })}</p>
              <p>{t("summary.connections", { count: connections.length })}</p>
            </div>
          </div>

          {/* ── At a Glance ── */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> {t("summary.atAGlance")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-3xl font-bold text-foreground">{components.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("summary.totalComponents")}</p>
              </div>
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-3xl font-bold text-foreground">{connections.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("summary.logicalLinks")}</p>
              </div>
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-3xl font-bold text-emerald-600">{statusCounts.achieved}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("summary.resultsAchieved")}</p>
              </div>
              <div className="rounded-xl border bg-card px-5 py-4">
                <p className="text-3xl font-bold text-red-600">{statusCounts.overdue}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("summary.status.overdue")}</p>
              </div>
            </div>

            {/* Progress bar */}
            {components.length > 0 && (
              <div className="mt-4 rounded-xl border bg-card px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">{t("summary.progressOverview")}</p>
                  <p className="text-xs text-muted-foreground">
                    {statusCounts.achieved}/{statusTotal} {t("summary.achievedFraction")} ({allIndicators.length > 0 ? t("summary.byIndicator") : t("summary.byComponent")})
                  </p>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                  {statusCounts.achieved > 0 && (
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(statusCounts.achieved / statusTotal) * 100}%` }} />
                  )}
                  {statusCounts.planned > 0 && (
                    <div className="bg-amber-400 h-full transition-all" style={{ width: `${(statusCounts.planned / statusTotal) * 100}%` }} />
                  )}
                  {statusCounts["in-progress"] > 0 && (
                    <div className="bg-blue-400 h-full transition-all" style={{ width: `${(statusCounts["in-progress"] / statusTotal) * 100}%` }} />
                  )}
                  {statusCounts.overdue > 0 && (
                    <div className="bg-red-400 h-full transition-all" style={{ width: `${(statusCounts.overdue / statusTotal) * 100}%` }} />
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
                  {legendItems.map(({ key, labelKey, color }) => (
                    <span key={key} className="flex items-center gap-1 text-muted-foreground">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
                      {statusCounts[key as keyof typeof statusCounts]} {t(labelKey)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Intervention Logic Flow ── */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Network className="w-4 h-4" /> {t("summary.interventionLogic")}
            </h3>
            <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
              {TYPES.map((type, i) => {
                const items = byType[type];
                return (
                  <div key={type} className="flex items-stretch gap-0 flex-1 min-w-0">
                    <div className="flex-1 rounded-xl border border-border overflow-hidden min-w-[140px]">
                      <div className={`${TYPE_HEADER[type]} px-3 py-2`}>
                        <p className="text-white text-[11px] font-bold uppercase tracking-wider">{t(`summary.types.${type}`, { defaultValue: type })}</p>
                        <p className="text-white/70 text-[10px]">{t(`summary.typeDescriptions.${type}`)}</p>
                      </div>
                      <div className="p-2 space-y-1.5 bg-card min-h-[80px]">
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 italic px-1 py-2">{t("summary.noneAdded")}</p>
                        ) : items.map(c => (
                          <div key={c.id} className={`rounded-md border px-2 py-1.5 text-xs ${TYPE_COLORS[type]}`}>
                            <span className="font-bold text-[10px] opacity-60 mr-1">#{boxNum(c.id)}</span>
                            <span className="font-medium leading-tight">{c.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {i < TYPES.length - 1 && (
                      <div className="flex items-center justify-center w-6 shrink-0">
                        <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Component Details ── */}
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> {t("summary.componentDetails")}
            </h3>
            <div className="space-y-3">
              {TYPES.map(type => {
                const items = byType[type];
                if (items.length === 0) return null;
                return items.map(comp => {
                  const status = getComponentStatus(comp.componentIndicators ?? []);
                  const cfg = statusConfig[status as keyof typeof statusConfig];
                  const StatusIcon = cfg.icon;

                  return (
                    <div key={comp.id} className={`rounded-xl border ${TYPE_COLORS[comp.type]} overflow-hidden`}>
                      <div className="flex items-start justify-between px-4 py-3 gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/60 text-[11px] font-bold shrink-0 mt-0.5">
                            {boxNum(comp.id)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{t(`summary.types.${comp.type}`, { defaultValue: comp.type })}</span>
                              <h4 className="font-semibold text-sm leading-snug">{comp.title}</h4>
                            </div>
                            {comp.description && (
                              <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{comp.description}</p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {t(cfg.labelKey)}
                        </span>
                      </div>

                      {(comp.componentIndicators ?? []).length > 0 && (
                        <div className="px-4 pb-3 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{t("summary.indicators")}</p>
                          {(comp.componentIndicators ?? []).map((ind, i) => (
                            <div key={ind.id} className="bg-white/40 rounded-lg px-2.5 py-1.5 text-xs flex items-start gap-2 flex-wrap">
                              <span className="text-[10px] font-bold opacity-50 shrink-0">{i + 1}.</span>
                              <span className="font-medium opacity-90 flex-1 min-w-0">{ind.name}</span>
                              {(ind.targetDate || ind.targetFigure) && (
                                <span className="text-amber-700 opacity-80 shrink-0">
                                  {t("summary.target")}: {[formatDate(ind.targetDate), ind.targetFigure].filter(Boolean).join(" · ")}
                                </span>
                              )}
                              {(ind.actualDate || ind.actualFigure) && (
                                <span className="text-emerald-700 font-medium shrink-0">
                                  {t("summary.actual")}: {[formatDate(ind.actualDate), ind.actualFigure].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })}
            </div>
          </section>

          {/* ── Key Assumptions ── */}
          {allAssumptions.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> {t("summary.keyAssumptions")}
              </h3>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-10">#</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">{t("summary.component")}</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{t("summary.assumption")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAssumptions.map((comp, i) => (
                      <tr key={comp.id} className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                            {boxNum(comp.id)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${TYPE_COLORS[comp.type] ?? ""}`}>
                            {t(`summary.types.${comp.type}`, { defaultValue: comp.type })}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">{comp.title}</p>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
                          {comp.assumptions}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Timeline ── */}
          {withTargets.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {t("summary.targetTimeline")}
              </h3>
              <div className="relative">
                <div className="absolute left-[88px] top-0 bottom-0 w-px bg-border" />
                <div className="space-y-3">
                  {withTargets.map((entry, i) => {
                    const { comp, ...ind } = entry;
                    const status = getStatusInfo(ind.targetDate, ind.targetFigure, ind.actualFigure);
                    const dotColor = {
                      achieved: "bg-emerald-500",
                      planned: "bg-amber-400",
                      overdue: "bg-red-500",
                      "in-progress": "bg-blue-500",
                      "not-set": "bg-muted-foreground/30",
                    }[status];
                    return (
                      <div key={`${comp.id}-${i}`} className="flex items-start gap-4">
                        <div className="shrink-0 w-20 text-right">
                          <p className="text-xs font-medium text-muted-foreground">{formatDate(ind.targetDate)}</p>
                        </div>
                        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                          <div className={`w-3 h-3 rounded-full border-2 border-background ${dotColor} relative z-10`} />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${TYPE_COLORS[comp.type]}`}>{t(`summary.types.${comp.type}`, { defaultValue: comp.type })}</span>
                            <span className="text-sm font-semibold text-foreground">
                              <span className="text-muted-foreground font-normal mr-1 text-xs">#{boxNum(comp.id)}</span>
                              {comp.title}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            {ind.name}
                            {ind.targetFigure ? ` · ${t("summary.target")}: ${ind.targetFigure}` : ""}
                            {ind.actualFigure ? ` · ${t("summary.actual")}: ${ind.actualFigure}` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground">
            <p>{t("summary.footer")} · {theory.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
