import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { X, CalendarCheck, CalendarX, CalendarRange } from "lucide-react";
import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";

interface AvailabilityCalendarManagerFlatpickrProps {
  blackoutDates: Date[];
  onBlackoutDatesChange: (dates: Date[]) => void;
}

const AvailabilityCalendarManagerFlatpickr = ({
  blackoutDates,
  onBlackoutDatesChange,
}: AvailabilityCalendarManagerFlatpickrProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>(blackoutDates);
  const [pickMode, setPickMode] = useState<"multiple" | "range">("multiple");
  const [rangePreview, setRangePreview] = useState<Date[]>([]);

  useEffect(() => {
    setSelectedDates(blackoutDates);
  }, [blackoutDates]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const commit = (dates: Date[]) => {
    setSelectedDates(dates);
    onBlackoutDatesChange(dates);
  };

  const handleDateChange = (dates: Date[]) => {
    if (pickMode === "multiple") {
      commit(dates);
      return;
    }
    setRangePreview(dates);
  };

  const expandRange = (from: Date, to: Date) => {
    const out: Date[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor <= end) {
      out.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  };

  const addRange = () => {
    if (rangePreview.length < 2) return;
    const added = expandRange(rangePreview[0], rangePreview[rangePreview.length - 1]);
    const merged = [...selectedDates];
    added.forEach((d) => {
      if (!merged.some((m) => isSameDay(m, d))) merged.push(d);
    });
    commit(merged);
    setRangePreview([]);
  };

  const removeDate = (dateToRemove: Date) => {
    commit(selectedDates.filter((d) => !isSameDay(d, dateToRemove)));
  };

  const switchMode = (mode: "multiple" | "range") => {
    setPickMode(mode);
    setRangePreview([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-[#FF69B4]" />
          Availability Calendar
        </CardTitle>
        <CardDescription>
          Mark dates when your item will NOT be available for rent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pick mode */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={pickMode === "multiple" ? "default" : "outline"}
            onClick={() => switchMode("multiple")}
          >
            <CalendarX className="h-4 w-4 mr-1" />
            Single dates
          </Button>
          <Button
            type="button"
            size="sm"
            variant={pickMode === "range" ? "default" : "outline"}
            onClick={() => switchMode("range")}
          >
            <CalendarRange className="h-4 w-4 mr-1" />
            Date range
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {pickMode === "multiple" ? (
            <span>Click on dates to mark them as unavailable. Click again to unmark.</span>
          ) : (
            <span>Click the first day, then the last day — everything in between gets blocked.</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#FF69B4]/20" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#D3D3D3]" />
            <span className="text-muted-foreground">Blocked</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex justify-center">
          <FlatpickrCalendar
            key={pickMode}
            mode={pickMode}
            selectedDates={pickMode === "multiple" ? selectedDates : rangePreview}
            onDateChange={handleDateChange}
            minDate={today}
            inline={true}
          />
        </div>

        {pickMode === "range" && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {rangePreview.length >= 2
                ? `${format(rangePreview[0], "MMM dd")} – ${format(
                    rangePreview[rangePreview.length - 1],
                    "MMM dd, yyyy"
                  )} (${expandRange(rangePreview[0], rangePreview[rangePreview.length - 1]).length} days)`
                : "Pick a start and end date."}
            </p>
            <Button type="button" size="sm" onClick={addRange} disabled={rangePreview.length < 2}>
              Block this range
            </Button>
          </div>
        )}

        {/* Blocked Dates List */}
        {selectedDates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Blocked Dates ({selectedDates.length})</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => commit([])}>
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {[...selectedDates]
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-[#D3D3D3] text-gray-700"
                  >
                    {format(date, "MMM dd, yyyy")}
                    <button
                      type="button"
                      onClick={() => removeDate(date)}
                      className="ml-1 hover:bg-gray-400/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          By default, all future dates are available. Only mark dates when your item is already
          booked or unavailable.
        </p>
      </CardContent>
    </Card>
  );
};

export default AvailabilityCalendarManagerFlatpickr;
