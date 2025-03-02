import {
  format,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
  isToday,
} from "date-fns";

export default function WorkspaceCalendar() {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
      <div className="border-2 border-black rounded-lg p-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold">
              {day}
            </div>
          ))}
          {days.map((day, i) => (
            <div
              key={i}
              className={`min-h-[80px] border border-gray-200 p-1 ${
                isToday(day) ? "border-2 border-red-500 rounded-full" : ""
              }`}
            >
              <div className="text-sm">{format(day, "d")}</div>
              <div className="space-y-1">
                <div className="border border-black rounded-sm text-xs p-1"></div>
                <div className="border border-black rounded-sm text-xs p-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
