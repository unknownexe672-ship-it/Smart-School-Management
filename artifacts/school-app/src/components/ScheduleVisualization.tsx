import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, BookOpen } from "lucide-react";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The `schedules` table stores dayOfWeek as a string enum ("monday", "tuesday", ...),
// not a number, so we need a name -> index lookup instead of Number(dayOfWeek).
const dayNameToIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function resolveDayIndex(dayOfWeek: number | string): number {
  if (typeof dayOfWeek === "number") return dayOfWeek;
  const normalized = dayOfWeek.toLowerCase().trim();
  if (normalized in dayNameToIndex) return dayNameToIndex[normalized];
  const asNumber = Number(dayOfWeek);
  return Number.isNaN(asNumber) ? -1 : asNumber;
}
const dayColors = {
  0: "from-slate-50 to-slate-100 border-slate-200",
  1: "from-blue-50 to-blue-100 border-blue-200",
  2: "from-purple-50 to-purple-100 border-purple-200",
  3: "from-pink-50 to-pink-100 border-pink-200",
  4: "from-green-50 to-green-100 border-green-200",
  5: "from-orange-50 to-orange-100 border-orange-200",
  6: "from-red-50 to-red-100 border-red-200",
};

const dayBadgeColors = {
  0: "bg-slate-200 text-slate-800",
  1: "bg-blue-200 text-blue-800",
  2: "bg-purple-200 text-purple-800",
  3: "bg-pink-200 text-pink-800",
  4: "bg-green-200 text-green-800",
  5: "bg-orange-200 text-orange-800",
  6: "bg-red-200 text-red-800",
};

interface Schedule {
  id: number;
  classId: number;
  teacherId: number;
  roomId?: number | null;
  subject?: string | null;
  dayOfWeek: number | string;
  startTime: string;
  endTime: string;
}

interface ScheduleVisualizationProps {
  schedules: Schedule[];
  title?: string;
  description?: string;
  classNames?: Record<number, string>;
  roomNames?: Record<number, string>;
}

export function ScheduleVisualization({
  schedules,
  title = "Weekly Schedule",
  description = "View all classes for this week",
  classNames = {},
  roomNames = {},
}: ScheduleVisualizationProps) {
  // Group schedules by day
  const schedulesByDay = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    dayName: dayNames[i],
    schedules: schedules.filter((s) => resolveDayIndex(s.dayOfWeek) === i).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const hasSchedules = schedules.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasSchedules ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No classes scheduled</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedulesByDay.map((dayData) => (
              <div
                key={dayData.day}
                className={`bg-gradient-to-br ${dayColors[Math.min(dayData.day, 6) as keyof typeof dayColors]} rounded-lg p-4 border-2 transition-all hover:shadow-md`}
              >
                <div className="mb-4">
                  <Badge className={dayBadgeColors[Math.min(dayData.day, 6) as keyof typeof dayBadgeColors]}>
                    {dayData.dayName}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-2">
                    {dayData.schedules.length} class{dayData.schedules.length !== 1 ? "es" : ""}
                  </p>
                </div>

                {dayData.schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No classes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayData.schedules.map((schedule, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-lg p-3 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{schedule.subject ?? "Subject not assigned"}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                              <Clock className="w-3 h-3" />
                              <span className="font-medium">{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                            {schedule.roomId && (
                              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                                <MapPin className="w-3 h-3" />
                                <span>{roomNames[schedule.roomId] || `Room ${schedule.roomId}`}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                              <Users className="w-3 h-3" />
                              <span>{classNames[schedule.classId] || `Class ${schedule.classId}`}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
