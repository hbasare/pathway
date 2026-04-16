import { useState, useRef } from "react";
import { Component, ComponentType, useDeleteComponent, useUpdateComponentIndicator, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Edit2, Trash2, ArrowRight, Unlink, Activity, Zap, FileText, Target, Globe, Lightbulb, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";

interface ConnectedComponent {
  connectionId: number;
  title: string;
  type: string;
}

interface ScYear {
  id?: number;
  year?: string | null;
  actualDate?: string | null;
  target?: string | null;
  actual?: string | null;
  position?: number | null;
}

type IndicatorWithSc = NonNullable<Component["componentIndicators"]>[number] & {
  scYears?: ScYear[];
};

interface ComponentCardProps {
  component: Component;
  boxNumber: number;
  onConnectStart: (id: number) => void;
  onConnectEnd: (id: number) => void;
  isConnectingFrom: boolean;
  isConnectingMode: boolean;
  connectedComponents?: ConnectedComponent[];
  onDisconnect?: (connectionId: number) => void;
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

function sumNumeric(vals: (string | null | undefined)[]): string | null {
  const nums = vals.map(v => parseFloat(v ?? "")).filter(n => !isNaN(n));
  if (nums.length === 0) return null;
  const total = nums.reduce((a, b) => a + b, 0);
  return total.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

interface InlineFigureProps {
  value: string | null | undefined;
  placeholder: string;
  scValue: string | null;
  onSave: (v: string) => void;
  valueCls: string;
  accentCls: string;
}

function InlineFigure({ value, placeholder, scValue, onSave, valueCls, accentCls }: InlineFigureProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = (v: string) => {
    setEditing(false);
    if (v !== (value ?? "")) onSave(v);
  };

  const applySc = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scValue) { onSave(scValue); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={`w-full bg-transparent border-b border-current outline-none text-[10px] font-semibold ${valueCls} placeholder:text-current/40`}
          value={draft}
          placeholder={placeholder}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={e => { if (e.key === "Enter") commit(draft); if (e.key === "Escape") setEditing(false); }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={startEdit}
        className={`text-[10px] font-semibold ${value ? valueCls : "text-muted-foreground/40 italic"} hover:opacity-70 transition-opacity text-left`}
        title="Click to edit"
      >
        {value || placeholder}
      </button>
      {scValue && scValue !== value && (
        <button
          onClick={applySc}
          className={`inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-semibold border ${accentCls} hover:opacity-80 transition-opacity leading-none`}
          title={`Use Support Calculations total: ${scValue}`}
        >
          SC Σ {scValue}
        </button>
      )}
    </div>
  );
}

export function ComponentCard({
  component, boxNumber, onConnectStart, onConnectEnd, isConnectingFrom, isConnectingMode,
  connectedComponents = [], onDisconnect,
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

  const updateIndicator = useUpdateComponentIndicator({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(component.theoryId) }),
    },
  });

  const saveIndicatorField = (indicatorId: number, field: "targetFigure" | "actualFigure", value: string) => {
    updateIndicator.mutate({
      theoryId: component.theoryId,
      componentId: component.id,
      id: indicatorId,
      data: { [field]: value },
    });
  };

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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onConnectStart(component.id)}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Connect To...
                  </DropdownMenuItem>
                  {connectedComponents.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Unlink className="w-4 h-4 mr-2" />
                        Disconnect From...
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52">
                        {connectedComponents.map((cc) => (
                          <DropdownMenuItem
                            key={cc.connectionId}
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDisconnect?.(cc.connectionId)}
                          >
                            <Unlink className="w-3.5 h-3.5 mr-2 shrink-0" />
                            <span className="truncate">
                              <span className="text-[10px] uppercase font-semibold opacity-60 mr-1">{cc.type}</span>
                              {cc.title}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
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
              {(indicators as IndicatorWithSc[]).map((ind, idx) => {
                const scYears = ind.scYears ?? [];

                // SC sums (from year rows — the values entered in Support Calculations)
                const scTargetSum = sumNumeric(scYears.map(y => y.target));
                const scActualSum = sumNumeric(scYears.map(y => y.actual));

                // Latest dates from SC year rows
                const latestScTargetDate = scYears.map(y => y.year).filter(Boolean).sort().at(-1);
                const latestScActualDate = scYears.map(y => y.actualDate).filter(Boolean).sort().at(-1);

                return (
                  <div key={ind.id ?? ind.name} className="rounded-md bg-muted/30 border border-border/50 px-2.5 py-2">
                    <p className="text-[11px] font-semibold text-foreground leading-snug mb-2 line-clamp-2">
                      {idx + 1}. {ind.name || <span className="italic text-muted-foreground">Unnamed indicator</span>}
                    </p>
                    <div className="space-y-1.5">
                      {/* Target */}
                      <div className="rounded border px-2 py-1 bg-amber-50 border-amber-200">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Target</span>
                        </div>
                        <div className="pl-3 space-y-0.5">
                          <InlineFigure
                            value={ind.targetFigure}
                            placeholder="Click to set target…"
                            scValue={scTargetSum}
                            onSave={v => ind.id != null && saveIndicatorField(ind.id, "targetFigure", v)}
                            valueCls="text-amber-900"
                            accentCls="bg-amber-100 border-amber-300 text-amber-800"
                          />
                          {(latestScTargetDate ?? ind.targetDate) && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {formatDate(latestScTargetDate ?? ind.targetDate)}
                              {latestScTargetDate && (
                                <span className="inline-flex items-center px-1 py-px rounded text-[8px] font-semibold bg-muted border border-border/60 text-muted-foreground uppercase tracking-wide leading-none">SC</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actual */}
                      <div className="rounded border px-2 py-1 bg-emerald-50 border-emerald-200">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Actual</span>
                        </div>
                        <div className="pl-3 space-y-0.5">
                          <InlineFigure
                            value={ind.actualFigure}
                            placeholder="Click to set actual…"
                            scValue={scActualSum}
                            onSave={v => ind.id != null && saveIndicatorField(ind.id, "actualFigure", v)}
                            valueCls="text-emerald-900"
                            accentCls="bg-emerald-100 border-emerald-300 text-emerald-800"
                          />
                          {(latestScActualDate ?? ind.actualDate) && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {formatDate(latestScActualDate ?? ind.actualDate)}
                              {latestScActualDate && (
                                <span className="inline-flex items-center px-1 py-px rounded text-[8px] font-semibold bg-muted border border-border/60 text-muted-foreground uppercase tracking-wide leading-none">SC</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Baseline — read-only (set via Edit Component) */}
                      <div className="rounded border px-2 py-1 bg-blue-50 border-blue-200">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Baseline</span>
                        </div>
                        {(ind.baselineFigure || ind.baselineDate) ? (
                          <div className="pl-3 space-y-0.5">
                            {ind.baselineFigure && <p className="text-[10px] text-blue-900 font-semibold">{ind.baselineFigure}</p>}
                            {ind.baselineDate && <p className="text-[10px] text-muted-foreground">{formatDate(ind.baselineDate)}</p>}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/50 italic pl-3">Not set</p>
                        )}
                      </div>
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
