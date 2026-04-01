import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

// Pages
import Dashboard from "@/pages/dashboard";
import TheoryDetail from "@/pages/theory-detail";
import MeasurementPlan from "@/pages/measurement-plan";
import SupportCalculations from "@/pages/support-calculations";
import Summary from "@/pages/summary";
import PortfolioLogframe from "@/pages/portfolio-logframe";
import ProgramLogframe from "@/pages/program-logframe";
import UserManagement from "@/pages/user-management";
import LoginPage from "@/pages/login";
import SetupPage from "@/pages/setup";
import NotFound from "@/pages/not-found";

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
      <Route path="/" component={Dashboard} />
      <Route path="/program-logframe" component={ProgramLogframe} />
      <Route path="/portfolio/:id/logframe" component={PortfolioLogframe} />
      <Route path="/theory/:id/measurement-plan" component={MeasurementPlan} />
      <Route path="/theory/:id/support-calculations" component={SupportCalculations} />
      <Route path="/theory/:id/summary" component={Summary} />
      <Route path="/theory/:id" component={TheoryDetail} />
      <Route path="/users" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const [isSetUp, setIsSetUp] = useState<boolean | null>(null);

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

  // First-run setup
  if (!isSetUp) return <SetupPage />;

  // Not logged in
  if (!user) return <LoginPage />;

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
          <div className="absolute top-4 left-4 z-50 md:hidden">
            <SidebarTrigger className="bg-background shadow-md border" />
          </div>
          <main className="flex-1 h-full overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
