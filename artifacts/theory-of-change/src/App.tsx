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
