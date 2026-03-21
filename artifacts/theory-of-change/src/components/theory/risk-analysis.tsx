import { useState, useRef, useEffect } from "react";
import {
  useListTheoryRiskAnalyses,
  useCreateTheoryRiskAnalysis,
  useUpdateTheoryRiskAnalysis,
  useDeleteTheoryRiskAnalysis,
  getListTheoryRiskAnalysesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RiskAnalysisProps {
  theoryId: number;
}

function likelihoodColor(val: string) {
  const n = parseFloat(val);
  if (isNaN(n)) return "";
  if (n >= 70) return "text-red-600 font-semibold";
  if (n >= 40) return "text-amber-600 font-semibold";
  return "text-emerald-600 font-semibold";
}

export function RiskAnalysis({ theoryId }: RiskAnalysisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getListTheoryRiskAnalysesQueryKey(theoryId);

  const { data: rows = [], isLoading } = useListTheoryRiskAnalyses(theoryId);

  const createMutation = useCreateTheoryRiskAnalysis({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to add row", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateTheoryRiskAnalysis({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteTheoryRiskAnalysis({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const handleAddRow = () => {
    createMutation.mutate({
      theoryId,
      data: { risk: "", likelihood: "", mitigationStrategy: "", notes: "", position: rows.length },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ theoryId, id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filledRows = rows.filter(r => r.risk.trim() !== "");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Risk Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground">Identify risks, assess likelihood, and plan mitigations</p>
        </div>
        <Button onClick={handleAddRow} size="sm" className="gap-2" disabled={createMutation.isPending}>
          <Plus className="w-4 h-4" />
          Add Risk
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk</th>
              <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Likelihood (%)</th>
              <th className="w-56 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mitigation Strategy</th>
              <th className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No risks identified yet. Click "Add Risk" to get started.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const numbered = row.risk.trim() !== ""
                ? filledRows.findIndex(r => r.id === row.id) + 1
                : null;

              return (
                <RiskRow
                  key={row.id}
                  rowNumber={numbered}
                  risk={row.risk}
                  likelihood={row.likelihood}
                  mitigationStrategy={row.mitigationStrategy}
                  notes={row.notes}
                  onSave={(risk, likelihood, mitigationStrategy, notes) =>
                    updateMutation.mutate({
                      theoryId,
                      id: row.id,
                      data: { risk, likelihood, mitigationStrategy, notes },
                    })
                  }
                  onDelete={() => handleDelete(row.id)}
                  isEven={idx % 2 === 0}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {filledRows.length} {filledRows.length === 1 ? "risk" : "risks"} identified
        </p>
      )}
    </div>
  );
}

interface RiskRowProps {
  rowNumber: number | null;
  risk: string;
  likelihood: string;
  mitigationStrategy: string;
  notes: string;
  onSave: (risk: string, likelihood: string, mitigationStrategy: string, notes: string) => void;
  onDelete: () => void;
  isEven: boolean;
}

function RiskRow({ rowNumber, risk, likelihood, mitigationStrategy, notes, onSave, onDelete, isEven }: RiskRowProps) {
  const [local, setLocal] = useState({ risk, likelihood, mitigationStrategy, notes });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocal({ risk, likelihood, mitigationStrategy, notes }), [risk, likelihood, mitigationStrategy, notes]);

  const update = (field: keyof typeof local, value: string) => {
    const next = { ...local, [field]: value };
    setLocal(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(next.risk, next.likelihood, next.mitigationStrategy, next.notes);
    }, 600);
  };

  const flush = () => onSave(local.risk, local.likelihood, local.mitigationStrategy, local.notes);

  return (
    <tr className={`border-b border-border/50 last:border-b-0 group transition-colors ${isEven ? "bg-card" : "bg-muted/20"} hover:bg-primary/5`}>
      {/* # */}
      <td className="px-4 py-3 align-top">
        {rowNumber !== null ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-1">
            {rowNumber}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground/40 text-xs mt-1">
            —
          </span>
        )}
      </td>

      {/* Risk */}
      <td className="px-4 py-2 align-top">
        <textarea
          className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-muted-foreground/50 min-h-[36px] leading-relaxed"
          placeholder="Describe the risk..."
          value={local.risk}
          rows={1}
          onChange={e => {
            update("risk", e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={flush}
        />
      </td>

      {/* Likelihood */}
      <td className="px-4 py-2 align-top">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="100"
            className={`w-20 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50 ${likelihoodColor(local.likelihood)}`}
            placeholder="0–100"
            value={local.likelihood}
            onChange={e => update("likelihood", e.target.value)}
            onBlur={flush}
          />
          {local.likelihood && <span className="text-xs text-muted-foreground">%</span>}
        </div>
        {local.likelihood && !isNaN(parseFloat(local.likelihood)) && (
          <div className="mt-1 h-1.5 w-20 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                parseFloat(local.likelihood) >= 70 ? "bg-red-400" :
                parseFloat(local.likelihood) >= 40 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(parseFloat(local.likelihood), 100)}%` }}
            />
          </div>
        )}
      </td>

      {/* Mitigation Strategy */}
      <td className="px-4 py-2 align-top">
        <textarea
          className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-muted-foreground/50 min-h-[36px] leading-relaxed"
          placeholder="How will this risk be mitigated?"
          value={local.mitigationStrategy}
          rows={1}
          onChange={e => {
            update("mitigationStrategy", e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={flush}
        />
      </td>

      {/* Notes */}
      <td className="px-4 py-2 align-top">
        <textarea
          className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-muted-foreground/50 min-h-[36px] leading-relaxed"
          placeholder="Additional notes..."
          value={local.notes}
          rows={1}
          onChange={e => {
            update("notes", e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={flush}
        />
      </td>

      {/* Delete */}
      <td className="px-2 py-3 align-top">
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
