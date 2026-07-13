import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Users, BookOpen, Clock, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { ScheduleVisualization } from "@/components/ScheduleVisualization";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherDetail() {
  const [, params] = useRoute("/teacher/:id");
  const [, navigate] = useLocation();
  const teacherId = params?.id ? parseInt(params.id) : null;

  const { data: teacher, isLoading: teacherLoading } = trpc.teachers.getById.useQuery(
    { id: teacherId || 0 },
    { enabled: !!teacherId }
  );

  const { data: schedules, isLoading: schedulesLoading } = trpc.schedules.list.useQuery();
  const { data: classes } = trpc.classes.list.useQuery();
  const { data: rooms } = trpc.rooms.list.useQuery();

  const classNames = Object.fromEntries(
    (classes || []).map((c: any) => [c.id, c.name])
  );
  const roomNames = Object.fromEntries((rooms || []).map((r: any) => [r.id, r.name]));

  if (!teacherId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Teacher not found</p>
      </div>
    );
  }

  if (teacherLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading teacher details...</p>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Teacher not found</p>
        <Button onClick={() => navigate("/teachers")} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  // Filter schedules for this teacher
  const teacherSchedules = (schedules || []).filter((s: any) => s.teacherId === teacherId);



  const performanceRating = Math.round(((teacher.performanceRating as any) || 0) * 10) / 10;
  const performanceColor = performanceRating >= 4.5 ? "text-green-600" : performanceRating >= 3.5 ? "text-blue-600" : "text-orange-600";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/teachers")}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Teachers
        </Button>
      </div>

      {/* Teacher Profile Card */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl text-indigo-900">{teacher.name}</CardTitle>
              <CardDescription className="text-lg mt-2">{teacher.subjects || "Subject not assigned"}</CardDescription>
            </div>
            <Badge className={`${teacher.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
              {teacher.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Star className={`w-5 h-5 ${performanceColor}`} />
                <span className="text-sm font-medium text-gray-600">Performance</span>
              </div>
              <div className={`text-2xl font-bold ${performanceColor}`}>{performanceRating}/5.0</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Classes</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{teacherSchedules.length || 0}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Email</span>
              </div>
              <div className="text-sm font-mono text-purple-600 truncate">{teacher.email || "N/A"}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-600">Experience</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">{teacher.yearsOfExperience || 0} yrs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Schedule - Visual Grid */}
      {!schedulesLoading && (
        <ScheduleVisualization
          schedules={teacherSchedules}
          title="Weekly Class Schedule"
          description={teacherSchedules.length === 0 ? "No classes scheduled" : `${teacherSchedules.length} classes this week`}
          classNames={classNames}
          roomNames={roomNames}
        />
      )}

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Qualifications</label>
              <p className="text-gray-900 mt-1">{teacher.qualifications || "Not specified"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Attendance Rate</label>
              <p className="text-gray-900 mt-1">100%</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Gender</label>
              <p className="text-gray-900 mt-1">{teacher.gender === "male" ? "Male" : teacher.gender === "female" ? "Female" : "Other"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Joined</label>
              <p className="text-gray-900 mt-1">{new Date(teacher.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
