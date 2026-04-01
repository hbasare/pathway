import { useState, useRef, useEffect, useCallback } from "react";
import { TheoryDetail, ComponentType, useCreateConnection, useDeleteConnection, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComponentCard } from "./component-card";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";
import { useToast } from "@/hooks/use-toast";

interface TheoryCanvasProps {
  theory: TheoryDetail;
}

const COLUMNS: { type: ComponentType; label: string; description: string; addLabel: string }[] = [
  { type: "opportunity", label: "Opportunities / Constraints", description: "Context & enabling factors", addLabel: "Opportunity / Constraint" },
  { type: "input",       label: "Inputs",      description: "Resources invested",            addLabel: "Input" },
  { type: "activity",   label: "Activities",   description: "Actions taken",                 addLabel: "Activity" },
  { type: "output",     label: "Outputs",      description: "Direct products",               addLabel: "Output" },
  { type: "outcome",    label: "Outcomes",     description: "Short/medium term changes",     addLabel: "Outcome" },
  { type: "impact",     label: "Impact",       description: "Long term systemic change",     addLabel: "Impact" },
];

const COLUMN_INDEX: Record<ComponentType, number> = {
  opportunity: 0,
  input: 1,
  activity: 2,
  output: 3,
  outcome: 4,
  impact: 5,
};

// Canvas layout constants (must match the JSX below)
const CANVAS_PADDING = 32; // p-8 = 2rem = 32px
const COL_W = 280;         // w-[280px]
const COL_GAP = 40;        // gap-10 = 2.5rem = 40px
const COL_STEP = COL_W + COL_GAP;

/** X coordinate (in scroll-content space) of the midpoint of the gap to the RIGHT of column i */
function gapRightOf(col: number) {
  return CANVAS_PADDING + col * COL_STEP + COL_W + COL_GAP / 2;
}

interface ConnectorPath {
  id: number;
  d: string;
}

/** Build an SVG path string that routes through column gaps, never through boxes. */
function buildPath(
  srcEl: Element,
  tgtEl: Element,
  srcCol: number,
  tgtCol: number,
  container: HTMLElement,
): string {
  const cRect = container.getBoundingClientRect();
  const sl = container.scrollLeft;
  const st = container.scrollTop;

  const toContent = (r: DOMRect) => ({
    left:    r.left   - cRect.left + sl,
    right:   r.right  - cRect.left + sl,
    top:     r.top    - cRect.top  + st,
    bottom:  r.bottom - cRect.top  + st,
    centerX: r.left   - cRect.left + sl + r.width  / 2,
    centerY: r.top    - cRect.top  + st + r.height / 2,
  });

  const src = toContent(srcEl.getBoundingClientRect());
  const tgt = toContent(tgtEl.getBoundingClientRect());

  if (srcCol === tgtCol) {
    // Same column — exit from bottom/top, loop out to the right by 24px, enter target
    const isBelow = src.centerY < tgt.centerY;
    const sx = src.centerX;
    const sy = isBelow ? src.bottom : src.top;
    const ex = tgt.centerX;
    const ey = isBelow ? tgt.top : tgt.bottom;
    const detourX = src.right + 28;
    const midY = (sy + ey) / 2;
    return `M ${sx},${sy} L ${sx},${midY} L ${detourX},${midY} L ${detourX},${(sy + ey) / 2} L ${ex},${(sy + ey) / 2} L ${ex},${ey}`;
  }

  if (srcCol < tgtCol) {
    // Forward (left → right)
    // Exit source RIGHT → turn at gap midpoint right of srcCol → go vertical → enter target LEFT
    const sx = src.right;
    const sy = src.centerY;
    const ex = tgt.left;
    const ey = tgt.centerY;
    const gx = gapRightOf(srcCol);
    return `M ${sx},${sy} L ${gx},${sy} L ${gx},${ey} L ${ex},${ey}`;
  }

  // Backward (right → left)
  // Exit source LEFT → turn at gap midpoint right of (srcCol-1) → go vertical → enter target RIGHT
  const sx = src.left;
  const sy = src.centerY;
  const ex = tgt.right;
  const ey = tgt.centerY;
  const gx = gapRightOf(srcCol - 1);
  return `M ${sx},${sy} L ${gx},${sy} L ${gx},${ey} L ${ex},${ey}`;
}

