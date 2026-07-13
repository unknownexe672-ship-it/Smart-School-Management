import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign } from "lucide-react";
import { ExpenseDialog } from "@/components/ExpenseDialog";

export default function Expenses() {
  const expensesQuery = trpc.expenses.list.useQuery();
  const expenses = expensesQuery.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getApprovalColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-red-600" />
            Expense Monitoring
          </h1>
          <p className="text-muted-foreground">
            Log expenses, track spending, and view trends
          </p>
        </div>
        <ExpenseDialog onSuccess={() => expensesQuery.refetch()} />
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expensesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No expenses found. Log your first expense to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium capitalize text-sm">
                        {expense.category.replace("_", " ")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        RM {Number(expense.amount || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {expense.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{expense.vendor || "-"}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.paymentStatus || "pending")}>
                          {(expense.paymentStatus || "pending").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getApprovalColor(expense.approvalStatus || "pending")}>
                          {(expense.approvalStatus || "pending").replace("_", " ")}
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
