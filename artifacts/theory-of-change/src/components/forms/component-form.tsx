import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useCallback } from "react";
import {
  useCreateComponent,
  useUpdateComponent,
  useCreateComponentIndicator,
  useUpdateComponentIndicator,
  useDeleteComponentIndicator,
  getGetTheoryQueryKey,
  ComponentType,
  ComponentIndicator,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, X, ChevronDown, ChevronRight, MessageSquare, BarChart3, FileText, Database, CalendarCheck, StickyNote, Calculator, Users } from "lucide-react";

const DESCRIPTION_GUIDANCE: Record<ComponentType, { hint: string; placeholder: string }> = {
  opportunity: {
    hint: "Describe the context or constraint. What situation exists that shapes this intervention?",
    placeholder: "e.g. Limited access to affordable finance prevents smallholder farmers from investing in better inputs.",
  },
  input: {
    hint: "Name the actor and what resource or investment they are providing.",
    placeholder: "e.g. Sedcom will fund the establishment of three regional training hubs to support educator capacity building.",
  },
  activity: {
    hint: "Name the actor and describe the action they will take, and why.",
    placeholder: "e.g. Sedcom will train educators and mentors so they can train students about new agricultural techniques.",
  },
  output: {
    hint: "Name the actor and describe the direct result they will deliver.",
    placeholder: "e.g. Sedcom will deliver 20 certified training workshops reaching 500 educators across the region.",
  },
  outcome: {
    hint: "Name who changes and describe the change in their behaviour, skills, or knowledge.",
    placeholder: "e.g. Trained educators will apply new mentoring techniques in their classrooms, improving student engagement.",
  },
  impact: {
    hint: "Describe the long-term systemic change for the target population.",
    placeholder: "e.g. Youth in target communities will have improved access to quality technical education, increasing employment prospects.",
  },
};

interface ScYear {
  target?: string | null;
  actual?: string | null;
}

type IndicatorWithSc = ComponentIndicator & { scYears?: ScYear[] };

