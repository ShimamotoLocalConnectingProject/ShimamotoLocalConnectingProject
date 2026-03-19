import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import LoginPage from "./pages/Login";
import FoodShare from "./pages/FoodShare";
import { useEffect } from "react";

function Router() {
  const [, setLocation] = useLocation();

  // OAuth callback no longer passes token in URL
  // Token is set as httpOnly cookie by server
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    
    if (error) {
      // OAuth error - redirect to login
      window.history.replaceState({}, "", "/login");
      setLocation("/login");
    }
  }, [setLocation]);

  return (
    <Switch>
      <Route path={"/login"} component={() => (
        <LoginPage onSuccess={() => setLocation("/")} />
      )} />
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/food-share"} component={FoodShare} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
