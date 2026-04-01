import { useState, useRef, useEffect } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import {
  TheoryDetail, ComponentType,
  useCreateConnection, useDeleteConnection, useUpdateConnection, useMoveComponent,
  getGetTheoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Info, Trash2, X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComponentCard } from "./component-card";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";
import { useToast } from "@/hooks/use-toast";

// ── Layout constants ──────────────────────────────────────────────────────────
const COL_W    = 280;
const COL_GAP  = 36;
const PAD      = 24;
const HEADER_H = 90;
const EST_CARD = 220;
const CARD_GAP = 16;

const COLUMNS: { type: ComponentType; label: string; description: string; addLabel: string }[] = [
  { type: "opportunity", label: "Opportunities / Constraints", description: "Context & enabling factors",        addLabel: "Opportunity / Constraint" },
  { type: "input",       label: "Inputs",                      description: "Resources invested",               addLabel: "Input" },
  { type: "activity",   label: "Activities",                    description: "Actions taken",                   addLabel: "Activity" },
  { type: "output",     label: "Outputs",                       description: "Direct products",                 addLabel: "Output" },
  { type: "outcome",    label: "Outcomes",                      description: "Short/medium term changes",        addLabel: "Outcome" },
  { type: "impact",     label: "Impact",                        description: "Long term systemic change",        addLabel: "Impact" },
];

const COL_IDX: Record<ComponentType, number> = {
  opportunity: 0, input: 1, activity: 2, output: 3, outcome: 4, impact: 5,
};

const colX = (type: ComponentType) => PAD + COL_IDX[type] * (COL_W + COL_GAP);

const CANVAS_W = PAD + 6 * COL_W + 5 * COL_GAP + PAD;

// ── Types ─────────────────────────────────────────────────────────────────────
type AnchorSide = "top" | "bottom" | "left" | "right" | "auto";

interface AnchorEditorState { connId: number; x: number; y: number }
interface DragState { compId: number; startMX: number; startMY: number; startPX: number; startPY: number }

const ANCHOR_BTNS: { value: AnchorSide; label: string; icon: string }[] = [
  { value: "top",    label: "Top",    icon: "↑" },
  { value: "right",  label: "Right",  icon: "→" },
  { value: "bottom", label: "Bottom", icon: "↓" },
  { value: "left",   label: "Left",   icon: "←" },
  { value: "auto",   label: "Auto",   icon: "⟳" },
];

// ── Helper: initial card position ─────────────────────────────────────────────
function autoPos(type: ComponentType, indexInCol: number) {
  return {
    x: colX(type),
    y: HEADER_H + 16 + indexInCol * (EST_CARD + CARD_GAP),
  };
}

