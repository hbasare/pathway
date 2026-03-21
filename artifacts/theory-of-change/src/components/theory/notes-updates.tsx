import { useState, useRef, useEffect } from "react";
import {
  useListTheoryNotesUpdates,
  useCreateTheoryNoteUpdate,
  useUpdateTheoryNoteUpdate,
  useDeleteTheoryNoteUpdate,
  getListTheoryNotesUpdatesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface NotesUpdatesProps {
  theoryId: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function NotesUpdates({ theoryId }: NotesUpdatesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = getListTheoryNotesUpdatesQueryKey(theoryId);

  const { data: rows = [], isLoading } = useListTheoryNotesUpdates(theoryId);

  const createMutation = useCreateTheoryNoteUpdate({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to add row", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateTheoryNoteUpdate({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteTheoryNoteUpdate({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey }),
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const handleAddRow = () => {
    createMutation.mutate({
      theoryId,
      data: { activityChange: "", date: "", position: rows.length },
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

  const displayRows = rows.filter(r => r.activityChange.trim() !== "");
  const rowsWithEmpty = [...rows];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notes and Updates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Record activities, changes and updates over time</p>
        </div>
        <Button onClick={handleAddRow} size="sm" className="gap-2" disabled={createMutation.isPending}>
          <Plus className="w-4 h-4" />
          Add Row
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity / Change</th>
              <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="w-12 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rowsWithEmpty.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No entries yet. Click "Add Row" to get started.
                </td>
              </tr>
            )}
            {rowsWithEmpty.map((row, idx) => {
              const rowNumber = rows
                .filter(r => r.activityChange.trim() !== "")
                .findIndex(r => r.id === row.id);
              const numbered = row.activityChange.trim() !== "" ? rowNumber + 1 : null;

              return (
                <NoteRow
                  key={row.id}
                  rowNumber={numbered}
                  activityChange={row.activityChange}
                  date={row.date}
                  onSave={(activityChange, date) =>
                    updateMutation.mutate({
                      theoryId,
                      id: row.id,
                      data: { activityChange, date },
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

      {rowsWithEmpty.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {displayRows.length} {displayRows.length === 1 ? "entry" : "entries"}
        </p>
      )}
    </div>
  );
}

interface NoteRowProps {
  rowNumber: number | null;
  activityChange: string;
  date: string;
  onSave: (activityChange: string, date: string) => void;
  onDelete: () => void;
  isEven: boolean;
}

function NoteRow({ rowNumber, activityChange, date, onSave, onDelete, isEven }: NoteRowProps) {
  const [localActivity, setLocalActivity] = useState(activityChange);
  const [localDate, setLocalDate] = useState(date);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalActivity(activityChange); }, [activityChange]);
  useEffect(() => { setLocalDate(date); }, [date]);

  const triggerSave = (activity: string, dateVal: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onSave(activity, dateVal);
    }, 600);
  };

  return (
    <tr className={`border-b border-border/50 last:border-b-0 group transition-colors ${isEven ? "bg-card" : "bg-muted/20"} hover:bg-primary/5`}>
      <td className="px-4 py-3 align-middle">
        {rowNumber !== null ? (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {rowNumber}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground/40 text-xs">
            —
          </span>
        )}
      </td>
      <td className="px-4 py-2 align-middle">
        <textarea
          className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none focus:ring-0 placeholder:text-muted-foreground/50 min-h-[36px] leading-relaxed"
          placeholder="Describe the activity or change..."
          value={localActivity}
          rows={1}
          onChange={e => {
            const v = e.target.value;
            setLocalActivity(v);
            triggerSave(v, localDate);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={() => onSave(localActivity, localDate)}
        />
      </td>
      <td className="px-4 py-2 align-middle">
        <input
          type="date"
          className="w-full text-sm text-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/50"
          value={localDate}
          onChange={e => {
            const v = e.target.value;
            setLocalDate(v);
            triggerSave(localActivity, v);
          }}
          onBlur={() => onSave(localActivity, localDate)}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}
