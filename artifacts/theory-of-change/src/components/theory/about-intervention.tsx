import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTheory, getGetTheoryQueryKey } from "@workspace/api-client-react";
import type { TheoryDetail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, X, Save, Lightbulb, ArrowRight, AlertCircle } from "lucide-react";

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
}: {
  sectionName: string;
  theory: TheoryDetail;
  isEditing: boolean;
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  const fields = fieldsBySection(sectionName);
  if (fields.length === 0) return null;
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
          {sectionName}
        </h3>
      </div>
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
  const opportunities = theory.components.filter(c => c.type === "opportunity");

  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-10 text-center gap-2">
        <AlertCircle className="w-6 h-6 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No opportunities or constraints defined yet</p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          Go to the <span className="font-semibold">Theory of Change</span> tab and add items under the
          "Opportunities / Constraints" column to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        The following opportunities and constraints were identified for this intervention.
        Each must be addressed through the Theory of Change — the connections show which components directly respond to them.
      </p>

      {opportunities.map(opp => {
        // Find what this opportunity connects to (outgoing connections)
        const connectedToIds = theory.connections
          .filter(c => c.fromComponentId === opp.id)
          .map(c => c.toComponentId);
        // Also find components connecting to this opportunity (incoming)
        const connectedFromIds = theory.connections
          .filter(c => c.toComponentId === opp.id)
          .map(c => c.fromComponentId);

        const allLinkedIds = Array.from(new Set([...connectedToIds, ...connectedFromIds]));
        const linkedComponents = theory.components.filter(c => allLinkedIds.includes(c.id));

        const isAddressed = linkedComponents.length > 0;

        return (
          <div
            key={opp.id}
            className={`rounded-xl border ${isAddressed ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"} p-5`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1.5 rounded-lg ${isAddressed ? "bg-emerald-100" : "bg-amber-100"}`}>
                <Lightbulb className={`w-4 h-4 ${isAddressed ? "text-emerald-600" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold text-foreground">{opp.title}</h4>
                  {isAddressed ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Addressed in ToC
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Not yet linked
                    </span>
                  )}
                </div>

                {opp.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{opp.description}</p>
                )}

                {linkedComponents.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Connected Theory of Change Components
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedComponents.map(comp => (
                        <div
                          key={comp.id}
                          className="flex items-center gap-1.5 text-xs bg-white border border-border rounded-md px-2.5 py-1.5 shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">{comp.title}</span>
                          <span className="text-muted-foreground/60 capitalize">({comp.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isAddressed && (
                  <p className="text-xs text-amber-700 mt-2 italic">
                    Connect this to an Input, Activity, or other component in the Theory of Change tab to show how it is being addressed.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
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

        {/* ── Opportunities / Constraints — sourced from Theory of Change ── */}
        <section>
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Strategic Context — Opportunities / Constraints
            </h3>
          </div>
          <OpportunitiesSection theory={theory} />
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
