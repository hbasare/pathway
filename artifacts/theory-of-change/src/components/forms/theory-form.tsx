import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateTheory, useUpdateTheory,
  useListPortfolios,
  getListTheoriesQueryKey, getGetTheoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().min(1, "Description is required"),
  portfolioId: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TheoryFormProps {
  onSuccess?: () => void;
  initialData?: FormValues & { id: number };
}

export function TheoryForm({ onSuccess, initialData }: TheoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const { data: portfolios } = useListPortfolios();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      portfolioId: initialData?.portfolioId ?? null,
    },
  });

  const createMutation = useCreateTheory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: "Theory created successfully" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to create theory", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateTheory({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(variables.id) });
        toast({ title: "Theory updated successfully" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to update theory", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description,
      portfolioId: values.portfolioId ?? null,
    };
    if (isEditing && initialData) {
      updateMutation.mutate({ id: initialData.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="portfolioId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <Select
                value={field.value != null ? String(field.value) : "none"}
                onValueChange={val => field.onChange(val === "none" ? null : Number(val))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="No portfolio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No portfolio</SelectItem>
                  {portfolios?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
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
                <Input placeholder="e.g. Youth Empowerment Program" {...field} />
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
                  placeholder="Describe the overall goal of this theory of change..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Theory"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
