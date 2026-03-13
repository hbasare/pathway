import { Link } from "wouter";
import { Layers, Plus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useListTheories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { TheoryForm } from "@/components/forms/theory-form";

export default function Dashboard() {
  const { data: theories, isLoading } = useListTheories();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and overview your theories of change.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-md font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Create Theory
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : theories?.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border">
          <Layers className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No theories yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            A theory of change helps you map out how your activities lead to your desired impact. Get started by creating your first theory.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} size="lg" className="shadow-md">
            Create your first Theory
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {theories?.map(theory => (
            <Link key={theory.id} href={`/theory/${theory.id}`}>
              <div className="group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Layers className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{theory.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                  {theory.description}
                </p>
                <div className="flex items-center text-sm font-medium text-primary mt-auto">
                  View Diagram <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <DialogWrapper
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Theory"
        description="Start mapping your path to impact."
      >
        <TheoryForm onSuccess={() => setIsCreateOpen(false)} />
      </DialogWrapper>
    </div>
  );
}
