import { useState } from "react";
import {
  useListBusinessModelActors,
  useCreateBusinessModelActor,
  useUpdateBusinessModelActor,
  useDeleteBusinessModelActor,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Plus, Trash2, Pencil, Check, X, Loader2, Image as ImageIcon, Upload,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Actor {
  id: number;
  position: number;
  actorName: string;
  currentBehaviour: string;
  expectedBehaviourChange: string;
}

interface BusinessModelProps {
  theory: {
    id: number;
    title: string;
    businessModelImagePath?: string | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

function imageUrl(path: string) {
  // Strip /api prefix since we'll prepend the dev domain
  const fullBase = window.location.origin;
  return `${fullBase}${path}`;
}

// ─── Inline row editor ────────────────────────────────────────────────────────
function ActorRow({
  actor,
  rowNum,
  onSave,
  onDelete,
}: {
  actor: Actor;
  rowNum: number;
  onSave: (id: number, data: Omit<Actor, "id" | "position">) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(actor.actorName);
  const [current, setCurrent] = useState(actor.currentBehaviour);
  const [expected, setExpected] = useState(actor.expectedBehaviourChange);

  const handleSave = () => {
    onSave(actor.id, { actorName: name, currentBehaviour: current, expectedBehaviourChange: expected });
    setEditing(false);
  };
  const handleCancel = () => {
    setName(actor.actorName);
    setCurrent(actor.currentBehaviour);
    setExpected(actor.expectedBehaviourChange);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-primary/5 border-b border-border">
        <td className="px-3 py-2 align-top text-center text-sm font-bold text-muted-foreground">{rowNum}</td>
        <td className="px-3 py-2 align-top">
          <Input value={name} onChange={e => setName(e.target.value)} className="text-sm h-8" placeholder={t("businessModel.actorName")} />
        </td>
        <td className="px-3 py-2 align-top">
          <Textarea value={current} onChange={e => setCurrent(e.target.value)} className="text-sm min-h-[60px]" placeholder={t("businessModel.currentBehaviour")} />
        </td>
        <td className="px-3 py-2 align-top">
          <Textarea value={expected} onChange={e => setExpected(e.target.value)} className="text-sm min-h-[60px]" placeholder={t("businessModel.expectedBehaviourChange")} />
        </td>
        <td className="px-3 py-2 align-top">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleSave}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={handleCancel}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
      <td className="px-3 py-3 align-top text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">{rowNum}</span>
      </td>
      <td className="px-3 py-3 align-top text-sm font-semibold text-foreground">{actor.actorName || <span className="italic text-muted-foreground/50">—</span>}</td>
      <td className="px-3 py-3 align-top text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{actor.currentBehaviour || <span className="italic text-muted-foreground/50">—</span>}</td>
      <td className="px-3 py-3 align-top text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{actor.expectedBehaviourChange || <span className="italic text-muted-foreground/50">—</span>}</td>
      <td className="px-3 py-3 align-top">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(actor.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── New row form ────────────────────────────────────────────────────────────
function NewActorRow({
  rowNum,
  onSave,
  onCancel,
}: {
  rowNum: number;
  onSave: (data: { actorName: string; currentBehaviour: string; expectedBehaviourChange: string; position: number }) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [expected, setExpected] = useState("");

  return (
    <tr className="bg-primary/5 border-b border-border">
      <td className="px-3 py-2 align-top text-center text-sm font-bold text-muted-foreground">{rowNum}</td>
      <td className="px-3 py-2 align-top">
        <Input value={name} onChange={e => setName(e.target.value)} className="text-sm h-8" placeholder={t("businessModel.actorName")} autoFocus />
      </td>
      <td className="px-3 py-2 align-top">
        <Textarea value={current} onChange={e => setCurrent(e.target.value)} className="text-sm min-h-[60px]" placeholder={t("businessModel.currentBehaviour")} />
      </td>
      <td className="px-3 py-2 align-top">
        <Textarea value={expected} onChange={e => setExpected(e.target.value)} className="text-sm min-h-[60px]" placeholder={t("businessModel.expectedBehaviourChange")} />
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => name.trim() && onSave({ actorName: name, currentBehaviour: current, expectedBehaviourChange: expected, position: rowNum - 1 })}>
            <Check className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function BusinessModel({ theory }: BusinessModelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentImagePath, setCurrentImagePath] = useState(theory.businessModelImagePath ?? "");
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);

  const { data: actors = [], refetch } = useListBusinessModelActors(theory.id);

  const createMutation = useCreateBusinessModelActor({
    mutation: {
      onSuccess: () => { refetch(); setAddingRow(false); },
      onError: () => toast({ title: t("businessModel.failedToAddActor"), variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateBusinessModelActor({
    mutation: {
      onSuccess: () => refetch(),
      onError: () => toast({ title: t("businessModel.failedToUpdateActor"), variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteBusinessModelActor({
    mutation: {
      onSuccess: () => refetch(),
      onError: () => toast({ title: t("businessModel.failedToDeleteActor"), variant: "destructive" }),
    },
  });

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`${API_BASE}/theories/${theory.id}/business-model/upload-image`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const { imageUrl: url } = await res.json() as { imageUrl: string };
      setCurrentImagePath(url);
      toast({ title: t("businessModel.diagramUploaded") });
    } catch (err) {
      toast({ title: t("businessModel.uploadFailed"), description: String(err), variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const buildGeneratePrompt = () => {
    const base = prompt.trim();
    const refinement = refinementPrompt.trim();
    if (refinement) return `${base}\n\nFurther instructions: ${refinement}`;
    return base;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setPendingImageUrl(null);
    try {
      const res = await fetch(`${API_BASE}/theories/${theory.id}/business-model/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildGeneratePrompt() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { imageUrl: url } = await res.json() as { imageUrl: string };
      setPendingImageUrl(url);
      setRefinementPrompt("");
    } catch (err) {
      toast({ title: t("businessModel.generationFailed"), description: String(err), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!pendingImageUrl) return;
    setCurrentImagePath(pendingImageUrl);
    setPendingImageUrl(null);
    setRefinementPrompt("");
    toast({ title: t("businessModel.diagramAccepted") });
  };

  const handleDiscard = () => {
    setPendingImageUrl(null);
    setRefinementPrompt("");
  };

  const handleSaveActor = (id: number, data: Omit<Actor, "id" | "position">) => {
    updateMutation.mutate({ theoryId: theory.id, id, data: { ...data, position: 0 } });
  };

  const handleDeleteActor = (id: number) => {
    if (window.confirm(t("businessModel.deleteActorConfirm"))) {
      deleteMutation.mutate({ theoryId: theory.id, id });
    }
  };

  const handleAddActor = (data: { actorName: string; currentBehaviour: string; expectedBehaviourChange: string; position: number }) => {
    createMutation.mutate({ theoryId: theory.id, data });
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="max-w-5xl mx-auto w-full px-6 py-8 space-y-10">

        {/* ── Header ── */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{theory.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("businessModel.title")}</p>
        </div>

        {/* ── AI Image Generation ── */}
        <section>
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              {t("businessModel.diagramTitle")}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Option A — AI generate */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("businessModel.generateWithAI")}</p>
              <p className="text-sm text-muted-foreground">
                {t("businessModel.generateDesc")}
              </p>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={t("businessModel.generatePlaceholder")}
                className="min-h-[80px] text-sm"
                disabled={isGenerating}
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isUploading || !prompt.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("businessModel.generating")}</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {t("businessModel.generateDiagram")}</>
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Option B — Upload */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("businessModel.uploadOwn")}</p>
              <p className="text-sm text-muted-foreground">
                {t("businessModel.uploadDesc")}
              </p>
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploading || isGenerating}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  asChild
                  variant="outline"
                  disabled={isUploading || isGenerating}
                  className="gap-2 cursor-pointer"
                >
                  <span>
                    {isUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t("businessModel.uploading")}</>
                    ) : (
                      <><Upload className="w-4 h-4" /> {t("businessModel.chooseFile")}</>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* ── Preview / review panel (shown after generation, before acceptance) ── */}
          {pendingImageUrl && (
            <div className="mt-5 rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{t("businessModel.reviewGenerated")}</span>
                </div>
                <button
                  onClick={handleDiscard}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Discard"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview image */}
              <img
                src={pendingImageUrl}
                alt="Generated business model diagram preview"
                className="w-full object-contain bg-white"
                style={{ maxHeight: "520px" }}
              />

              {/* Refinement + actions */}
              <div className="px-4 py-4 space-y-3 bg-background/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("businessModel.refinementLabel")}
                  </label>
                  <Textarea
                    value={refinementPrompt}
                    onChange={e => setRefinementPrompt(e.target.value)}
                    placeholder={t("businessModel.refinementPlaceholder")}
                    className="min-h-[60px] text-sm"
                    disabled={isGenerating}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleAccept}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t("businessModel.acceptDiagram")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t("businessModel.regenerating")}</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> {t("businessModel.regenerate")}</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDiscard}
                    className="text-muted-foreground gap-2 ml-auto"
                  >
                    <X className="w-4 h-4" />
                    {t("businessModel.discard")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Accepted / current image ── */}
          {!pendingImageUrl && (
            <div className="mt-5">
              {currentImagePath ? (
                <div className="rounded-xl border border-border overflow-hidden shadow-sm">
                  <img
                    src={imageUrl(currentImagePath)}
                    alt="Business model diagram"
                    className="w-full object-contain bg-white"
                    style={{ maxHeight: "520px" }}
                  />
                  <div className="px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" />
                    {t("businessModel.diagramCaption")}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">{t("businessModel.noDiagram")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    {t("businessModel.noDiagramHint")}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Actors table ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex-1">
              {t("businessModel.actorBehaviourChange")}
            </h3>
          </div>

          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-12">#</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs w-48">{t("businessModel.actors")}</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">{t("businessModel.currentBehaviour")}</th>
                  <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">{t("businessModel.expectedBehaviourChange")}</th>
                  <th className="w-20 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {(actors as Actor[]).map((actor, i) => (
                  <ActorRow
                    key={actor.id}
                    actor={actor}
                    rowNum={i + 1}
                    onSave={handleSaveActor}
                    onDelete={handleDeleteActor}
                  />
                ))}
                {addingRow && (
                  <NewActorRow
                    rowNum={(actors as Actor[]).length + 1}
                    onSave={handleAddActor}
                    onCancel={() => setAddingRow(false)}
                  />
                )}
                {actors.length === 0 && !addingRow && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground italic">
                      {t("businessModel.noActors")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            {!addingRow && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setAddingRow(true)}
              >
                <Plus className="w-4 h-4" />
                {t("businessModel.addActor")}
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
