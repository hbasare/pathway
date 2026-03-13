import { Link, useLocation } from "wouter";
import { FolderGit2, Plus, Home, Layers } from "lucide-react";
import { useListTheories } from "@workspace/api-client-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { TheoryForm } from "@/components/forms/theory-form";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: theories, isLoading } = useListTheories();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Logo" 
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <div>
            <h2 className="font-display font-bold text-lg leading-tight tracking-tight">Pathways</h2>
            <p className="text-xs text-muted-foreground font-medium">Theory of Change</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mt-4 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between mt-4 mb-2 px-2">
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Your Theories
            </SidebarGroupLabel>
            <DialogWrapper
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              title="Create New Theory"
              description="Define the core objective of your new theory of change."
              trigger={
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="w-4 h-4" />
                </Button>
              }
            >
              <TheoryForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogWrapper>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : theories?.length === 0 ? (
                <div className="px-4 py-2 text-xs text-muted-foreground italic">No theories created yet.</div>
              ) : (
                theories?.map((theory) => (
                  <SidebarMenuItem key={theory.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location === `/theory/${theory.id}`}
                      className="group"
                    >
                      <Link href={`/theory/${theory.id}`}>
                        <Layers className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="truncate">{theory.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
