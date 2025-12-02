import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { X, CalendarCheck, CalendarX } from "lucide-react";

interface AvailabilityCalendarManagerProps {
  blackoutDates: Date[];
  onBlackoutDatesChange: (dates: Date[]) => void;
}

const AvailabilityCalendarManager = ({ 
  blackoutDates, 
  onBlackoutDatesChange 
}: AvailabilityCalendarManagerProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>(blackoutDates);
  const [mode, setMode] = useState<"available" | "blocked">("blocked");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const handleDateClick = (date: Date) => {
    if (date < today) return;
    
    const isAlreadyBlocked = selectedDates.some((d) => isSameDay(d, date));
    
    let newDates: Date[];
    if (isAlreadyBlocked) {
      // Remove from blocked dates
      newDates = selectedDates.filter((d) => !isSameDay(d, date));
    } else {
      // Add to blocked dates
      newDates = [...selectedDates, date];
    }
    
    setSelectedDates(newDates);
    onBlackoutDatesChange(newDates);
  };

  const removeDate = (dateToRemove: Date) => {
    const newDates = selectedDates.filter((d) => !isSameDay(d, dateToRemove));
    setSelectedDates(newDates);
    onBlackoutDatesChange(newDates);
  };

  const isDateBlocked = (date: Date) => {
    return selectedDates.some((d) => isSameDay(d, date));
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
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "blocked" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("blocked")}
            className={mode === "blocked" ? "bg-[#FF69B4] hover:bg-[#FF69B4]/90" : ""}
          >
            <CalendarX className="mr-2 h-4 w-4" />
            Mark Unavailable
          </Button>
          <Button
            type="button"
            variant={mode === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("available")}
            className={mode === "available" ? "bg-[#FF69B4] hover:bg-[#FF69B4]/90" : ""}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            Mark Available
          </Button>
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
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={(date) => date && handleDateClick(date)}
            numberOfMonths={1}
            disabled={(date) => date < today}
            className={cn("rounded-md border pointer-events-auto")}
            modifiers={{
              blocked: selectedDates,
              available: (date) => date >= today && !isDateBlocked(date),
            }}
            modifiersClassNames={{
              blocked: "bg-[#D3D3D3] text-gray-600 font-bold line-through hover:bg-[#D3D3D3]/80",
              available: "bg-[#FF69B4]/20 text-foreground hover:bg-[#FF69B4]/40",
            }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Click a date to block it. Click again to unblock. You can select multiple dates.
        </p>

        {/* Blocked Dates List */}
        {selectedDates.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Blocked Dates ({selectedDates.length})</p>
            <div className="flex flex-wrap gap-2">
              {selectedDates
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

export default AvailabilityCalendarManager;
