import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import DriverPortal from "@/pages/driver";
import DispatchCenter from "@/pages/dispatch";
import AdminDashboard from "@/pages/admin";
import BusinessSettings from "@/pages/business-settings";
import ResetPassword from "@/pages/reset-password";
import Auth from "@/pages/auth";

function Router() {
  // Initialize theme based on business settings
  useTheme();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/profile" component={Profile} />
      <Route path="/driver" component={DriverPortal} />
      <Route path="/dispatch" component={DispatchCenter} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/business-settings" component={BusinessSettings} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
