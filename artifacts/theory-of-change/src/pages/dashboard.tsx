import { Link } from "wouter";
import { Layers, Plus, ArrowRight, FolderOpen, Pencil, Trash2, MoreHorizontal, FolderPlus } from "lucide-react";
import { useState } from "react";
import {
  useListTheories,
  useListPortfolios,
  useDeletePortfolio,
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

export default function Dashboard() {
  const { data: theories, isLoading: theoriesLoading } = useListTheories();
  const { data: portfolios, isLoading: portfoliosLoading } = useListPortfolios();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateTheoryOpen, setIsCreateTheoryOpen] = useState(false);
  const [isCreatePortfolioOpen, setIsCreatePortfolioOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const deletePortfolioMutation = useDeletePortfolio({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPortfoliosQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTheoriesQueryKey() });
        toast({ title: "Portfolio deleted. Its theories are now ungrouped." });
      },
      onError: () => toast({ title: "Failed to delete portfolio", variant: "destructive" }),
    },
  });

  const handleDeletePortfolio = (portfolio: Portfolio) => {
    if (window.confirm(`Delete portfolio "${portfolio.name}"? Its theories will become ungrouped.`)) {
      deletePortfolioMutation.mutate({ id: portfolio.id });
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
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and overview your theories of change.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreatePortfolioOpen(true)} className="font-semibold">
            <FolderPlus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
          <Button onClick={() => setIsCreateTheoryOpen(true)} className="shadow-md font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Create Theory
          </Button>
        </div>
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
          <h3 className="text-xl font-bold text-foreground mb-2">No theories yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            A theory of change helps you map out how your activities lead to your desired impact. Get started by creating your first theory.
          </p>
          <Button onClick={() => setIsCreateTheoryOpen(true)} size="lg" className="shadow-md">
            Create your first Theory
          </Button>
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
                      {groupTheories.length} {groupTheories.length === 1 ? "theory" : "theories"}
                    </Badge>
                  </div>
                  {portfolio.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{portfolio.description}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingPortfolio(portfolio)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit Portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeletePortfolio(portfolio)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Portfolio
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {groupTheories.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No theories in this portfolio yet.</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 text-primary"
                    onClick={() => setIsCreateTheoryOpen(true)}
                  >
                    Add a theory
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupTheories.map(theory => (
                    <TheoryCard key={theory.id} theory={theory} />
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
                  <h2 className="text-lg font-bold text-foreground">Ungrouped</h2>
                  <Badge variant="outline" className="rounded-full">
                    {ungrouped.length}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ungrouped.map(theory => (
                  <TheoryCard key={theory.id} theory={theory} />
                ))}
              </div>
            </div>
          )}

          {/* If only portfolios exist but no theories at all */}
          {totalTheories === 0 && (portfolios ?? []).length > 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground mb-4">No theories yet. Create one and assign it to a portfolio.</p>
              <Button onClick={() => setIsCreateTheoryOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Theory
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <DialogWrapper
        open={isCreateTheoryOpen}
        onOpenChange={setIsCreateTheoryOpen}
        title="Create New Theory"
        description="Start mapping your path to impact."
      >
        <TheoryForm onSuccess={() => setIsCreateTheoryOpen(false)} />
      </DialogWrapper>

      <DialogWrapper
        open={isCreatePortfolioOpen}
        onOpenChange={setIsCreatePortfolioOpen}
        title="New Portfolio"
        description="Group related theories of change under a portfolio."
      >
        <PortfolioForm onSuccess={() => setIsCreatePortfolioOpen(false)} />
      </DialogWrapper>

      <DialogWrapper
        open={!!editingPortfolio}
        onOpenChange={open => { if (!open) setEditingPortfolio(null); }}
        title="Edit Portfolio"
      >
        <PortfolioForm
          initialData={editingPortfolio ?? undefined}
          onSuccess={() => setEditingPortfolio(null)}
        />
      </DialogWrapper>
    </div>
  );
}

function TheoryCard({ theory }: { theory: { id: number; title: string; description: string } }) {
  return (
    <Link href={`/theory/${theory.id}`}>
      <div className="group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Layers className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {theory.title}
        </h3>
        <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
          {theory.description}
        </p>
        <div className="flex items-center text-sm font-medium text-primary mt-auto">
          View Diagram <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
