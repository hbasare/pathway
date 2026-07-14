import { Link } from "wouter";
import { Layers, Plus, ArrowRight, FolderOpen, Pencil, Trash2, MoreHorizontal, FolderPlus, TableProperties } from "lucide-react";
import { useState, useEffect } from "react";
import {
  useListTheories,
  useListPortfolios,
  useDeletePortfolio,
  useDeleteTheory,
  getListPortfoliosQueryKey,
  getListTheoriesQueryKey,
  Portfolio,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { TheoryForm } from "@/components/forms/theory-form";
import { PortfolioForm } from "@/components/forms/portfolio-form";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/contexts/auth-context";

function MasterConsoleDashboard() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [portsList, setPortsList] = useState<any[]>([]);
  const [theoriesList, setTheoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { refetch } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [orgsRes, usersRes, portsRes, theoriesRes] = await Promise.all([
          fetch("/api/admin/organizations"),
          fetch("/api/users"),
          fetch("/api/portfolios"),
          fetch("/api/theories"),
        ]);
        if (orgsRes.ok) setOrgs(await orgsRes.json());
        if (usersRes.ok) setUsersList(await usersRes.json());
        if (portsRes.ok) setPortsList(await portsRes.json());
        if (theoriesRes.ok) setTheoriesList(await theoriesRes.json());
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSwitchTenant = async (orgId: number) => {
    try {
      const res = await fetch("/api/admin/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        await refetch();
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to switch context:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">System Master Console</h1>
        <p className="text-muted-foreground mt-1">Global administration panel across all system tenants</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Total Organizations", value: orgs.length, color: "text-blue-600 bg-blue-500/10" },
          { label: "Total Users", value: usersList.length, color: "text-purple-600 bg-purple-500/10" },
          { label: "Total Portfolios", value: portsList.length, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Total Interventions", value: theoriesList.length, color: "text-amber-600 bg-amber-500/10" },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-card border border-border rounded-2xl shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-display font-bold text-foreground">{stat.value}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${stat.color}`}>Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Orgs list */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Registered Organizations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Context switch into any organization to view and manage their data</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 pl-6">ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Users</th>
                <th className="p-4">Portfolios</th>
                <th className="p-4">Interventions</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {orgs.map((org) => {
                const orgUsers = usersList.filter(u => u.orgId === org.id).length;
                const orgPorts = portsList.filter(p => p.orgId === org.id).length;
                const orgTheories = theoriesList.filter(t => t.orgId === org.id).length;

                return (
                  <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 pl-6 font-mono text-xs text-muted-foreground">#{org.id}</td>
                    <td className="p-4 font-semibold text-foreground">{org.name}</td>
                    <td className="p-4 text-muted-foreground">{orgUsers} users</td>
                    <td className="p-4 text-muted-foreground">{orgPorts} portfolios</td>
                    <td className="p-4 text-muted-foreground">{orgTheories} interventions</td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSwitchTenant(org.id)}
                        className="shadow-sm gap-1.5 font-semibold"
                      >
                        <span>Switch Context</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (user?.role === "system_admin" && !user.orgId) {
    return <MasterConsoleDashboard />;
  }

  const { data: theories, isLoading: theoriesLoading } = useListTheories();
  const { data: portfolios, isLoading: portfoliosLoading } = useListPortfolios();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const permissions = usePermissions();
  const [isCreateTheoryOpen, setIsCreateTheoryOpen] = useState(false);
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const deletePortfolioMutation = useDeletePortfolio({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: t("dashboard.portfolioDeleted") });
      },
      onError: () => toast({ title: t("dashboard.portfolioDeleteFailed"), variant: "destructive" }),
    },
  });

  const deleteTheoryMutation = useDeleteTheory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: t("theory.deleted") });
      },
      onError: () => toast({ title: t("theory.deleteFailed"), variant: "destructive" }),
    },
  });

  const handleDeletePortfolio = (portfolio: Portfolio) => {
    if (window.confirm(t("dashboard.portfolioDeleteConfirm", { name: portfolio.name }))) {
      deletePortfolioMutation.mutate({ id: portfolio.id });
    }
  };

  const handleDeleteTheory = (theory: { id: number; title: string }) => {
    if (window.confirm(t("theory.deleteConfirm", { title: theory.title }))) {
      deleteTheoryMutation.mutate({ id: theory.id });
    }
  };

  const isLoading = theoriesLoading || portfoliosLoading;

  const grouped = (portfolios ?? []).map(p => ({
    portfolio: p,
    theories: (theories ?? []).filter(t => t.portfolioId === p.id),
  }));

  const ungrouped = (theories ?? []).filter(t => t.portfolioId == null);
  const totalTheories = theories?.length ?? 0;

  return (
    <div className="w-full max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>
        {permissions.canEdit && <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreatePortfolioOpen(true)} className="font-semibold">
            <FolderPlus className="w-4 h-4 mr-2" />
            {t("dashboard.newPortfolio")}
          </Button>
          <Button onClick={() => setIsCreateTheoryOpen(true)} className="shadow-md font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            {t("dashboard.createTheory")}
          </Button>
        </div>}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i} className="space-y-4">
              <div className="h-7 w-48 bg-muted/50 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2].map(j => (
                  <div key={j} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : totalTheories === 0 && (portfolios ?? []).length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
          <Layers className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{t("dashboard.emptyTitle")}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t("dashboard.emptyText")}
          </p>
          {permissions.canEdit && (
            <Button onClick={() => setIsCreateTheoryOpen(true)} size="lg" className="shadow-md">
              {t("dashboard.createFirst")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* Portfolio groups */}
          {grouped.map(({ portfolio, theories: groupTheories }) => (
            <div key={portfolio.id}>
              {/* Portfolio header */}
              <div className="flex items-center gap-3 mb-4">
                <FolderOpen className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground truncate">{portfolio.name}</h2>
                    <Badge variant="secondary" className="rounded-full shrink-0">
                      {t("dashboard.theoryCount", { count: groupTheories.length })}
                    </Badge>
                  </div>
                  {portfolio.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{portfolio.description}</p>
                  )}
                </div>
                <Link href={`/portfolio/${portfolio.id}/logframe`}>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0 text-xs h-8">
                    <TableProperties className="w-3.5 h-3.5" /> {t("dashboard.logframe")}
                  </Button>
                </Link>
                {permissions.canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingPortfolio(portfolio)}>
                        <Pencil className="w-4 h-4 mr-2" /> {t("dashboard.editPortfolio")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeletePortfolio(portfolio)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> {t("dashboard.deletePortfolio")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {groupTheories.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 py-8 text-center">
                  <p className="text-sm text-muted-foreground">{t("dashboard.noTheoriesInPortfolio")}</p>
                  {permissions.canEdit && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 text-primary"
                      onClick={() => setIsCreateTheoryOpen(true)}
                    >
                      {t("dashboard.addTheory")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupTheories.map(theory => (
                    <TheoryCard key={theory.id} theory={theory} isAssigned={user?.role === "member" ? (user.assignedTheoryIds ?? []).includes(theory.id) : undefined} canEdit={permissions.canEdit} onDelete={() => handleDeleteTheory(theory)} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Ungrouped theories */}
          {ungrouped.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Layers className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{t("dashboard.ungrouped")}</h2>
                  <Badge variant="outline" className="rounded-full">
                    {ungrouped.length}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ungrouped.map(theory => (
                  <TheoryCard key={theory.id} theory={theory} isAssigned={user?.role === "member" ? (user.assignedTheoryIds ?? []).includes(theory.id) : undefined} canEdit={permissions.canEdit} onDelete={() => handleDeleteTheory(theory)} />
                ))}
              </div>
            </div>
          )}

          {/* If only portfolios exist but no theories at all */}
          {totalTheories === 0 && (portfolios ?? []).length > 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground mb-4">{t("dashboard.noTheoriesYet")}</p>
              {permissions.canEdit && (
                <Button onClick={() => setIsCreateTheoryOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> {t("dashboard.createTheory")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <DialogWrapper
        open={isCreateTheoryOpen}
        onOpenChange={setIsCreateTheoryOpen}
        title={t("dashboard.createTheoryTitle")}
        description={t("dashboard.createTheoryDesc")}
      >
        <TheoryForm onSuccess={() => setIsCreateTheoryOpen(false)} />
      </DialogWrapper>

      <DialogWrapper
        open={isCreatePortfolioOpen}
        onOpenChange={setIsCreatePortfolioOpen}
        title={t("dashboard.newPortfolioTitle")}
        description={t("dashboard.newPortfolioDesc")}
      >
        <PortfolioForm onSuccess={() => setIsCreatePortfolioOpen(false)} />
      </DialogWrapper>

      <DialogWrapper
        open={!!editingPortfolio}
        onOpenChange={open => { if (!open) setEditingPortfolio(null); }}
        title={t("dashboard.editPortfolioTitle")}
      >
        <PortfolioForm
          initialData={editingPortfolio ?? undefined}
          onSuccess={() => setEditingPortfolio(null)}
        />
      </DialogWrapper>
    </div>
  );
}

function TheoryCard({
  theory,
  isAssigned,
  canEdit,
  onDelete,
}: {
  theory: { id: number; title: string; description: string };
  isAssigned?: boolean;
  canEdit?: boolean;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative group">
      <Link href={`/theory/${theory.id}`}>
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
              <Layers className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            {isAssigned !== undefined && (
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 shrink-0 ${
                isAssigned
                  ? "text-blue-700 bg-blue-100"
                  : "text-muted-foreground bg-muted"
              }`}>
                {isAssigned ? "Assigned" : "View only"}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {theory.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
            {theory.description}
          </p>
          <div className="flex items-center text-sm font-medium text-primary mt-auto">
            {t("dashboard.viewDiagram")} <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>

      {canEdit && onDelete && (
        <div className="absolute top-3 right-3" onClick={e => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 hover:bg-card border border-border/50"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={e => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t("theory.deleteTheory")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
