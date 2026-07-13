import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";
import { ResourceDialog } from "@/components/ResourceDialog";

export default function Resources() {
  const resourcesQuery = trpc.resources.list.useQuery();
  const reorderQuery = trpc.resources.getNeedingReorder.useQuery();
  const resources = resourcesQuery.data || [];
  const needsReorder = reorderQuery.data || [];

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "good":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "fair":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "poor":
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
            <Package className="h-8 w-8 text-amber-600" />
            Essentials Tracker
          </h1>
          <p className="text-muted-foreground">
            Monitor resources, inventory, and borrowing activities
          </p>
        </div>
        <ResourceDialog onSuccess={() => resourcesQuery.refetch()} />
      </div>

      {/* Reorder Alert */}
      {needsReorder.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-5 w-5" />
              Items Needing Reorder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsReorder.map((resource) => (
                <p key={resource.id} className="text-sm text-amber-800 dark:text-amber-300">
                  • {resource.name}: {resource.quantity} {resource.unit || "units"} (Reorder level: {resource.reorderLevel})
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            {resources.length} resource{resources.length !== 1 ? "s" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resourcesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No resources found. Add your first resource to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell className="text-sm capitalize">
                        {resource.category.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {resource.quantity} {resource.unit || "units"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getConditionColor(resource.condition || "good")}>
                          {(resource.condition || "good").charAt(0).toUpperCase() + (resource.condition || "good").slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{resource.location || "-"}</TableCell>
                      <TableCell className="text-sm">{resource.reorderLevel || 0}</TableCell>
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