export function TheoryCanvas({ theory }: TheoryCanvasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [selectedColumnType, setSelectedColumnType] = useState<ComponentType>("activity");
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const measurePaths = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;

    const paths: ConnectorPath[] = [];

    for (const conn of theory.connections) {
      const srcEl = document.getElementById(`comp-${conn.fromComponentId}`);
      const tgtEl = document.getElementById(`comp-${conn.toComponentId}`);
      if (!srcEl || !tgtEl) continue;

      const fromComp = theory.components.find(c => c.id === conn.fromComponentId);
      const toComp   = theory.components.find(c => c.id === conn.toComponentId);
      if (!fromComp || !toComp) continue;

      const srcCol = COLUMN_INDEX[fromComp.type as ComponentType] ?? 0;
      const tgtCol = COLUMN_INDEX[toComp.type   as ComponentType] ?? 0;

      try {
        const d = buildPath(srcEl, tgtEl, srcCol, tgtCol, container);
        paths.push({ id: conn.id, d });
      } catch {
        // skip if elements not in DOM yet
      }
    }

    setConnectorPaths(paths);
  }, [theory.connections, theory.components]);

  // Re-measure whenever connections, components, or layout changes
  useEffect(() => {
    const id = setTimeout(measurePaths, 60);
    return () => clearTimeout(id);
  }, [measurePaths, theory.components.length, theory.connections.length]);

  // Also re-measure on scroll and resize
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    container.addEventListener("scroll", measurePaths);
    window.addEventListener("resize", measurePaths);
    return () => {
      container.removeEventListener("scroll", measurePaths);
      window.removeEventListener("resize", measurePaths);
    };
  }, [measurePaths]);

  const createConnectionMutation = useCreateConnection({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theory.id) });
        setConnectingFrom(null);
        toast({ title: "Connected successfully" });
      },
      onError: () => {
        toast({ title: "Failed to connect", variant: "destructive" });
        setConnectingFrom(null);
      }
    }
  });

  const deleteConnectionMutation = useDeleteConnection({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theory.id) })
    }
  });

  const handleConnectStart = (id: number) => setConnectingFrom(id);

  const handleConnectEnd = (id: number) => {
    if (!connectingFrom || connectingFrom === id) return;
    const exists = theory.connections.some(c =>
      (c.fromComponentId === connectingFrom && c.toComponentId === id) ||
      (c.fromComponentId === id && c.toComponentId === connectingFrom)
    );
    if (exists) {
      toast({ title: "These components are already connected", variant: "destructive" });
      setConnectingFrom(null);
      return;
    }
    createConnectionMutation.mutate({
      theoryId: theory.id,
      data: { fromComponentId: connectingFrom, toComponentId: id, label: "" }
    });
  };

  const handleCancelConnect = () => setConnectingFrom(null);

  const handleDeleteConnection = (connId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Remove this connection?")) {
      deleteConnectionMutation.mutate({ theoryId: theory.id, id: connId });
    }
  };

  // Assign stable sequential box numbers by component ID order
  const sortedIds = [...theory.components].sort((a, b) => a.id - b.id).map(c => c.id);
  const boxNumber = (compId: number) => sortedIds.indexOf(compId) + 1;

  return (
    <div className="relative flex flex-col h-full bg-slate-50/50">
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-top-4">
          <span className="font-medium">Select a component to connect to...</span>
          <Button variant="secondary" size="sm" onClick={handleCancelConnect} className="rounded-full h-8 px-3">
            Cancel
          </Button>
        </div>
      )}

      <div
        ref={canvasRef}
        className="flex-1 overflow-auto p-8"
      >
        {/* Wrap content + SVG overlay in a relative container */}
        <div className="relative min-w-max">
          <div className="flex gap-10 pb-32">
            {COLUMNS.map((col) => {
              const isOpportunityCol = col.type === "opportunity";
              const columnComponents = isOpportunityCol
                ? theory.components.filter(c => c.type === "opportunity" && c.willBeAddressed)
                : theory.components.filter(c => c.type === col.type);

              return (
                <div key={col.type} className="flex flex-col w-[280px] shrink-0">
                  {/* Column header */}
                  <div className="mb-5 sticky top-0 bg-slate-50/95 backdrop-blur-sm pt-2 pb-3 z-10 border-b border-border/50">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-base text-foreground">{col.label}</h3>
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                        {columnComponents.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{col.description}</p>
                  </div>

                  <div className="flex flex-col gap-5">
                    {columnComponents.map((comp) => (
                      <ComponentCard
                        key={comp.id}
                        component={comp}
                        boxNumber={boxNumber(comp.id)}
                        onConnectStart={handleConnectStart}
                        onConnectEnd={handleConnectEnd}
                        isConnectingFrom={connectingFrom === comp.id}
                        isConnectingMode={!!connectingFrom}
                      />
                    ))}

                    {isOpportunityCol ? (
                      <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/10 p-4 text-center flex flex-col items-center gap-2">
                        <Info className="w-4 h-4 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground leading-snug">
                          Manage opportunities & constraints in the{" "}
                          <span className="font-semibold">About Intervention</span> tab.
                          Toggle <span className="font-semibold">"Will be addressed"</span> to include them here.
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="border-dashed border-2 py-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedColumnType(col.type);
                          setIsAddComponentOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add {col.addLabel}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG connector overlay — positioned over the full content area */}
          <svg
            className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="toc-arrow"
                markerWidth="7"
                markerHeight="5"
                refX="7"
                refY="2.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 7 2.5, 0 5" fill="#94a3b8" />
              </marker>
              <marker
                id="toc-arrow-hover"
                markerWidth="7"
                markerHeight="5"
                refX="7"
                refY="2.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <polygon points="0 0, 7 2.5, 0 5" fill="#ef4444" />
              </marker>
            </defs>

            {connectorPaths.map((cp) => {
              const conn = theory.connections.find(c => c.id === cp.id);
              if (!conn) return null;
              return (
                <g key={cp.id} className="group" style={{ pointerEvents: "stroke" }}>
                  {/* Wide invisible stroke for easier clicking */}
                  <path
                    d={cp.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onClick={(e) => handleDeleteConnection(cp.id, e)}
                  />
                  {/* Visible stroke */}
                  <path
                    d={cp.d}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                    markerEnd="url(#toc-arrow)"
                    style={{ pointerEvents: "none" }}
                    className="group-hover:stroke-red-400 transition-colors"
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <DialogWrapper
        open={isAddComponentOpen}
        onOpenChange={setIsAddComponentOpen}
        title="Add New Component"
        className="sm:max-w-[620px]"
      >
        <ComponentForm
          theoryId={theory.id}
          defaultType={selectedColumnType}
          onSuccess={() => setIsAddComponentOpen(false)}
        />
      </DialogWrapper>
    </div>
  );
}
