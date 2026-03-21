import { useState, useRef, useEffect } from "react";
import Xarrow, { Xwrapper } from "react-xarrows";
import { TheoryDetail, ComponentType, useCreateConnection, useDeleteConnection, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComponentCard } from "./component-card";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";
import { useToast } from "@/hooks/use-toast";

interface TheoryCanvasProps {
  theory: TheoryDetail;
}

const COLUMNS: { type: ComponentType; label: string; description: string }[] = [
  { type: "input", label: "Inputs", description: "Resources invested" },
  { type: "activity", label: "Activities", description: "Actions taken" },
  { type: "output", label: "Outputs", description: "Direct products" },
  { type: "outcome", label: "Outcomes", description: "Short/medium term changes" },
  { type: "impact", label: "Impact", description: "Long term systemic change" },
];

const COLUMN_INDEX: Record<ComponentType, number> = {
  input: 0,
  activity: 1,
  output: 2,
  outcome: 3,
  impact: 4,
};

export function TheoryCanvas({ theory }: TheoryCanvasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectingFrom, setConnectingFrom] = useState<number | null>(null);
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [selectedColumnType, setSelectedColumnType] = useState<ComponentType>("activity");

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

  // Determine smart anchors so arrows route through column gaps, not through cards
  const getAnchors = (fromId: number, toId: number) => {
    const from = theory.components.find(c => c.id === fromId);
    const to = theory.components.find(c => c.id === toId);
    if (!from || !to) return { start: "auto" as const, end: "auto" as const };
    const fromCol = COLUMN_INDEX[from.type as ComponentType] ?? 0;
    const toCol = COLUMN_INDEX[to.type as ComponentType] ?? 0;
    if (fromCol < toCol) return { start: "right" as const, end: "left" as const };
    if (fromCol > toCol) return { start: "left" as const, end: "right" as const };
    return { start: "bottom" as const, end: "top" as const };
  };

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
      >
        <Xwrapper>
          <div className="flex gap-10 min-w-max pb-32">
            {COLUMNS.map((col) => {
              const columnComponents = theory.components.filter((c) => c.type === col.type);

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

                    <Button
                      variant="outline"
                      className="border-dashed border-2 py-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedColumnType(col.type);
                        setIsAddComponentOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add {col.label.slice(0, -1)}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {theory.connections.map((conn) => {
            const { start, end } = getAnchors(conn.fromComponentId, conn.toComponentId);
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
                  onClick: (e: React.MouseEvent) => handleDeleteConnection(conn.id, e),
                  className: "cursor-pointer hover:stroke-destructive transition-colors",
                  style: { zIndex: 0 },
                }}
              />
            );
          })}
        </Xwrapper>
      </div>

      <DialogWrapper
        open={isAddComponentOpen}
        onOpenChange={setIsAddComponentOpen}
        title="Add New Component"
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
