import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";

// Pages
import Dashboard from "@/pages/dashboard";
import TheoryDetail from "@/pages/theory-detail";
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
      <Route path="/theory/:id" component={TheoryDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
