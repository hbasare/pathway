import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ColorSettingsProvider } from "@/contexts/color-settings";
import { ThemeProvider } from "@/contexts/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PathwaysLogo } from "@/components/PathwaysLogo";
import { PasswordStrength } from "@/components/PasswordStrength";
import { isPasswordValid } from "@/lib/password";

// Pages
import Dashboard from "@/pages/dashboard";
import TheoryDetail from "@/pages/theory-detail";
import MeasurementPlan from "@/pages/measurement-plan";
import SupportCalculations from "@/pages/support-calculations";
import SystemicChange from "@/pages/systemic-change";
import Summary from "@/pages/summary";
import PortfolioLogframe from "@/pages/portfolio-logframe";
import PortfolioLocations from "@/pages/portfolio-locations";
import ProgramLogframe from "@/pages/program-logframe";
import UserManagement from "@/pages/user-management";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import SetupPage from "@/pages/setup";
import NotFound from "@/pages/not-found";
import VideoPage from "@/pages/video";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/video" component={VideoPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/program-logframe" component={ProgramLogframe} />
      <Route path="/portfolio/:id/logframe" component={PortfolioLogframe} />
      <Route path="/portfolio/:id/locations" component={PortfolioLocations} />
      <Route path="/theory/:id/measurement-plan" component={MeasurementPlan} />
      <Route path="/theory/:id/support-calculations" component={SupportCalculations} />
      <Route path="/theory/:id/systemic-change" component={SystemicChange} />
      <Route path="/theory/:id/summary" component={Summary} />
      <Route path="/theory/:id" component={TheoryDetail} />
      <Route path="/users" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading, refetch } = useAuth();
  const [isSetUp, setIsSetUp] = useState<boolean | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    fetch("/api/setup/status", { credentials: "include" })
      .then(r => r.json())
      .then((data: { isSetUp: boolean }) => setIsSetUp(data.isSetUp))
      .catch(() => setIsSetUp(true));
  }, []);

  // Still checking
  if (isLoading || isSetUp === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // First-run setup (no orgs exist yet)
  if (!isSetUp) return <SetupPage />;

  // Public routes — accessible without being logged in
  if (!user) {
    if (location === "/signup") return <SignupPage />;
    if (location === "/video") return <VideoPage />;
    return <LoginPage />;
  }

  // Force first-time password change if flagged
  if (user?.mustChangePassword) {
    return <ForcePasswordChangePage />;
  }

  // Logged in — render full app
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 h-full min-w-0">
          {user?.role === "system_admin" && (
            <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
              user.orgId ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
                <span>
                  {user.orgId 
                    ? `Switched Context: viewing as tenant "${user.orgName}"` 
                    : "System Administrator: Master Console (viewing all organizations)"}
                </span>
              </div>
              {user.orgId && (
                <button 
                  onClick={async () => {
                    const res = await fetch("/api/admin/switch-tenant", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ orgId: null }),
                    });
                    if (res.ok) {
                       await refetch();
                       window.location.href = "/";
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors font-bold text-[10px] uppercase tracking-wide"
                >
                  Clear Switched Context
                </button>
              )}
            </div>
          )}
          <div className="absolute top-4 left-4 z-50 md:hidden">
            <SidebarTrigger className="bg-background shadow-md border" />
          </div>
          <main className="flex-1 h-full overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
      <ChatWidget />
    </SidebarProvider>
  );
}

function ForcePasswordChangePage() {
  const { refetch, logout } = useAuth();
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirm) return;
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(err.error || "Failed to update password");
      }
      await refetch();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PathwaysLogo size={52} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground mt-1">Please secure your account</p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Reset Temporary Password</h2>
          <p className="text-xs text-muted-foreground mb-5">
            Your account was registered with a temporary password. Please set a new secure password before proceeding.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Current Temporary Password</label>
              <div className="relative">
                <Input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">New Secure Password</label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm && newPassword !== confirm && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" className="w-full animate-pulse-slow" disabled={loading || !oldPassword || !isPasswordValid(newPassword) || newPassword !== confirm}>
                {loading ? "Updating Password..." : "Update Password & Continue"}
              </Button>
              <Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => logout()} disabled={loading}>
                Sign Out
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <ColorSettingsProvider>
                <AppShell />
              </ColorSettingsProvider>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
