import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  Briefcase,
  Package,
  DollarSign,
  MessageCircle,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";

const modules = [
  {
    title: "Smart Teacher Analytics",
    description: "Monitor teacher performance, attendance, and assignments",
    icon: Users,
    path: "/teachers",
    color: "bg-blue-50 dark:bg-blue-950",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Class Scheduler",
    description: "Manage class schedules, rooms, and teacher assignments",
    icon: Calendar,
    path: "/schedules",
    color: "bg-purple-50 dark:bg-purple-950",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Employee Management",
    description: "Track staff records, attendance, and performance",
    icon: Briefcase,
    path: "/employees",
    color: "bg-green-50 dark:bg-green-950",
    iconColor: "text-green-600 dark:text-green-400",
  },
  {
    title: "Essentials Tracker",
    description: "Monitor resources, inventory, and borrowing activities",
    icon: Package,
    path: "/resources",
    color: "bg-amber-50 dark:bg-amber-950",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "Expense Monitoring",
    description: "Log expenses, track spending, and view trends",
    icon: DollarSign,
    path: "/expenses",
    color: "bg-red-50 dark:bg-red-950",
    iconColor: "text-red-600 dark:text-red-400",
  },
  {
    title: "Amira AI Assistant",
    description: "Get insights, recommendations, and data-driven answers",
    icon: MessageCircle,
    path: "/amira",
    color: "bg-indigo-50 dark:bg-indigo-950",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
];

function KPICard({
  title,
  value,
  isLoading,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  isLoading: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Fetch KPI data
  const teacherStatsQuery = trpc.teachers.getStats.useQuery();
  const employeeStatsQuery = trpc.employees.getStats.useQuery();
  const expenseStatsQuery = trpc.expenses.getStats.useQuery();
  const classesQuery = trpc.classes.list.useQuery();
  const schedulesQuery = trpc.schedules.list.useQuery();

  const teacherStats = teacherStatsQuery.data;
  const employeeStats = employeeStatsQuery.data;
  const expenseStats = expenseStatsQuery.data;

  const isLoading =
    teacherStatsQuery.isLoading ||
    employeeStatsQuery.isLoading ||
    expenseStatsQuery.isLoading ||
    classesQuery.isLoading ||
    schedulesQuery.isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Smart School Management. One Dashboard. Every School Decision.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Teachers"
          value={teacherStats?.totalTeachers || 0}
          isLoading={isLoading}
          icon={Users}
        />
        <KPICard
          title="Total Classes"
          value={classesQuery.data?.length || 0}
          isLoading={isLoading}
          icon={Calendar}
        />
        <KPICard
          title="Total Employees"
          value={employeeStats?.totalEmployees || 0}
          isLoading={isLoading}
          icon={Briefcase}
        />
        <KPICard
          title="Total Expenses"
          value={`RM ${Number(expenseStats?.totalExpenses || 0).toFixed(2)}`}
          isLoading={isLoading}
          icon={DollarSign}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Teacher Performance
            </CardTitle>
            <CardDescription>Average metrics across all teachers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Performance Rating</span>
                  <span className="font-semibold">
                    {(Number(teacherStats?.avgPerformance || 0) / 1).toFixed(2)}/5.00
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Attendance</span>
                  <span className="font-semibold">
                    {(Number(teacherStats?.avgAttendance || 0)).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Employee Performance
            </CardTitle>
            <CardDescription>Average metrics across all employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Performance Rating</span>
                  <span className="font-semibold">
                    {(Number(employeeStats?.avgPerformance || 0) / 1).toFixed(2)}/5.00
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Attendance</span>
                  <span className="font-semibold">
                    {(Number(employeeStats?.avgAttendance || 0)).toFixed(1)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Quick Navigation */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
          <p className="text-muted-foreground">
            Access all school management features from here
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.path}
                className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                onClick={() => setLocation(module.path)}
              >
                <CardHeader className={`${module.color} pb-3`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {module.description}
                      </CardDescription>
                    </div>
                    <Icon className={`h-5 w-5 ${module.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(module.path);
                    }}
                  >
                    Open Module
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            • Total class schedules: {schedulesQuery.data?.length || 0}
          </p>
          <p className="text-muted-foreground">
            • Expense records: {expenseStats?.count || 0}
          </p>
          <p className="text-muted-foreground">
            • Use Amira AI to get deeper insights into school performance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
