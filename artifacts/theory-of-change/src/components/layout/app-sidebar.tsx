import { Link, useLocation } from "wouter";
import { FolderGit2, Plus, Home, Layers, LayoutGrid, Users, LogOut, Shield } from "lucide-react";
import { useListTheories } from "@workspace/api-client-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DialogWrapper } from "@/components/ui/dialog-wrapper";
import { TheoryForm } from "@/components/forms/theory-form";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ColorSettingsTrigger } from "@/components/ColorSettings";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: theories, isLoading } = useListTheories();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useTranslation();

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
            <h2 className="font-display font-bold text-lg leading-tight tracking-tight">{t("app.name")}</h2>
            <p className="text-xs text-muted-foreground font-medium">{t("app.taglineShort")}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mt-4 mb-2">
            {t("sidebar.navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/">
                    <Home className="w-4 h-4 mr-2" />
                    <span>{t("sidebar.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/program-logframe"}>
                  <Link href="/program-logframe">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    <span>{t("sidebar.programLogframe")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user?.role === "manager" && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/users"}>
                    <Link href="/users">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{t("sidebar.userManagement")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between mt-4 mb-2 px-2">
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {t("sidebar.yourTheories")}
            </SidebarGroupLabel>
            <DialogWrapper
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              title={t("sidebar.createTheory")}
              description={t("sidebar.defineObjective")}
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
                <div className="px-4 py-2 text-sm text-muted-foreground">{t("sidebar.loadingTheories")}</div>
              ) : theories?.length === 0 ? (
                <div className="px-4 py-2 text-xs text-muted-foreground italic">{t("sidebar.noTheories")}</div>
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

      {/* Logged-in user footer */}
      <SidebarFooter className="border-t p-3 space-y-2">
        {/* Language picker */}
        <div className="flex items-center justify-between px-1">
          <LanguageSwitcher />
          <ColorSettingsTrigger />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">
              {(user?.displayName || user?.username || "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {user?.displayName || user?.username}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {user?.role === "manager" && <Shield className="w-3 h-3 text-amber-500" />}
              <span className="truncate">{user?.orgName}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            title={t("common.signOut")}
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
