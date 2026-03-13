import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useDeleteTheory, getListTheoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TheoryCanvas } from "@/components/theory/theory-canvas";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { TheoryForm } from "@/components/forms/theory-form";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TheoryDetail() {
  const [, params] = useRoute("/theory/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: theory, isLoading, error } = useGetTheory(id, {
    query: { enabled: !!id }
  });

  const [isEditOpen, setIsEditOpen] = useState(false);

  const deleteMutation = useDeleteTheory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: "Theory deleted successfully" });
        setLocation("/");
      },
      onError: () => toast({ title: "Failed to delete theory", variant: "destructive" })
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${theory?.title}"? All components and connections will be lost.`)) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !theory) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold text-foreground mb-2">Theory Not Found</h2>
        <p className="text-muted-foreground mb-6">The theory you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => setLocation("/")}><ArrowLeft className="w-4 h-4 mr-2"/> Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-300">
      <header className="flex-none flex items-center justify-between px-6 py-4 border-b bg-card z-10 shadow-sm">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground leading-tight tracking-tight">
            {theory.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl truncate">
            {theory.description}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Theory Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Theory
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <TheoryCanvas theory={theory} />
      </main>

      <DialogWrapper
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Theory Settings"
        description="Update the title and description for this theory."
      >
        <TheoryForm 
          initialData={theory} 
          onSuccess={() => setIsEditOpen(false)} 
        />
      </DialogWrapper>
    </div>
  );
}
