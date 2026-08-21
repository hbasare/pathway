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
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100),
  interventionLimit: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, "Limit must be a non-negative number").nullable()
  ),
});

type FormValues = z.infer<typeof formSchema>;

interface OrgFormProps {
  onSuccess?: () => void;
  initialData?: { id: number; name: string; interventionLimit?: number | null };
}

export function OrgForm({ onSuccess, initialData }: OrgFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const isEditing = !!initialData;

  const [isUnlimited, setIsUnlimited] = useState(
    initialData ? initialData.interventionLimit === null : false
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      interventionLimit: initialData?.interventionLimit ?? 10,
    },
  });

  const handleUnlimitedChange = (checked: boolean) => {
    setIsUnlimited(checked);
    if (checked) {
      form.setValue("interventionLimit", null);
    } else {
      form.setValue("interventionLimit", 10);
    }
  };

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

        <div className="flex items-center space-x-2 pt-1">
          <Checkbox
            id="unlimited"
            checked={isUnlimited}
            onCheckedChange={(checked) => handleUnlimitedChange(!!checked)}
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="unlimited"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Unlimited Interventions
            </label>
            <p className="text-xs text-muted-foreground">
              Checking this bypasses all creation limits for this organization.
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="interventionLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intervention Limit</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={isUnlimited ? "∞" : "e.g. 10"}
                  disabled={isUnlimited}
                  {...field}
                  value={isUnlimited ? "∞" : (field.value ?? "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      field.onChange(val);
                    }
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Specify a limit (e.g. 5, 10). Set to 0 to completely disable intervention creation.
              </p>
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
