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

type ScheduleDialogProps = {
  onSuccess?: () => void;
};

export function ScheduleDialog({ onSuccess }: ScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    classId: "1",
    teacherId: "1",
    roomId: "1",
    subject: "",
    dayOfWeek: "monday" as const,
    startTime: "08:00",
    endTime: "09:00",
  });

  const classesQuery = trpc.classes.list.useQuery();
  const teachersQuery = trpc.teachers.list.useQuery();
  const roomsQuery = trpc.rooms.list.useQuery();

  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule added successfully");
      setOpen(false);
      setFormData({
        classId: "1",
        teacherId: "1",
        roomId: "1",
        subject: "",
        dayOfWeek: "monday",
        startTime: "08:00",
        endTime: "09:00",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add schedule");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      classId: parseInt(formData.classId),
      teacherId: parseInt(formData.teacherId),
      roomId: parseInt(formData.roomId),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Schedule</DialogTitle>
          <DialogDescription>
            Create a new class schedule for your school.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class *</Label>
            <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })}>
              <SelectTrigger id="class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classesQuery.data?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher *</Label>
            <Select value={formData.teacherId} onValueChange={(value) => setFormData({ ...formData, teacherId: value })}>
              <SelectTrigger id="teacher">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teachersQuery.data?.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id.toString()}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Room *</Label>
            <Select value={formData.roomId} onValueChange={(value) => setFormData({ ...formData, roomId: value })}>
              <SelectTrigger id="room">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roomsQuery.data?.map((room) => (
                  <SelectItem key={room.id} value={room.id.toString()}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="e.g., Mathematics"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="day">Day of Week *</Label>
            <Select value={formData.dayOfWeek} onValueChange={(value: any) => setFormData({ ...formData, dayOfWeek: value })}>
              <SelectTrigger id="day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
