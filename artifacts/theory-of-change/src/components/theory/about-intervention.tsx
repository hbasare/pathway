import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTheory, useCreateComponent, useUpdateComponent, useDeleteComponent, getGetTheoryQueryKey } from "@workspace/api-client-react";
import type { TheoryDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pencil, X, Save, Lightbulb, Plus, Trash2, AlertCircle, ArrowRight, Check } from "lucide-react";

// ─── Field configuration ─────────────────────────────────────────────────────
// To add, remove, or reorder fields simply edit this array.
type FieldType = "input" | "textarea";

interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  section: string;
}

const FIELD_CONFIG: FieldDef[] = [
  // Identification
  { key: "market",           label: "Market",            type: "input",    section: "Identification",          placeholder: "e.g. Kenya, Ethiopia" },
  { key: "interventionCode", label: "Intervention Code", type: "input",    section: "Identification",          placeholder: "e.g. KE-YEP-2024-001" },
  { key: "interventionTitle",label: "Intervention Title",type: "input",    section: "Identification",          placeholder: "Full official title of the intervention" },

  // People & Responsibility
  { key: "manager",          label: "Manager",                           type: "input",    section: "People & Responsibility", placeholder: "Full name of the intervention manager" },
  { key: "mrmResponsible",   label: "Person(s) Responsible for MRM",    type: "input",    section: "People & Responsibility", placeholder: "Name(s) of MRM leads", hint: "Monitoring, Results & Measurement" },

  // Beneficiaries & Partners
  { key: "targetBeneficiary",      label: "Target Beneficiary Group(s)",  type: "textarea", section: "Beneficiaries & Partners", placeholder: "Describe who this intervention targets (e.g. youth aged 16–24 in underserved communities)" },
  { key: "privateSectorPartners",  label: "Private Sector Partner(s)",    type: "textarea", section: "Beneficiaries & Partners", placeholder: "List private sector organisations involved" },
  { key: "publicSectorPartners",   label: "Public Sector Partner(s)",     type: "textarea", section: "Beneficiaries & Partners", placeholder: "List government or public sector bodies involved" },
  { key: "serviceProviders",       label: "Service Provider(s)",          type: "textarea", section: "Beneficiaries & Partners", placeholder: "List organisations delivering services" },

  // Strategic Context
  { key: "interventionStory", label: "Intervention Story", type: "textarea", section: "Strategic Context", placeholder: "Narrative describing the intervention's journey and context" },

  // Cross-cutting Themes
  { key: "womenEconomicEmpowerment",    label: "Women's Economic Empowerment",    type: "textarea", section: "Cross-cutting Themes", placeholder: "How does this intervention advance women's economic empowerment?" },
  { key: "climateSmart",                label: "Climate Smart",                   type: "textarea", section: "Cross-cutting Themes", placeholder: "How does this intervention integrate climate-smart approaches?" },
  { key: "displacement",                label: "Displacement",                    type: "textarea", section: "Cross-cutting Themes", placeholder: "How does this intervention address or consider displacement?" },
  { key: "contributionOfOtherProjects", label: "Contribution of Other Projects",  type: "textarea", section: "Cross-cutting Themes", placeholder: "What other projects contribute to or complement this intervention?" },
];

// Group fields by section
const SECTIONS = Array.from(new Set(FIELD_CONFIG.map(f => f.section)));
const fieldsBySection = (section: string) => FIELD_CONFIG.filter(f => f.section === section);

// ─── Zod schema (built dynamically from config) ──────────────────────────────
const schemaShape = Object.fromEntries(
  FIELD_CONFIG.map(f => [f.key, z.string().optional()])
) as Record<string, z.ZodOptional<z.ZodString>>;

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  ...schemaShape,
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────
interface AboutInterventionProps {
  theory: TheoryDetail;
}

