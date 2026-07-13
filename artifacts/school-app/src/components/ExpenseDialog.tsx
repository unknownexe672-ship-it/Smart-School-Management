import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type ExpenseDialogProps = {
  onSuccess?: () => void;
};

export function ExpenseDialog({ onSuccess }: ExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "maintenance" as const,
    amount: "",
    description: "",
    vendor: "",
    expenseDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense added successfully");
      setOpen(false);
      setFormData({
        category: "maintenance",
        amount: "",
        description: "",
        vendor: "",
        expenseDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add expense");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: formData.amount,
      expenseDate: formData.expenseDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Log a new school expense to track spending.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electricity">Electricity</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="internet">Internet</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="repairs">Repairs</SelectItem>
                <SelectItem value="stationery">Stationery</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (RM) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of the expense"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              placeholder="Vendor or supplier name"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseDate">Expense Date *</Label>
            <Input
              id="expenseDate"
              type="date"
              value={formData.expenseDate}
              onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or details"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
