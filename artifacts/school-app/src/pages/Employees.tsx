import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { EmployeeDialog } from "@/components/EmployeeDialog";

export default function Employees() {
  const employeesQuery = trpc.employees.list.useQuery();
  const employees = employeesQuery.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPerformanceColor = (rating: string | number) => {
    const r = Number(rating);
    if (r >= 4) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (r >= 3) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (r >= 2) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-green-600" />
            Employee Management
          </h1>
          <p className="text-muted-foreground">
            Track staff records, attendance, and performance
          </p>
        </div>
        <EmployeeDialog onSuccess={() => employeesQuery.refetch()} />
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            {employees.length} employee{employees.length !== 1 ? "s" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No employees found. Add your first employee to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-sm">{employee.email}</TableCell>
                      <TableCell className="text-sm">{employee.role}</TableCell>
                      <TableCell className="text-sm">{employee.department}</TableCell>
                      <TableCell>
                        <Badge className={getPerformanceColor(employee.performanceRating || "0")}>
                          {(Number(employee.performanceRating || 0) / 1).toFixed(1)}/5.0
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(Number(employee.attendancePercentage || 0) / 1).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.status || "active")}>
                          {(employee.status || "active").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
