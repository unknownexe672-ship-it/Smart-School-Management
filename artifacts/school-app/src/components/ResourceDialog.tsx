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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type ResourceDialogProps = {
  onSuccess?: () => void;
};

export function ResourceDialog({ onSuccess }: ResourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "books" as const,
    quantity: "0",
    unit: "",
    condition: "good" as const,
    location: "",
    reorderLevel: "0",
    reorderQuantity: "0",
  });

  const createMutation = trpc.resources.create.useMutation({
    onSuccess: () => {
      toast.success("Resource added successfully");
      setOpen(false);
      setFormData({
        name: "",
        category: "books",
        quantity: "0",
        unit: "",
        condition: "good",
        location: "",
        reorderLevel: "0",
        reorderQuantity: "0",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add resource");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      quantity: parseInt(formData.quantity),
      reorderLevel: parseInt(formData.reorderLevel),
      reorderQuantity: parseInt(formData.reorderQuantity),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
          <DialogDescription>
            Add a new resource or item to your school inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Resource Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Mathematics Textbooks"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="e.g., pieces, sets"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select value={formData.condition} onValueChange={(value: any) => setFormData({ ...formData, condition: value })}>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g., Library, Storeroom"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderQty">Reorder Quantity</Label>
              <Input
                id="reorderQty"
                type="number"
                min="0"
                value={formData.reorderQuantity}
                onChange={(e) => setFormData({ ...formData, reorderQuantity: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
