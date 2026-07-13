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

type TeacherDialogProps = {
  onSuccess?: () => void;
};

export function TeacherDialog({ onSuccess }: TeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "male" as const,
    subjects: "",
    qualifications: "",
    yearsOfExperience: "0",
  });

  const createMutation = trpc.teachers.create.useMutation({
    onSuccess: () => {
      toast.success("Teacher added successfully");
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        gender: "male",
        subjects: "",
        qualifications: "",
        yearsOfExperience: "0",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add teacher");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      yearsOfExperience: parseInt(formData.yearsOfExperience),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>
            Enter the teacher's information to add them to the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter teacher's full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value: any) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger id="gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subjects">Subjects</Label>
            <Input
              id="subjects"
              placeholder="e.g., Mathematics, Science"
              value={formData.subjects}
              onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Textarea
              id="qualifications"
              placeholder="e.g., Bachelor's in Mathematics, Master's in Education"
              value={formData.qualifications}
              onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Years of Experience</Label>
            <Input
              id="experience"
              type="number"
              min="0"
              value={formData.yearsOfExperience}
              onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Teacher"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
