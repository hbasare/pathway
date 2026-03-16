import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTheory, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, X, Save } from "lucide-react";

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
  { key: "strategy",          label: "Strategy",            type: "textarea", section: "Strategic Context", placeholder: "Describe the overall strategic approach" },
  { key: "interventionStory", label: "Intervention Story",  type: "textarea", section: "Strategic Context", placeholder: "Narrative describing the intervention's journey and context" },

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
  theory: {
    id: number;
    title: string;
    description: string;
    [key: string]: unknown;
  };
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

        {/* Sections */}
        {SECTIONS.map(section => (
          <section key={section}>
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                {section}
              </h3>
            </div>

            <div className="grid gap-5">
              {fieldsBySection(section).map(field => {
                const value = (theory[field.key] as string) ?? "";
                const isEmpty = !value.trim();

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
                      {field.hint && (
                        <p className="text-xs text-muted-foreground mt-0.5">{field.hint}</p>
                      )}
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
        ))}
      </div>
    </div>
  );
}
