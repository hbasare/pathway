import { Link } from "wouter";
import { useGetProgramLogframe } from "@workspace/api-client-react";
import { ArrowLeft, Printer, LayoutGrid, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LEVELS = [
  { type: "impact",      label: "Impact",           color: "bg-purple-100 text-purple-800 border-purple-200" },
  { type: "outcome",     label: "Outcome",           color: "bg-blue-100 text-blue-800 border-blue-200" },
  { type: "output",      label: "Output",            color: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { type: "activity",   label: "Activity",           color: "bg-green-100 text-green-800 border-green-200" },
  { type: "input",       label: "Input",             color: "bg-amber-100 text-amber-800 border-amber-200" },
  { type: "opportunity", label: "Opp / Constraint",  color: "bg-slate-100 text-slate-700 border-slate-200" },
] as const;

export default function ProgramLogframe() {
  const { data, isLoading, error } = useGetProgramLogframe();

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
        <p className="text-muted-foreground">Failed to load program logframe.</p>
        <Link href="/"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button></Link>
      </div>
    );
  }

  const { portfolios } = data;
  const totalInterventions = portfolios.reduce((acc, p) => acc + p.theories.length, 0);
  const hasAnyData = portfolios.some(p => p.theories.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="print:hidden flex items-center justify-between px-8 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <span className="text-muted-foreground/60">/</span>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">Program Logframe</span>
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
          <h1 className="text-2xl font-bold text-foreground">Program Logframe</h1>
          <p className="text-muted-foreground mt-1">
            Consolidated view of all portfolio interventions and their results chains.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="secondary">{portfolios.length} {portfolios.length === 1 ? "portfolio" : "portfolios"}</Badge>
            <Badge variant="secondary">{totalInterventions} {totalInterventions === 1 ? "intervention" : "interventions"}</Badge>
          </div>
        </div>

        {portfolios.length === 0 ? (
          <div className="text-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground">
            <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No portfolios yet.</p>
            <p className="text-sm mt-1">Create portfolios and assign interventions from the Dashboard.</p>
          </div>
        ) : !hasAnyData ? (
          <div className="text-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground">
            <TableProperties className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No interventions assigned to any portfolio yet.</p>
            <p className="text-sm mt-1">Assign theories to portfolios from the Dashboard to populate the logframe.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 print:bg-gray-100">
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[100px]">Level</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[140px]">Portfolio</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[150px]">Intervention</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[170px]">Component / Description</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[150px]">Indicator</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[100px]">Baseline</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[100px]">Target</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground w-[100px]">Actual</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[130px]">Source of Info</th>
                  <th className="border border-border px-4 py-3 text-left font-bold text-foreground min-w-[130px]">Assumptions</th>
                </tr>
              </thead>
              <tbody>
                {LEVELS.map(({ type, label, color }) => {
                  // Gather all rows for this level across ALL portfolios
                  type RowEntry = {
                    portfolioName: string;
                    portfolioId: number;
                    theoryTitle: string;
                    component: ReturnType<typeof buildRows>[0]["component"];
                  };

                  function buildRows() {
                    const rows: RowEntry[] = [];
                    for (const { portfolio, theories } of portfolios) {
                      for (const theory of theories) {
                        const comps = theory.components.filter(c => c.type === type);
                        for (const comp of comps) {
                          rows.push({
                            portfolioName: portfolio.name,
                            portfolioId: portfolio.id,
                            theoryTitle: theory.title,
                            component: comp,
                          });
                        }
                      }
                    }
                    return rows;
                  }

                  const rows = buildRows();
                  if (rows.length === 0) return null;

                  // Total indicator rows for this entire level (for rowspan)
                  const totalIndicatorRows = rows.reduce((acc, { component: comp }) => {
                    const count = comp.componentIndicators?.length ?? 0;
                    return acc + Math.max(count, 1);
                  }, 0);

                  let levelRendered = false;
                  // Track portfolio spans: map portfolioId → remaining rows
                  const portfolioRowCounts: Record<number, number> = {};
                  for (const { portfolioId, component: comp } of rows) {
                    const indCount = Math.max(comp.componentIndicators?.length ?? 0, 1);
                    portfolioRowCounts[portfolioId] = (portfolioRowCounts[portfolioId] ?? 0) + indCount;
                  }
                  const portfolioRendered = new Set<number>();

                  return rows.map(({ portfolioName, portfolioId, theoryTitle, component: comp }) => {
                    const indicators = comp.componentIndicators ?? [];
                    const indRows = indicators.length > 0 ? indicators : [null];

                    return indRows.map((ind, indIdx) => {
                      const isFirstIndInComp = indIdx === 0;
                      const isFirstOfLevel = !levelRendered && isFirstIndInComp;
                      if (isFirstOfLevel) levelRendered = true;

                      const isFirstOfPortfolio = isFirstIndInComp && !portfolioRendered.has(portfolioId);
                      if (isFirstOfPortfolio) portfolioRendered.add(portfolioId);

                      return (
                        <tr
                          key={`${type}-${portfolioId}-${comp.id}-${indIdx}`}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          {/* Level cell */}
                          {isFirstOfLevel && (
                            <td
                              rowSpan={totalIndicatorRows}
                              className={`border border-border px-3 py-2 text-center font-bold text-xs uppercase tracking-wide align-middle ${color}`}
                            >
                              {label}
                            </td>
                          )}

                          {/* Portfolio cell — rowspan all rows in this level for this portfolio */}
                          {isFirstOfPortfolio && (
                            <td
                              rowSpan={portfolioRowCounts[portfolioId]}
                              className="border border-border px-3 py-2 text-xs font-bold text-primary align-top"
                            >
                              {portfolioName}
                            </td>
                          )}

                          {/* Intervention */}
                          {isFirstIndInComp && (
                            <td
                              rowSpan={indRows.length}
                              className="border border-border px-3 py-2 text-xs font-semibold text-foreground align-top"
                            >
                              {theoryTitle}
                            </td>
                          )}

                          {/* Component */}
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
                              <td className="border border-border px-3 py-2 text-sm align-top">{ind.name}</td>
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
