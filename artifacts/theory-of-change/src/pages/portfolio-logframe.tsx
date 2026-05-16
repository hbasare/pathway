import { useParams, Link, useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getPermissions } from "@/lib/permissions";
import { useGetPortfolioLogframe } from "@workspace/api-client-react";
import { ArrowLeft, Printer, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LEVELS = [
  { type: "impact",      label: "Impact",                color: "bg-purple-100 text-purple-800 border-purple-200" },
  { type: "outcome",     label: "Outcome",               color: "bg-blue-100 text-blue-800 border-blue-200" },
  { type: "output",      label: "Output",                color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { type: "activity",    label: "Activity",              color: "bg-green-100 text-green-800 border-green-200" },
  { type: "input",       label: "Input",                 color: "bg-amber-100 text-amber-800 border-amber-200" },
  { type: "opportunity", label: "Opp / Constraint",      color: "bg-slate-100 text-slate-700 border-slate-200" },
] as const;

export default function PortfolioLogframe() {
  const { id } = useParams<{ id: string }>();
  const portfolioId = Number(id);
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (user && !getPermissions(user.role).canViewDetail) setLocation("/");
  }, [user?.role]);
  const { data, isLoading, error } = useGetPortfolioLogframe(portfolioId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Portfolio not found.</p>
        <Link href="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button></Link>
      </div>
    );
  }

  const { portfolio, theories } = data;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden flex items-center justify-between px-8 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{portfolio.name}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-muted-foreground">Logframe</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Export
        </Button>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-8 print:p-4">
        {/* Title block */}
        <div className="mb-8 print:mb-6">
          <h1 className="text-2xl font-bold text-foreground">{portfolio.name} — Logframe</h1>
          {portfolio.description && (
            <p className="text-muted-foreground mt-1">{portfolio.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{theories.length} {theories.length === 1 ? "intervention" : "interventions"}</Badge>
          </div>
        </div>

        {theories.length === 0 ? (
          <div className="text-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground">
            <p className="font-medium">No interventions in this portfolio yet.</p>
            <p className="text-sm mt-1">Assign theories to this portfolio from the Dashboard to populate the logframe.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 print:bg-gray-100">
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[110px]">Level</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[160px]">Intervention</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[180px]">Component / Description</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[160px]">Indicator</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[110px]">Baseline</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[110px]">Target</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[110px]">Actual</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[140px]">Source of Info</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[140px]">Assumptions</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map(({ type, label, color }) => {
                  // Gather all components of this type across all theories
                  const rows: {
                    theoryTitle: string;
                    component: typeof theories[0]["components"][0];
                  }[] = [];

                  for (const theory of theories) {
                    const comps = theory.components.filter(c => c.type === type);
                    for (const comp of comps) {
                      rows.push({ theoryTitle: theory.title, component: comp });
                    }
                  }

                  if (rows.length === 0) return null;

                  // Count total indicator rows for level rowspan
                  const totalIndicatorRows = rows.reduce((acc, { component: comp }) => {
                    const indCount = comp.componentIndicators?.length ?? 0;
                    return acc + Math.max(indCount, 1);
                  }, 0);

                  let levelRendered = false;

                  return rows.map(({ theoryTitle, component: comp }, rowIdx) => {
                    const indicators = comp.componentIndicators ?? [];
                    const indRows = indicators.length > 0 ? indicators : [null];

                    return indRows.map((ind, indIdx) => {
                      const isFirstIndInComp = indIdx === 0;
                      const isFirstRowOverall = !levelRendered && isFirstIndInComp;
                      if (isFirstRowOverall) levelRendered = true;

                      return (
                        <tr
                          key={`${type}-${comp.id}-${indIdx}`}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          {/* Level cell — rowspan across all rows for this level */}
                          {isFirstRowOverall && (
                            <td
                              rowSpan={totalIndicatorRows}
                              className={`border border-border px-3 py-2 text-center font-bold text-xs uppercase tracking-wide align-middle ${color}`}
                            >
                              {label}
                            </td>
                          )}

                          {/* Intervention — rowspan across all indicators for this component */}
                          {isFirstIndInComp && (
                            <td
                              rowSpan={indRows.length}
                              className="border border-border px-3 py-2 text-xs font-semibold text-foreground align-top"
                            >
                              {theoryTitle}
                            </td>
                          )}

                          {/* Component — rowspan across all indicators */}
                          {isFirstIndInComp && (
                            <td
                              rowSpan={indRows.length}
                              className="border border-border px-3 py-2 align-top"
                            >
                              <div className="font-semibold text-foreground text-sm">{comp.title}</div>
                              {comp.description && (
                                <div className="text-muted-foreground text-xs mt-0.5 leading-snug">{comp.description}</div>
                              )}
                            </td>
                          )}

                          {/* Indicator columns */}
                          {ind ? (
                            <>
                              <td className="border border-border px-3 py-2 text-sm align-top">
                                {ind.name}
                              </td>
                              <td className="border border-border px-3 py-2 text-sm align-top">
                                <IndicatorCell figure={ind.baselineFigure} date={ind.baselineDate} />
                              </td>
                              <td className="border border-border px-3 py-2 text-sm align-top">
                                <IndicatorCell figure={ind.targetFigure} date={ind.targetDate} />
                              </td>
                              <td className="border border-border px-3 py-2 text-sm align-top">
                                <IndicatorCell figure={ind.actualFigure} date={ind.actualDate} />
                              </td>
                              <td className="border border-border px-3 py-2 text-xs text-muted-foreground align-top">
                                {ind.targetSourceOfInformation || ind.actualSourceOfInformation || "—"}
                              </td>
                              <td className="border border-border px-3 py-2 text-xs text-muted-foreground align-top">
                                {comp.assumptions || "—"}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border border-border px-3 py-2 text-xs text-muted-foreground/50 italic align-top">No indicators</td>
                              <td className="border border-border px-3 py-2" />
                              <td className="border border-border px-3 py-2" />
                              <td className="border border-border px-3 py-2" />
                              <td className="border border-border px-3 py-2" />
                              <td className="border border-border px-3 py-2 text-xs text-muted-foreground align-top">
                                {comp.assumptions || "—"}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function IndicatorCell({ figure, date }: { figure?: string | null; date?: string | null }) {
  if (!figure && !date) return <span className="text-muted-foreground/50">—</span>;
  return (
    <div>
      {figure && <div className="font-medium">{figure}</div>}
      {date && <div className="text-xs text-muted-foreground">{date}</div>}
    </div>
  );
}
