import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateComponent, useUpdateComponent, getGetTheoryQueryKey, ComponentType } from "@workspace/api-client-react";
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

const formSchema = z.object({
  type: z.enum(["opportunity", "input", "activity", "output", "outcome", "impact"] as const),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  indicators: z.string().optional(),
  assumptions: z.string().optional(),
  targetDate: z.string().optional(),
  targetFigure: z.string().optional(),
  actualDate: z.string().optional(),
  actualFigure: z.string().optional(),
  qualitativeQuestions: z.string().optional(),
  quantitativeQuestions: z.string().optional(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface ComponentFormProps {
  theoryId: number;
  onSuccess?: () => void;
  initialData?: FormValues & { id: number };
  defaultType?: ComponentType;
}

export function ComponentForm({ theoryId, onSuccess, initialData, defaultType = "activity" }: ComponentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type || defaultType,
      title: initialData?.title || "",
      description: initialData?.description || "",
      indicators: initialData?.indicators || "",
      assumptions: initialData?.assumptions || "",
      targetDate: initialData?.targetDate || "",
      targetFigure: initialData?.targetFigure || "",
      actualDate: initialData?.actualDate || "",
      actualFigure: initialData?.actualFigure || "",
      qualitativeQuestions: initialData?.qualitativeQuestions || "",
      quantitativeQuestions: initialData?.quantitativeQuestions || "",
      positionX: initialData?.positionX || 0,
      positionY: initialData?.positionY || 0,
    },
  });

  const createMutation = useCreateComponent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theoryId) });
        toast({ title: "Component created successfully" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to create component", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateComponent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(theoryId) });
        toast({ title: "Component updated successfully" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to update component", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing && initialData) {
      updateMutation.mutate({ theoryId, id: initialData.id, data: values });
    } else {
      createMutation.mutate({ theoryId, data: values });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedType = form.watch("type") as ComponentType;
  const descGuidance = DESCRIPTION_GUIDANCE[selectedType] ?? DESCRIPTION_GUIDANCE.activity;

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="indicators"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indicators (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Number of participants trained"
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
            name="assumptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assumptions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Participants have access to internet"
                    className="min-h-[70px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Projection / Target</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetFigure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Figure</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 500 participants, $50,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Actual Results</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="actualDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actualFigure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Figure</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 423 participants, $47,200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Measurement Questions</p>
          <p className="text-xs text-muted-foreground mb-3">Questions to ask respondents when measuring this indicator</p>
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
                      className="min-h-[80px]"
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
                      className="min-h-[80px]"
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
