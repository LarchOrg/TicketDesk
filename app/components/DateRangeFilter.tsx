import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateRangeChange: (dateFrom?: string, dateTo?: string) => void;
  disabled?: boolean;
}

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateRangeChange,
  disabled = false,
}: DateRangeFilterProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(
    dateFrom ? new Date(dateFrom) : null
  );
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(
    dateTo ? new Date(dateTo) : null
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Update internal state when props change
  useEffect(() => {
    setSelectedStart(dateFrom ? new Date(dateFrom) : null);
    setSelectedEnd(dateTo ? new Date(dateTo) : null);
  }, [dateFrom, dateTo]);

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isDateInFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date.getTime() > today.getTime();
  };

  const generateCalendarDates = (month: Date): CalendarDate[] => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const dates: CalendarDate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const isCurrentMonth = date.getMonth() === monthIndex;
      const isToday = date.getTime() === today.getTime();
      const isFuture = isDateInFuture(date);

      let isSelected = false;
      let isInRange = false;

      if (selectedStart && selectedEnd) {
        const start = new Date(selectedStart);
        const end = new Date(selectedEnd);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        isSelected =
          date.getTime() === start.getTime() ||
          date.getTime() === end.getTime();
        isInRange =
          date.getTime() > start.getTime() && date.getTime() < end.getTime();
      } else if (selectedStart) {
        const start = new Date(selectedStart);
        start.setHours(0, 0, 0, 0);
        isSelected = date.getTime() === start.getTime();

        if (hoverDate && !isFuture) {
          const hover = new Date(hoverDate);
          hover.setHours(0, 0, 0, 0);
          const minDate = start.getTime() < hover.getTime() ? start : hover;
          const maxDate = start.getTime() > hover.getTime() ? start : hover;
          isInRange =
            date.getTime() > minDate.getTime() &&
            date.getTime() < maxDate.getTime();
        }
      }

      dates.push({
        date,
        isCurrentMonth,
        isSelected,
        isInRange,
        isToday,
        isFuture,
      });
    }

    return dates;
  };

  const handleDateClick = (date: Date) => {
    // Don't allow selection of future dates
    if (isDateInFuture(date)) {
      return;
    }

    if (!selectedStart || (selectedStart && selectedEnd)) {
      // Start new selection
      setSelectedStart(date);
      setSelectedEnd(null);
      onDateRangeChange(formatDate(date), undefined);
    } else {
      // Complete the range
      const start = selectedStart;
      const end = date;

      if (start.getTime() <= end.getTime()) {
        setSelectedEnd(end);
        onDateRangeChange(formatDate(start), formatDate(end));
      } else {
        setSelectedStart(end);
        setSelectedEnd(start);
        onDateRangeChange(formatDate(end), formatDate(start));
      }
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const selectQuickRange = (
    range: "thisMonth" | "lastMonth" | "last3Months" | "last6Months"
  ) => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case "thisMonth":
        start.setDate(1);
        // Don't go beyond today for current month
        if (end.getTime() > today.getTime()) {
          end.setTime(today.getTime());
        } else {
          end.setMonth(end.getMonth() + 1, 0);
        }
        break;
      case "lastMonth":
        start.setMonth(start.getMonth() - 1, 1);
        end.setMonth(end.getMonth(), 0);
        break;
      case "last3Months":
        start.setMonth(start.getMonth() - 3, 1);
        end.setMonth(end.getMonth(), 0);
        break;
      case "last6Months":
        start.setMonth(start.getMonth() - 6, 1);
        end.setMonth(end.getMonth(), 0);
        break;
    }

    setSelectedStart(start);
    setSelectedEnd(end);
    onDateRangeChange(formatDate(start), formatDate(end));
  };

  const clearDates = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
    onDateRangeChange(undefined, undefined);
  };

  const applySelection = () => {
    setShowCalendar(false);
  };

  const calendarDates = generateCalendarDates(currentMonth);

  // Get max date (today) for manual input
  const maxDate = formatDate(new Date());

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium text-muted-foreground">
        Date Range
      </Label>

      <Button
        variant="outline"
        onClick={() => setShowCalendar(true)}
        disabled={disabled}
        className="flex items-center gap-2 min-w-[200px] justify-start"
      >
        <Calendar className="h-4 w-4" />
        {selectedStart && selectedEnd ? (
          <span className="text-sm">
            {formatDisplayDate(selectedStart)} -{" "}
            {formatDisplayDate(selectedEnd)}
          </span>
        ) : selectedStart ? (
          <span className="text-sm">
            {formatDisplayDate(selectedStart)} - Select end date
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            Select date range
          </span>
        )}
      </Button>

      {(selectedStart || selectedEnd) && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearDates}
          disabled={disabled}
          className="px-2 py-1 h-8"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>

          <div className="calendar-date-picker pt-3">
            {/* Quick Range Selection */}
            <div className="mb-4 quick-range-buttons">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectQuickRange("thisMonth")}
                  className="text-xs quick-range-btn"
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectQuickRange("lastMonth")}
                  className="text-xs quick-range-btn"
                >
                  Last Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectQuickRange("last3Months")}
                  className="text-xs quick-range-btn"
                >
                  Last 3 Months
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectQuickRange("last6Months")}
                  className="text-xs quick-range-btn"
                >
                  Last 6 Months
                </Button>
              </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4 calendar-nav">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("prev")}
                className="p-1 nav-button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h3 className="font-medium calendar-header">
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth("next")}
                className="p-1 nav-button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 calendar-days-header">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {calendarDates.map((calDate, index) => {
                const {
                  date,
                  isCurrentMonth,
                  isSelected,
                  isInRange,
                  isToday,
                  isFuture,
                } = calDate;

                return (
                  <button
                    key={index}
                    onClick={() =>
                      isCurrentMonth && !isFuture && handleDateClick(date)
                    }
                    onMouseEnter={() =>
                      isCurrentMonth && !isFuture && setHoverDate(date)
                    }
                    onMouseLeave={() => setHoverDate(null)}
                    disabled={!isCurrentMonth || isFuture}
                    className={`
                      p-2 text-sm rounded-md transition-colors relative calendar-date
                      ${!isCurrentMonth || isFuture ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-accent cursor-pointer"}
                      ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary selected" : ""}
                      ${isInRange ? "bg-primary/20 hover:bg-primary/30 in-range" : ""}
                      ${isToday && !isSelected ? "bg-accent font-medium today" : ""}
                      ${isFuture ? "opacity-40" : ""}
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Manual Input */}
            <div className="pt-4 border-t manual-input-section mb-4">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Manual Input
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    max={maxDate}
                    value={selectedStart ? formatDate(selectedStart) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        if (!isDateInFuture(date)) {
                          setSelectedStart(date);
                          if (!selectedEnd) {
                            onDateRangeChange(formatDate(date), undefined);
                          } else {
                            onDateRangeChange(
                              formatDate(date),
                              formatDate(selectedEnd)
                            );
                          }
                        }
                      }
                    }}
                    className="text-xs"
                    placeholder="From"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    max={maxDate}
                    value={selectedEnd ? formatDate(selectedEnd) : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        const date = new Date(e.target.value);
                        if (!isDateInFuture(date)) {
                          setSelectedEnd(date);
                          if (selectedStart) {
                            onDateRangeChange(
                              formatDate(selectedStart),
                              formatDate(date)
                            );
                          }
                        }
                      }
                    }}
                    className="text-xs"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCalendar(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button variant="outline" onClick={clearDates} className="text-xs">
              Clear
            </Button>
            <Button onClick={applySelection} className="text-xs">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
