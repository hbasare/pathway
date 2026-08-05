import { Link, useLocation } from "wouter";
import { FolderGit2, Plus, Home, Layers, LayoutGrid, Users, LogOut, Shield, Globe, User, Eye, EyeOff, Search, Heart, Sun, Moon, Monitor, KeyRound } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useListTheories } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { PasswordStrength } from "@/components/PasswordStrength";
import { isPasswordValid } from "@/lib/password";
import { Input } from "@/components/ui/input";
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
import { getPermissions } from "@/lib/permissions";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ColorSettingsTrigger } from "@/components/ColorSettings";
import { PathwaysLogo } from "@/components/PathwaysLogo";

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const options: { value: "light" | "dark" | "system"; icon: React.ReactNode; label: string }[] = [
    { value: "light",  icon: <Sun className="w-3.5 h-3.5" />,     label: "Light"  },
    { value: "dark",   icon: <Moon className="w-3.5 h-3.5" />,    label: "Dark"   },
    { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
  ];

  const current = options.find(o => o.value === theme) ?? options[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Toggle theme"
        className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        {current.icon}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-1 right-0 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[110px]">
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => { setTheme(o.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left ${theme === o.value ? "text-primary font-semibold" : "text-foreground"}`}
              >
                {o.icon}
                {o.label}
                {theme === o.value && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { data: theories, isLoading } = useListTheories();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user, logout, refetch } = useAuth();
  const { t } = useTranslation();
  const permissions = getPermissions(user?.role ?? "");

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeError, setChangeError] = useState("");
  const [changeSuccess, setChangeSuccess] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setChangeError("Passwords do not match");
      return;
    }
    setChangeError("");
    setChangeSuccess("");
    setChangeLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || "Failed to change password");
      }
      setChangeSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setChangePasswordOpen(false);
        setChangeSuccess("");
      }, 1500);
    } catch (err: any) {
      setChangeError(err.message);
    } finally {
      setChangeLoading(false);
    }
  };

  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (user?.role === "system_admin") {
      fetch("/api/admin/organizations")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setOrganizations(data);
        })
        .catch(err => console.error("Failed to load organizations:", err));
    }
  }, [user]);

  const handleSwitchTenant = async (orgId: number | null) => {
    try {
      const res = await fetch("/api/admin/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        await refetch();
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Failed to switch tenant:", err);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <PathwaysLogo className="w-8 h-8 rounded-lg shadow-sm" />
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
              {permissions.canViewDetail && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/program-logframe"}>
                    <Link href="/program-logframe">
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      <span>{t("sidebar.programLogframe")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
            {permissions.canEdit && (
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
            )}
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
        {/* Language picker + theme toggle */}
        <div className="flex items-center justify-between px-1">
          <LanguageSwitcher />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <ColorSettingsTrigger />
          </div>
        </div>

        {user?.role === "system_admin" && (
          <div className="px-1 py-1.5 border-t border-border mt-2 space-y-1">
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
              Organization Context
            </label>
            <select
              value={user.orgId ?? "0"}
              onChange={(e) => {
                const val = e.target.value;
                handleSwitchTenant(val === "0" ? null : Number(val));
              }}
              className="w-full bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow cursor-pointer"
            >
              <option value="0">Master Console (All Tenants)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
              {user?.role === "system_admin" && <Globe className="w-3 h-3 text-primary" />}
              {user?.role === "manager" && <Shield className="w-3 h-3 text-amber-500" />}
              {user?.role === "member" && <User className="w-3 h-3 text-blue-500" />}
              {user?.role === "senior_manager" && <Eye className="w-3 h-3 text-indigo-500" />}
              {user?.role === "auditor" && <Search className="w-3 h-3 text-purple-500" />}
              {user?.role === "donor" && <Heart className="w-3 h-3 text-emerald-500" />}
              <span className="truncate">{user?.orgName || "Master Console"}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            title="Change Password"
            onClick={() => setChangePasswordOpen(true)}
          >
            <KeyRound className="w-4 h-4" />
          </Button>
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

      <DialogWrapper
        open={changePasswordOpen}
        onOpenChange={(val) => {
          setChangePasswordOpen(val);
          if (!val) {
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setChangeError("");
            setChangeSuccess("");
          }
        }}
        title="Change Password"
        description="Update your account password. You will need to verify your current password."
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Current Password</label>
            <div className="relative">
              <Input
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="••••••••"
                disabled={changeLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                disabled={changeLoading}
              >
                {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                disabled={changeLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                disabled={changeLoading}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={newPassword} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={changeLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
                disabled={changeLoading}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {changeError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{changeError}</p>
          )}

          {changeSuccess && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{changeSuccess}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setChangePasswordOpen(false)}
              disabled={changeLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={changeLoading || !oldPassword || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
            >
              {changeLoading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </DialogWrapper>
    </Sidebar>
  );
}