// ─── FieldSection helper ─────────────────────────────────────────────────────
function FieldSection({
  sectionName,
  theory,
  isEditing,
  form,
  hideHeader = false,
}: {
  sectionName: string;
  theory: TheoryDetail;
  isEditing: boolean;
  form: ReturnType<typeof useForm<FormValues>>;
  hideHeader?: boolean;
}) {
  const fields = fieldsBySection(sectionName);
  if (fields.length === 0) return null;
  return (
    <section>
      {!hideHeader && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            {sectionName}
          </h3>
        </div>
      )}
      <div className="grid gap-5">
        {fields.map(field => {
          const value = (theory[field.key as keyof typeof theory] as string) ?? "";
          const isEmpty = !value?.trim();
          if (isEditing) {
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {field.label}
                  {field.hint && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">({field.hint})</span>
                  )}
                </label>
                {field.type === "textarea" ? (
                  <Textarea
                    {...form.register(field.key as keyof FormValues)}
                    placeholder={field.placeholder}
                    className="min-h-[90px] text-sm"
                  />
                ) : (
                  <Input
                    {...form.register(field.key as keyof FormValues)}
                    placeholder={field.placeholder}
                    className="text-sm"
                  />
                )}
              </div>
            );
          }
          return (
            <div key={field.key} className="grid grid-cols-[200px_1fr] gap-4 items-start py-2 border-b border-border/40 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{field.label}</p>
                {field.hint && <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>}
              </div>
              <div>
                {isEmpty ? (
                  <span className="text-sm text-muted-foreground/50 italic">Not set</span>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── OpportunitiesSection ─────────────────────────────────────────────────────
function OpportunitiesSection({ theory }: { theory: TheoryDetail }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theory.id) });

  const opportunities = theory.components.filter(c => c.type === "opportunity");

  // New-entry draft state
  const [showAdd, setShowAdd] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDesc, setDraftDesc] = useState("");

  const createMutation = useCreateComponent({
    mutation: {
      onSuccess: () => { invalidate(); setShowAdd(false); setDraftTitle(""); setDraftDesc(""); },
      onError: () => toast({ title: "Failed to add", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateComponent({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteComponent({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const handleAdd = () => {
    if (!draftTitle.trim()) return;
    createMutation.mutate({
      theoryId: theory.id,
      data: {
        type: "opportunity",
        title: draftTitle.trim(),
        description: draftDesc.trim(),
        willBeAddressed: false,
      },
    });
  };

  const toggleWillBeAddressed = (opp: TheoryDetail["components"][number]) => {
    updateMutation.mutate({
      theoryId: theory.id,
      id: opp.id,
      data: {
        type: opp.type as "opportunity",
        title: opp.title,
        description: opp.description,
        indicators: opp.indicators,
        assumptions: opp.assumptions,
        targetDate: opp.targetDate ?? "",
        targetFigure: opp.targetFigure ?? "",
        actualDate: opp.actualDate ?? "",
        actualFigure: opp.actualFigure ?? "",
        qualitativeQuestions: opp.qualitativeQuestions ?? "",
        quantitativeQuestions: opp.quantitativeQuestions ?? "",
        willBeAddressed: !opp.willBeAddressed,
        positionX: opp.positionX,
        positionY: opp.positionY,
      },
    });
  };

  const handleDelete = (opp: TheoryDetail["components"][number]) => {
    if (!window.confirm(`Delete "${opp.title}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ theoryId: theory.id, id: opp.id });
  };

  // Connections for showing linked ToC components (only for addressed ones)
  const getLinkedComponents = (oppId: number) => {
    const linkedIds = new Set([
      ...theory.connections.filter(c => c.fromComponentId === oppId).map(c => c.toComponentId),
      ...theory.connections.filter(c => c.toComponentId === oppId).map(c => c.fromComponentId),
    ]);
    return theory.components.filter(c => linkedIds.has(c.id) && c.type !== "opportunity");
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        List the opportunities and constraints relevant to this intervention. Toggle <span className="font-semibold text-emerald-700">Will be addressed</span> for each one that the intervention will respond to — only those will appear in the Theory of Change canvas.
      </p>

      {opportunities.length === 0 && !showAdd && (
        <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-8 text-center gap-2">
          <AlertCircle className="w-5 h-5 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No opportunities or constraints added yet</p>
        </div>
      )}

      {opportunities.map(opp => {
        const linked = getLinkedComponents(opp.id);
        return (
          <div
            key={opp.id}
            className={`rounded-xl border p-4 transition-colors ${opp.willBeAddressed ? "border-emerald-200 bg-emerald-50/40" : "border-border bg-muted/20"}`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${opp.willBeAddressed ? "bg-emerald-100" : "bg-muted"}`}>
                <Lightbulb className={`w-4 h-4 ${opp.willBeAddressed ? "text-emerald-600" : "text-muted-foreground"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug">{opp.title}</p>
                {opp.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{opp.description}</p>
                )}

                {/* Will be addressed toggle */}
                <div className="flex items-center gap-2 mt-3">
                  <Switch
                    id={`wba-${opp.id}`}
                    checked={!!opp.willBeAddressed}
                    onCheckedChange={() => toggleWillBeAddressed(opp)}
                    disabled={updateMutation.isPending}
                  />
                  <label htmlFor={`wba-${opp.id}`} className="text-xs font-medium cursor-pointer select-none">
                    {opp.willBeAddressed ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Will be addressed — included in Theory of Change
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Will be addressed by this intervention?</span>
                    )}
                  </label>
                </div>

                {/* Linked ToC components (only shown if addressed and connected) */}
                {opp.willBeAddressed && linked.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Connected in Theory of Change
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {linked.map(comp => (
                        <span
                          key={comp.id}
                          className="inline-flex items-center gap-1 text-xs bg-white border border-border rounded-md px-2 py-1 shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{comp.title}</span>
                          <span className="text-muted-foreground/60 capitalize">({comp.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(opp)}
                className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Add new entry inline form */}
      {showAdd ? (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
          <Input
            autoFocus
            placeholder="Title — e.g. Limited access to finance"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            className="text-sm"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Textarea
            placeholder="Description (optional) — elaborate on this opportunity or constraint"
            value={draftDesc}
            onChange={e => setDraftDesc(e.target.value)}
            className="text-sm min-h-[70px]"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!draftTitle.trim() || createMutation.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setDraftTitle(""); setDraftDesc(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="border-dashed border-2 w-full py-5 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Opportunity / Constraint
        </Button>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AboutIntervention({ theory }: AboutInterventionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultValues: FormValues = {
    title: theory.title,
    description: theory.description,
    ...Object.fromEntries(
      FIELD_CONFIG.map(f => [f.key, (theory[f.key] as string) ?? ""])
    ),
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const updateMutation = useUpdateTheory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theory.id) });
        toast({ title: "Intervention details saved" });
        setIsEditing(false);
      },
      onError: () => toast({ title: "Failed to save details", variant: "destructive" }),
    },
  });

  const handleEdit = () => {
    form.reset(defaultValues);
    setIsEditing(true);
  };

  const handleCancel = () => {
    form.reset(defaultValues);
    setIsEditing(false);
  };

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({ id: theory.id, data: values });
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-10">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{theory.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">About this intervention</p>
          </div>
          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" size="sm" className="gap-2 shrink-0">
              <Pencil className="w-3.5 h-3.5" />
              Edit Details
            </Button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <Button onClick={handleCancel} variant="ghost" size="sm" className="gap-2">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                size="sm"
                className="gap-2"
                disabled={updateMutation.isPending}
              >
                <Save className="w-3.5 h-3.5" />
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Sections — render in explicit order so we can inject the O/C section */}
        {(["Identification", "People & Responsibility", "Beneficiaries & Partners"] as const).map(sectionName => (
          <FieldSection
            key={sectionName}
            sectionName={sectionName}
            theory={theory}
            isEditing={isEditing}
            form={form}
          />
        ))}

        {/* ── Strategic Context — editable fields + linked O/C from ToC ── */}
        <section>
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Strategic Context
            </h3>
          </div>
          <div className="space-y-6">
            <FieldSection
              sectionName="Strategic Context"
              theory={theory}
              isEditing={isEditing}
              form={form}
              hideHeader
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Opportunities / Constraints
              </p>
              <OpportunitiesSection theory={theory} />
            </div>
          </div>
        </section>

        {(["Cross-cutting Themes"] as const).map(sectionName => (
          <FieldSection
            key={sectionName}
            sectionName={sectionName}
            theory={theory}
            isEditing={isEditing}
            form={form}
          />
        ))}
      </div>
    </div>
  );
}
