import { useState, useRef, useEffect } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import {
  TheoryDetail, ComponentType,
  useCreateConnection, useDeleteConnection, useUpdateConnection,
  getGetTheoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Info, Trash2, X } from "lucide-react";
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

type AnchorSide = "top" | "bottom" | "left" | "right" | "auto";

interface AnchorEditorState {
  connId: number;
  x: number;
  y: number;
}

const ANCHOR_BUTTONS: { value: AnchorSide; label: string; icon: string }[] = [
  { value: "top",    label: "Top",    icon: "↑" },
  { value: "right",  label: "Right",  icon: "→" },
  { value: "bottom", label: "Bottom", icon: "↓" },
  { value: "left",   label: "Left",   icon: "←" },
  { value: "auto",   label: "Auto",   icon: "⟳" },
];

export function TheoryCanvas({ theory }: TheoryCanvasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [selectedColumnType, setSelectedColumnType] = useState<ComponentType>("activity");
  const [anchorEditor, setAnchorEditor] = useState<AnchorEditorState | null>(null);

  const [, setTick] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTick(t => t + 1), 150);
    return () => clearTimeout(timer);
  }, [theory.components.length]);

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

  const updateConnectionMutation = useUpdateConnection({
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

  const handleArrowClick = (connId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorEditor({ connId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteFromEditor = (connId: number) => {
    if (window.confirm("Remove this connection?")) {
      deleteConnectionMutation.mutate({ theoryId: theory.id, id: connId });
      setAnchorEditor(null);
    }
  };

  const handleAnchorChange = (connId: number, side: "start" | "end", value: AnchorSide) => {
    const conn = theory.connections.find(c => c.id === connId);
    if (!conn) return;
    updateConnectionMutation.mutate({
      theoryId: theory.id,
      id: connId,
      data: {
        startAnchor: side === "start" ? (value === "auto" ? null : value) : (conn.startAnchor ?? null),
        endAnchor:   side === "end"   ? (value === "auto" ? null : value) : (conn.endAnchor   ?? null),
      },
    });
  };

  // Assign stable sequential box numbers by component ID order
  const sortedIds = [...theory.components].sort((a, b) => a.id - b.id).map(c => c.id);
  const boxNumber = (compId: number) => sortedIds.indexOf(compId) + 1;

  const handleDisconnect = (connId: number) => {
    deleteConnectionMutation.mutate({ theoryId: theory.id, id: connId });
  };

  const getConnectedComponents = (compId: number) => {
    return theory.connections
      .filter(c => c.fromComponentId === compId || c.toComponentId === compId)
      .map(c => {
        const otherId = c.fromComponentId === compId ? c.toComponentId : c.fromComponentId;
        const other = theory.components.find(comp => comp.id === otherId);
        if (!other) return null;
        return { connectionId: c.id, title: other.title, type: other.type };
      })
      .filter(Boolean) as { connectionId: number; title: string; type: string }[];
  };

  // Determine smart anchors so arrows route through column gaps, not through cards
  const getAnchors = (conn: { fromComponentId: number; toComponentId: number; startAnchor?: string | null; endAnchor?: string | null }) => {
    const from = theory.components.find(c => c.id === conn.fromComponentId);
    const to   = theory.components.find(c => c.id === conn.toComponentId);
    if (!from || !to) return { start: "auto" as AnchorSide, end: "auto" as AnchorSide };

    const fromCol = COLUMN_INDEX[from.type as ComponentType] ?? 0;
    const toCol   = COLUMN_INDEX[to.type   as ComponentType] ?? 0;

    const autoStart: AnchorSide = fromCol < toCol ? "right" : fromCol > toCol ? "left" : "bottom";
    const autoEnd:   AnchorSide = fromCol < toCol ? "left"  : fromCol > toCol ? "right" : "top";

    return {
      start: (conn.startAnchor as AnchorSide) || autoStart,
      end:   (conn.endAnchor   as AnchorSide) || autoEnd,
    };
  };

  const editingConn = anchorEditor
    ? theory.connections.find(c => c.id === anchorEditor.connId)
    : null;

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
        onScroll={() => setTick(t => t + 1)}
        onClick={() => setAnchorEditor(null)}
      >
        <Xwrapper>
          <div className="flex gap-10 min-w-max pb-32">
            {COLUMNS.map((col) => {
              const isOpportunityCol = col.type === "opportunity";
              const columnComponents = isOpportunityCol
                ? theory.components.filter(c => c.type === "opportunity" && c.willBeAddressed)
                : theory.components.filter(c => c.type === col.type);

              return (
                <div key={col.type} className="flex flex-col w-[280px] shrink-0">
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
                        connectedComponents={getConnectedComponents(comp.id)}
                        onDisconnect={handleDisconnect}
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

          {theory.connections.map((conn) => {
            const { start, end } = getAnchors(conn);
            return (
              <Xarrow
                key={conn.id}
                start={`comp-${conn.fromComponentId}`}
                end={`comp-${conn.toComponentId}`}
                startAnchor={start}
                endAnchor={end}
                color="#94a3b8"
                strokeWidth={1.8}
                path="grid"
                gridBreak="60%"
                headSize={5}
                passProps={{
                  onClick: (e: React.MouseEvent) => handleArrowClick(conn.id, e),
                  className: "cursor-pointer hover:stroke-primary transition-colors",
                  style: { zIndex: 0 },
                }}
              />
            );
          })}
        </Xwrapper>
      </div>

      {/* Anchor editor popover — fixed positioning so it ignores canvas scroll */}
      {anchorEditor && editingConn && (() => {
        const { start, end } = getAnchors(editingConn);
        const currentStart: AnchorSide = (editingConn.startAnchor as AnchorSide) || start;
        const currentEnd:   AnchorSide = (editingConn.endAnchor   as AnchorSide) || end;

        const fromComp = theory.components.find(c => c.id === editingConn.fromComponentId);
        const toComp   = theory.components.find(c => c.id === editingConn.toComponentId);

        // Clamp to viewport
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const W = 260;
        const H = 230;
        const x = Math.min(anchorEditor.x + 8, vpW - W - 8);
        const y = Math.min(anchorEditor.y + 8, vpH - H - 8);

        return (
          <div
            className="fixed z-[999] bg-white border border-border rounded-xl shadow-2xl p-4 w-[260px]"
            style={{ left: x, top: y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Connector Anchors</span>
              <button onClick={() => setAnchorEditor(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* From side */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-foreground mb-1.5">
                From: <span className="font-normal text-muted-foreground truncate">{fromComp?.title}</span>
              </p>
              <div className="flex gap-1 flex-wrap">
                {ANCHOR_BUTTONS.map(btn => (
                  <button
                    key={btn.value}
                    onClick={() => handleAnchorChange(editingConn.id, "start", btn.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors
                      ${currentStart === btn.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* To side */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-foreground mb-1.5">
                To: <span className="font-normal text-muted-foreground truncate">{toComp?.title}</span>
              </p>
              <div className="flex gap-1 flex-wrap">
                {ANCHOR_BUTTONS.map(btn => (
                  <button
                    key={btn.value}
                    onClick={() => handleAnchorChange(editingConn.id, "end", btn.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors
                      ${currentEnd === btn.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => handleDeleteFromEditor(editingConn.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Remove Connection
            </Button>
          </div>
        );
      })()}

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
