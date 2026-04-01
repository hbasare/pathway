import { useState } from "react";
import { Component, ComponentType, useDeleteComponent, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Edit2, Trash2, ArrowRight, Activity, Zap, FileText, Target, Globe, Lightbulb, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";

interface ComponentCardProps {
  component: Component;
  boxNumber: number;
  onConnectStart: (id: number) => void;
  onConnectEnd: (id: number) => void;
  isConnectingFrom: boolean;
  isConnectingMode: boolean;
}

const TYPE_CONFIG: Record<ComponentType, { border: string; accent: string; icon: React.ElementType }> = {
  opportunity: { border: "border-emerald-200", accent: "bg-emerald-400", icon: Lightbulb },
  input:    { border: "border-blue-200",   accent: "bg-blue-400",   icon: FileText },
  activity: { border: "border-purple-200", accent: "bg-purple-400", icon: Activity },
  output:   { border: "border-teal-200",   accent: "bg-teal-400",   icon: Zap },
  outcome:  { border: "border-orange-200", accent: "bg-orange-400", icon: Target },
  impact:   { border: "border-rose-200",   accent: "bg-rose-400",   icon: Globe },
};

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

export function ComponentCard({
  component, boxNumber, onConnectStart, onConnectEnd, isConnectingFrom, isConnectingMode
}: ComponentCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const deleteMutation = useDeleteComponent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(component.theoryId) });
        toast({ title: "Component deleted" });
      },
      onError: () => toast({ title: "Failed to delete component", variant: "destructive" }),
    },
  });

  const config = TYPE_CONFIG[component.type];
  const Icon = config.icon;
  const indicators = component.componentIndicators ?? [];

  const handleCardClick = () => {
    if (isConnectingMode && !isConnectingFrom) onConnectEnd(component.id);
  };

  return (
    <>
      <div
        id={`comp-${component.id}`}
        onClick={handleCardClick}
        className={`
          relative w-[280px] rounded-xl border shadow-sm bg-card overflow-hidden
          transition-all duration-200 cursor-pointer
          ${isConnectingMode ? "hover:ring-2 hover:ring-primary hover:border-primary" : "hover:shadow-md"}
          ${isConnectingFrom ? "ring-2 ring-primary border-primary shadow-md scale-[1.02]" : ""}
          ${config.border}
        `}
      >
        {/* Accent top bar */}
        <div className={`h-1 w-full ${config.accent} opacity-70`} />

        <div className="p-4">
          {/* Header row: box number + type label + menu */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold shrink-0">
                {boxNumber}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{component.type}</span>
              </div>
            </div>

            {!isConnectingMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onConnectStart(component.id)}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Connect To...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this component?")) {
                        deleteMutation.mutate({ theoryId: component.theoryId, id: component.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Title */}
          <h4 className="font-bold text-foreground text-sm leading-snug mb-2">{component.title}</h4>

          {/* Description */}
          {component.description && (
            <div className="mb-3 bg-muted/40 rounded-lg px-3 py-2 border-l-2 border-muted-foreground/20">
              <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                {component.description}
              </p>
            </div>
          )}

          {/* Assumptions badge */}
          {component.assumptions && (
            <div className="mb-3">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm font-medium">
                Assumptions
              </Badge>
            </div>
          )}

          {/* Per-indicator rows */}
          {indicators.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Indicators ({indicators.length})
                </span>
              </div>
              {indicators.map((ind, idx) => {
                const groups = [
                  {
                    key: "target",
                    label: "Target",
                    date: ind.targetDate,
                    figure: ind.targetFigure,
                    labelCls: "text-amber-700",
                    bgCls: "bg-amber-50 border-amber-200",
                    dotCls: "bg-amber-400",
                  },
                  {
                    key: "actual",
                    label: "Actual",
                    date: ind.actualDate,
                    figure: ind.actualFigure,
                    labelCls: "text-emerald-700",
                    bgCls: "bg-emerald-50 border-emerald-200",
                    dotCls: "bg-emerald-400",
                  },
                  {
                    key: "baseline",
                    label: "Baseline",
                    date: ind.baselineDate,
                    figure: ind.baselineFigure,
                    labelCls: "text-blue-700",
                    bgCls: "bg-blue-50 border-blue-200",
                    dotCls: "bg-blue-400",
                  },
                ];
                return (
                  <div key={ind.id ?? ind.name} className="rounded-md bg-muted/30 border border-border/50 px-2.5 py-2">
                    <p className="text-[11px] font-semibold text-foreground leading-snug mb-2 line-clamp-2">
                      {idx + 1}. {ind.name || <span className="italic text-muted-foreground">Unnamed indicator</span>}
                    </p>
                    <div className="space-y-1.5">
                      {groups.map(g => {
                        const hasData = !!(g.date || g.figure);
                        return (
                          <div key={g.key} className={`rounded border px-2 py-1 ${g.bgCls}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.dotCls}`} />
                              <span className={`text-[10px] font-bold uppercase tracking-wide ${g.labelCls}`}>{g.label}</span>
                            </div>
                            {hasData ? (
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pl-3">
                                {g.date && (
                                  <span className="text-[10px] text-foreground font-medium">{formatDate(g.date)}</span>
                                )}
                                {g.date && g.figure && (
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                )}
                                {g.figure && (
                                  <span className="text-[10px] text-muted-foreground">{g.figure}</span>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground/50 italic pl-3">Not set</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DialogWrapper open={isEditOpen} onOpenChange={setIsEditOpen} title="Edit Component" className="sm:max-w-[620px]">
        <ComponentForm
          theoryId={component.theoryId}
          initialData={{
            ...component,
            assumptions: component.assumptions ?? undefined,
            qualitativeQuestions: component.qualitativeQuestions ?? undefined,
            quantitativeQuestions: component.quantitativeQuestions ?? undefined,
            componentIndicators: component.componentIndicators ?? [],
          }}
          onSuccess={() => setIsEditOpen(false)}
        />
      </DialogWrapper>
    </>
  );
}
