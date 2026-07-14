import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().max(100).optional(),
  role: z.string().min(1, "Role is required"),
  orgId: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AdminUserFormProps {
  onSuccess?: () => void;
}

export function AdminUserForm({ onSuccess }: AdminUserFormProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);

  // Fetch list of organizations on mount for the selection dropdown
  useEffect(() => {
    fetch("/api/admin/organizations")
      .then(res => (res.ok ? res.json() : []))
      .then(data => setOrganizations(data))
      .catch(err => console.error("Failed to load organizations:", err));
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      role: "member",
      orgId: null,
    },
  });

  const selectedRole = form.watch("role");

  // If role is system_admin, reset and disable organization selection
  useEffect(() => {
    if (selectedRole === "system_admin") {
      form.setValue("orgId", null);
    }
  }, [selectedRole, form]);

  const onSubmit = async (values: FormValues) => {
    setIsPending(true);
    try {
      const payload = {
        username: values.username,
        password: values.password,
        displayName: values.displayName || undefined,
        role: values.role,
        orgId: values.role === "system_admin" ? null : values.orgId || undefined,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to register user");
      }

      toast({ title: "User registered successfully" });
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Error registering user",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="e.g. manager-henry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g. Henry Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="manager">Manager (Admin)</SelectItem>
                  <SelectItem value="member">Member (Editor)</SelectItem>
                  <SelectItem value="senior_manager">Senior Manager (Read-Only)</SelectItem>
                  <SelectItem value="auditor">Auditor (Read-Only)</SelectItem>
                  <SelectItem value="donor">Donor (Read-Only)</SelectItem>
                  <SelectItem value="system_admin">System Administrator (Global)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedRole !== "system_admin" && (
          <FormField
            control={form.control}
            name="orgId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Scope</FormLabel>
                <Select
                  value={field.value != null ? String(field.value) : "none"}
                  onValueChange={val => field.onChange(val === "none" ? null : Number(val))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None / Unassigned</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={String(org.id)}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending} className="font-semibold shadow-md">
            {isPending ? "Registering..." : "Register User"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
