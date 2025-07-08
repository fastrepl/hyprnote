import { format, isToday } from "date-fns";
import { Archive, Calendar, ChevronDown, ChevronUp, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@hypr/ui/components/ui/tabs";

interface TableViewProps {
  date: Date;
  sessions: any[];
  events: any[];
  onNavigate: (params: { date: string }) => void;
}

type TableItemType = "session" | "event" | "all";

interface TableItem {
  id: string;
  title: string;
  date: Date;
  type: "session" | "event";
  original: any;
  tags?: string[];
  duration?: number; // in minutes
}

type SortField = "title" | "date" | "type";
type SortOrder = "asc" | "desc";

export function TableView({ date, sessions, events, onNavigate }: TableViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<TableItemType>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Convert sessions and events to a unified list of items
  const tableItems = useMemo(() => {
    const items: TableItem[] = [];

    // Process sessions
    sessions.forEach(session => {
      items.push({
        id: session.id,
        title: session.title || "Untitled Session",
        date: new Date(session.created_at),
        type: "session",
        original: session,
        tags: session.tags || [],
        duration: session.duration || 0,
      });
    });

    // Process events
    events.forEach(event => {
      const startDate = event.start_date ? new Date(event.start_date) : new Date();
      const endDate = event.end_date ? new Date(event.end_date) : startDate;
      const durationInMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      items.push({
        id: event.id,
        title: event.title || "Untitled Event",
        date: startDate,
        type: "event",
        original: event,
        duration: durationInMinutes,
      });
    });

    return items;
  }, [sessions, events]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return tableItems
      .filter(item => {
        // Filter by search term
        if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Filter by tab
        if (activeTab !== "all" && item.type !== activeTab) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        // Sort by the selected field
        if (sortField === "title") {
          comparison = a.title.localeCompare(b.title);
        } else if (sortField === "date") {
          comparison = a.date.getTime() - b.date.getTime();
        } else if (sortField === "type") {
          comparison = a.type.localeCompare(b.type);
        }

        // Apply sort order
        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [tableItems, searchTerm, activeTab, sortField, sortOrder]);

  // Toggle sort order for a field
  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // Toggle between asc and desc
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to desc
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Handle row click
  const handleRowClick = (item: TableItem) => {
    if (item.type === "session") {
      // Navigate to session
      window.location.href = `/app/transcript/${item.id}`;
    } else if (item.type === "event") {
      // Navigate to date on calendar view
      onNavigate({
        date: format(item.date, "yyyy-MM-dd"),
      });
      // Update the view to calendar
      window.location.href = `/app/finder?view=calendar&date=${format(item.date, "yyyy-MM-dd")}`;
    }
  };

  // Format duration in minutes to readable format
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) {
      return "N/A";
    }

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  };

  // Get a friendly display format for date
  const formatDisplayDate = (dateObj: Date) => {
    if (isToday(dateObj)) {
      return "Today, " + format(dateObj, "h:mm a");
    }
    return format(dateObj, "MMM d, yyyy, h:mm a");
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with search and filters */}
      <div className="p-4 pb-2 border-b border-neutral-100">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search notes and events..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TableItemType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="session">Notes</TabsTrigger>
            <TabsTrigger value="event">Events</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto">
        {filteredItems.length > 0
          ? (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-xs font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <th
                    className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => handleSortClick("type")}
                  >
                    <div className="flex items-center">
                      Type
                      {sortField === "type" && (
                        sortOrder === "asc"
                          ? <ChevronUp className="h-3 w-3 ml-1" />
                          : <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                      {sortField !== "type" && <ChevronDown className="h-3 w-3 ml-1 opacity-30" />}
                    </div>
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => handleSortClick("title")}
                  >
                    <div className="flex items-center">
                      Title
                      {sortField === "title" && (
                        sortOrder === "asc"
                          ? <ChevronUp className="h-3 w-3 ml-1" />
                          : <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                      {sortField !== "title" && <ChevronDown className="h-3 w-3 ml-1 opacity-30" />}
                    </div>
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer"
                    onClick={() => handleSortClick("date")}
                  >
                    <div className="flex items-center">
                      Date
                      {sortField === "date" && (
                        sortOrder === "asc"
                          ? <ChevronUp className="h-3 w-3 ml-1" />
                          : <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                      {sortField !== "date" && <ChevronDown className="h-3 w-3 ml-1 opacity-30" />}
                    </div>
                  </th>
                  <th className="px-4 py-2 text-left">Duration</th>
                  <th className="px-4 py-2 text-left">Tags</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredItems.map((item) => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-1.5 rounded-md mr-2 bg-neutral-100">
                          {item.type === "session"
                            ? <FileText className="h-3.5 w-3.5 text-indigo-500" />
                            : <Calendar className="h-3.5 w-3.5 text-blue-500" />}
                        </div>
                        <span className="text-xs text-neutral-500 font-medium">
                          {item.type === "session" ? "Note" : "Event"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-neutral-500">
                        {formatDisplayDate(item.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                      {formatDuration(item.duration || 0)}
                    </td>
                    <td className="px-4 py-3">
                      {item.tags && item.tags.length > 0
                        ? (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 text-xs rounded-sm bg-neutral-100 text-neutral-700"
                              >
                                {tag}
                              </span>
                            ))}
                            {item.tags.length > 2 && (
                              <span className="text-xs text-neutral-500">
                                +{item.tags.length - 2} more
                              </span>
                            )}
                          </div>
                        )
                        : <span className="text-xs text-neutral-400">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
          : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 pt-12">
              <Archive className="h-12 w-12 mb-3 text-neutral-300" />
              <p className="text-neutral-500 font-medium">No items found</p>
              <p className="text-sm text-neutral-400 mt-1">
                {searchTerm ? "Try a different search term" : "Create notes or events to see them here"}
              </p>

              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="mt-4"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