function cardPos(comp: { id: number; type: string; positionX: number; positionY: number }, indexInCol: number, overrides: Map<number, { x: number; y: number }>) {
  const ov = overrides.get(comp.id);
  if (ov) return ov;
  if (comp.positionX !== 0 || comp.positionY !== 0) return { x: comp.positionX, y: comp.positionY };
  return autoPos(comp.type as ComponentType, indexInCol);
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TheoryCanvas({ theory }: { theory: TheoryDetail }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [connectingFrom, setConnectingFrom]     = useState<number | null>(null);
  const [addOpen, setAddOpen]                   = useState(false);
  const [addType, setAddType]                   = useState<ComponentType>("activity");
  const [anchorEditor, setAnchorEditor]         = useState<AnchorEditorState | null>(null);
  const [dragState, setDragState]               = useState<DragState | null>(null);

  // Local position overrides while dragging (or after drag before DB confirms)
  const posRef = useRef(new Map<number, { x: number; y: number }>());
  const [, tick] = useState(0);
  const rerender = () => tick(n => n + 1);

  // Stable refs so effects can always reach latest values
  const dragStateRef   = useRef<DragState | null>(null);
  dragStateRef.current = dragState;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theory.id) });

  const createConnectionMutation = useCreateConnection({
    mutation: {
      onSuccess: () => { invalidate(); setConnectingFrom(null); toast({ title: "Connected" }); },
      onError:   () => { toast({ title: "Failed to connect", variant: "destructive" }); setConnectingFrom(null); },
    },
  });

  const deleteConnectionMutation = useDeleteConnection({ mutation: { onSuccess: invalidate } });

  const updateConnectionMutation = useUpdateConnection({ mutation: { onSuccess: invalidate } });

  const moveComponentMutation = useMoveComponent({
    mutation: {
      onSuccess: (data) => {
        // Remove local override now that DB has the real value
        posRef.current.delete(data.id);
        invalidate();
      },
    },
  });
  const moveRef = useRef(moveComponentMutation.mutate);
  moveRef.current = moveComponentMutation.mutate;

  // ── Drag ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dragState) return;

    const onMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startMX;
      const dy = e.clientY - ds.startMY;
      posRef.current.set(ds.compId, {
        x: Math.max(0,        ds.startPX + dx),
        y: Math.max(HEADER_H, ds.startPY + dy),
      });
      rerender();
    };

    const onUp = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const pos = posRef.current.get(ds.compId);
      if (pos) {
        moveRef.current({
          theoryId: theory.id,
          id: ds.compId,
          data: { positionX: pos.x, positionY: pos.y },
        });
      }
      setDragState(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [dragState, theory.id]);

  // ── Connections ───────────────────────────────────────────────────────────────
  const handleConnectEnd = (id: number) => {
    if (!connectingFrom || connectingFrom === id) return;
    const exists = theory.connections.some(c =>
      (c.fromComponentId === connectingFrom && c.toComponentId === id) ||
      (c.fromComponentId === id && c.toComponentId === connectingFrom)
    );
    if (exists) {
      toast({ title: "Already connected", variant: "destructive" });
      setConnectingFrom(null);
      return;
    }
    createConnectionMutation.mutate({ theoryId: theory.id, data: { fromComponentId: connectingFrom, toComponentId: id, label: "" } });
  };

  const handleDisconnect = (connId: number) =>
    deleteConnectionMutation.mutate({ theoryId: theory.id, id: connId });

  // ── Anchor editor ─────────────────────────────────────────────────────────────
  const handleArrowClick = (connId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorEditor({ connId, x: e.clientX, y: e.clientY });
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

  const getAnchors = (conn: { fromComponentId: number; toComponentId: number; startAnchor?: string | null; endAnchor?: string | null }) => {
    const from = theory.components.find(c => c.id === conn.fromComponentId);
    const to   = theory.components.find(c => c.id === conn.toComponentId);
    if (!from || !to) return { start: "auto" as AnchorSide, end: "auto" as AnchorSide };
    const fc = COL_IDX[from.type as ComponentType] ?? 0;
    const tc = COL_IDX[to.type   as ComponentType] ?? 0;
    const autoStart: AnchorSide = fc < tc ? "right" : fc > tc ? "left" : "bottom";
    const autoEnd:   AnchorSide = fc < tc ? "left"  : fc > tc ? "right" : "top";
    return {
      start: (conn.startAnchor as AnchorSide) || autoStart,
      end:   (conn.endAnchor   as AnchorSide) || autoEnd,
    };
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const sortedIds = [...theory.components].sort((a, b) => a.id - b.id).map(c => c.id);
  const boxNumber = (id: number) => sortedIds.indexOf(id) + 1;

  const getConnectedComponents = (compId: number) =>
    theory.connections
      .filter(c => c.fromComponentId === compId || c.toComponentId === compId)
      .map(c => {
        const otherId = c.fromComponentId === compId ? c.toComponentId : c.fromComponentId;
        const other = theory.components.find(x => x.id === otherId);
        if (!other) return null;
        return { connectionId: c.id, title: other.title, type: other.type };
      })
      .filter(Boolean) as { connectionId: number; title: string; type: string }[];

  // Canvas height: at least 700px, extends past the lowest card
  const canvasH = Math.max(700,
    ...theory.components.map((comp, _, arr) => {
      const idx = arr.filter(c => c.type === comp.type).findIndex(c => c.id === comp.id);
      const pos = cardPos(comp, idx, posRef.current);
      return pos.y + EST_CARD + 120;
    }),
    HEADER_H + 120,
  );

  const editingConn = anchorEditor ? theory.connections.find(c => c.id === anchorEditor.connId) : null;

  return (
    <div className="relative flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* ── Connecting mode banner ── */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-top-4">
          <span className="font-medium">Click another card to connect…</span>
          <Button variant="secondary" size="sm" className="rounded-full h-8 px-3" onClick={() => setConnectingFrom(null)}>
            Cancel
          </Button>
        </div>
      )}

      {/* ── Scrollable canvas ── */}
      <div className="flex-1 overflow-auto" onClick={() => setAnchorEditor(null)}>
        <div
          className="relative select-none"
          style={{ width: CANVAS_W, minHeight: canvasH }}
        >
          <Xwrapper>
            {/* ── Column header bands ── */}
            {COLUMNS.map((col, i) => {
              const colComponents = col.type === "opportunity"
                ? theory.components.filter(c => c.type === "opportunity" && c.willBeAddressed)
                : theory.components.filter(c => c.type === col.type);

              return (
                <div
                  key={col.type}
                  className="absolute top-0 flex flex-col"
                  style={{ left: PAD + i * (COL_W + COL_GAP), width: COL_W, height: HEADER_H - 8 }}
                >
                  <div className="flex items-center justify-between mb-0.5 mt-3">
                    <h3 className="font-bold text-sm text-foreground leading-tight">{col.label}</h3>
                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs shrink-0 ml-1">
                      {colComponents.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{col.description}</p>
                  <div className="mt-2 border-b-2 border-border/50" />
                </div>
              );
            })}

            {/* ── Draggable component cards ── */}
            {theory.components
              .filter(comp => comp.type !== "opportunity" || comp.willBeAddressed)
              .map((comp) => {
                const sameType = theory.components.filter(c => c.type === comp.type);
                const idxInCol = sameType.findIndex(c => c.id === comp.id);
                const pos = cardPos(comp, idxInCol, posRef.current);
                const isDragging = dragState?.compId === comp.id;

                return (
                  <div
                    key={comp.id}
                    className={`absolute group ${isDragging ? "z-50 opacity-90" : "z-10"}`}
                    style={{
                      left: pos.x,
                      top:  pos.y,
                      width: COL_W,
                      cursor: isDragging ? "grabbing" : "default",
                    }}
                  >
                    {/* Drag handle */}
                    <div
                      className={`absolute -top-6 left-0 right-0 h-6 flex items-center justify-center rounded-t-lg
                        opacity-0 group-hover:opacity-100 transition-opacity
                        ${isDragging ? "opacity-100 cursor-grabbing bg-primary/10" : "cursor-grab bg-muted/70 hover:bg-muted"}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAnchorEditor(null);
                        setDragState({
                          compId: comp.id,
                          startMX: e.clientX,
                          startMY: e.clientY,
                          startPX: pos.x,
                          startPY: pos.y,
                        });
                      }}
                      title="Drag to reposition"
                    >
                      <GripHorizontal className="w-4 h-4 text-muted-foreground/70" />
                    </div>

                    <ComponentCard
                      component={comp}
                      boxNumber={boxNumber(comp.id)}
                      onConnectStart={setConnectingFrom}
                      onConnectEnd={handleConnectEnd}
                      isConnectingFrom={connectingFrom === comp.id}
                      isConnectingMode={!!connectingFrom}
                      connectedComponents={getConnectedComponents(comp.id)}
                      onDisconnect={handleDisconnect}
                    />
                  </div>
                );
              })}

            {/* ── "Add" buttons — one per non-opportunity column ── */}
            {COLUMNS.filter(col => col.type !== "opportunity").map(col => {
              const colComponents = theory.components.filter(c => c.type === col.type);
              // Place button below the lowest card in this column (or at HEADER_H if empty)
              const maxBottom = colComponents.length === 0
                ? HEADER_H + 16
                : Math.max(
                    ...colComponents.map((comp, _, arr) => {
                      const idx = arr.findIndex(c => c.id === comp.id);
                      const pos = cardPos(comp, idx, posRef.current);
                      return pos.y + EST_CARD + 12;
                    })
                  );
              return (
                <div
                  key={`add-${col.type}`}
                  className="absolute"
                  style={{ left: colX(col.type), top: maxBottom, width: COL_W }}
                >
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2 py-5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={() => { setAddType(col.type); setAddOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {col.addLabel}
                  </Button>
                </div>
              );
            })}

            {/* ── Opportunity column note ── */}
            <div
              className="absolute"
              style={{ left: colX("opportunity"), top: HEADER_H + 16, width: COL_W }}
            >
              <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/10 p-4 text-center flex flex-col items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground leading-snug">
                  Manage in the{" "}
                  <span className="font-semibold">About Intervention</span> tab.
                  Toggle <span className="font-semibold">"Will be addressed"</span> to show cards here.
                </p>
              </div>
            </div>

            {/* ── Arrows ── */}
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
                  }}
                />
              );
            })}
          </Xwrapper>
        </div>
      </div>

      {/* ── Anchor editor popover ── */}
      {anchorEditor && editingConn && (() => {
        const { start, end } = getAnchors(editingConn);
        const curStart: AnchorSide = (editingConn.startAnchor as AnchorSide) || start;
        const curEnd:   AnchorSide = (editingConn.endAnchor   as AnchorSide) || end;
        const fromComp = theory.components.find(c => c.id === editingConn.fromComponentId);
        const toComp   = theory.components.find(c => c.id === editingConn.toComponentId);
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const W = 264; const H = 236;
        const x = Math.min(anchorEditor.x + 8, vpW - W - 8);
        const y = Math.min(anchorEditor.y + 8, vpH - H - 8);

        return (
          <div
            className="fixed z-[999] bg-white border border-border rounded-xl shadow-2xl p-4"
            style={{ left: x, top: y, width: W }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Connector Anchors</span>
              <button onClick={() => setAnchorEditor(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3">
              <p className="text-[11px] font-semibold mb-1.5">From: <span className="font-normal text-muted-foreground">{fromComp?.title}</span></p>
              <div className="flex gap-1 flex-wrap">
                {ANCHOR_BTNS.map(btn => (
                  <button key={btn.value} onClick={() => handleAnchorChange(editingConn.id, "start", btn.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors
                      ${curStart === btn.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"}`}>
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-[11px] font-semibold mb-1.5">To: <span className="font-normal text-muted-foreground">{toComp?.title}</span></p>
              <div className="flex gap-1 flex-wrap">
                {ANCHOR_BTNS.map(btn => (
                  <button key={btn.value} onClick={() => handleAnchorChange(editingConn.id, "end", btn.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors
                      ${curEnd === btn.value ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"}`}>
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="destructive" size="sm" className="w-full h-8 text-xs"
              onClick={() => {
                if (window.confirm("Remove this connection?")) {
                  deleteConnectionMutation.mutate({ theoryId: theory.id, id: editingConn.id });
                  setAnchorEditor(null);
                }
              }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Connection
            </Button>
          </div>
        );
      })()}

      {/* ── Add component dialog ── */}
      <DialogWrapper open={addOpen} onOpenChange={setAddOpen} title="Add New Component" className="sm:max-w-[620px]">
        <ComponentForm theoryId={theory.id} defaultType={addType} onSuccess={() => setAddOpen(false)} />
      </DialogWrapper>
    </div>
  );
}
