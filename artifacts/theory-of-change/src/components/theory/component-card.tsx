import { useState } from "react";
import { format } from "date-fns";
import { Component, ComponentType, useDeleteComponent, getGetTheoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Edit2, Trash2, ArrowRight, Activity, Zap, FileText, Target, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { ComponentForm } from "@/components/forms/component-form";

interface ComponentCardProps {
  component: Component;
  onConnectStart: (id: number) => void;
  onConnectEnd: (id: number) => void;
  isConnectingFrom: boolean;
  isConnectingMode: boolean;
}

const TYPE_CONFIG: Record<ComponentType, { border: string; bg: string; icon: React.ElementType }> = {
  input: { border: "border-blue-200", bg: "bg-blue-50/50", icon: FileText },
  activity: { border: "border-purple-200", bg: "bg-purple-50/50", icon: Activity },
  output: { border: "border-teal-200", bg: "bg-teal-50/50", icon: Zap },
  outcome: { border: "border-orange-200", bg: "bg-orange-50/50", icon: Target },
  impact: { border: "border-rose-200", bg: "bg-rose-50/50", icon: Globe },
};

export function ComponentCard({ component, onConnectStart, onConnectEnd, isConnectingFrom, isConnectingMode }: ComponentCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const deleteMutation = useDeleteComponent({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTheoryQueryKey(component.theoryId) });
        toast({ title: "Component deleted" });
      },
      onError: () => toast({ title: "Failed to delete component", variant: "destructive" }),
    },
  });

  const config = TYPE_CONFIG[component.type];
  const Icon = config.icon;

  const handleCardClick = () => {
    if (isConnectingMode && !isConnectingFrom) {
      onConnectEnd(component.id);
    }
  };

  return (
    <>
      <div
        id={`comp-${component.id}`}
        onClick={handleCardClick}
        className={`
          relative w-[280px] rounded-xl border p-4 shadow-sm bg-card
          transition-all duration-200 cursor-pointer
          ${isConnectingMode ? 'hover:ring-2 hover:ring-primary hover:border-primary' : 'hover:shadow-md'}
          ${isConnectingFrom ? 'ring-2 ring-primary border-primary shadow-md scale-[1.02]' : ''}
          ${config.border}
        `}
      >
        <div className={`absolute top-0 left-0 w-full h-1.5 rounded-t-xl opacity-80 ${config.bg}`} />
        
        <div className="flex items-start justify-between mb-3 mt-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">{component.type}</span>
          </div>
          
          {!isConnectingMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onConnectStart(component.id)}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Connect To...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this component?")) {
                      deleteMutation.mutate({ theoryId: component.theoryId, id: component.id });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h4 className="font-display font-bold text-foreground text-base leading-tight mb-2">{component.title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
          {component.description}
        </p>

        {(component.indicators || component.assumptions) && (
          <div className="flex flex-wrap gap-2 mt-auto">
            {component.indicators && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-medium">
                Indicators
              </Badge>
            )}
            {component.assumptions && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm font-medium">
                Assumptions
              </Badge>
            )}
          </div>
        )}
      </div>

      <DialogWrapper
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit Component"
      >
        <ComponentForm 
          theoryId={component.theoryId} 
          initialData={{
            ...component,
            indicators: component.indicators ?? undefined,
            assumptions: component.assumptions ?? undefined
          }}
          onSuccess={() => setIsEditOpen(false)} 
        />
      </DialogWrapper>
    </>
  );
}
