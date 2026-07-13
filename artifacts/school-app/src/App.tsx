import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Teachers from "@/pages/Teachers";
import Schedules from "@/pages/Schedules";
import Employees from "@/pages/Employees";
import Resources from "@/pages/Resources";
import Expenses from "@/pages/Expenses";
import AmiraAI from "@/pages/AmiraAI";
import PerformanceTrends from "@/pages/PerformanceTrends";
import WaterMonitor from "@/pages/WaterMonitor";
import ElectricMonitor from "@/pages/ElectricMonitor";
import TeacherDetail from "@/pages/TeacherDetail";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Dashboard} />
        <Route path={"/teachers"} component={Teachers} />
        <Route path={"/schedules"} component={Schedules} />
        <Route path={"/employees"} component={Employees} />
        <Route path={"/resources"} component={Resources} />
        <Route path={"/expenses"} component={Expenses} />
        <Route path={"/amira"} component={AmiraAI} />
        <Route path={"/performance-trends"} component={PerformanceTrends} />
        <Route path={"/water-monitor"} component={WaterMonitor} />
        <Route path={"/electric-monitor"} component={ElectricMonitor} />
        <Route path={"/teacher/:id"} component={TeacherDetail} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
