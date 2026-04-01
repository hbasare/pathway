import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreatePortfolio,
  useUpdatePortfolio,
  getListPortfoliosQueryKey,
  Portfolio,
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  name: z.string().min(1, "Portfolio name is required").max(100),
  description: z.string().default(""),
});

type FormValues = z.infer<typeof formSchema>;

interface PortfolioFormProps {
  onSuccess?: () => void;
  initialData?: Portfolio;
}

export function PortfolioForm({ onSuccess, initialData }: PortfolioFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
    },
  });

  const createMutation = useCreatePortfolio({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
        toast({ title: "Portfolio created" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to create portfolio", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdatePortfolio({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
        toast({ title: "Portfolio updated" });
        onSuccess?.();
      },
      onError: () => toast({ title: "Failed to update portfolio", variant: "destructive" }),
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing && initialData) {
      updateMutation.mutate({ id: initialData.id, data: values });
    } else {
      createMutation.mutate({ data: values });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Access to Inputs" {...field} />
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
              <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly describe what this portfolio covers..."
                  className="min-h-[90px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Portfolio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
