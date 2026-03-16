import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useDeleteTheory, getListTheoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2, ArrowLeft, Loader2, ClipboardList, LayoutList, Network, Info, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TheoryCanvas } from "@/components/theory/theory-canvas";
import { AboutIntervention } from "@/components/theory/about-intervention";
import { BusinessModel } from "@/components/theory/business-model";
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

type ActiveTab = "canvas" | "about" | "business-model";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("canvas");

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
      {/* ── Header ── */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/summary`)}
            className="gap-2"
          >
            <LayoutList className="w-4 h-4" />
            Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/measurement-plan`)}
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Measurement Plan
          </Button>
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

      {/* ── Tab bar ── */}
      <div className="flex-none flex items-center gap-1 px-6 pt-3 pb-0 border-b bg-card">
        <TabButton
          active={activeTab === "canvas"}
          onClick={() => setActiveTab("canvas")}
          icon={<Network className="w-4 h-4" />}
          label="Theory Canvas"
        />
        <TabButton
          active={activeTab === "about"}
          onClick={() => setActiveTab("about")}
          icon={<Info className="w-4 h-4" />}
          label="About Intervention"
        />
        <TabButton
          active={activeTab === "business-model"}
          onClick={() => setActiveTab("business-model")}
          icon={<Briefcase className="w-4 h-4" />}
          label="Business Model"
        />
      </div>

      {/* ── Tab content ── */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "canvas" && <TheoryCanvas theory={theory} />}
        {activeTab === "about" && <AboutIntervention theory={theory} />}
        {activeTab === "business-model" && <BusinessModel theory={theory} />}
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

// ─── TabButton ───────────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors
        ${active
          ? "border-primary text-primary bg-primary/5"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}
