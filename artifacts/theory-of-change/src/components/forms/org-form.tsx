import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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

const formSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
});

type FormValues = z.infer<typeof formSchema>;

interface OrgFormProps {
  onSuccess?: () => void;
  initialData?: { id: number; name: string };
}

export function OrgForm({ onSuccess, initialData }: OrgFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    try {
      const url = isEditing
        ? `/api/admin/organizations/${initialData.id}`
        : "/api/admin/organizations";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${isEditing ? "update" : "create"} organization`);
      }

      toast({ title: `Organization ${isEditing ? "updated" : "created"} successfully` });
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} organization`,
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Demo Org" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Organization"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