interface IndicatorRow {
  localKey: string;
  id?: number;
  name: string;
  scYears?: ScYear[];
  // Target group
  targetDate: string;
  targetFigure: string;
  targetExplanation: string;
  targetSourceOfInformation: string;
  targetDateLastReviewed: string;
  targetNotes: string;
  targetQualitativeQuestion: string;
  targetQuantitativeQuestion: string;
  // Actual group
  actualDate: string;
  actualFigure: string;
  actualExplanation: string;
  actualSourceOfInformation: string;
  actualDateLastReviewed: string;
  actualNotes: string;
  actualQualitativeQuestion: string;
  actualQuantitativeQuestion: string;
  // Baseline group
  baselineDate: string;
  baselineFigure: string;
  baselineExplanation: string;
  baselineSourceOfInformation: string;
  baselineDateLastReviewed: string;
  baselineNotes: string;
  baselineQualitativeQuestion: string;
  baselineQuantitativeQuestion: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function emptyIndicator(): IndicatorRow {
  return {
    localKey: makeKey(),
    name: "",
    scYears: [],
    targetDate: "", targetFigure: "", targetExplanation: "", targetSourceOfInformation: "", targetDateLastReviewed: "", targetNotes: "",
    targetQualitativeQuestion: "", targetQuantitativeQuestion: "",
    actualDate: "", actualFigure: "", actualExplanation: "", actualSourceOfInformation: "", actualDateLastReviewed: "", actualNotes: "",
    actualQualitativeQuestion: "", actualQuantitativeQuestion: "",
    baselineDate: "", baselineFigure: "", baselineExplanation: "", baselineSourceOfInformation: "", baselineDateLastReviewed: "", baselineNotes: "",
    baselineQualitativeQuestion: "", baselineQuantitativeQuestion: "",
  };
}

function fromApiIndicator(ind: IndicatorWithSc): IndicatorRow {
  return {
    localKey: makeKey(),
    id: ind.id,
    name: ind.name ?? "",
    scYears: (ind.scYears ?? []) as ScYear[],
    targetDate: ind.targetDate ?? "",
    targetFigure: ind.targetFigure ?? "",
    targetExplanation: ind.targetExplanation ?? "",
    targetSourceOfInformation: ind.targetSourceOfInformation ?? "",
    targetDateLastReviewed: ind.targetDateLastReviewed ?? "",
    targetNotes: ind.targetNotes ?? "",
    targetQualitativeQuestion: ind.targetQualitativeQuestion ?? "",
    targetQuantitativeQuestion: ind.targetQuantitativeQuestion ?? "",
    actualDate: ind.actualDate ?? "",
    actualFigure: ind.actualFigure ?? "",
    actualExplanation: ind.actualExplanation ?? "",
    actualSourceOfInformation: ind.actualSourceOfInformation ?? "",
    actualDateLastReviewed: ind.actualDateLastReviewed ?? "",
    actualNotes: ind.actualNotes ?? "",
    actualQualitativeQuestion: ind.actualQualitativeQuestion ?? "",
    actualQuantitativeQuestion: ind.actualQuantitativeQuestion ?? "",
    baselineDate: ind.baselineDate ?? "",
    baselineFigure: ind.baselineFigure ?? "",
    baselineExplanation: ind.baselineExplanation ?? "",
    baselineSourceOfInformation: ind.baselineSourceOfInformation ?? "",
    baselineDateLastReviewed: ind.baselineDateLastReviewed ?? "",
    baselineNotes: ind.baselineNotes ?? "",
    baselineQualitativeQuestion: ind.baselineQualitativeQuestion ?? "",
    baselineQuantitativeQuestion: ind.baselineQuantitativeQuestion ?? "",
  };
}

const formSchema = z.object({
  type: z.enum(["opportunity", "input", "activity", "output", "outcome", "impact"] as const),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  assumptions: z.string().optional(),
  directBeneficiaries: z.string().optional(),
  indirectBeneficiaries: z.string().optional(),
  targetDate: z.string().optional(),
  targetFigure: z.string().optional(),
  actualDate: z.string().optional(),
  actualFigure: z.string().optional(),
  baselineDate: z.string().optional(),
  baselineFigure: z.string().optional(),
  qualitativeQuestions: z.string().optional(),
  quantitativeQuestions: z.string().optional(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  theoryId: number;
  onSuccess?: () => void;
  initialData?: FormValues & { id: number; componentIndicators?: IndicatorWithSc[]; targetDate?: string | null; targetFigure?: string | null; actualDate?: string | null; actualFigure?: string | null; baselineDate?: string | null; baselineFigure?: string | null };
  defaultType?: ComponentType;
}

interface MeasurementGroupProps {
  ind: IndicatorRow;
  prefix: "target" | "actual" | "baseline";
  label: string;
  color: { border: string; header: string; label: string };
  update: (key: string, field: keyof Omit<IndicatorRow, "localKey" | "id">, val: string) => void;
  onClear: () => void;
  scValues?: (string | null | undefined)[];
}

function computeAggregate(vals: (string | null | undefined)[], mode: "sum" | "avg" | "count"): string | null {
  const nums = vals.map(v => parseFloat(v ?? "")).filter(n => !isNaN(n));
  if (nums.length === 0) return null;
  if (mode === "count") return String(nums.length);
  const total = nums.reduce((a, b) => a + b, 0);
  if (mode === "avg") return (total / nums.length).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return total.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function MeasurementGroup({ ind, prefix, label, color, update, onClear, scValues }: MeasurementGroupProps) {
  const dateField        = `${prefix}Date` as keyof IndicatorRow;
  const figureField      = `${prefix}Figure` as keyof IndicatorRow;
  const explanationField = `${prefix}Explanation` as keyof IndicatorRow;
  const sourceField      = `${prefix}SourceOfInformation` as keyof IndicatorRow;
  const reviewedField    = `${prefix}DateLastReviewed` as keyof IndicatorRow;
  const notesField       = `${prefix}Notes` as keyof IndicatorRow;
  const qualField        = `${prefix}QualitativeQuestion` as keyof IndicatorRow;
  const quantField       = `${prefix}QuantitativeQuestion` as keyof IndicatorRow;

  const qualVal  = ind[qualField] as string;
  const quantVal = ind[quantField] as string;

  const hasAnyData = [dateField, figureField, explanationField, sourceField, reviewedField, notesField, qualField, quantField]
    .some(f => (ind[f] as string)?.trim());

  const [isOpen, setIsOpen] = useState(hasAnyData);
  const [aggMode, setAggMode] = useState<"sum" | "avg" | "count">("sum");

  const hasScData = scValues && scValues.some(v => v != null && v !== "");
  const aggResult = hasScData ? computeAggregate(scValues!, aggMode) : null;

  return (
    <div className={`rounded-md border ${color.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full px-3 py-2 ${color.header} flex items-center justify-between hover:brightness-95 transition-all`}
      >
        <div className="flex items-center gap-2">
          {isOpen
            ? <ChevronDown className={`w-3.5 h-3.5 ${color.label}`} />
            : <ChevronRight className={`w-3.5 h-3.5 ${color.label}`} />
          }
          <span className={`text-[11px] font-bold uppercase tracking-wider ${color.label}`}>{label}</span>
          {hasAnyData && !isOpen && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${color.header} border ${color.border} ${color.label} opacity-80`}>
              data entered
            </span>
          )}
        </div>
        {hasAnyData && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onClear(); }}
            onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); onClear(); } }}
            title={`Clear all ${label} data`}
            className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded opacity-70 hover:opacity-100 transition-opacity ${color.label} hover:text-destructive`}
          >
            <X className="w-3 h-3" />
            Clear
          </span>
        )}
      </button>
      {isOpen && (
      <div className="p-3 space-y-2.5">
        {/* Date + Figure */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-xs font-medium mb-1 block ${color.label}`}>Date</label>
            <Input
              type="date"
              value={ind[dateField] as string}
              onChange={e => update(ind.localKey, dateField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className={`text-xs font-medium mb-1 block ${color.label}`}>Figure</label>
            <Input
              value={ind[figureField] as string}
              onChange={e => update(ind.localKey, figureField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
              placeholder="e.g. 500 educators"
              className="text-xs"
            />
          </div>
        </div>

        {/* SC aggregate picker — only shown when there is SC year data */}
        {hasScData && (
          <div className={`rounded border ${color.border} bg-white/60 p-2.5 space-y-2`}>
            <div className="flex items-center gap-1.5">
              <Calculator className={`w-3 h-3 ${color.label}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${color.label}`}>From Support Calculations</span>
            </div>
            {/* Mode toggle */}
            <div className="flex items-center gap-0.5 w-fit rounded border overflow-hidden text-[10px] font-semibold">
              {(["sum", "avg", "count"] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAggMode(m)}
                  className={`px-2.5 py-1 transition-colors ${aggMode === m ? `${color.header} ${color.label} border-r last:border-r-0` : "text-muted-foreground hover:bg-muted/60 border-r last:border-r-0"}`}
                >
                  {m === "sum" ? "Σ Sum" : m === "avg" ? "Ø Average" : "# Count"}
                </button>
              ))}
            </div>
            {/* Result + apply */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {aggResult ?? <em className="text-xs font-normal text-muted-foreground">No numeric data yet</em>}
              </span>
              {aggResult && (
                <button
                  type="button"
                  onClick={() => update(ind.localKey, figureField as keyof Omit<IndicatorRow, "localKey" | "id">, aggResult)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${color.border} ${color.label} ${color.header} hover:brightness-95 transition-all`}
                >
                  Apply to figure
                </button>
              )}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Explanation / Assumption
          </label>
          <Textarea
            value={ind[explanationField] as string}
            onChange={e => update(ind.localKey, explanationField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
            placeholder="e.g. Assumes trained educators apply skills within 3 months."
            className="text-xs min-h-[52px]"
          />
        </div>

        {/* Source */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <Database className="w-3 h-3" /> Source of Information
          </label>
          <Input
            value={ind[sourceField] as string}
            onChange={e => update(ind.localKey, sourceField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
            placeholder="e.g. Monitoring surveys, admin records"
            className="text-xs"
          />
        </div>

        {/* Date Last Reviewed */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <CalendarCheck className="w-3 h-3" /> Date Last Reviewed
          </label>
          <Input
            type="date"
            value={ind[reviewedField] as string}
            onChange={e => update(ind.localKey, reviewedField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
            className="text-xs"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" /> Notes
          </label>
          <Textarea
            value={ind[notesField] as string}
            onChange={e => update(ind.localKey, notesField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value)}
            placeholder="Any additional context, caveats or observations…"
            className="text-xs min-h-[48px]"
          />
        </div>

        {/* Linked Measurement Questions */}
        <div className="pt-1 border-t border-border/30 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linked Measurement Questions</p>

          {/* Qualitative toggle */}
          <div className="rounded-md border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => update(ind.localKey, qualField as keyof Omit<IndicatorRow, "localKey" | "id">, qualVal ? "" : " ")}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                qualVal
                  ? "bg-violet-50 text-violet-700 border-b border-violet-200"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <MessageSquare className="w-3 h-3 shrink-0" />
              Qualitative Question
              <span className="ml-auto text-[10px] font-normal opacity-60">{qualVal ? "tap to remove" : "tap to add"}</span>
            </button>
            {qualVal !== undefined && qualVal !== "" && (
              <Textarea
                value={qualVal === " " ? "" : qualVal}
                onChange={e => update(ind.localKey, qualField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value || " ")}
                placeholder="e.g. How has your confidence changed since starting the programme?"
                className="text-xs min-h-[56px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                autoFocus
              />
            )}
          </div>

          {/* Quantitative toggle */}
          <div className="rounded-md border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => update(ind.localKey, quantField as keyof Omit<IndicatorRow, "localKey" | "id">, quantVal ? "" : " ")}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                quantVal
                  ? "bg-blue-50 text-blue-700 border-b border-blue-200"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <BarChart3 className="w-3 h-3 shrink-0" />
              Quantitative Question
              <span className="ml-auto text-[10px] font-normal opacity-60">{quantVal ? "tap to remove" : "tap to add"}</span>
            </button>
            {quantVal !== undefined && quantVal !== "" && (
              <Textarea
                value={quantVal === " " ? "" : quantVal}
                onChange={e => update(ind.localKey, quantField as keyof Omit<IndicatorRow, "localKey" | "id">, e.target.value || " ")}
                placeholder="e.g. How many training sessions did you attend? (0–10)"
                className="text-xs min-h-[56px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export function ComponentForm({ theoryId, onSuccess, initialData, defaultType = "activity" }: ComponentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const [indicators, setIndicators] = useState<IndicatorRow[]>(() =>
    initialData?.componentIndicators?.length
      ? initialData.componentIndicators.map(fromApiIndicator)
      : []
  );

  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type || defaultType,
      title: initialData?.title || "",
      description: initialData?.description || "",
      assumptions: initialData?.assumptions || "",
      directBeneficiaries: initialData?.directBeneficiaries ?? "",
      indirectBeneficiaries: initialData?.indirectBeneficiaries ?? "",
      targetDate: initialData?.targetDate ?? "",
      targetFigure: initialData?.targetFigure ?? "",
      actualDate: initialData?.actualDate ?? "",
      actualFigure: initialData?.actualFigure ?? "",
      baselineDate: initialData?.baselineDate ?? "",
      baselineFigure: initialData?.baselineFigure ?? "",
      qualitativeQuestions: initialData?.qualitativeQuestions || "",
      quantitativeQuestions: initialData?.quantitativeQuestions || "",
      positionX: initialData?.positionX || 0,
      positionY: initialData?.positionY || 0,
    },
  });

  const createComponent = useCreateComponent();
  const updateComponent = useUpdateComponent();
  const createIndicator = useCreateComponentIndicator();
  const updateIndicator = useUpdateComponentIndicator();
  const deleteIndicator = useDeleteComponentIndicator();

  const isPending =
    createComponent.isPending ||
    updateComponent.isPending ||
    createIndicator.isPending ||
    updateIndicator.isPending ||
    deleteIndicator.isPending;

  const selectedType = form.watch("type") as ComponentType;
  const descGuidance = DESCRIPTION_GUIDANCE[selectedType] ?? DESCRIPTION_GUIDANCE.activity;

  const addIndicator = useCallback(() => {
    setIndicators(prev => [...prev, emptyIndicator()]);
  }, []);

  const removeIndicator = useCallback((localKey: string, id?: number) => {
    if (id !== undefined) setDeletedIds(prev => [...prev, id]);
    setIndicators(prev => prev.filter(r => r.localKey !== localKey));
  }, []);

  const updateIndicatorField = useCallback(
    (localKey: string, field: keyof Omit<IndicatorRow, "localKey" | "id">, value: string) => {
      setIndicators(prev => prev.map(r => (r.localKey === localKey ? { ...r, [field]: value } : r)));
    },
    []
  );

  const saveIndicators = async (componentId: number) => {
    await Promise.all(
      deletedIds.map(id => deleteIndicator.mutateAsync({ theoryId, componentId, id }))
    );

    await Promise.all(
      indicators.map((ind, idx) => {
        const payload = {
          name: ind.name || "",
          targetDate: ind.targetDate || undefined,
          targetFigure: ind.targetFigure || undefined,
          targetExplanation: ind.targetExplanation || undefined,
          targetSourceOfInformation: ind.targetSourceOfInformation || undefined,
          targetDateLastReviewed: ind.targetDateLastReviewed || undefined,
          targetNotes: ind.targetNotes || undefined,
          targetQualitativeQuestion: ind.targetQualitativeQuestion?.trim() || undefined,
          targetQuantitativeQuestion: ind.targetQuantitativeQuestion?.trim() || undefined,
          actualDate: ind.actualDate || undefined,
          actualFigure: ind.actualFigure || undefined,
          actualExplanation: ind.actualExplanation || undefined,
          actualSourceOfInformation: ind.actualSourceOfInformation || undefined,
          actualDateLastReviewed: ind.actualDateLastReviewed || undefined,
          actualNotes: ind.actualNotes || undefined,
          actualQualitativeQuestion: ind.actualQualitativeQuestion?.trim() || undefined,
          actualQuantitativeQuestion: ind.actualQuantitativeQuestion?.trim() || undefined,
          baselineDate: ind.baselineDate || undefined,
          baselineFigure: ind.baselineFigure || undefined,
          baselineExplanation: ind.baselineExplanation || undefined,
          baselineSourceOfInformation: ind.baselineSourceOfInformation || undefined,
          baselineDateLastReviewed: ind.baselineDateLastReviewed || undefined,
          baselineNotes: ind.baselineNotes || undefined,
          baselineQualitativeQuestion: ind.baselineQualitativeQuestion?.trim() || undefined,
          baselineQuantitativeQuestion: ind.baselineQuantitativeQuestion?.trim() || undefined,
          position: idx,
        };
        if (ind.id !== undefined) {
          return updateIndicator.mutateAsync({ theoryId, componentId, id: ind.id, data: payload });
        } else {
          return createIndicator.mutateAsync({ theoryId, componentId, data: payload });
        }
      })
    );
  };

  const onSubmit = async (values: FormValues) => {
    try {
      let componentId: number;
      if (isEditing && initialData) {
        const updated = await updateComponent.mutateAsync({ theoryId, id: initialData.id, data: values });
        componentId = updated.id;
      } else {
        const created = await createComponent.mutateAsync({ theoryId, data: values });
        componentId = created.id;
      }

      await saveIndicators(componentId);

      queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theoryId) });
      toast({ title: isEditing ? "Component updated" : "Component created" });
      onSuccess?.();
    } catch {
      toast({ title: "Failed to save component", variant: "destructive" });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select component type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="opportunity">Opportunity / Constraint (Context, enabling factors)</SelectItem>
                  <SelectItem value="input">Input (Resources, investments)</SelectItem>
                  <SelectItem value="activity">Activity (Actions, processes)</SelectItem>
                  <SelectItem value="output">Output (Direct products, deliverables)</SelectItem>
                  <SelectItem value="outcome">Outcome (Short/medium-term changes)</SelectItem>
                  <SelectItem value="impact">Impact (Long-term systemic changes)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Conduct Training Workshops" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description — Who does what, and why?</FormLabel>
              <FormDescription className="text-xs text-muted-foreground leading-relaxed">
                {descGuidance.hint}
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder={descGuidance.placeholder}
                  className="min-h-[90px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assumptions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assumptions (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Participants have access to internet; facilitators are available"
                  className="min-h-[60px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Beneficiaries — only for output, outcome, impact */}
        {["output", "outcome", "impact"].includes(selectedType) && (() => {
          const isOutput = selectedType === "output";
          const directLabel  = isOutput ? "Direct SMEs" : "Direct Beneficiaries";
          const indirectLabel = isOutput ? "Indirect SMEs" : "Indirect Beneficiaries";
          const directDesc   = isOutput
            ? "The SMEs (enterprises, practitioners, or organisations) who directly adopt or adapt the innovation introduced by this output."
            : "The people or groups who are the primary, intended recipients of this outcome's / impact's benefits.";
          const indirectDesc = isOutput
            ? "Other SMEs or actors influenced as a secondary effect of the direct SMEs adopting the innovation — the separate onward pathway."
            : "People or groups who benefit as a secondary effect — e.g. households, communities, or others reached through the direct beneficiaries.";
          const directPlaceholder  = isOutput
            ? "e.g. 120 agri-input SMEs in target districts"
            : "e.g. 500 smallholder farmers trained by SMEs";
          const indirectPlaceholder = isOutput
            ? "e.g. 40 additional SMEs influenced by peer networks"
            : "e.g. ~2,500 household members of trained farmers";

          return (
            <div className="space-y-0">
              {/* Section heading */}
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">
                  {isOutput ? "SME Pathways" : "Beneficiary Pathways"}
                </p>
              </div>

              {/* Direct pathway box */}
              <div className="rounded-t-lg border border-b-0 border-emerald-300 bg-emerald-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-800">Direct pathway — {directLabel}</span>
                </div>
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">{directDesc}</p>
                <FormField
                  control={form.control}
                  name="directBeneficiaries"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={directPlaceholder}
                          className="min-h-[56px] text-sm bg-white border-emerald-200 focus-visible:ring-emerald-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Connector arrow */}
              <div className="flex items-center gap-0 pl-4">
                <div className="w-px h-3 bg-border" />
                <svg width="12" height="8" viewBox="0 0 12 8" className="text-muted-foreground -ml-[0.5px] -mt-0.5" fill="none">
                  <path d="M6 8L0 0h12L6 8Z" fill="currentColor" />
                </svg>
                <span className="ml-2 text-[10px] text-muted-foreground italic">separate onward pathway</span>
              </div>

              {/* Indirect pathway box */}
              <div className="rounded-b-lg border border-t-0 border-blue-300 bg-blue-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-xs font-bold text-blue-800">Indirect pathway — {indirectLabel}</span>
                </div>
                <p className="text-[11px] text-blue-700/80 leading-relaxed">{indirectDesc}</p>
                <FormField
                  control={form.control}
                  name="indirectBeneficiaries"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={indirectPlaceholder}
                          className="min-h-[56px] text-sm bg-white border-blue-200 focus-visible:ring-blue-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          );
        })()}

        <Separator />

        {/* Multi-indicator manager */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Indicators</p>
              <p className="text-xs text-muted-foreground">Track target, actual and baseline data for each indicator</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={addIndicator}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Indicator
            </Button>
          </div>

          {indicators.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-5 text-center text-xs text-muted-foreground">
              No indicators yet. Click "Add Indicator" to track targets, actuals and baselines.
            </div>
          )}

          <div className="space-y-4">
            {indicators.map((ind, idx) => (
              <div key={ind.localKey} className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Indicator {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeIndicator(ind.localKey, ind.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Indicator name / description</label>
                  <Input
                    value={ind.name}
                    onChange={e => updateIndicatorField(ind.localKey, "name", e.target.value)}
                    placeholder="e.g. Number of educators trained"
                    className="text-sm"
                  />
                </div>

                {/* TARGET group */}
                <MeasurementGroup
                  ind={ind}
                  prefix="target"
                  label="Target"
                  color={{ border: "border-amber-200", header: "bg-amber-50", label: "text-amber-700" }}
                  update={updateIndicatorField}
                  scValues={ind.scYears?.map(y => y.target)}
                  onClear={() => {
                    const fields: Array<keyof Omit<IndicatorRow, "localKey" | "id">> = [
                      "targetDate", "targetFigure", "targetExplanation", "targetSourceOfInformation",
                      "targetDateLastReviewed", "targetNotes", "targetQualitativeQuestion", "targetQuantitativeQuestion",
                    ];
                    fields.forEach(f => updateIndicatorField(ind.localKey, f, ""));
                  }}
                />

                {/* ACTUAL group */}
                <MeasurementGroup
                  ind={ind}
                  prefix="actual"
                  label="Actual"
                  color={{ border: "border-emerald-200", header: "bg-emerald-50", label: "text-emerald-700" }}
                  update={updateIndicatorField}
                  scValues={ind.scYears?.map(y => y.actual)}
                  onClear={() => {
                    const fields: Array<keyof Omit<IndicatorRow, "localKey" | "id">> = [
                      "actualDate", "actualFigure", "actualExplanation", "actualSourceOfInformation",
                      "actualDateLastReviewed", "actualNotes", "actualQualitativeQuestion", "actualQuantitativeQuestion",
                    ];
                    fields.forEach(f => updateIndicatorField(ind.localKey, f, ""));
                  }}
                />

                {/* BASELINE group */}
                <MeasurementGroup
                  ind={ind}
                  prefix="baseline"
                  label="Baseline"
                  color={{ border: "border-blue-200", header: "bg-blue-50", label: "text-blue-700" }}
                  update={updateIndicatorField}
                  onClear={() => {
                    const fields: Array<keyof Omit<IndicatorRow, "localKey" | "id">> = [
                      "baselineDate", "baselineFigure", "baselineExplanation", "baselineSourceOfInformation",
                      "baselineDateLastReviewed", "baselineNotes", "baselineQualitativeQuestion", "baselineQuantitativeQuestion",
                    ];
                    fields.forEach(f => updateIndicatorField(ind.localKey, f, ""));
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="pb-2">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save Changes" : "Create Component"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
