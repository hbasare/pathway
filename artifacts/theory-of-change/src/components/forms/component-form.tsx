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
import { Plus, Trash2, MessageSquare, BarChart3 } from "lucide-react";

// Per-type guidance for the description field
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

// Local indicator row (id is present when editing an existing record)
interface IndicatorRow {
  localKey: string;
  id?: number;
  name: string;
  targetDate: string;
  targetFigure: string;
  actualDate: string;
  actualFigure: string;
  qualitativeQuestion: string;
  quantitativeQuestion: string;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function emptyIndicator(): IndicatorRow {
  return { localKey: makeKey(), name: "", targetDate: "", targetFigure: "", actualDate: "", actualFigure: "", qualitativeQuestion: "", quantitativeQuestion: "" };
}

function fromApiIndicator(ind: ComponentIndicator): IndicatorRow {
  return {
    localKey: makeKey(),
    id: ind.id,
    name: ind.name ?? "",
    targetDate: ind.targetDate ?? "",
    targetFigure: ind.targetFigure ?? "",
    actualDate: ind.actualDate ?? "",
    actualFigure: ind.actualFigure ?? "",
    qualitativeQuestion: ind.qualitativeQuestion ?? "",
    quantitativeQuestion: ind.quantitativeQuestion ?? "",
  };
}

const formSchema = z.object({
  type: z.enum(["opportunity", "input", "activity", "output", "outcome", "impact"] as const),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  assumptions: z.string().optional(),
  qualitativeQuestions: z.string().optional(),
  quantitativeQuestions: z.string().optional(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  theoryId: number;
  onSuccess?: () => void;
  initialData?: FormValues & { id: number; componentIndicators?: ComponentIndicator[] };
  defaultType?: ComponentType;
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

  // Track ids of indicators that were removed during editing
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type || defaultType,
      title: initialData?.title || "",
      description: initialData?.description || "",
      assumptions: initialData?.assumptions || "",
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

  // Indicator field helpers
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
    // Delete removed indicators
    await Promise.all(
      deletedIds.map(id =>
        deleteIndicator.mutateAsync({ theoryId, componentId, id })
      )
    );

    // Create or update each indicator
    await Promise.all(
      indicators.map((ind, idx) => {
        const payload = {
          name: ind.name || "",
          targetDate: ind.targetDate || undefined,
          targetFigure: ind.targetFigure || undefined,
          actualDate: ind.actualDate || undefined,
          actualFigure: ind.actualFigure || undefined,
          qualitativeQuestion: ind.qualitativeQuestion?.trim() || undefined,
          quantitativeQuestion: ind.quantitativeQuestion?.trim() || undefined,
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

        <Separator />

        {/* Multi-indicator manager */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Indicators</p>
              <p className="text-xs text-muted-foreground">Each indicator tracks its own target and actual result</p>
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
              No indicators yet. Click "Add Indicator" to track targets and results.
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-amber-700 mb-1 block">Target Date</label>
                    <Input
                      type="date"
                      value={ind.targetDate}
                      onChange={e => updateIndicatorField(ind.localKey, "targetDate", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-amber-700 mb-1 block">Target Figure</label>
                    <Input
                      value={ind.targetFigure}
                      onChange={e => updateIndicatorField(ind.localKey, "targetFigure", e.target.value)}
                      placeholder="e.g. 500 educators"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-emerald-700 mb-1 block">Actual Date</label>
                    <Input
                      type="date"
                      value={ind.actualDate}
                      onChange={e => updateIndicatorField(ind.localKey, "actualDate", e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-emerald-700 mb-1 block">Actual Figure</label>
                    <Input
                      value={ind.actualFigure}
                      onChange={e => updateIndicatorField(ind.localKey, "actualFigure", e.target.value)}
                      placeholder="e.g. 423 educators"
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Linked measurement questions */}
                <div className="pt-2 border-t border-border/40 space-y-3">
                  <p className="text-xs font-medium text-foreground">Linked Measurement Questions (Optional)</p>

                  {/* Qualitative */}
                  <div className="rounded-md border border-border/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        updateIndicatorField(
                          ind.localKey,
                          "qualitativeQuestion",
                          ind.qualitativeQuestion ? "" : " "
                        )
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        ind.qualitativeQuestion
                          ? "bg-violet-50 text-violet-700 border-b border-violet-200"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      Qualitative Question
                      <span className="ml-auto text-[10px] font-normal opacity-60">
                        {ind.qualitativeQuestion ? "tap to remove" : "tap to add"}
                      </span>
                    </button>
                    {ind.qualitativeQuestion !== undefined && ind.qualitativeQuestion !== "" && (
                      <Textarea
                        value={ind.qualitativeQuestion === " " ? "" : ind.qualitativeQuestion}
                        onChange={e =>
                          updateIndicatorField(ind.localKey, "qualitativeQuestion", e.target.value || " ")
                        }
                        placeholder="e.g. How has your confidence changed since starting the programme?"
                        className="text-xs min-h-[64px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                        autoFocus
                      />
                    )}
                  </div>

                  {/* Quantitative */}
                  <div className="rounded-md border border-border/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        updateIndicatorField(
                          ind.localKey,
                          "quantitativeQuestion",
                          ind.quantitativeQuestion ? "" : " "
                        )
                      }
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        ind.quantitativeQuestion
                          ? "bg-blue-50 text-blue-700 border-b border-blue-200"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <BarChart3 className="w-3 h-3 shrink-0" />
                      Quantitative Question
                      <span className="ml-auto text-[10px] font-normal opacity-60">
                        {ind.quantitativeQuestion ? "tap to remove" : "tap to add"}
                      </span>
                    </button>
                    {ind.quantitativeQuestion !== undefined && ind.quantitativeQuestion !== "" && (
                      <Textarea
                        value={ind.quantitativeQuestion === " " ? "" : ind.quantitativeQuestion}
                        onChange={e =>
                          updateIndicatorField(ind.localKey, "quantitativeQuestion", e.target.value || " ")
                        }
                        placeholder="e.g. How many training sessions did you attend? (0–10)"
                        className="text-xs min-h-[64px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Measurement Questions</p>
          <p className="text-xs text-muted-foreground mb-3">Questions to ask respondents when measuring this component</p>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="qualitativeQuestions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualitative Questions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. How has this programme affected your daily life? What changes have you noticed since participating?"
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantitativeQuestions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantitative Questions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. How many sessions did you attend? Rate your skill level from 1-10 before and after."
                      className="min-h-[70px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Component"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
