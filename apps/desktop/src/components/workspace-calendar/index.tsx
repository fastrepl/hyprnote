import { eachDayOfInterval, format, getDay, isToday, startOfMonth, endOfMonth } from "date-fns";
import { useState } from "react";
import { DayEvents } from "./day-events";
import { mockEvents } from "./mock";

import { type Event } from "@hypr/plugin-db";

export default function WorkspaceCalendar() {
  const currentMonth = new Date(2025, 2); // March 2025
  
  const [events] = useState<Event[]>(mockEvents);

  const getEventsForDay = (date: Date) => {
    return events.filter(
      (event) =>
        format(new Date(event.start_date), "yyyy-MM-dd")
          === format(date, "yyyy-MM-dd"),
    );
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = monthStart;
    const endDate = monthEnd;
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const calendarDays = getCalendarDays();
  
  // Get the number of empty cells before the first day of the month
  const getEmptyCellsBeforeMonth = () => {
    return getDay(startOfMonth(currentMonth));
  };
  
  // Get the number of empty cells after the last day of the month to complete the grid
  const getEmptyCellsAfterMonth = () => {
    const totalCells = 42; // 6 rows of 7 days
    return totalCells - getEmptyCellsBeforeMonth() - calendarDays.length;
  };

  return (
    <div className="grid grid-cols-7 divide-x divide-neutral-200">
      {/* Empty cells before the month starts */}
      {Array(getEmptyCellsBeforeMonth())
        .fill(null)
        .map((_, i) => {
          const isLastInRow = (i + 1) % 7 === 0;
          
          return (
            <div 
              key={`empty-before-${i}`} 
              className={`min-h-[100px] bg-neutral-50 border-b border-neutral-200 ${
                isLastInRow ? "border-r-0" : ""
              }`}
            />
          );
        })}
      
      {/* Calendar days */}
      {calendarDays.map((day, i) => {
        const dayEvents = getEventsForDay(day);
        const isWeekNumber = (i + getEmptyCellsBeforeMonth()) % 7 === 0;
        const isLastInRow = (i + getEmptyCellsBeforeMonth() + 1) % 7 === 0;
        const dayNumber = format(day, "d");
        const isHighlighted = dayNumber === "15"; // Highlighted day from screenshot
        
        return (
          <div
            key={i}
            className={`min-h-[100px] relative border-b border-neutral-200 ${
              isToday(day) ? "bg-blue-50" : "bg-white"
            } ${isLastInRow ? "border-r-0" : ""}`}
          >
            <div className={`flex items-center justify-between p-1 ${isHighlighted ? "bg-red-500 rounded-full w-6 h-6 flex items-center justify-center mx-auto mt-1" : ""}`}>
              {isWeekNumber && (
                <span className="text-xs text-neutral-500 ml-1">{format(day, "w")}</span>
              )}
              <span className={`text-sm ${isHighlighted ? "text-white font-medium" : "text-neutral-700"} ${isWeekNumber ? "" : "ml-auto"} mr-1`}>
                {dayNumber}
              </span>
            </div>
            <DayEvents date={day} events={dayEvents} />
          </div>
        );
      })}
      
      {/* Empty cells after the month ends */}
      {Array(getEmptyCellsAfterMonth())
        .fill(null)
        .map((_, i) => {
          const isLastInRow = (i + getEmptyCellsBeforeMonth() + calendarDays.length + 1) % 7 === 0;
          
          return (
            <div 
              key={`empty-after-${i}`} 
              className={`min-h-[100px] bg-neutral-50 border-b border-neutral-200 ${
                isLastInRow ? "border-r-0" : ""
              }`}
            />
          );
        })}
    </div>
  );
}
