import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetTheory, useDeleteTheory, getListTheoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2, ArrowLeft, Loader2, ClipboardList, Calculator, LayoutList, Network, Info, Briefcase, StickyNote, ShieldAlert, GitBranch, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TheoryCanvas } from "@/components/theory/theory-canvas";
import { AboutIntervention } from "@/components/theory/about-intervention";
import { BusinessModel } from "@/components/theory/business-model";
import { NotesUpdates } from "@/components/theory/notes-updates";
import { RiskAnalysis } from "@/components/theory/risk-analysis";
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
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import { getPermissions } from "@/lib/permissions";

type ActiveTab = "about" | "business-model" | "canvas" | "notes" | "risk";

export default function TheoryDetail() {
  const [, params] = useRoute("/theory/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const permissions = getPermissions(user?.role ?? "");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: theory, isLoading, error } = useGetTheory(id, {
    query: { enabled: !!id }
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("about");

  // Redirect donors to the summary-only view
  useEffect(() => {
    if (user && !permissions.canViewDetail && id) {
      setLocation(`/theory/${id}/summary`);
    }
  }, [user?.role, id]);

  const deleteMutation = useDeleteTheory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: t("theory.deleted") });
        setLocation("/");
      },
      onError: () => toast({ title: t("theory.deleteFailed"), variant: "destructive" })
    }
  });

  const handleDelete = () => {
    if (window.confirm(t("theory.deleteConfirm", { title: theory?.title }))) {
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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("theory.notFound")}</h2>
        <p className="text-muted-foreground mb-6">{t("theory.notFoundDesc")}</p>
        <Button onClick={() => setLocation("/")}><ArrowLeft className="w-4 h-4 mr-2"/>{t("theory.backToDashboard")}</Button>
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
          {permissions.isReadOnly && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full px-3 py-1 border border-border">
              <Eye className="w-3 h-3" />
              View only
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/summary`)}
            className="gap-2"
          >
            <LayoutList className="w-4 h-4" />
            {t("theory.summary")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/measurement-plan`)}
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            {t("theory.measurementPlan")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/support-calculations`)}
            className="gap-2"
          >
            <Calculator className="w-4 h-4" />
            {t("theory.supportCalculations")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/theory/${id}/systemic-change`)}
            className="gap-2"
          >
            <GitBranch className="w-4 h-4" />
            {t("theory.systemicChange")}
          </Button>
          {permissions.canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t("theory.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("theory.deleteTheory")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div className="flex-none flex items-center gap-1 px-6 pt-3 pb-0 border-b bg-card">
        <TabButton
          active={activeTab === "about"}
          onClick={() => setActiveTab("about")}
          icon={<Info className="w-4 h-4" />}
          label={t("theory.tabs.about")}
        />
        <TabButton
          active={activeTab === "business-model"}
          onClick={() => setActiveTab("business-model")}
          icon={<Briefcase className="w-4 h-4" />}
          label={t("theory.tabs.businessModel")}
        />
        <TabButton
          active={activeTab === "canvas"}
          onClick={() => setActiveTab("canvas")}
          icon={<Network className="w-4 h-4" />}
          label={t("theory.tabs.canvas")}
        />
        <TabButton
          active={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          icon={<StickyNote className="w-4 h-4" />}
          label={t("theory.tabs.notes")}
        />
        <TabButton
          active={activeTab === "risk"}
          onClick={() => setActiveTab("risk")}
          icon={<ShieldAlert className="w-4 h-4" />}
          label={t("theory.tabs.risk")}
        />
      </div>

      {/* ── Tab content ── */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "about" && <AboutIntervention theory={theory} />}
        {activeTab === "business-model" && <BusinessModel theory={theory} />}
        {activeTab === "canvas" && <TheoryCanvas theory={theory} />}
        {activeTab === "notes" && (
          <div className="h-full overflow-y-auto">
            <NotesUpdates theoryId={theory.id} />
          </div>
        )}
        {activeTab === "risk" && (
          <div className="h-full overflow-y-auto">
            <RiskAnalysis theoryId={theory.id} />
          </div>
        )}
      </main>

      <DialogWrapper
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title={t("theory.settings")}
        description={t("theory.settingsDesc")}
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
