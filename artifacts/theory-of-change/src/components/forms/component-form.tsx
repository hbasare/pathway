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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  type: z.enum(["input", "activity", "output", "outcome", "impact"] as const),
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detail what this component entails..."
                  className="min-h-[80px]"
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
