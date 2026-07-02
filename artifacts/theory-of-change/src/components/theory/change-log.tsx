import { useListTheoryChangeLog } from "@workspace/api-client-react";
import { Loader2, PlusCircle, Pencil, Trash2, History } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChangeLogProps {
  theoryId: number;
}

function formatDateTime(dateVal: string | Date) {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateVal);
  }
}

function dayKey(dateVal: string | Date) {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return String(dateVal);
  }
}

const ACTION_STYLES: Record<string, { icon: typeof PlusCircle; className: string }> = {
  create: { icon: PlusCircle, className: "text-emerald-600 bg-emerald-50" },
  update: { icon: Pencil, className: "text-amber-600 bg-amber-50" },
  delete: { icon: Trash2, className: "text-red-600 bg-red-50" },
};

export function ChangeLog({ theoryId }: ChangeLogProps) {
  const { t } = useTranslation();
  const { data: entries = [], isLoading, isError } = useListTheoryChangeLog(theoryId, {
    query: { enabled: !!theoryId },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-sm text-destructive">
        {t("changeLog.loadFailed")}
      </div>
    );
  }

  const groups: { day: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const day = dayKey(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(entry);
    } else {
      groups.push({ day, items: [entry] });
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">{t("changeLog.title")}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t("changeLog.subtitle")}</p>
      </div>

      {entries.length === 0 && (
        <div className="rounded-xl border border-border border-dashed p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
          <History className="w-6 h-6 text-muted-foreground/50" />
          {t("changeLog.noEntries")}
        </div>
      )}

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.day}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {group.day}
            </div>
            <div className="rounded-xl border border-border overflow-hidden shadow-sm divide-y divide-border/60">
              {group.items.map(entry => {
                const style = ACTION_STYLES[entry.action] ?? ACTION_STYLES.update;
                const Icon = style.icon;
                const entityLabelType =
                  t(`changeLog.entityTypes.${entry.entityType}`, { defaultValue: entry.entityType });
                const actionWord = t(`changeLog.${entry.action}`, { defaultValue: entry.action });
                const who = entry.displayName || entry.username || t("changeLog.unknownUser");

                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 bg-card">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${style.className}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{who}</span>{" "}
                        {entry.summary
                          ? entry.summary
                          : `${actionWord} ${entityLabelType}${entry.entityLabel ? ` "${entry.entityLabel}"` : ""}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
