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

const formSchema = z.object({
  type: z.enum(["input", "activity", "output", "outcome", "impact"] as const),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  indicators: z.string().optional(),
  assumptions: z.string().optional(),
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
            name="assumptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assumptions (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="e.g. Participants have access to internet" 
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Component"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
